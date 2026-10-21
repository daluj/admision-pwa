# domain

Pure TypeScript business logic: Zod schemas and inferred types for every entity and event (`schemas/`, with `schemas/fixtures.ts` holding valid synthetic samples for tests), state machines (`state-machines/`, `next` / `can` / `allowedActions`, `InvalidTransitionError`), domain commands (`commands/`: `async (ctx, input) => { events, changes }` — `resetDemo` since Phase 3; ED, bed, admission, transfer and simulation commands since Phase 5; `executeCommand` persists a result in one transaction with `expectedLastSeq` and retries on conflict), KPI calculators (`kpis/`: pure functions of entities + `now`, e.g. `computeCensus`; thresholds in `kpis/thresholds.ts`) and alert rules (`alerts/`).

**May import:** `zod`, `date-fns`, `src/lib/`, the port interfaces in `src/data/ports/`.
**Must not import:** React, Dexie, `src/data/adapters/`, `src/features/`, `src/components/`.

Time comes from the `Clock` port — never `Date.now()` / `new Date()` for "now". Every state change produces `HospitalEvent`s persisted in the same transaction.
