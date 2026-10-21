# Plan: Event Store & Simulator Engine

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-5): group K – <name>`. Group 1 follows the `data-model-change` skill; UI groups follow `dashboard-widget` and `specs/ux-guidelines.md`. Specs/domain.md changes are made in group 1.

## Group 1: Simulation Events & Command Infrastructure

1. `src/domain/schemas/events.ts`: add `SimulationStarted`, `SimulationPaused`, `SimulationSpeedChanged` (`{ speed }`, entity `SimulationState`/`current`); update event-count tests and samples.
2. `specs/domain.md`: add the 3 events (Events table + payloads), the "clock ticks are not events" exception and the simulation commands note; `backlog/postgres-schema-draft.sql`: extend the `events.type` CHECK.
3. `src/domain/commands/types.ts`: `CommandContext` (`now`, `newId`, read accessors `get/list` per entity), `CommandInput` helpers, `IdGenerator`, reuse `InvalidCommandError` for unknown ids / invalid input (invalid transitions keep throwing `InvalidTransitionError`); commands are `async (ctx, input) => CommandResult` reading state through `ctx.repositories`.
4. `src/domain/commands/execute.ts`: `executeCommand(deps, command)` with load → build → `append(..., { expectedLastSeq })` → retry ≤ 3 on `ConcurrencyError`; `src/test/commandHarness.ts` helper (domain must not import adapters) to run a command against the memory backend with a fixed clock and counter ids.
5. Tests: retry on concurrency, rejected transition writes nothing, result events validate against the event schemas.

## Group 2: ED & Bed Commands

6. `src/domain/commands/ed.ts`: `registerEdArrival`, `triageEdPatient`, `startEdAssessment`, `decideAdmission`, `registerEdDeparture`.
7. `src/domain/commands/beds.ts`: `reserveBed`, `releaseBedReservation`, `admitPatient`, `dischargePatient`, `startCleaning`, `finishCleaning`, `blockBed`, `unblockBed`, `transferBetweenBeds`.
8. Tests per command: happy path (events + every changed entity), invalid transition rejected, field consistency (e.g. `triagedAt`, `admitDecisionAt`, `statusChangedAt`, bed ↔ admission ↔ bed request links), unknown ids rejected.

## Group 3: Admission & Transfer Commands

9. `src/domain/commands/admissions.ts`: `createScheduledAdmission`, `requestBedForScheduled`, `cancelAdmission`, `setExpectedDischarge`, `orderDischarge`.
10. `src/domain/commands/transfers.ts`: `requestTransfer` (SLA from priority: URGENT 10 min / NORMAL 30 min), `assignTransfer`, `pickUpTransfer`, `deliverTransfer`, `cancelTransfer`; porter status updates; admission `IN_TRANSFER` on assign/pickup per the admission machine.
11. `src/domain/commands/index.ts` exports; tests as in group 2 plus an end-to-end command chain (ED arrival → … → discharge → cleaning) leaving consistent state (reuse `src/simulator/seed/snapshotInvariants.ts`).

## Group 4: Simulated Clock & Control Commands

12. `src/domain/commands/simulation.ts`: `startSimulation`, `pauseSimulation`, `setSimulationSpeed` (emit control events; update `SimulationState`), plus `advanceSimulation` (state-only `put` of `simNow`, no event — the documented exception).
13. `src/simulator/clock/simulationClock.ts`: `createSimulationClock(repositories)` (cached `simNow`, wall-clock fallback, `dispose`).
14. `src/features/simulation/SimulationClockProvider.tsx` + `useSimulationClock.ts`, `useSimulationState` hook already exists in `src/data/hooks`.
15. Tests: control commands, speed validation, clock follows `simNow` updates and cross-subscription, fallback before seeding.

## Group 5: Runner

16. `src/simulator/runner/minuteStep.ts`: processes simulated minutes `(from, to]` calling scenario policies with `rng.fork(seed, minuteIndex, label)`.
17. `src/simulator/runner/runner.ts`: tick loop (250 ms), start/stop, resumes from stored state, writes `simNow` via `advanceSimulation`; `src/simulator/runner/leader.ts`: Web Locks leader with fallback.
18. `src/simulator/runner/runSimulation.ts`: headless `runSimulation({ backend, seed, scenario, fromAt, durationMs })` using memory backend + `createFixedClock`/simulated clock.
19. Tests with fake timers: advances `simNow` by `speed × tick`, pause stops, speed change applies, only the lock holder runs (mock `navigator.locks`), resume after "reload".

## Group 6: Scenario "normal-day"

20. `src/simulator/scenarios/normalDay.config.ts` (data: hourly arrival curve, shares, delays, probabilities) and `normalDay.ts` composing policies: `edArrivals`, `edFlow`, `bedAssignment`, `transfersFlow`, `scheduledAdmissions`, `discharges`, `cleaning`, `bedBlocks` (one file each under `src/simulator/scenarios/policies/`).
21. Synthetic patient generation for arrivals reusing `names.ts`/PRNG (unique `SIM-` MRN).
22. Tests per policy on small fixtures (deterministic with a fixed seed): delays respected, occupancy never exceeds capacity, no command rejections, bed matching (unit type/specialty/isolation).
23. Integration: run 24 simulated hours from the seeded 08:00 (memory backend): `snapshotInvariants` hold at the end, occupancy stays 70–100 %, > 100 events, every event type of the normal flow appears, no `console.warn` from rejected commands.

## Group 7: UI — Controls & Clock

24. `src/i18n/es.ts`: `simulation` strings (play, pause, speed labels, "Hora simulada", running/paused status).
25. `SimClock.tsx` reads `useSimulationClock()`; `src/features/simulation/SimulationControls.tsx` (Play/Pause icon button with `aria-pressed`, speed `DropdownMenu`/select) shown for `ADMISSIONS_HEAD`; `TopBar.tsx` wiring; start the runner from the provider in `main.tsx`/`App.tsx` (ports & adapters respected).
26. Component tests: controls visible only for the head; click Play emits `SimulationStarted`; speed change emits `SimulationSpeedChanged`; clock updates when `simNow` changes; other roles see read-only clock.

## Group 8: Event Log Viewer

27. `src/data/hooks`: `useEvents({ afterSeq?, limit })` if needed on top of `observeRecent`; page/filters state in the feature.
28. `src/features/settings/components/EventLogCard.tsx` (+ `EventLogFilters.tsx`, `eventSummary.ts` to render short payload text): filters by type, entity type, time window; "Cargar más"; empty and loading states; `Settings` page integration; Spanish labels for event types in `es.ts`.
29. Tests: filtering logic (pure), rendering, live row on append, pagination.

## Group 9: Determinism, E2E & Docs

30. `src/simulator/determinism.test.ts`: same seed/scenario/duration ⇒ identical events and tables; different tick sizes ⇒ identical; different seed ⇒ different.
31. `e2e/simulation.spec.ts`: login as head, press Play at 60×, event log gains rows and clock advances; Pause stops; reload keeps simulated time; second tab shows the same clock; non-head roles see no controls.
32. READMEs (`src/domain`, `src/simulator`, `src/features`), `specs/tech-stack.md` note on Web Locks if needed.
