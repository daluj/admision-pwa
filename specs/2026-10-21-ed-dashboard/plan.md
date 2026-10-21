# Plan: Emergency Department Dashboard

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-8): group K – <name>`. UI follows the `dashboard-widget` skill and `specs/ux-guidelines.md`. No schema or event changes (`data-model-change` does not apply; `specs/domain.md` gets definitions).

## Group 1: ED KPIs (domain)

1. `specs/domain.md` → KPIs → Emergency Department: wait to physician, % seen within target (L2–L5, last 24 h, L1 as exception), tile thresholds, boarding thresholds (`BOARDING_LONG`), hourly series; Alert Rules note that the dashboard exceptions mirror `ED_TRIAGE_TARGET_BREACH` and `BOARDING_LONG`.
2. `src/domain/kpis/thresholds.ts`: `ED_THRESHOLDS` (Manchester `physicianTargetMinutes`, `triageWaitWarnMin 15` / `criticalMin 30`, `boardingCountWarn 10` / `Critical 20`, `boardingLongWarnMin 240` / `CriticalMin 480`, `withinTargetObjective 0.85` / `Warn 0.7`, `targetCriticalFactor 1.5`).
3. `src/domain/kpis/ed.ts` (pure): `computeEd({ edVisits, admissions, bedRequests, beds, units, patients, specialties, now })` → `{ kpis, columns, boarding, exceptions, hourly }`:
   - `columns`: per phase, cards `{ visit, level?, initials, fullName, mrn, area, waitMs, targetMs?, overTarget }` sorted as in the requirements;
   - `boarding`: rows with specialty name, unit type, isolation, `sinceDecisionMs`, request state (`OPEN` / `RESERVED` bed + unit / `IN_TRANSFER`);
   - `kpis`: counts, oldest waits, within-target % and counts;
   - `exceptions`: triage breach (L1 any, L2 > 10 → critical; L3–L5 over target → warn) and boarding long (4 h / 8 h);
   - `hourly`: 24 buckets `{ start, seen, within, pct | null }` aligned to the hour, ending at the current hour.
4. `src/domain/kpis/edStatus.ts`: tile statuses (`triageWaitStatus`, `physicianWaitStatus`, `boardingCountStatus`, `boardingLongStatus`, `withinTargetStatus`).
5. Tests with fixtures and a fixed `now`: columns and sorting, waits and targets per level, L1 handling, % within target (boundary at target, L1 excluded, only last 24 h, none seen ⇒ `null`), hourly buckets across midnight and DST, boarding request states, exception severities and order, every status boundary.

## Group 2: Dependency, hook, TriageBadge

6. `npm install recharts` (exact version, already in `specs/tech-stack.md`); check it works with the project's React version; note it in the commit.
7. `src/components/dashboard/TriageBadge.tsx` (Manchester colour + number + sr-only "Triaje N"; `bg-triage-N text-triage-N-foreground`), exported from the dashboard index; tests for all five levels.
8. `src/features/emergency/useEd.ts`: combines the data hooks and memoises `computeEd`; `undefined` while loading; test with the memory backend.
9. `src/i18n/es.ts`: `pages.emergency.*` (KPI labels/contexts, column names, area names, exception titles, boarding table, chart, states).

## Group 3: KPI strip and exceptions

10. `src/features/emergency/components/EdKpis.tsx` (six tiles via `KpiTile`/`KpiStrip size={6}`), `EdExceptions.tsx` (maps domain exceptions to `ExceptionItem`s).
11. Tests: values, contexts and status of each tile on a fixture; exception text and ordering.

## Group 4: ED board

12. `components/EdBoard.tsx` (four columns, responsive: 4 → 2 → 1), `EdCard.tsx` (memoised; button trigger, tooltip with full name/NHC, `DurationText` against the target, area, complaint), empty column state.
13. Tests: columns and counts, sort order, `TriageBadge` per card, over-target colouring, initials on the face and full identity only in the tooltip, keyboard focus opens the tooltip.

## Group 5: Boarding list

14. `components/BoardingTable.tsx` (accessible table with caption, `DurationText` 4 h / 8 h, request-state cell, "Gestionar en Camas" link for roles that can reserve beds), empty state.
15. Tests: order, the three request states, isolation marker, link visibility per role, empty state.

## Group 6: Waiting-time chart

16. `src/components/dashboard/TrendChart.tsx` (Recharts line, optional dashed reference line, gaps for `null`, tooltip, theme tokens via CSS variables, `prefers-reduced-motion`, visually-hidden `<table>` alternative); tests on the hidden table and reference line (Recharts needs no layout in jsdom: assert the table and props, not pixels).
17. `components/WaitChart.tsx` wiring `hourly` to `TrendChart` ("Atendidos en objetivo por hora (últimas 24 h)", 85 % objective, tooltip "N de M").

## Group 7: Page, roles, e2e and docs

18. `src/features/emergency/EmergencyPage.tsx` (container): `useEd` → KPI strip → exceptions → board → boarding → chart; skeleton while loading; `EmptyState` when there are no visits; `PageHeader`.
19. Page test with a seeded fixture (KPI values, board columns, boarding rows); role tests (head and ED coordinator see it; management sees it without the Camas link; other roles redirected as before).
20. `e2e/emergency.spec.ts`: head opens Urgencias: six tiles, four columns with cards, boarding table, chart table present; start the simulator at 300×: a KPI or card count changes within 45 s; ED coordinator reaches the page and has no Camas link.
21. READMEs (`src/features`, `src/components`), note the Recharts usage and the L1 convention.
