# Validation: Domain Model & Local Database

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0 with no warnings
- [x] `npm test` exits 0
- [x] `npm run build` exits 0
- [x] `npm run test:e2e` exits 0

### Specific coverage required

- [x] Every entity schema has a valid and an invalid sample test; non-UTC timestamps are rejected
- [x] Every event type in `specs/domain.md` parses with a valid payload; mismatched type/payload is rejected
- [x] Bed, EdVisit, Admission, TransferRequest: every allowed transition from `specs/domain.md` tested, plus forbidden ones throwing `InvalidTransitionError`
- [x] `edVisit.leave` outcome guards tested for each source phase
- [x] Contract suite runs against **both** memory and Dexie (fake-indexeddb) adapters with identical results
- [x] Contract: `seq` starts at 1 and is consecutive; events and changes commit together; a failing append writes nothing
- [x] Contract: observables emit initial value, emit after each append, stop after unsubscribe
- [x] Dexie: a second connection to the same database sees appended data
- [x] `createBackend` rejects an unknown `VITE_DATA_BACKEND`
- [x] Hooks update after an append and unsubscribe on unmount
- [x] `DatabaseStatusCard` shows backend, schema version and live counts
- [x] E2E: Ajustes shows "IndexedDB", "Versión del esquema: 1", "Eventos registrados: 0"; `torre-control` database exists

## Manual

- [x] `npm run dev`, open Ajustes: card shows IndexedDB, schema v1, all counts 0; DevTools → Application → IndexedDB → `torre-control` lists all 13 tables with the indexes from `plan.md`
- [x] `VITE_DATA_BACKEND=memory npm run dev`: card shows "Memoria (pruebas)"; no `torre-control` database is created
- [x] `VITE_DATA_BACKEND=foo npm run dev`: the app shows a clear startup error instead of a blank page
- [x] Card is readable in light and dark themes and at 1024×768 and 390 px
- [x] Offline after first load: Ajustes still renders the card

## Copy Check

- [x] All new visible text is Spanish, from `src/i18n/es.ts`; table labels use glossary terms (Camas, Unidades, Servicios, Pacientes, Episodios de Urgencias, Ingresos, Solicitudes de cama, Traslados, Celadores, Usuarios, Alertas, Simulación, Eventos)

## Architecture Check

- [x] `src/domain/` imports nothing from React, Dexie, `src/data/adapters/` or `src/features/`
- [x] Components and hooks never import Dexie or `src/data/adapters/` (only `createBackend.ts` / `DataProvider.tsx` do)
- [x] No `Date.now()` / `new Date()` for "now" in `src/domain/` (clock implementations live in `src/data/adapters/clock/`)
- [x] Every Dexie write goes through `EventStore.append` in a single transaction covering events + changed tables
- [x] `db.version(1)` only; `SCHEMA_VERSION` matches
- [x] `backlog/postgres-schema-draft.sql` covers every table
- [x] `specs/domain.md` matches the schemas (event payloads, `AdmissionCancelled.reason`)
- [x] Only `zod`, `dexie`, `fake-indexeddb` added; versions pinned

## Definition of Done

All automated checks pass, manual checks confirmed, Phase 2 items ticked in `specs/roadmap.md`, `CHANGELOG.md` updated, no leftover `console.log`, branch merged into `main`.
