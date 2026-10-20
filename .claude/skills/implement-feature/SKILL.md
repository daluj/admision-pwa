---
name: implement-feature
description: Implements the current feature spec (specs/YYYY-MM-DD-*/plan.md) task group by task group, keeping typecheck, lint and tests green after each group and committing per group. Use when the user says "implement the spec", "implement the plan", "implement the remaining task groups", "build phase N", or invokes /implement-feature.
---

# Implement Feature

## 1. Locate the spec

- Current branch `phase-N-*` → the spec dir whose `requirements.md` has `**Roadmap phase:** N`.
- If ambiguous, list candidate spec dirs and ask.
- Read `requirements.md`, `plan.md`, `validation.md`, then `CLAUDE.md`, `specs/tech-stack.md`, `specs/domain.md`, `specs/ux-guidelines.md`.

## 2. Find where to resume

Check `git log --oneline main..HEAD` for commits named `feat(phase-N): group K …`. Start at the first group without a commit (or the group the user names).

## 3. For each task group, in order

1. Create a todo list with the group's numbered tasks (TaskCreate/TaskUpdate).
2. Implement the tasks. Follow existing patterns in `src/`; for:
   - entities, events, state machines, Dexie schema → follow the `data-model-change` skill
   - KPI tiles, boards, charts, dashboards → follow the `dashboard-widget` skill
3. Write the tests the plan asks for in the same group (tests are not a separate afterthought).
4. Run: `npm run typecheck && npm run lint && npm test`. Fix until green. Do not weaken or skip tests to make them pass.
5. Commit: `feat(phase-N): group K – <group name>`.

## 4. Guardrails

- **Stay in scope.** Anything not in the plan goes into `backlog/YYYY-MM-DD-<topic>.md` and is mentioned at the end, not implemented.
- **Spec drift.** If the plan is wrong or impossible, stop and propose a spec edit; after the user agrees, update `plan.md`/`requirements.md` (and `specs/domain.md` if relevant) in the same branch.
- **Rules from CLAUDE.md are non-negotiable:** synthetic data only, ports & adapters, events first, `Clock` for time, Spanish UI strings in `src/i18n/es.ts`, no unapproved dependencies.
- Do not tick roadmap items — that happens in `ship-feature` after validation.

## 5. Finish

When all groups are done: run `npm run build` and `npm run test:e2e`, then summarise what was built per group and suggest "validate the feature".
