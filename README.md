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

## Getting started (after Phase 1)

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run test:e2e
```
