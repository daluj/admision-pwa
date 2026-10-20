---
name: feature-spec
description: Starts a new feature by finding the next roadmap phase without a spec in specs/roadmap.md, creating a git branch, interviewing the user about scope/decisions/context, and writing a dated spec directory under specs/ with requirements.md, plan.md and validation.md. Use when the user says "feature spec", "next phase", "start the next feature", "spec phase N", or invokes /feature-spec.
---

# Feature Spec

## Workflow

### 1. Find the phase

- If the user named a phase ("phase 7"), use it.
- Otherwise read `specs/roadmap.md` and pick the **first phase whose items are all `[ ]`** and that has **no existing spec directory** (search `specs/*/requirements.md` for `**Roadmap phase:** N`).
- If the phase is in Part B (post-MVP) and is still coarse, suggest running `replan-roadmap` first.

### 2. Create the branch

```bash
git status --porcelain   # must be clean; if not, ask the user what to do
git checkout main && git pull --ff-only 2>/dev/null || true
git checkout -b phase-N-<kebab-name>
```
If the repo has no git yet: `git init -b main`, commit everything as "chore: initial specs", then branch.

### 3. Read the constitution

Read `specs/mission.md`, `specs/tech-stack.md`, `specs/domain.md`, `specs/ux-guidelines.md`, the previous phase's spec directory (for patterns) and skim `src/` for existing conventions. Do this **before** interviewing so the questions are specific.

### 4. Interview the user — BEFORE writing any files

Use `AskUserQuestion` with exactly **3 questions in one call**, each with concrete options derived from the roadmap items and the domain model (recommended option first):

| Header | Question focus |
|---|---|
| **Scope** | What the phase includes/excludes: which KPIs, entities, screens, roles, simulator behaviour |
| **Decisions** | Key implementation choices: UX pattern, data shape, thresholds/SLAs, what is computed vs stored |
| **Context** | Demo story, roles to optimise for, constraints, open questions for the hospital |

Do **not** write any files until all three are answered. Ask follow-ups only if an answer contradicts the constitution.

### 5. Create the spec directory

`specs/YYYY-MM-DD-<feature-name>/` with today's date.

#### `requirements.md`
- Header lines: `**Roadmap phase:** N — <name>` and `**Branch:** phase-N-<kebab-name>`
- **Scope**: included / not included; tables for fields, KPIs (with formula reference to `specs/domain.md`), routes, roles
- **Decisions**: choices made and why (from the interview)
- **Context**: pointers to constitution files, existing patterns to follow, demo story

#### `plan.md`
- Numbered **task groups**, each independently implementable and leaving tests green. Typical order for this project:
  Domain (schemas, state machine, KPI functions) → Data (ports, adapters, Dexie version bump, hooks) → Simulator → UI components → Page & route → Navigation/roles → Tests
- Sub-tasks numbered continuously across groups; name concrete files.
- Any domain/schema change must reference the `data-model-change` skill; any dashboard UI the `dashboard-widget` skill.

#### `validation.md`
- **Automated**: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, plus specific assertions (state transitions, KPI values on fixtures, components, e2e flow)
- **Manual**: walkthrough with the simulator running at 60×, per-role checks, responsive and wall-mode checks, edge cases (empty, overload)
- **Copy check**: Spanish copy from `src/i18n/es.ts`, glossary terms
- **Architecture check**: no adapter imports in UI, events appended for every state change, `Clock` used
- **Definition of done**

### 6. Update the constitution if needed

If the interview changed something global (new entity, KPI, alert rule, dependency), update `specs/domain.md` / `specs/tech-stack.md` / `specs/roadmap.md` in the same branch and say so.

### 7. Finish

Commit the spec: `docs(spec): phase N <name>`. Summarise the spec in 5 lines and suggest: "implement the spec".

## Constraints

- Respect `specs/tech-stack.md` — no new dependencies without explicit user approval.
- Keep the phase small enough for one session; if it is not, propose splitting it in the roadmap.
- Specs in English; UI copy examples in Spanish.
