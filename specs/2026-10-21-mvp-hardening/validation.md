# Validation: MVP Hardening

## Automated
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [ ] `npm run perf` baseline recorded below; budgets met
- [ ] Shared subscriptions: one upstream query per table/limit for many components; released when idle; value delivered to late subscribers
- [ ] Error boundary: a crashing page shows the Spanish error inside the layout; "Reintentar" recovers; a crash outside routes shows the global fallback
- [ ] Axe: zero violations (A/AA) on every page for every role, light and dark
- [ ] Keyboard flows: skip link, nav, bell → centre → acknowledge, sheet focus return, wall keys
- [ ] Offline: every route loads offline after one visit
## Manual
- [ ] **NEEDS HUMAN:** install on Chrome/Edge desktop and iPad Safari following `docs/install-and-offline.md`
- [ ] 1800× run for a few simulated days on the pressure scenario: no visible jank, bell and status level stay responsive
## Copy / Architecture
- [ ] Strings from `es.ts`; no adapter imports in UI; only dependency added: `@axe-core/playwright` (dev)
## Definition of Done
All ticked (NEEDS HUMAN items reported), roadmap Phase 14 ticked, CHANGELOG, merged, tag `v0.1.0-mvp`.

## Performance baseline (filled in during implementation)
