---
name: changelog
description: Maintains CHANGELOG.md in the project root from git commit history, grouped by date (newest first). Use when the user invokes /changelog, asks to "update the changelog" or "generate a changelog", or before merging a phase branch (the ship-feature skill calls it). Creates the file if missing; otherwise adds only commits newer than the last recorded date.
---

# Changelog

## Workflow

1. From the project root (where `.git/` is), run:

   ```bash
   python3 .claude/skills/changelog/scripts/changelog.py
   ```

2. The script:
   - **No `CHANGELOG.md`**: reads the full history and writes all dates.
   - **`CHANGELOG.md` exists**: finds the newest `## YYYY-MM-DD` heading and inserts sections for commits **after** that date (commits from that same date are merged into the existing section without duplicates).
   - Skips merge commits and commits whose subject starts with `docs: update changelog`.
   - Is idempotent: if nothing is new it prints a message and does not touch the file.

3. Review the result: rewrite bullets so a stakeholder can understand them (e.g. `feat(phase-6): group 3 – bed map` → "Bed map per unit with live status colours"). Drop noise (typo fixes, formatting).

## Format

```markdown
# Changelog

## 2026-10-22

- Bed management census dashboard with live occupancy per unit
- Unit tests for bed state machine

## 2026-10-20

- Project scaffold, app shell and installable PWA
```
