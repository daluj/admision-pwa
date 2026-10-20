#!/usr/bin/env python3
"""Create or update CHANGELOG.md from git history, grouped by commit date (newest first).

The last processed commit is stored in an HTML comment (<!-- last-commit: <sha> -->) so bullets
can be reworded by hand without being re-added on the next run.

Usage (from the repository root):
    python3 .claude/skills/changelog/scripts/changelog.py
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

CHANGELOG = Path("CHANGELOG.md")
TITLE = "# Changelog"
MARKER = re.compile(r"<!-- last-commit: ([0-9a-f]{7,40}) -->")
DATE_HEADING = re.compile(r"^## (\d{4}-\d{2}-\d{2})\s*$")
SKIP_PREFIXES = ("docs: update changelog",)


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        sys.exit(f"git {' '.join(args)} failed: {exc}")


def new_commits(last_sha: str | None, last_date: str | None) -> list[tuple[str, str, str]]:
    """Return (sha, date, subject), oldest first."""
    args = ["log", "--no-merges", "--reverse", "--date=short", "--pretty=format:%H%x09%ad%x09%s"]
    if last_sha:
        args.append(f"{last_sha}..HEAD")
    commits = []
    for line in git(*args).splitlines():
        parts = line.split("\t", 2)
        if len(parts) != 3:
            continue
        sha, date, subject = parts[0], parts[1], parts[2].strip()
        if not last_sha and last_date and date <= last_date:
            continue  # legacy changelog without marker: only strictly newer dates
        if subject and not subject.lower().startswith(SKIP_PREFIXES):
            commits.append((sha, date, subject))
    return commits


def main() -> None:
    if not Path(".git").exists():
        sys.exit("Run this from the repository root (no .git directory found).")
    if not git("rev-parse", "--verify", "-q", "HEAD").strip():
        sys.exit("No commits yet.")

    text = CHANGELOG.read_text(encoding="utf-8") if CHANGELOG.exists() else ""
    marker = MARKER.search(text)
    last_sha = marker.group(1) if marker else None
    dates = [m.group(1) for m in (DATE_HEADING.match(l) for l in text.splitlines()) if m]
    last_date = max(dates) if dates else None

    commits = new_commits(last_sha, last_date)
    head = git("rev-parse", "HEAD").strip()
    if not commits:
        print("CHANGELOG.md is already up to date.")
        return

    # Group new commits by date, newest commit first within each date.
    grouped: dict[str, list[str]] = {}
    for _, date, subject in commits:
        grouped.setdefault(date, []).insert(0, subject)

    lines = [l for l in text.splitlines() if not MARKER.search(l)]
    if not lines or lines[0].strip() != TITLE:
        lines = [TITLE, ""] + lines

    # Insert bullets: merge into an existing heading for the same date, else add a new section on top.
    for date in sorted(grouped):  # oldest first, each new section is inserted at the top
        bullets = [f"- {s}" for s in grouped[date]]
        idx = next((i for i, l in enumerate(lines) if l.strip() == f"## {date}"), None)
        if idx is not None:
            at = idx + 2 if idx + 1 < len(lines) and lines[idx + 1] == "" else idx + 1
            lines[at:at] = bullets
        else:
            first = next((i for i, l in enumerate(lines) if DATE_HEADING.match(l)), len(lines))
            lines[first:first] = [f"## {date}", "", *bullets, ""]

    body = "\n".join(lines).rstrip() + "\n"
    body = body.replace(TITLE + "\n", f"{TITLE}\n\n<!-- last-commit: {head} -->\n", 1)
    body = re.sub(r"\n{3,}", "\n\n", body)
    CHANGELOG.write_text(body, encoding="utf-8")
    print(f"Added {len(commits)} entr{'y' if len(commits) == 1 else 'ies'} to CHANGELOG.md.")


if __name__ == "__main__":
    main()
