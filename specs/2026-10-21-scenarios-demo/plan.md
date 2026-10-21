# Plan: Scenarios & Demo Mode

## Group 1: Scenario engine
1. `ScenarioTuning` + `NORMAL_TUNING`, `scale()` helper; thread an optional tuning through the eight policies (default = normal ⇒ existing tests unchanged).
2. `definitions.ts`: `SCENARIO_DEFINITIONS` (id, tuning, profile overrides); `createScenario`; registry serves all three; `generateHospital`/`resetDemo` take the scenario (profile + `scenarioId`); tests (determinism, defaults unchanged, pressure ordering over a simulated day, snapshot invariants per scenario).
## Group 2: Time-lapse
3. Speed 1800 (schema, domain.md, command, controls); `jumpToTimeOfDay` helper (next occurrence, abortable, progress callback) + tests; performance check of a simulated day.
## Group 3: UI
4. Scenario selector in the demo card (strings, tests); "Avance rápido" card with presets and progress/cancel; clock tooltip shows the scenario.
## Group 4: Demo script
5. `docs/demo-script.md`; `e2e/demo-script.spec.ts`; READMEs.
