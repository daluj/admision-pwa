# Requirements: Scenarios & Demo Mode

**Roadmap phase:** 13 — Scenarios & Demo Mode
**Branch:** `phase-13-scenarios-demo`
**Status:** Complete — 2026-10-21

> Autonomous run (phases 13–14): no interview; the "Recommended" options of earlier interviews were applied. Choices are listed under **Decisions**.

## Scope

A repeatable, compelling demo: three scenarios, a fast-forward to watch a whole day, and a guided script that is also a test.

### Included

**1. Scenarios**
- `normal-day` "Martes normal" (existing behaviour, unchanged), `high-pressure` "Lunes de alta presión", `winter-flu` "Pico de gripe (plan de invierno)".
- A scenario = **tuning** (how the minute-by-minute policies behave: arrivals multiplier, admit share, doctor throughput, bed-manager / porter / cleaning / discharge speed, discharge slip, blocks per day) + a **starting profile** (the 08:00 snapshot: occupancy, ED load, boarders, blocks). Both are data (`src/simulator/scenarios/definitions.ts`), policies keep acting only through domain commands.
- Defaults tuned so that, over a simulated day, `high-pressure` reaches status ALERT (occupancy ≥ 92 % and/or boarding) and `winter-flu` reaches CRITICAL with several alerts, while `normal-day` stays calm.
- Determinism kept: same seed + scenario ⇒ same event sequence regardless of speed.
- Ajustes → Datos de demostración: a **scenario selector** next to the seed; "Restablecer demo" loads the hospital of that scenario and sets `SimulationState.scenarioId`. The current scenario is shown there and in the top bar tooltip of the clock.

**2. Time-lapse**
- New speed **1800×** (the ceiling: measured in Phase 14, a laptop with IndexedDB plays ≈ 0.09 simulated hours per second, i.e. a day in 4–5 minutes). `SIMULATION_SPEEDS = 1, 10, 60, 300, 1800`.
- **Jump to a time of day** (Ajustes → card "Avance rápido", and the simulation menu in the top bar): choose HH:MM (Europe/Madrid) and "Avanzar" — the simulator plays the minutes up to the next occurrence of that time headlessly (pauses the run, shows progress, can be cancelled), then stays paused there. Same code path as the runner (`advanceSimulationTo`), so results are identical to watching it.
- Preset buttons: 10:00, 14:00, 20:00, 08:00 (next day).

**3. Guided demo**
- `docs/demo-script.md`: a 6–8 minute walkthrough in Spanish for presenting to the hospital (what to open, what to say, what to click) per role and scenario.
- `e2e/demo-script.spec.ts`: a Playwright test that follows the script's steps end to end (reset to the pressure scenario, fast-forward, overview status, alerts, ED board, bed assignment, transfers, journey, wall mode) so the script cannot rot.

### Not included
- Editing scenarios in the UI; new events or entities; real data; per-scenario alert thresholds; sound/voice-over; scenario-specific dashboards.

### Routes / roles
Everything is in Ajustes (head only) plus the existing simulation menu (head only). No new routes.

## Decisions (autonomous)
- Scenarios are **data over the same policies** (a `ScenarioTuning` threaded as an optional argument, default = normal day), not copies of the code: one place to read behaviour, tests of the normal day keep their meaning.
- The starting snapshot differs per scenario through `HospitalProfile.targets` overrides; the structure (units, beds) is identical so dashboards and tests do not depend on the scenario.
- `SimulationState.scenarioId` already exists; unknown ids make the runner idle (existing behaviour), the selector only offers registered scenarios.
- Jump-to is a runner-level helper over `advanceSimulationTo` with an abort signal, not a new domain command: the clock advance stays the documented state-only exception; pausing is the existing `SimulationPaused` event.
- The demo script test is a smoke test of the flow (headings, counts > 0), not pixel checks.
- `ScenarioTuning` reaches the policies through `ctx.tuning` (set from `Scenario.tuning` by `processMinute`) instead of an extra argument: policies keep their signatures and the normal day is byte-identical.
- When the seed is unchanged a reset keeps the session (same simulated users); with another seed the demo returns to the login.
- No new dependencies.

## Context
`src/simulator/**` (policies, runner, seed), `specs/domain.md` → Synthetic Hospital and Events, Phase 12 alerts/overview/wall mode, `e2e/` helpers.
