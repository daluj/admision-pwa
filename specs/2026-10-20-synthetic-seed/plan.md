# Plan: Synthetic Hospital Seed

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-3): group K – <name>`. Domain/port changes follow the `data-model-change` skill; the Ajustes card follows `dashboard-widget`.

## Group 1: DemoSeeded Event & Time Helpers

1. `specs/domain.md` already lists `DemoSeeded` and the seed targets (updated with the spec); keep it in sync if implementation changes a detail.
2. `src/domain/schemas/events.ts`: `DemoSeeded` payload (`seed` int ≥ 0, `profileId` string, `anchorAt` IsoDateTime, `counts` partial record of `EntityName` → int ≥ 0); update the event-count test (27 → 28) and add a valid/invalid sample.
3. `src/lib/time.ts`: `zonedDayAt(iso, timeZone, hour, minute)` → ISO UTC of that wall-clock time on the same local day (via `Intl.DateTimeFormat`), plus `formatDateTime(iso, timeZone)` → `dd/MM/yyyy HH:mm`. Tests across both DST changes (2026-03-29, 2026-10-25) and around midnight UTC.
4. `backlog/postgres-schema-draft.sql`: add `DemoSeeded` to the `events.type` CHECK.

## Group 2: Ports — reset & optimistic concurrency

5. `src/data/ports/eventStore.ts`: `AppendOptions { expectedLastSeq?: number }`, `ConcurrencyError extends AppendError` (`expected`, `actual`), `reset(events, changes)`.
6. Memory adapter: `expectedLastSeq` check before applying; `reset` builds empty tables + applies changes atomically, `seq` from 1; notify subscribers.
7. Dexie adapter: `expectedLastSeq` checked **inside** the rw transaction; `reset` = one rw transaction over all tables: `clear()` every table, then write.
8. Contract tests: `expectedLastSeq` match/mismatch (nothing written on mismatch); `reset` empties all tables and events, restarts `seq` at 1, applies changes; failed `reset` (invalid record) leaves the previous data intact; observers emit after `reset`.

## Group 3: Seeded Randomness & Names

9. `src/simulator/random/prng.ts`: `createRng(seed)` (mulberry32) with `float`, `int`, `pick`, `weighted`, `shuffle`, `chance`, `uuid`, `fork(label)` (independent sub-stream so adding one generator doesn't shift others).
10. `src/simulator/random/names.ts`: ~60 female + ~60 male common Spanish first names, ~80 common surnames; `personName(rng, sex)`.
11. Tests: same seed ⇒ same sequence; different seeds differ; `int` bounds inclusive; `weighted` roughly matches weights over 10k draws; `uuid` passes `z.uuid()`; `fork` streams independent.

## Group 4: Hospital Profile & Structure

12. `src/simulator/seed/hospital.ts`: `HospitalProfile` type + `DEFAULT_PROFILE` (`profileId: 'tertiary-600'`, specialties, units with building/floor/type/specialties/capacity, porters per shift, occupancy and mix targets, ED/scheduled/transfer volumes).
13. `src/simulator/seed/generateStructure.ts`: specialties, units, beds (labels `<floor><room>-<A|B>`), porters, users (1 per role + nurse supervisor per ward/critical unit).
14. Tests: ~600 inpatient beds (580–620), every bed's `unitId` exists, bed labels unique per unit, unit `capacity` = its bed count, 16 specialties, user per role, every record passes its Zod schema.

## Group 5: Live State at 08:00

15. `src/simulator/seed/generateCensus.ts`: bed status mix, inpatients (patients + `ADMITTED`/`DISCHARGE_ORDERED` admissions, LOS distribution, expected discharges, outliers).
16. `src/simulator/seed/generateEd.ts`: ED visits by phase and triage, boarding admissions + bed requests (+ `RESERVED` beds for `BED_ASSIGNED`), scheduled admissions, open transfers.
17. `src/simulator/seed/generateHospital.ts`: `generateHospital({ seed, anchorAt, profile }) → HospitalSnapshot` (records per entity + `SimulationState`).
18. Invariant tests on seeds 1, 42, 7: occupancy 83–87 %; every `OCCUPIED` bed ↔ exactly one admitted admission with matching `bedId` and `patientId`; no patient in two places; every `RESERVED` bed ↔ a `BED_ASSIGNED` admission + `ASSIGNED` bed request; boarding visits all have an admission + request; timestamps ≤ anchor except expected discharges / scheduled admissions; all records pass schemas; ED phase/field consistency (`triageLevel` set from `TRIAGED` on, `admitDecisionAt` only for `ADMIT_DECISION`); generation < 300 ms.
19. Determinism tests: same `(seed, anchor)` ⇒ deep-equal snapshot; anchor shifted by 1 day ⇒ identical except every timestamp + 24 h.

## Group 6: Command & Seed Service

20. `src/domain/commands/resetDemo.ts`: `resetDemo({ snapshot, seed, profileId, anchorAt, eventId, actor })` → `{ events: [DemoSeeded], changes }`; validates every record with Zod (throws on invalid).
21. `src/simulator/seed/seedDemo.ts`: `resetDemo(backend, seed)` and `ensureDemoSeeded(backend, seed = 42)` as in requirements; `src/simulator/index.ts` public API.
22. Wire `ensureDemoSeeded` into `main.tsx` (after `createBackend`, errors logged, never blocks rendering).
23. Tests (memory + Dexie/fake-indexeddb): first call seeds and writes exactly 1 event; second call is a no-op; two concurrent `ensureDemoSeeded` calls ⇒ one seed; `resetDemo` with another seed replaces everything, `lastSeq` = 1; same seed twice ⇒ identical table contents.
24. Update READMEs (`src/simulator`, `src/features`, `src/domain`) for commands and the simulator public API.

## Group 7: Ajustes "Datos de demostración" Card

25. Add shadcn `alert-dialog`, `input`, `label` to `src/components/ui/` (fix imports as in Phase 1; Spanish sr-only text from `es.ts`).
26. `src/i18n/es.ts` → `pages.settings.demo` strings from requirements.
27. `src/data/hooks`: `useSimulationState()`.
28. `src/features/settings/components/DemoDataCard.tsx` (presentational: current seed, start time, seed field + validation, button, dialog, busy state) and `DemoDataSection.tsx` (container: hook + `resetDemo` + toasts).
29. Component tests: shows current seed/start time; invalid seed blocks reset with message; confirm runs reset with the typed seed and shows toast; cancel does nothing; busy state.
30. E2E: first load shows ~600 camas and 1 evento; reset with seed 7 in one page updates a **second page** (same context, two tabs) to the new counts; reset back to 42 restores the original counts.
