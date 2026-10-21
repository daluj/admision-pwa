# Requirements: Event Store & Simulator Engine

**Roadmap phase:** 5 — Event Store & Simulator Engine
**Branch:** `phase-5-event-store-simulator`
**Status:** Draft — 2026-10-21

## Scope

Make the hospital come alive. Domain **commands** validate state-machine transitions and append events + state changes in one transaction. A **simulated clock** (persisted, shared across tabs) drives a **simulator runner** that plays the **"normal day"** scenario through those same commands. Controls live in the top bar; an event log viewer lives in Ajustes. A determinism test guarantees the same seed + scenario + duration ⇒ identical event sequence.

### Included

**1. Domain commands** (`src/domain/commands/`, pure functions → `CommandResult { events, changes }`; they read current state through a `CommandContext` and never touch an adapter)

| Area | Commands → events |
|---|---|
| ED | `registerEdArrival` → `EdPatientArrived`; `triageEdPatient` → `EdPatientTriaged`; `startEdAssessment` → `EdAssessmentStarted`; `decideAdmission` → `AdmissionDecided` + `BedRequested` (creates URGENT `Admission` in `AWAITING_BED` and an `OPEN` `BedRequest`); `registerEdDeparture` → `EdPatientLeft` (outcomes `DISCHARGED_HOME`, `LWBS`, `TRANSFERRED_OUT`, `DECEASED`, `ADMITTED`) |
| Beds | `reserveBed` → `BedReserved`; `releaseBedReservation` → `BedReservationReleased`; `admitPatient` → `PatientAdmitted`; `dischargePatient` → `PatientDischarged`; `startCleaning` / `finishCleaning` → `BedCleaningStarted` / `BedCleaningFinished`; `blockBed` / `unblockBed` → `BedBlocked` / `BedUnblocked`; `transferBetweenBeds` → `PatientTransferredBetweenBeds` |
| Admissions | `createScheduledAdmission` → `ScheduledAdmissionCreated`; `requestBedForScheduled` → `BedRequested`; `cancelAdmission` → `AdmissionCancelled`; `setExpectedDischarge` → `ExpectedDischargeSet`; `orderDischarge` → `DischargeOrdered` |
| Transfers | `requestTransfer` → `TransferRequested`; `assignTransfer` → `TransferAssigned` (porter becomes `BUSY`); `pickUpTransfer` → `TransferPickedUp`; `deliverTransfer` → `TransferDelivered` (porter `AVAILABLE`); `cancelTransfer` → `TransferCancelled` |
| Simulation | `startSimulation` / `pauseSimulation` / `setSimulationSpeed` → new events `SimulationStarted` / `SimulationPaused` / `SimulationSpeedChanged` |

- Every command: validates input with Zod, checks the state machine (`InvalidTransitionError` ⇒ nothing written), updates **every** affected entity (e.g. `reserveBed` changes Bed + BedRequest + Admission), uses `occurredAt` from the context clock, and returns ≥ 1 event.
- `executeCommand(backend, clock, command)` (in `src/domain/commands/execute.ts`, depends on the ports only): loads state, builds the result, calls `EventStore.append(events, changes, { expectedLastSeq })`; on `ConcurrencyError` retries (max 3) re-reading state.
- Event ids come from an injectable `IdGenerator` (`crypto.randomUUID` in the app, seeded PRNG in the simulator and tests).

**2. Simulated clock**
- `SimulationState.simNow` is the single source of simulated time. `createSimulationClock(repositories)` returns a `Clock` whose `now()` is synchronous (value cached from an `observe` subscription of `SimulationState`; falls back to the wall clock before the first value).
- `SimulationClockProvider` + `useSimulationClock()` in `src/features/simulation/`; `SimClock` in the top bar shows live `HH:mm` (Europe/Madrid) and the date on hover/sr-only.
- Wall clock (`backend.clock`) is unchanged: it is still what "Restablecer demo" uses to anchor 08:00 of the real current day.

**3. Simulator runner** (`src/simulator/runner/`)
- Tick loop every 250 ms wall time while `running`: advances `simNow` by `tickMs × speed`, then processes every **simulated minute** in `(lastProcessed, simNow]` in order. Per-minute randomness is `rng.fork(seed, minuteIndex, label)`, so the result does **not** depend on tick size or speed.
- Tick persistence: `simNow` writes go through `EventStore.append([], [put SimulationState])` — a documented exception to "events first" (it is the clock, not a domain fact; see `specs/domain.md`).
- **Single runner across tabs:** only the tab holding the Web Lock `torre-control-simulator` runs the loop (fallback when `navigator.locks` is missing: the tab that pressed Start). Other tabs just observe `simNow`.
- Speeds `1×, 10×, 60×, 300×`; Start / Pause; resumes after reload if `running` was true (the tab that acquires the lock continues from the stored `simNow`).
- A **headless mode** (`runSimulation({ backend, seed, scenario, fromAt, durationMs })`) steps minute by minute with no timers, for tests and the determinism check.

**4. Scenario "normal-day"** (`src/simulator/scenarios/normalDay.ts`)
Stateless policies evaluated each simulated minute against the current database state, with per-entity deterministic delays (so the scenario survives a reload and is replay-safe):

