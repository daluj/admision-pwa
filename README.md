# Torre de Control — Servicio de Admisión

Real-time operations dashboards for the Admissions Service of Hospital Clínico San Carlos (Madrid): beds, Emergency Department flow, admissions & discharges and internal transfers — run "the Amazon way" (track & trace, SLAs, exceptions, forecasting).

> **MVP status:** Progressive Web App with IndexedDB and an in-browser simulator. **All data is synthetic.**

## Input from stakeholders (assumed — validate with the hospital)

- The **Head of Admissions** wants a single live picture of the hospital and to act on exceptions instead of phoning units.
- **Bed managers** want to see who is waiting for a bed, which beds free up today and which are being cleaned.
- **ED coordination** wants boarding patients and their waiting time visible to the whole hospital.
- **Nurse supervisors** want incoming patients and expected discharges for their unit.
- **Porters** want a clear transfer queue.
- **Management** wants one screen with the status of the hospital and its trends.
- **Hospital IT** wants patient data on hospital infrastructure, standard integrations (HL7/FHIR) and compliance with ENS and GDPR.

## How this project is built: Spec-Driven Development

The project follows the spec-driven workflow from DeepLearning.AI's *Spec-Driven Development with Coding Agents* course.

```
specs/
  mission.md          # Why, for whom, principles            ┐
  tech-stack.md       # Stack, architecture rules, scripts    │ the "constitution"
  roadmap.md          # Small phases, in order                │
  domain.md           # Glossary, entities, states, KPIs      │
  ux-guidelines.md    # Layout, colour semantics, copy        ┘
  YYYY-MM-DD-<feature>/
    requirements.md   # Scope, decisions, context
    plan.md           # Numbered task groups
    validation.md     # How we know it is done and mergeable
backlog/              # Research notes and ideas not yet on the roadmap
.claude/skills/       # Claude Code skills that automate the workflow
```

### The loop (one roadmap phase at a time)

| Step | In Claude Code, say… | Skill |
|---|---|---|
| 1. Spec the next phase | "feature spec" / `/feature-spec` | `feature-spec` |
| 2. Implement it | "implement the spec" / `/implement-feature` | `implement-feature` |
| 3. Validate it | "validate the feature" / `/validate-feature` | `validate-feature` |
| 4. Ship it | "ship it" / `/ship-feature` (changelog, roadmap tick, merge) | `ship-feature`, `changelog` |
| 5. Replan when needed | "replan the roadmap" / `/replan-roadmap` | `replan-roadmap` |

Helper skills used during implementation: `data-model-change` (any change to entities, events or the Dexie schema) and `dashboard-widget` (KPI tiles, boards and charts).

### First-time setup

The skills are shipped in `skills/`. Move them to where Claude Code discovers project skills, then initialise git:

```bash
mkdir -p .claude && mv skills .claude/skills
git init -b main && git add -A && git commit -m "chore: initial specs and skills"
```

Phase 1 already has its spec: `specs/2026-10-20-project-scaffold/`. Start with **"implement the spec"**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 (first launch seeds the synthetic hospital)
npm run build && npm run preview   # production build, installable PWA (http://localhost:4173)
```

| Command | What it does |
|---|---|
| `npm run typecheck` / `lint` / `format` | TypeScript, ESLint (incl. jsx-a11y), Prettier |
| `npm test` | Unit and component tests (Vitest, jsdom) |
| `npm run test:e2e` | Playwright end-to-end tests, including the accessibility audit (axe), keyboard flows, offline and the guided demo |
| `npm run perf` | Opt-in performance run: ~600 beds and 7 simulated days, timing of every dashboard calculator |

## Run the demo

1. Open the app and **log in as Jefe/a de Admisión** (simulated login, no password).
2. **Ajustes → Datos de demostración**: pick a scenario — *Martes normal*, *Lunes de alta presión* or *Pico de gripe (plan de invierno)* — and **Restablecer demo**. The same seed and scenario always give the same day.
3. Press ▶ in the top bar and choose a speed (1×, 10×, 60×, 300×, **1800×** is the ceiling: with IndexedDB a laptop plays a simulated day in a few minutes), or use **Ajustes → Avance rápido** to jump to 10:00, 14:00, 20:00 or any HH:MM; the run stops paused there.
4. Walk through the panels: **Torre de control** (status level, KPIs, alerts, 24 h trends), **Camas**, **Urgencias**, **Ingresos y altas**, **Traslados**, **Seguimiento** (search a patient, follow their journey) and **Modo pantalla** (`/pantalla`, rotating wall display).
5. Follow the script in [`docs/demo-script.md`](docs/demo-script.md) (7–8 minutes, in Spanish); `e2e/demo-script.spec.ts` runs it automatically.

Roles (login page): head of admissions, bed manager, nurse supervisor (pick a unit), ED coordination, porter and management — each sees only their areas and can act only where `specs/domain.md` says so.

## What is inside

- **React 19 + Vite + TypeScript** PWA, Tailwind v4 + shadcn/ui, Recharts, installable and **offline-capable** (`docs/install-and-offline.md`).
- **Ports & adapters**: UI → hooks (`src/data/hooks`, one shared live query per table) → ports; adapters for IndexedDB (Dexie) and memory. Writes only through **domain commands**, every state change appends an **event** in the same transaction.
- **Simulator** (`src/simulator`): seeded, deterministic, runs in the browser (Web Lock leader tab), scenarios as data.
- **Alert engine**, status level and overview (`src/domain/alerts`), journey tracking (`src/domain/kpis/journey.ts`).
- Synthetic data only. Specs in `specs/`, one folder per phase.

See [`docs/known-limitations.md`](docs/known-limitations.md) for what the MVP deliberately does not do.

## Roadmap

Phases 1–14 (the MVP) are complete — see `specs/roadmap.md` and `CHANGELOG.md`. Part B (backend, real authentication, integrations) starts with Phase 15 once the hospital validates the MVP.
