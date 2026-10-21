# Validation: Control Tower Overview & Alerts

## Automated
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [x] Every rule: candidates at/over/under the threshold (strict), severity levels, params; `diffAlerts` raise / resolve / escalate / unchanged; no duplicates
- [x] `evaluateAlerts` writes `AlertRaised` / `AlertResolved` atomically and is a no-op when nothing changed; `acknowledgeAlert` records who/when and rejects resolved or already acknowledged alerts
- [x] `computeStatusLevel`: each trigger, highest wins, boundaries, custom thresholds
- [x] Bell count and colour; centre filters, acknowledge, role/unit visibility (supervisor fails closed, porter cannot acknowledge)
- [x] Overview tiles, top exceptions order and links; wall mode rotation, pause, keys, role-filtered slides
- [x] Thresholds form validation, persistence across reload, restore defaults, evaluator uses new values
- [x] E2E: alert appears while the simulation runs and can be acknowledged; wall mode rotates and exits; thresholds saved
## Manual
- [x] Simulator at 60×: alerts raise and resolve, the bell and the status level follow; wall mode on a large viewport
## Copy / Architecture
- [x] Strings from `es.ts`; logic in `src/domain/alerts`; no adapter imports; no wall clock; no new dependencies
## Definition of Done
All ticked, roadmap Phase 12 ticked, CHANGELOG, merged.
