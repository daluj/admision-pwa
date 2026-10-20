# Validation: Synthetic Hospital Seed

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with no warnings
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` exits 0

### Specific coverage required

- [ ] `DemoSeeded` schema: valid and invalid payloads; event list matches `specs/domain.md`
- [ ] `zonedDayAt` correct across both DST changes and near midnight UTC
- [ ] Contract: `expectedLastSeq` mismatch rejects with `ConcurrencyError` and writes nothing (both adapters)
- [ ] Contract: `reset` wipes all tables + events, restarts `seq` at 1, is atomic (failed reset keeps old data), observers emit
- [ ] PRNG: deterministic, bounds, weights, `fork` independence, UUIDs valid
- [ ] Structure: ~600 inpatient beds, referential integrity, unique labels, capacity = bed count, users per role
- [ ] Census/ED invariants on several seeds (occupancy 83–87 %, bed ↔ admission ↔ patient consistency, boarding ↔ requests, reserved beds, phase/field consistency, timestamps vs anchor)
- [ ] Every generated record passes its Zod schema
- [ ] Determinism: same seed + anchor ⇒ identical snapshot; +1 day ⇒ only timestamps shift by 24 h
- [ ] `ensureDemoSeeded`: seeds once, idempotent, concurrent calls ⇒ one seed (memory + Dexie)
- [ ] `resetDemo`: replaces everything, `lastSeq` = 1, same seed ⇒ same data
- [ ] `DemoDataCard`: current seed, validation, confirm/cancel, busy state, toasts
- [ ] E2E: first load seeded; reset with seed 7 updates a second tab; reset to 42 restores the original counts

## Manual

- [ ] Fresh browser profile: open the app → Ajustes shows ~600 camas, ~550 pacientes, 1 evento without any action
- [ ] Reload: still 1 evento (no re-seed); DevTools → IndexedDB shows realistic rows (Spanish names, `SIM-` MRNs, bed labels like `512-A`)
- [ ] "Restablecer demo" with seed 7 → confirmation dialog → toast → counts change; with 42 → original counts back
- [ ] Two tabs open: reset in one, the other updates within ~1 s
- [ ] Reset completes in under 2 s on a laptop; no UI freeze longer than ~300 ms
- [ ] Keyboard only: seed field, button, dialog (focus trapped, Escape cancels)
- [ ] Light/dark, 1024×768 and 390 px: card readable, no horizontal scroll
- [ ] `VITE_DATA_BACKEND=memory`: seeds on every load, reset works

## Copy Check

- [ ] All new text Spanish, from `src/i18n/es.ts`; dates `dd/MM/yyyy HH:mm` in 24 h
- [ ] Seeded names are generic/fictitious; no real staff, patients, hospital or SERMAS identifiers

## Architecture Check

- [ ] Simulator code imports only `src/domain/`, `src/data/ports/`, `src/lib/` (no Dexie, no adapters, no React)
- [ ] Seed writes only via the `resetDemo` command → `EventStore.reset` / `append` (one `DemoSeeded` event per seed)
- [ ] No `Date.now()` / `new Date()` for "now" in `src/domain/` or `src/simulator/` (anchor from `Clock`)
- [ ] Hospital structure lives only in `src/simulator/seed/hospital.ts`
- [ ] No Dexie version bump; `specs/domain.md` and Postgres draft updated for `DemoSeeded`
- [ ] No new npm dependencies

## Definition of Done

All automated checks pass, manual checks confirmed, Phase 3 items ticked in `specs/roadmap.md`, `CHANGELOG.md` updated, no leftover `console.log`, branch merged into `main`.