| Policy | Behaviour (defaults, data in `normalDay.config.ts`) |
|---|---|
| ED arrivals | Hour-of-day curve (peak 10:00–14:00 and 18:00–21:00), ~150–180 arrivals/day; triage level mix per Manchester shares from the seed spec; new synthetic patient (seeded names, `SIM-` MRN) |
| ED flow | Triage after 5–30 min (L1/L2 immediate); assessment after the Manchester-target-ish wait (85 % within target); outcome: ~22 % admit decision, ~75 % home, ~3 % LWBS |
| Bed management | A simulated bed manager reserves a matching bed (unit type, specialty, isolation) for each open request after 10–90 min when one is `AVAILABLE`; none free ⇒ request stays open (boarding grows) |
| Transfers | Reserve → `requestTransfer`; porters assigned after 2–15 min, pickup 3–12 min, delivery 5–20 min; patient admitted on delivery; `registerEdDeparture` (`ADMITTED`) at the same time |
| Scheduled admissions | The day's scheduled admissions (seeded 08:00–14:00) arrive, get a bed request, bed and transfer like urgent ones; ~10 % cancelled with `NO_BED` when no bed by their time + 3 h |
| Discharges | Inpatients with `expectedDischargeAt` get `orderDischarge` ~1–2 h before, `dischargePatient` at/after it (skewed 10:00–18:00); unset ones get an expected discharge from LOS-based chance |
| Cleaning | `PENDING_CLEANING` → `startCleaning` after 5–40 min, `finishCleaning` after 15–45 min (hospital turnaround ≈ 45–90 min) |
| Blocks | Rare random block (≤ 1/day) of an `AVAILABLE` bed with a reason, unblocked 2–8 h later |

- Guard rails: policies never throw on "no candidate" (skip the minute); a command rejected by a state machine is logged to `console.warn` and skipped (never crashes the runner).
- Only synthetic data is created (names from `src/simulator/random/names.ts`).

**5. UI**
- **Top bar:** `SimClock` shows live simulated time; for `ADMISSIONS_HEAD` only, `SimulationControls` (Play/Pause + speed select 1×/10×/60×/300×). Others see the clock read-only. Roles use `useSession().user.role`.
- **Ajustes → "Registro de eventos"** (`ADMISSIONS_HEAD`, the whole Ajustes page already is): table of the latest events (seq, simulated time, type, entity, actor, short payload) with filters by event type (multi-select), entity type and time window (last 1 h / 6 h / 24 h / all), "cargar más" pagination (50 per page), live-updating at the top; accessible table; empty state.

**6. Determinism test** — `runSimulation` twice on fresh memory backends with the same seed/scenario/duration (e.g. 6 simulated hours from the seeded 08:00) ⇒ deep-equal event sequences (type, occurredAt, entityId, payload, id) and identical final tables. Also: result is identical when the same duration is run in different tick sizes.

### Not included

- Alert engine, alert bell content (Phase 12); KPI calculators (Phases 6–9); dashboards consuming the events.
- Scenario selector and other scenarios (Phase 13); time-lapse / jump to time (Phase 13). The scenario is fixed to `normal-day`.
- Reservation/porter-assignment UI actions for humans (Phases 7, 10): commands exist, UI does not use them yet.
- Web Worker execution; event-log export.

### Routes / roles

| Item | Access |
|---|---|
| Simulation controls (top bar) | `ADMISSIONS_HEAD` only |
| Simulated clock (top bar) | all roles (read-only) |
| Event log (Ajustes) | `ADMISSIONS_HEAD` (Ajustes route guard) |

## Decisions

- **Persisted simulated time + tick loop** (not a pre-generated schedule, not per-tab clock): survives reload, works with a wall-display tab (cross-tab live queries) and keeps the scenario reactive to state (e.g. no free bed ⇒ boarding grows).
- **Stateless minute-based policies with per-entity deterministic randomness** instead of an in-memory event queue: nothing is lost on reload, results are independent of tick size/speed, and determinism is testable.
- **Commands are pure; `executeCommand` owns persistence** with optimistic concurrency (`expectedLastSeq`) so two writers (simulator + a human action in another tab) cannot interleave silently.
- **Clock ticks are not events.** Only control actions (start/pause/speed) are. Documented exception in `specs/domain.md`.
- **Three new event types** (`SimulationStarted`, `SimulationPaused`, `SimulationSpeedChanged`) → `data-model-change` skill (Zod, `specs/domain.md`, draft SQL CHECK). No new entity, **no Dexie version bump** (event-log filters run in memory over the newest page; revisit indexes in Phase 14).
- Wall clock vs simulation clock stay separate so reset anchoring is unaffected.
- No new dependencies (Web Locks API is native).

## Context

- Ports: `src/data/ports/eventStore.ts` (`append`, `expectedLastSeq`, `ConcurrencyError`), `src/data/ports/clock.ts`; existing command pattern `src/domain/commands/resetDemo.ts`; state machines in `src/domain/state-machines/`.
- Seed/PRNG: `src/simulator/random/prng.ts` (`createRng`, `fork`, `uuid`), `src/simulator/seed/`.
- UI: `src/components/layout/SimClock.tsx` (currently static `08:00`), `TopBar.tsx`, `src/features/settings/` (cards pattern: `DemoDataCard`), `dashboard-widget` skill for the log table.
- Domain reference: `specs/domain.md` → State Machines, Events, Event payloads.
- Demo story: log in as Jefe/a de Admisión → press ▶ at 60× → within a minute the event log fills (arrivals, triage, reservations, transfers, discharges, cleaning); a second tab shows the same clock and log live; reload keeps the time; Pause stops it.
