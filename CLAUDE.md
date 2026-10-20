# CLAUDE.md

Project: **Torre de Control** — real-time dashboards for a hospital Admissions Service. React + Vite + TypeScript PWA, IndexedDB (Dexie) and an in-browser simulator for the MVP; PostgreSQL/Supabase later.

## Source of truth

Read before any non-trivial work:
- `specs/mission.md` — purpose, audience, principles, non-goals
- `specs/tech-stack.md` — stack, folder layout, architecture rules, scripts
- `specs/domain.md` — glossary (EN code ↔ ES UI), entities, state machines, events, KPIs, alerts, roles
- `specs/ux-guidelines.md` — layout, colour semantics, copy
- `specs/roadmap.md` — phases; the current phase's spec lives in `specs/YYYY-MM-DD-<feature>/`

If code and specs disagree, stop and ask whether to update the spec or the code. Never silently diverge from a spec; update the spec in the same branch when a decision changes.

## Workflow (spec-driven)

1. `feature-spec` skill → branch + interview + `requirements.md` / `plan.md` / `validation.md`
2. `implement-feature` skill → implement task groups in order, tests green after each group
3. `validate-feature` skill → run every check in `validation.md`
4. `ship-feature` skill → changelog, tick roadmap, commit, merge, delete branch

One roadmap phase per branch. Keep scope to the phase; put new ideas in `backlog/`.

## Non-negotiable rules

- **Synthetic data only.** Never add real patient data, real staff names or real identifiers.
- **Ports & adapters.** Components and domain code never import Dexie or `src/data/adapters/*`. UI reads through hooks in `src/data/hooks/`; writes go through domain commands in `src/domain/commands/`.
- **Events first.** Every state change appends a `HospitalEvent` in the same transaction.
- **Time from `Clock`.** No `Date.now()` / `new Date()` for "now" in domain or simulator code.
- **Language.** Code, comments, commits and specs in English. UI copy in Spanish, only via `src/i18n/es.ts`.
- **Dependencies.** Only those in `specs/tech-stack.md`. Ask before adding any other.
- **Schema changes** follow the `data-model-change` skill (Zod + Dexie version bump + `specs/domain.md`).
- **Dashboards** follow the `dashboard-widget` skill and `specs/ux-guidelines.md`.

## Commands

```bash
npm run dev | build | preview | typecheck | lint | format | test | test:e2e
```

Before saying a task is done: `npm run typecheck && npm run lint && npm test` must pass.

## Git

If the folder is not yet a git repository, run `git init -b main` and make an initial commit of the specs before creating the first phase branch.
