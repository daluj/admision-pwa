# Requirements: Domain Model & Local Database

**Roadmap phase:** 2 — Domain Model & Local Database
**Branch:** `phase-2-domain-model`

## Scope

Build the domain and persistence foundation behind ports & adapters: Zod schemas for every entity and event in `specs/domain.md`, the four state machines, the port interfaces, an IndexedDB (Dexie) adapter and an in-memory adapter that pass the same contract tests, a `DataProvider` and the first data hooks. The only visible change is a small live "Base de datos local" card in Ajustes.

### Included

**Domain schemas** (`src/domain/schemas/`, one file per entity, types inferred with `z.infer`) for **all** entities:

| Entity | File | Notes |
|---|---|---|
| Specialty | `specialty.ts` | |
| Unit | `unit.ts` | `type` enum `WARD \| ICU \| INTERMEDIATE \| ED \| OTHER` |
| Bed | `bed.ts` | `status` enum from the Bed state machine |
| Patient | `patient.ts` | synthetic only; `mrn` is a fictitious NHC |
| EdVisit | `edVisit.ts` | `phase`, `area`, `outcome` enums; `triageLevel` 1–5 |
| Admission | `admission.ts` | `type`, `status` enums |
| BedRequest | `bedRequest.ts` | |
| TransferRequest | `transferRequest.ts` | uses `Location` |
| Porter | `porter.ts` | |
| User | `user.ts` | `role` enum from Roles |
| Alert | `alert.ts` | |
| SimulationState | `simulationState.ts` | singleton row (`id: 'current'`) |
| HospitalEvent | `events.ts` | discriminated union on `type`, one payload schema per event (see `specs/domain.md` → Event payloads) |

Shared building blocks in `common.ts`: `Id`, `IsoDateTime` (ISO 8601 UTC), `EntityBase` (`id`, `createdAt`, `updatedAt`), `Location`, `TriageLevel`.

**State machines** (`src/domain/state-machines/`) for Bed, EdVisit, Admission, TransferRequest:

| Machine | Actions (from `specs/domain.md` diagrams) |
|---|---|
| Bed | `reserve`, `release`, `occupy`, `discharge`, `transferOut`, `startCleaning`, `finishCleaning`, `block`, `unblock` |
| EdVisit | `triage`, `startAssessment`, `decideAdmission`, `leave` (guarded by `outcome`) |
| Admission | `requestBed`, `assignBed`, `startTransfer`, `admit`, `orderDischarge`, `discharge`, `cancel` |
| TransferRequest | `assign`, `pickUp`, `deliver`, `cancel` |

Each exposes `next(state, action[, context]) → state` (throws `InvalidTransitionError` with `entity`, `from`, `action`), `can(state, action) → boolean` and `allowedActions(state)`.

**Ports** (`src/data/ports/`):
- `Subscribable<T>`: `subscribe(onValue, onError?) → Unsubscribe`.
- `Clock`: `now() → IsoDateTime`.
- One repository per entity with `get(id)`, `list()`, `observeList()`, `count()`, `observeCount()` — plus intent-named queries only where this phase's hooks need them (`listBedsByUnit` / `observeBedsByUnit`).
- `EventStore`: `append(events, changes) → appended events with seq`, `list({ afterSeq?, limit? })`, `observeRecent(limit)`, `lastSeq()`.
- `DataBackend`: bundles repositories, event store, clock, `info` (`name`, `schemaVersion`), `observeTableCounts()` and `close()`.

**Adapters** (`src/data/adapters/`):
- `memory/` — Map-based, notifies subscribers after each committed append.
- `dexie/` — database `torre-control`, `db.version(1)` with one table per entity + `events` (`++seq`), indexes listed in `plan.md`; observables built on Dexie `liveQuery` (live across tabs).
- `contract.test.ts` — one suite run against both adapters (Dexie on fake-indexeddb).

**DataProvider & hooks** (`src/data/`):
- `DataProvider.tsx` chooses the adapter from `VITE_DATA_BACKEND` (`dexie` default, `memory`), unknown value → clear error at startup.
- Hooks in `src/data/hooks/`: `useDataInfo()`, `useTableCounts()`, `useUnits()`, `useBeds()`, `useBedsByUnit(unitId)`, `useRecentEvents(limit)`, built on a generic `useSubscribable()` (`useSyncExternalStore`).

