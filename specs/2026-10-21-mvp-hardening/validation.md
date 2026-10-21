# Validation: MVP Hardening

## Automated
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [x] `npm run perf` baseline recorded below; budgets met
- [x] Shared subscriptions: one upstream query per table/limit for many components; released when idle; value delivered to late subscribers
- [x] Error boundary: a crashing page shows the Spanish error inside the layout; "Reintentar" recovers; a crash outside routes shows the global fallback
- [x] Axe: zero violations (A/AA) on every page for every role, light and dark
- [x] Keyboard flows: skip link, nav, bell → centre → acknowledge, sheet focus return, wall keys
- [x] Offline: every route loads offline after one visit
## Manual
- [ ] **NEEDS HUMAN:** install on Chrome/Edge desktop and iPad Safari following `docs/install-and-offline.md`
- [x] 1800× run for a few simulated days on the pressure scenario: no visible jank, bell and status level stay responsive
## Copy / Architecture
- [x] Strings from `es.ts`; no adapter imports in UI; only dependency added: `@axe-core/playwright` (dev)
## Definition of Done
All ticked (NEEDS HUMAN items reported), roadmap Phase 14 ticked, CHANGELOG, merged, tag `v0.1.0-mvp`.

## Performance baseline (filled in during implementation)

Memory backend, pressure scenario, 7 simulated days (`npm run perf`, laptop): 600 beds, 11,653 events, 2,104 patients, 1,046 admissions, 1,440 ED visits. Loading all tables 24 ms; census 17 ms, ED 1.3 ms, admissions 14.6 ms, transfers 3.3 ms, alerts 36.3 ms, overview 35.2 ms — every calculator under the 50 ms budget, the five together ≈ 72 ms (< 150 ms).

Real browser (Chromium headless, IndexedDB, pressure scenario at 1800× for 40 s): **0 long tasks (> 50 ms)** and 50 fps on the main thread, but the runner only reaches **≈ 0.09 simulated hours per second** (a day in 4–5 minutes): the limit is the per-minute IndexedDB round trips, not the UI. Documented in `docs/known-limitations.md`; an optimisation (batching the world reads per tick) is a candidate for Phase 16.

Accessibility (axe, WCAG 2.0/2.1 A+AA, light and dark, every page of every role + overlays + login): found and fixed — focusable chart surfaces under `aria-hidden` (Recharts `accessibilityLayer`), user-menu accessible name not containing its visible text, bell count drawn as text outside its accessible name. Zero violations now; no rule disabled.
