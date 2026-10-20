# domain

Pure TypeScript business logic: Zod schemas and inferred types for every entity and event (`schemas/`, with `schemas/fixtures.ts` holding valid synthetic samples for tests), state machines (`state-machines/`, `next` / `can` / `allowedActions`, `InvalidTransitionError`), and later domain commands (`commands/`, Phase 5), KPI calculators (`kpis/`) and alert rules (`alerts/`).

**May import:** `zod`, `date-fns`, `src/lib/`, the port interfaces in `src/data/ports/`.
**Must not import:** React, Dexie, `src/data/adapters/`, `src/features/`, `src/components/`.

Time comes from the `Clock` port — never `Date.now()` / `new Date()` for "now". Every state change produces `HospitalEvent`s persisted in the same transaction.
