---
name: replan-roadmap
description: Revises specs/roadmap.md after a phase ships, after a demo or when priorities change — splits coarse phases into small ones, merges or reorders phases, moves backlog ideas in, and keeps the rest of the constitution and existing feature specs consistent. Use when the user says "replan", "update the roadmap", "combine phases", "split phase N", "what's next after the MVP", or invokes /replan-roadmap.
---

# Replan Roadmap

## 1. Gather context

- Read `specs/roadmap.md`, `specs/mission.md`, `specs/tech-stack.md`, `specs/domain.md`.
- Read `backlog/*.md` (ideas and research) and the latest `CHANGELOG.md` entries.
- `git log --oneline -20` to see what actually shipped.

## 2. Interview — BEFORE editing

Use `AskUserQuestion` with up to 3 questions in one call:

| Header | Focus |
|---|---|
| **Goal** | What the next milestone must achieve (e.g. hospital demo date, pilot, IT review) |
| **Changes** | Which phases to add, split, merge, drop or reorder (offer concrete proposals) |
| **Constraints** | Time, stakeholder feedback, IT/compliance input, dependencies |

## 3. Edit rules

- **Never rewrite completed phases** (`(Complete)`) except to fix typos.
- Keep phases small (one session each, 3–6 items, a one-line **Goal**), each demo-able when done.
- Renumber only phases that are not started; if a phase has a spec dir, keep its number and update the `**Roadmap phase:**` line in its `requirements.md` if it must change.
- When a replan changes global decisions (stack, entities, principles), update `specs/tech-stack.md`, `specs/domain.md` or `specs/mission.md` in the same commit and list what changed.
- Move ideas that are not scheduled into `backlog/` rather than deleting them.

## 4. Finish

Show a before/after summary of phases, commit on the current branch (or a `replan-YYYY-MM-DD` branch if on `main`) as `docs(roadmap): replan – <reason>`, and suggest the next `feature-spec`.
