# Validation: Domain Model & Local Database

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with no warnings
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` exits 0

### Specific coverage required

- [ ] Every entity schema has a valid and an invalid sample test; non-UTC timestamps are rejected
- [ ] Every event type in `specs/domain.md` parses with a valid payload; mismatched type/payload is rejected
- [ ] Bed, EdVisit, Admission, TransferRequest: every allowed transition from `specs/domain.md` tested, plus forbidden ones throwing `InvalidTransitionError`
- [ ] `edVisit.leave` outcome guards tested for each source phase
- [ ] Contract suite runs against **both** memory and Dexie (fake-indexeddb) adapters with identical results
- [ ] Contract: `seq` starts at 1 and is consecutive; events and changes commit together; a failing append writes nothing
- [ ] Contract: observables emit initial value, emit after each append, stop after unsubscribe
- [ ] Dexie: a second connection to the same database sees appended data
- [ ] `createBackend` rejects an unknown `VITE_DATA_BACKEND`
- [ ] Hooks update after an append and unsubscribe on unmount
- [ ] `DatabaseStatusCard` shows backend, schema version and live counts
- [ ] E2E: Ajustes shows "IndexedDB", "Versión del esquema: 1", "Eventos registrados: 0"; `torre-control` database exists

## Manual

- [ ] `npm run dev`, open Ajustes: card shows IndexedDB, schema v1, all counts 0; DevTools → Application → IndexedDB → `torre-control` lists all 13 tables with the indexes from `plan.md`
- [ ] `VITE_DATA_BACKEND=memory npm run dev`: card shows "Memoria (pruebas)"; no `torre-control` database is created
- [ ] `VITE_DATA_BACKEND=foo npm run dev`: the app shows a clear startup error instead of a blank page
- [ ] Card is readable in light and dark themes and at 1024×768 and 390 px
- [ ] Offline after first load: Ajustes still renders the card

## Copy Check

- [ ] All new visible text is Spanish, from `src/i18n/es.ts`; table labels use glossary terms (Camas, Unidades, Servicios, Pacientes, Episodios de Urgencias, Ingresos, Solicitudes de cama, Traslados, Celadores, Usuarios, Alertas, Simulación, Eventos)

## Architecture Check

- [ ] `src/domain/` imports nothing from React, Dexie, `src/data/adapters/` or `src/features/`
- [ ] Components and hooks never import Dexie or `src/data/adapters/` (only `createBackend.ts` / `DataProvider.tsx` do)
- [ ] No `Date.now()` / `new Date()` for "now" in `src/domain/` (clock implementations live in `src/data/adapters/clock/`)
- [ ] Every Dexie write goes through `EventStore.append` in a single transaction covering events + changed tables
- [ ] `db.version(1)` only; `SCHEMA_VERSION` matches
- [ ] `backlog/postgres-schema-draft.sql` covers every table
- [ ] `specs/domain.md` matches the schemas (event payloads, `AdmissionCancelled.reason`)
- [ ] Only `zod`, `dexie`, `fake-indexeddb` added; versions pinned

## Definition of Done

All automated checks pass, manual checks confirmed, Phase 2 items ticked in `specs/roadmap.md`, `CHANGELOG.md` updated, no leftover `console.log`, branch merged into `main`.
