# Validation: Event Store & Simulator Engine

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with no warnings
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` exits 0

### Specific coverage required

- [ ] New simulation events: valid/invalid payloads; event list matches `specs/domain.md`
- [ ] `executeCommand`: appends events + changes in one call, retries on `ConcurrencyError`, a rejected command writes nothing
- [ ] Every command: happy path updates all affected entities and emits the documented event(s); invalid transition rejected; `occurredAt` from the clock
- [ ] Command chain (ED arrival → admit decision → bed reserved → transfer → admitted → discharge → cleaning) keeps `snapshotInvariants` valid
- [ ] Simulated clock follows `simNow`, wall-clock fallback before seeding
- [ ] Runner: advances by `speed × tick`, pause/resume, speed change, only the lock holder ticks, resumes after reload
- [ ] Minute processing is independent of tick size and speed
- [ ] Each scenario policy: delays, matching rules, no overbooking, no rejected commands
- [ ] 24 simulated hours: invariants hold, occupancy 70–100 %, expected event types appear
- [ ] **Determinism:** same seed + scenario + duration ⇒ identical event sequence and final tables; different seed ⇒ different
- [ ] Controls visible only to `ADMISSIONS_HEAD`; Play/Pause/speed emit the control events
- [ ] Event log: filters (type, entity, window), pagination, live update, empty state
- [ ] E2E: Play at 60× → clock and log advance; Pause stops; reload keeps time; second tab follows; non-head roles have no controls

## Manual

- [ ] Fresh profile → log in as Jefe/a de Admisión → ▶ at 60×: log fills with plausible events within ~1 min; clock moves 1 simulated hour per real minute
- [ ] 300× for 2 minutes: no UI freeze > 300 ms, no console errors; Pause stops immediately
- [ ] Reload while running: simulation resumes from the stored time (no jump back, no duplicates in the log)
- [ ] Two tabs: clock and log update in both; only one tab produces events (check `seq` has no gaps/duplicates)
- [ ] "Restablecer demo" while running: simulation stops, clock returns to 08:00, log shows only `DemoSeeded`
- [ ] Event log readable on 1024 px and 390 px; light/dark; keyboard-only filters and pagination
- [ ] After 24 simulated hours ED has boarding patients, beds cycle through cleaning, discharges concentrate in the morning/afternoon (spot-check via the log and Ajustes table counts)

## Copy Check

- [ ] All new strings in `src/i18n/es.ts`; event type labels in Spanish; speed labels "1×, 10×, 60×, 300×"; "acceso" roles unchanged

## Architecture Check

- [ ] Commands are pure and live in `src/domain/commands/`; no Dexie / adapter imports in domain, simulator or UI
- [ ] Every state change appends a `HospitalEvent` in the same transaction; only `advanceSimulation` writes state without an event (documented)
- [ ] No `Date.now()` / `new Date()` for "now" in `src/domain/` or `src/simulator/` (wall clock only via the `Clock` port)
- [ ] No schema change or Dexie version bump; no new dependencies

## Definition of Done

All boxes ticked, roadmap Phase 5 items ticked by `ship-feature`, CHANGELOG updated, branch merged and deleted.
