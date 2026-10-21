# Plan: Bed Management — Census Dashboard

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-6): group K – <name>`. UI groups follow the `dashboard-widget` skill and `specs/ux-guidelines.md`. No schema change, so `data-model-change` does not apply.

## Group 1: Census KPIs (domain)

1. `specs/domain.md` → KPIs → Beds: add the definitions listed in `requirements.md` (operational beds, libres, pendientes de limpieza, ectópicos, "hoy").
2. `src/domain/kpis/thresholds.ts`: `CENSUS_THRESHOLDS` (`occupancyWarn 0.92`, `occupancyCritical 0.97`, `blockedLongHours 72`, `pendingCleaningWarnShare 0.05`, `outlierWarnShare 0.05`).
3. `src/domain/kpis/census.ts` (pure): `bedCounts(beds)`, `occupancy(counts)`, `computeCensus({ beds, units, admissions, patients, now })` → `{ hospital: KpiSet, byUnit: Map<unitId, UnitCensus>, beds: BedView[] }` where `BedView` carries status, patient initials / full name / NHC, `losMs`, `expectedDischargeAt`, `dischargeOrdered`, `outlier`; `censusExceptions(census, now)` → sorted `{ id, severity, kind, unitCode, bedLabel?, ageMs, … }`.
4. `src/domain/kpis/initials.ts`: `patientInitials(patient)` ("M. G. R.").
5. Tests (fixed `now`, small fixtures): counts per status, occupancy with blocked beds excluded and 0-bed unit, expected-today boundaries around local midnight and DST, completed today, outlier rules (ward only, ICU never, specialty match), exceptions ordering, initials.

## Group 2: Data hooks

6. `src/data/hooks/index.ts`: add `usePatients`, `useAdmissions`, `useSpecialties`, `useSimNow()` (live `simNow`, `undefined` while loading / not seeded); tests in `hooks.test.tsx`.
7. `src/features/beds/useCensus.ts`: combines the hooks, memoises `computeCensus`; returns `undefined` while any source is loading.

## Group 3: Shared dashboard components

8. `src/lib/format.ts`: `formatDuration(ms)` ("2 h 15 min", "3 d 4 h", "<1 min"), `formatRelativeDay(iso, now)` ("hoy 14:00", "mañana", "dd/MM") — Europe/Madrid, 24 h, with tests.
9. `src/components/dashboard/`: `KpiTile` (status ok/warn/critical/neutral shown by colour + icon + sr-only text, fixed height, tabular numerals, optional `href`), `KpiStrip` (6 → 3 → 2 columns), `StatusBadge` (`kind: 'bed'` for now), `DurationText`, `ExceptionList` (severity → age sort, max 8 + "Ver todas", empty state).
10. `src/i18n/es.ts`: `dashboard.*` (shared) and `pages.beds.*` strings (KPI labels, contexts, exception titles, bed status labels, unit type labels, filters, legend, empty and not-found states).
11. Component tests: each status renders the right class and text; strip accessible; exception list order/limit/expand/empty.

## Group 4: Census page (`/camas`)

12. `src/features/beds/BedsPage.tsx` (container) + `components/CensusKpis.tsx`, `CensusExceptions.tsx`, `UnitGrid.tsx`, `UnitCard.tsx` (status stacked bar with text counts, link), `BedFilters.tsx`.
13. `src/features/beds/bedFilters.ts`: filter model + `applyFilters(units, filters)` + localStorage persistence per user (try/catch); tests.
14. Skeleton while loading; `EmptyState` when there are no beds; nurse supervisor ⇒ `<Navigate to="/camas/<own unit code>" replace />`.
15. Page test (memory backend with a small fixture): KPI strip values, grid cards, filter narrows KPIs and grid, link targets.

## Group 5: Unit page and bed map (`/camas/:unitCode`)

16. `src/features/beds/UnitPage.tsx`: resolves unit by code, header, scoped KPI strip, `BedMap`; unknown code → not-found state; supervisor guard (own unit only).
17. `components/BedMap.tsx` (rooms grouped from labels), `BedTile.tsx` (memoised; status text + colour, initials, LOS, expected discharge, outlier marker, blocked reason), `BedDetail` tooltip with full name / NHC / admitted at / specialty, `BedLegend.tsx`.
18. Component tests: tile per status, initials only on the face, detail contains full identity, expected-discharge wording (hoy / mañana / ordenada), legend.

## Group 6: Routing, roles and scope

19. `src/app/routes.tsx`: add the `camas/:unitCode` child under the `beds` area guard (lazy `UnitPage`); `PAGE_LOADERS` stays one per area (unit page lazily imported next to it); `routes.test.ts` covers the new path.
20. Remove the Phase 4 scope notice from the old Camas placeholder (superseded); update `guards.test.tsx` / `roleNavigation.test.tsx` accordingly.
21. Tests: supervisor on `/camas` → own unit; supervisor on another unit → own unit; head/management/bed manager/ED coordinator reach both routes; porter redirected as before; unknown unit code state.

## Group 7: E2E and docs

22. `e2e/beds.spec.ts`: login as head → `/camas` shows 6 KPI tiles and ~19 unit cards; filter by unit type narrows the grid; open a unit → bed map with tiles and legend; start the simulator at 300× and assert a KPI/bed count changes within 30 s; nurse supervisor lands on own unit and cannot open another.
23. READMEs (`src/domain`, `src/features`, `src/components`), mention `useSimNow` and the dashboard components; note performance expectations (memoised tiles, 600 beds).
