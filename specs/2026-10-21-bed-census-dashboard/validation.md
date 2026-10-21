# Validation: Bed Management — Census Dashboard

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0 with no warnings
- [x] `npm test` exits 0
- [x] `npm run build` exits 0
- [x] `npm run test:e2e` exits 0

### Specific coverage required

- [x] Census KPIs on fixtures: counts per status, occupancy excludes blocked beds, zero-bed unit, expected discharges today (local-day boundaries incl. DST), completed today, outliers (ward only, specialty rules)
- [x] Exceptions: blocked > 72 h, unit occupancy thresholds, outliers; severity → age order
- [x] `patientInitials`, `formatDuration`, `formatRelativeDay`
- [x] `useSimNow` and the new data hooks
- [x] `KpiTile`, `KpiStrip`, `StatusBadge`, `DurationText`, `ExceptionList`: status colour + text, empty/limit/expand
- [x] Filters: apply to KPIs, exceptions and grid; persisted per user; storage failures tolerated
- [x] Census page with a seeded fixture: KPI values, unit cards, links
- [x] Bed tile per status; initials only on the face; full identity only in the detail
- [x] Routing: `/camas/:unitCode`, unknown code state, supervisor redirects (own unit only), roles
- [x] E2E: KPIs and grid, filter, bed map, simulator changes a value, supervisor scope

## Manual (simulator at 60×)

- [x] Fresh profile → `/camas`: occupancy ≈ 85 %, ~19 unit cards, ~600 beds in total; KPI numbers match the unit cards
- [ ] Start the simulator: free beds, pending cleaning and expected discharges move; no flicker or layout jump; bed tiles update in place
- [x] Filter by building / "UCI" / a specialty: KPIs, exceptions and grid agree; reload keeps the filters
- [x] Open a ward: tiles show initials, LOS and expected discharge; hover/focus shows full name and NHC; a blocked bed shows its reason; outlier marker appears
- [x] Back button, deep link to `/camas/<code>`, unknown code
- [x] Nurse supervisor: lands on own unit; other unit URL redirects; KPIs are the unit's
- [ ] 1920×1080, 1280×800, 1024×768 and 390×844; light/dark; no horizontal scroll; keyboard-only navigation of cards and tiles
- [ ] Performance: with 600 beds at 300× no visible jank (UI stays responsive)

## Copy Check

- [x] All strings from `src/i18n/es.ts`; bed status names match `specs/domain.md` (Libre, Reservada, Ocupada, Pendiente de limpieza, En limpieza, Bloqueada); colours never the only signal

## Architecture Check

- [x] KPI logic only in `src/domain/kpis/`; presentational components take plain props and call no data hooks; containers use hooks from `src/data/hooks/`
- [x] No Dexie / adapter imports outside `src/data/`; no `Date.now()` / `new Date()` for "now" in dashboards (use `useSimNow`)
- [x] Tokens only (`bg-status-*`), no hex colours; no new dependencies; no schema change

## Definition of Done

All boxes ticked, roadmap Phase 6 items ticked by `ship-feature`, CHANGELOG updated, branch merged and deleted.