**UI — Ajustes "Base de datos local" card** (follows `dashboard-widget` skill):

| Element | Spanish copy |
|---|---|
| Card title | "Base de datos local" |
| Description | "Los datos se guardan solo en este navegador." |
| Backend row | "Origen de datos: IndexedDB" / "Memoria (pruebas)" |
| Schema row | "Versión del esquema: 1" |
| Event row | "Eventos registrados: 0" |
| Table counts | one row per table with its Spanish label (Camas, Unidades, Pacientes…) and a live count |
| Empty hint | "Sin datos todavía: el hospital simulado se cargará en la siguiente fase." |

**Postgres draft:** `backlog/postgres-schema-draft.sql` with the equivalent tables, `CHECK` enum constraints and indexes (`snake_case`).

### Not included

- Domain **commands** (validate + produce events/changes) — Phase 5. This phase only provides the `EventStore.append` contract they will call.
- Seed data, PRNG, "Restablecer demo" — Phase 3.
- Simulated clock with speeds — Phase 5 (this phase ships `SystemClock` and `FixedClock`).
- KPI calculators and alert rules — their dashboard phases.
- Supabase adapter — post-MVP.

## Decisions

- **All entities now.** Every entity in `specs/domain.md` gets a schema, a repository and a Dexie v1 table, so later phases do not need a schema bump just to add a table. State machines only for Bed, EdVisit, Admission, TransferRequest.
- **Write contract = events + typed upserts.** `EventStore.append(events, changes)` where `changes` is a list of `{ entity: EntityName, op: 'put', record } | { entity, op: 'delete', id }`. The adapter validates nothing domain-wise (commands do), assigns `seq` and writes events and changes in **one transaction**; either everything commits or nothing does. Current-state tables are read directly — maps 1:1 to Postgres tables + an `events` table.
- **`seq` is assigned by the store**, monotonic and gap-free per database; callers pass events without `seq`. Each event also has an `id` (UUID) for idempotency later.
- **Hooks don't use `dexie-react-hooks`.** `useLiveQuery` would make hooks depend on Dexie; instead the Dexie adapter wraps `liveQuery` in our `Subscribable`, and hooks use `useSyncExternalStore`. `dexie-react-hooks` is therefore not installed (tech-stack updated).
- **Zod validates at the boundary:** `append` parses events and records with the schemas in development and tests (`import.meta.env.DEV`); reads return typed objects without re-parsing for speed.
- **Clock returns ISO strings** (`now(): string`), matching how timestamps are stored. `SystemClock` lives in `src/data/adapters/clock/`; domain code only sees the port.
- **IDs are provided by the caller** (commands in Phase 5, seed in Phase 3); repositories never generate ids.
- **New event payload table and `AdmissionCancelled.reason`** (`NO_BED | PATIENT | CLINICAL | OTHER`) added to `specs/domain.md`, needed for the "cancelled due to no bed" KPI.
- **Data card in Ajustes** proves the live pipeline end to end (including across tabs) without fake domain UI; it replaces the Phase 1 "Sin ajustes disponibles todavía" empty state. The colour swatch card stays.

## Context

- Constitution: `specs/domain.md` (entities, state machines, events), `specs/tech-stack.md` (ports & adapters rules, Dexie, Zod, fake-indexeddb), `specs/ux-guidelines.md`.
- Follow the `data-model-change` skill for every schema/adapter file and the `dashboard-widget` skill for the Ajustes card.
- Patterns from Phase 1: small typed components, strings in `src/i18n/es.ts`, tests next to sources, folder READMEs define allowed imports.
- New dependencies (all already listed in `specs/tech-stack.md`): `zod`, `dexie`, `fake-indexeddb` (dev). Pin exact versions.
- Demo story: Ajustes shows IndexedDB, schema v1 and zero rows, and the database exists in DevTools → Application → IndexedDB. Nothing in the app writes data yet, so the live/cross-tab behaviour is proven by contract tests now and becomes visible in Phase 3 ("Restablecer demo" fills the counts in every open tab) and Phase 5 (event count ticks up).
