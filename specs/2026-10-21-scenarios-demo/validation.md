# Validation: Scenarios & Demo Mode

## Automated
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [ ] Normal day identical to before (existing simulator tests untouched and green); tuning applied by each policy
- [ ] Same seed + scenario ⇒ same events regardless of tick size; different scenarios ⇒ different days
- [ ] Over a simulated day: `high-pressure` more boarders / higher occupancy than `normal-day`; `winter-flu` more than `high-pressure`; snapshot invariants hold for all three
- [ ] Reset with a scenario sets `scenarioId` and its starting profile; selector offers the three
- [ ] Speed 1800 accepted by schema, command and menu; `jumpToTimeOfDay`: next occurrence (same day / next day), pauses at the end, abortable, never goes back
- [ ] E2E: demo script test follows `docs/demo-script.md`
## Manual
- [ ] Run each scenario at 300× for a simulated day; watch alerts and status level; fast-forward to 14:00
## Copy / Architecture
- [ ] Strings from `es.ts`; simulator imports only allowed layers; no wall clock in simulator; no new dependencies
## Definition of Done
All ticked, roadmap Phase 13 ticked, CHANGELOG, merged.
