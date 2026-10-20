---
name: data-model-change
description: Checklist for any change to the domain model — adding or changing an entity, field, state, event type, KPI or the IndexedDB (Dexie) schema — so Zod schemas, state machines, ports, both adapters, seed, simulator, tests and specs/domain.md stay in sync and the later PostgreSQL migration stays easy. Use whenever a task touches src/domain/schemas, src/domain/state-machines, src/data/ports, src/data/adapters or specs/domain.md, or the user says "add a field", "new entity", "new event", "change the schema".
---

# Data Model Change

Work through the layers **in this order**. Skip a step only if it truly does not apply, and say so.

## 1. Spec first — `specs/domain.md`
- Add/modify the entity row, state machine diagram, event row (with HL7 ADT mapping or `—`), KPI formula or alert rule.
- Use the glossary: English code name + Spanish UI label.

## 2. Domain — `src/domain/`
- **Schema:** update Zod in `src/domain/schemas/<entity>.ts`; export the inferred type. Timestamps are ISO UTC strings (`z.string().datetime()`); enums as `z.enum([...])`; optional fields `.optional()` (never `null` unless the domain needs "explicitly empty").
- **Events:** add the payload schema to the discriminated union in `src/domain/schemas/events.ts` (`type` literal discriminator).
- **State machine:** update the transition table in `src/domain/state-machines/<entity>.ts`; invalid transitions throw a typed `InvalidTransitionError`.
- **Commands:** update/create the command in `src/domain/commands/` — validate input with Zod, check transition, return `{ events, changes }`.
- **KPIs / alert rules:** pure functions in `src/domain/kpis/` / `src/domain/alerts/` taking data + `now`.

## 3. Ports — `src/data/ports/`
- Add repository methods only when a use case needs them. Name by intent (`listOpenBedRequests`), not by storage (`queryIndex`).
- Every list query a dashboard needs must exist in both a one-shot (`list*`) and an observable (`observe*` → `Subscribable`) form.

## 4. Adapters
- **Dexie** (`src/data/adapters/dexie/db.ts`):
  - **Never edit an existing `db.version(n)` block.** Add `db.version(n + 1).stores({...})` with the full new store definition and an `.upgrade(tx => …)` if existing rows need new defaults or reshaping.
  - Add indexes for every field used in `where()` / sorting by dashboards (compound indexes like `[unitId+status]` where useful).
  - Writes that change state **and** append events happen in one `db.transaction('rw', [...tables, db.events], …)`.
- **Memory** adapter (`src/data/adapters/memory/`): implement the same methods.
- **Contract tests** (`src/data/adapters/contract.test.ts`) run the same suite against both adapters — add cases for the new methods.
- **Future Postgres:** append the equivalent DDL to `backlog/postgres-schema-draft.sql` (create the file if missing): table, columns with SQL types, `CHECK` constraints for enums, indexes. Keep names `snake_case`. This keeps Phase 15 cheap.

## 5. Seed & simulator
- Update `src/simulator/seed/*` so new fields have realistic synthetic values (seeded PRNG only, no real data).
- If a new event type exists, decide whether the simulator emits it; if yes, add it to the relevant scenario with plausible timing.
- Re-run the determinism test.

## 6. Tests (minimum)
- Schema: valid and invalid samples.
- State machine: every allowed transition + at least one forbidden one.
- Command: emits the right events and changes.
- Adapter contract tests pass for Dexie (fake-indexeddb) and memory.
- **Upgrade test** when bumping the Dexie version: open DB at version n with fixture data, upgrade to n + 1, assert data integrity.

## 7. Verify
`npm run typecheck && npm run lint && npm test`. Mention in the commit message: `feat(domain): …` and note the Dexie version if it changed.
