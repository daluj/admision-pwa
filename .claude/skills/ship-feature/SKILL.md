---
name: ship-feature
description: Finishes a validated roadmap phase — ticks its items in specs/roadmap.md, updates CHANGELOG.md with the changelog skill, commits, merges the phase branch into main and deletes it. Use when the user says "ship it", "merge this phase", "mark the phase complete", "finish the feature", or invokes /ship-feature.
---

# Ship Feature

## Preconditions (stop and report if any fails)

- Current branch is `phase-N-*` and the working tree has only intended changes.
- The phase's `validation.md` has all automated items checked, and the user has confirmed manual / NEEDS HUMAN items. If not, run the `validate-feature` skill first.
- `npm run typecheck && npm run lint && npm test` pass right now.
- No `console.log` / `debugger` left in `src/` (`grep -rn "console.log\|debugger" src`), except in intentional logger utilities.

## Steps

1. **Roadmap:** in `specs/roadmap.md`, tick every item of phase N (`[x]`) and append ` (Complete)` to the phase heading. If something was descoped, leave it unticked and move it to a later phase or `backlog/`, and tell the user.
2. **Spec status:** add `**Status:** Complete — YYYY-MM-DD` under the header lines of the phase's `requirements.md`.
3. **Commit** the above: `docs(phase-N): mark phase complete`.
4. **Changelog:** run the `changelog` skill; review the new bullets (rewrite them in plain English, user-facing where possible); commit `docs: update changelog`.
5. **Merge:**
   ```bash
   git checkout main
   git merge --no-ff phase-N-<name> -m "Merge phase N: <name>"
   git branch -d phase-N-<name>
   ```
   If a remote exists, ask before pushing.
6. **Next:** read the roadmap and tell the user the next phase and whether it needs replanning. Suggest "feature spec".
