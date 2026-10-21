# Plan: Control Tower Overview & Alerts

## Group 1: Domain
1. `Alert.params` + `AlertRaised.params` (data-model-change: Zod, `specs/domain.md`, tests).
2. `src/domain/alerts/config.ts` (`AlertConfig`, defaults, validation), `rules.ts` (`alertCandidates`), `diff.ts` (`diffAlerts`), `status.ts` (`computeStatusLevel`); tests.
3. Commands `evaluateAlerts`, `acknowledgeAlert` (+ `canAcknowledgeAlert` in `access.ts`); tests.
## Group 2: Data and host
4. `useAlerts`, `useAlertConfig` (localStorage + storage event), `useStatusLevel`, `AlertEvaluatorHost` (leader tab), tests.
## Group 3: Bell, centre, status badge
5. `AlertBell` with count, `AlertCentre` sheet (filters, acknowledge), `StatusLevelBadge` live; strings; tests.
## Group 4: Overview
6. `OverviewPage` (`computeOverview` pure: tiles, top exceptions, 24 h series), tests.
## Group 5: Wall mode
7. `/pantalla` route, `WallLayout`/`WallPage` (rotation, pause, keys, fullscreen), entry point, tests.
## Group 6: Settings, e2e, docs
8. `ThresholdsCard` in Ajustes; `e2e/control-tower.spec.ts`; READMEs; roadmap/spec notes.
