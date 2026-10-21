# Validation: Patient Journey Tracking

## Automated
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [ ] `searchPatients`: NHC and name, accents/case, multiple words, minimum length, limit, ranking, unit scope fails closed
- [ ] `buildJourney`: ED-only, ED → admission → discharge, scheduled, cancelled, with transfers; step order, durations, current step, next step/ETA per state; patient without events
- [ ] Search page: typing, results, empty states; journey page: header, timeline states (done/current/upcoming), previous episodes
- [ ] Deep links present for roles with access and absent for others; nurse supervisor cannot open a patient outside their unit
- [ ] E2E: search by NHC → journey; link from a dashboard row
## Manual
- [ ] Simulator at 60×: follow one patient from ED arrival to a bed; timeline and "current" update live
## Copy / Architecture
- [ ] Strings from `es.ts`; logic in `src/domain/kpis`; no adapter imports; no wall clock; no new dependencies
## Definition of Done
All ticked, roadmap Phase 11 ticked, CHANGELOG, merged.
