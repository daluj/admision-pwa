# simulator

Synthetic hospital: seeded PRNG, demo seed, and (from Phase 5) scenarios, simulated clock and runner. Same seed ⇒ same hospital / event sequence.

- `random/` — `createRng(seed)` (mulberry32: `int`, `pick`, `weighted`, `shuffle`, `uuid`, `fork`) and fictitious Spanish names.
- `seed/hospital.ts` — **the hospital profile (data only)**: specialties, units, bed counts, porters and live-state targets. Real figures replace this file, not code.
- `seed/generate*.ts` — pure generators: structure → census → ED & flows → `generateHospital({ seed, anchorAt })`.
- `seed/seedDemo.ts` — `ensureDemoSeeded` (first launch) and `resetDemo` ("Restablecer demo"), via the `resetDemo` domain command.
- `clock/` — `createSimulationClock`: a synchronous `Clock` that follows `SimulationState.simNow` (wall-clock fallback before seeding).
- `runner/` — the engine. `advanceSimulationTo` plays whole simulated minutes (randomness depends only on seed + minute, so tick size/speed never change the result) and persists `simNow` after each; `createSimulationRunner` is the 250 ms tick loop (reads running/speed/seed every tick); `runAsLeader` keeps a single runner across tabs with a Web Lock; `runSimulation` is the headless variant for tests.
- `scenarios/` — a `Scenario` is `step(ctx)` per simulated minute. `normalDay.ts` composes policies (`policies/*`: ED arrivals/flow, bed assignment, transfers, scheduled admissions, discharges, cleaning, blocks) that act **only through domain commands** via `ctx.exec` (a rejected command is logged and skipped). All numbers live in `normalDay.config.ts`. Per-entity randomness (`entityRandom.ts`) keeps delays stable across reloads.
- **Scenarios (Phase 13)** — `scenarios/definitions.ts` is data: `normal-day`, `high-pressure`, `winter-flu`, each a `ScenarioTuning` (how the policies bend; read through `ctx.tuning`, default = normal day) plus a starting `HospitalProfile` (the 08:00 snapshot; structure is identical). `createScenario(id, tuning)` makes the scenario; `resetDemo(backend, seed, profile?, scenarioId)` loads the matching hospital and sets `SimulationState.scenarioId`. `runner/jump.ts` (`jumpToTimeOfDay`, `nextTimeOfDay`) fast-forwards headlessly to the next HH:MM (Madrid) in cancellable chunks over `advanceSimulationTo`; the caller pauses the run first. Speed 1800× plays a day in about a minute.
- `stateInvariants.ts` — cross-entity link rules (bed ↔ admission ↔ request ↔ porter) used by tests after any run.
- `index.ts` — public API; the only entry point other layers may import.

**May import:** `src/domain/` (commands, schemas), `src/data/ports/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, React. Never `Math.random()` or the system time: use `Rng` and the `Clock` port (the runner receives a monotonic timer from its caller).

Known limitation: `simNow` ticks are plain state writes, so a human control command racing a tick can rewind the clock by one tick; the runner skips already-played minutes, which keeps the result consistent.

Writes only through domain commands, exactly as a future HIS integration would. Synthetic data only — never real patients, staff or identifiers.
