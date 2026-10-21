# Plan: Patient Journey Tracking

## Group 1: Domain
1. `src/domain/kpis/journey.ts`: `searchPatients` (normalised prefix match, scope, ranking, limit), `buildJourney` (episodes, steps with state/time/duration, current location/status, next step + ETA), status helpers; `specs/domain.md` definitions; tests on fixtures (ED→admission→discharge, scheduled, cancelled, transfers, no-event patient).
## Group 2: Hooks
2. `useJourneySearch(query)` and `useJourney(patientId)` (hooks → pure functions; unit scope for nurse supervisors, fail closed), tests.
## Group 3: UI
3. `TrackingPage` (search + results), `JourneyPage` (`/seguimiento/:patientId`, sub-page under the `tracking` guard), `JourneyHeader`, `JourneyTimeline`, `NextStepCard`, `PreviousEpisodes`; strings in `es.ts`; tests.
## Group 4: Deep links
4. `JourneyLink` component (shown only when the role can open Seguimiento); add to ED board/boarding, bed sheet, bed requests, transfer queue, discharge worklist, scheduled table; tests.
## Group 5: Roles, e2e, docs
5. Scope tests (supervisor), `e2e/tracking.spec.ts`, README, ux-guidelines note on the exception.
