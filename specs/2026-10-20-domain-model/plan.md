# Plan: Domain Model & Local Database

Every group follows the `data-model-change` skill and ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-2): group K – <name>`.

## Group 1: Dependencies & Domain Schemas

1. Install pinned `zod`, `dexie` and dev `fake-indexeddb`. Do **not** install `dexie-react-hooks` (see Decisions).
2. `src/domain/schemas/common.ts`: `Id`, `IsoDateTime` (Zod ISO datetime, UTC `Z`), `EntityBase`, `Location` (`kind`, `refId?`, `label`), `TriageLevel` (1–5), `Actor` (`userId` string or `'simulator'`).
3. One schema file per entity listed in `requirements.md` (enums exported both as Zod enums and as `readonly` arrays/`type`s). `SimulationState` uses `id: 'current'`.
4. `src/domain/schemas/events.ts`: `EventBase` (`id`, `seq`, `type`, `occurredAt`, `actor`, `entityType`, `entityId`), one payload schema per event from `specs/domain.md` → Event payloads, `HospitalEvent` = `z.discriminatedUnion('type', [...])`, `NewHospitalEvent` = event without `seq`, `EVENT_TYPES` array.
5. `src/domain/schemas/index.ts` re-exporting everything plus `ENTITY_NAMES` (`'specialty' | 'unit' | 'bed' | …`) and an `entitySchemas` map `EntityName → schema`.
6. Tests `src/domain/schemas/*.test.ts`: a valid and an invalid sample for every entity; every event type parses with a valid payload and rejects a wrong `type`/payload pair; non-UTC timestamps rejected.

## Group 2: State Machines

7. `src/domain/state-machines/errors.ts`: `InvalidTransitionError` (`entity`, `from`, `action`, message in English).
8. `src/domain/state-machines/machine.ts`: tiny generic `defineMachine({ entity, transitions })` → `{ next, can, allowedActions }`; transitions are a typed table `Record<State, Partial<Record<Action, State | Guard>>>`.
9. `bed.ts`, `edVisit.ts`, `admission.ts`, `transferRequest.ts` with the actions in `requirements.md`. `edVisit.leave` takes `{ outcome }`: from `ARRIVED`/`TRIAGED` only `LWBS`; from `ADMIT_DECISION` only `ADMITTED`; from `IN_ASSESSMENT` `DISCHARGED_HOME | TRANSFERRED_OUT | DECEASED`.
10. Tests per machine: **every** allowed transition (table-driven from the spec diagrams), at least two forbidden ones, `allowedActions` for each state, guard cases for `edVisit.leave`.

## Group 3: Ports

11. `src/data/ports/subscribable.ts`: `Subscribable<T>`, `Unsubscribe`, helper `fromValue` for tests.
12. `src/data/ports/clock.ts`: `Clock { now(): IsoDateTime }`.
13. `src/data/ports/repositories.ts`: generic `Repository<T>` (`get`, `list`, `observeList`, `count`, `observeCount`) and `Repositories` map keyed by `EntityName`; `BedRepository` adds `listBedsByUnit` / `observeBedsByUnit`.
14. `src/data/ports/eventStore.ts`: `Change` union (`put` / `delete`), `EventStore` (`append`, `list`, `observeRecent`, `lastSeq`), `AppendError`.
15. `src/data/ports/dataBackend.ts`: `DataBackend` (`info`, `repositories`, `events`, `clock`, `observeTableCounts`, `close`) and `TableCounts` (`Record<EntityName | 'events', number>`).
16. Update `src/data/ports/README.md` with the contract summary.

## Group 4: Memory Adapter & Contract Suite

17. `src/data/adapters/memory/createMemoryBackend.ts`: Map per entity + events array; `append` applies changes on a copy and swaps only if all succeed (atomic), then notifies subscribers (microtask).
18. `src/data/adapters/clock/systemClock.ts` and `fixedClock.ts` (settable, for tests).
19. `src/data/adapters/contract.ts`: `runBackendContract(name, factory)` covering: empty state; `append` assigns consecutive `seq` from 1; events + changes visible together; put overwrites, delete removes; failed append (invalid event, or change for unknown entity) leaves **nothing** written; `observeList` / `observeCount` / `observeTableCounts` / `observeRecent` emit initial value then after each append; unsubscribe stops emissions; `listBedsByUnit`; `list({ afterSeq, limit })`.
20. `src/data/adapters/memory/memory.contract.test.ts` runs the suite.

## Group 5: Dexie Adapter

21. `src/data/adapters/dexie/db.ts`: `TorreControlDb extends Dexie`, name `torre-control`, `db.version(1).stores({...})`:
    - `specialties: 'id, &code'`, `units: 'id, &code, type'`, `beds: 'id, unitId, status, [unitId+status], patientId, admissionId'`, `patients: 'id, &mrn'`, `edVisits: 'id, patientId, phase, triageLevel, arrivedAt'`, `admissions: 'id, patientId, status, type, specialtyCode, bedId, expectedDischargeAt'`, `bedRequests: 'id, admissionId, status, priority'`, `transferRequests: 'id, patientId, status, porterId, slaDueAt'`, `porters: 'id, status, shift'`, `users: 'id, &username, role'`, `alerts: 'id, ruleId, severity, [entityType+entityId], resolvedAt'`, `simulationState: 'id'`, `events: '++seq, &id, type, occurredAt, [entityType+entityId]'`.
    - `SCHEMA_VERSION = 1` exported.
22. `src/data/adapters/dexie/createDexieBackend.ts`: repositories, `append` in `db.transaction('rw', [all tables], …)`, observables via `liveQuery` wrapped as `Subscribable`, `close()`; accepts an optional db name (tests use unique names).
23. `src/data/adapters/dexie/dexie.contract.test.ts` with `fake-indexeddb/auto`; plus a test that a **second Dexie instance on the same database** sees appended data (persistence across connections).
24. `backlog/postgres-schema-draft.sql`: tables, column types, `CHECK` enums, indexes, `events` with `bigserial seq`.

## Group 6: DataProvider & Hooks

25. `src/data/createBackend.ts`: reads `import.meta.env.VITE_DATA_BACKEND` (`dexie` default | `memory`), throws `UnknownBackendError` otherwise. Add `src/vite-env.d.ts` typing for the env var and `.env.example`.
26. `src/data/DataProvider.tsx` + `src/data/dataContext.ts`: creates the backend once, provides it, closes it on unmount; accepts an injected `backend` prop for tests.
27. `src/data/hooks/useSubscribable.ts` (`useSyncExternalStore`, returns `undefined` while loading, surfaces errors to an error boundary), then `useDataInfo`, `useTableCounts`, `useUnits`, `useBeds`, `useBedsByUnit`, `useRecentEvents`.
28. Wire `DataProvider` into `main.tsx` and the test helper `renderApp` (memory backend).
29. Hook tests with the memory backend: initial value, update after `append`, unsubscribe on unmount, `useBedsByUnit` changes when `unitId` changes.

## Group 7: Ajustes "Base de datos local" Card

30. Strings in `src/i18n/es.ts` → `pages.settings.database` (title, description, backend labels, schema version, events, table labels for every `EntityName`, empty hint, loading).
31. `src/features/settings/components/DatabaseStatusCard.tsx` (follows `dashboard-widget`: label/value pairs with tabular numerals, `aria-live="polite"` for counts, skeleton while loading, no colour-only meaning).
32. `SettingsPage`: replace the empty state with the card; keep the colour swatch card.
33. Component test: renders backend, schema version and counts from a memory backend, and updates after an `append`.
34. Extend `e2e/shell.spec.ts`: Ajustes shows "IndexedDB", "Versión del esquema: 1", "Eventos registrados: 0"; the `torre-control` IndexedDB database exists after load; still works offline.
35. Update folder READMEs (`src/domain`, `src/data/*`) if structure changed; update `specs/domain.md` if implementation forced any schema detail.
