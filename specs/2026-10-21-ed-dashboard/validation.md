# Validation: Emergency Department Dashboard

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0 with no warnings
- [x] `npm test` exits 0
- [x] `npm run build` exits 0
- [x] `npm run test:e2e` exits 0

### Specific coverage required

- [x] `computeEd`: columns by phase and sort order, waits and targets per level, L1 handling, area and initials
- [x] % seen within target: boundary exactly at target, L1 excluded, only the last 24 h, no data ⇒ `null`
- [x] Hourly series: 24 buckets, hour alignment, midnight and DST, empty hours are gaps
- [x] Boarding rows: request states (`OPEN`, `ASSIGNED` with bed and unit, `IN_TRANSFER`), longest first, specialty names, isolation
- [x] Exceptions: triage breach severities (L1/L2 critical, L3–L5 warn), boarding 4 h / 8 h, ordering
- [x] Tile statuses at every threshold boundary
- [x] `TriageBadge` for the five levels (colour class, number, accessible text); `TrendChart` hidden table and reference line
- [x] Board: counts, sort, over-target colouring, initials only on the card face, identity in the tooltip (keyboard too)
- [x] Boarding table: order, states, link visibility per role, empty state
- [x] Page: loading, empty, values on a fixture; role access (head, ED coordinator, management; others redirected)
- [x] E2E: tiles, board, boarding table, chart table, simulator changes a value, ED coordinator has no Camas link

## Manual (simulator at 60×)

- [x] Fresh profile → `/urgencias`: ≈ 40 patients present, 4 columns, ≈ 8 in "Pendiente de ingreso", boarding table matches the column; KPI numbers agree with the board
- [ ] Start the simulator: cards move between columns, waits tick up and turn amber/red against each patient's target, no layout jump, chart gets new points hour by hour
- [ ] An L1/L2 patient waiting beyond target appears at the top of "Necesita atención" as critical; a boarder over 4 h shows amber, over 8 h red
- [ ] Reserve a bed for a boarder in Camas: the boarding table switches to "Cama … reservada", then "En traslado", and the patient leaves the board when admitted
- [x] Tooltip (hover and keyboard) shows full name and NHC; nothing identifying on the card face
- [ ] Chart: 85 % dashed line, gaps for empty hours, readable tooltip, data table available to screen readers
- [ ] 1920×1080, 1280×800, 1024×768 and 390×844 (columns stack, no horizontal scroll); light and dark; Manchester colours distinguishable with text/number
- [ ] Keyboard only: tab through cards and tooltips; reduced-motion respected by the chart

## Copy Check

- [x] All strings from `src/i18n/es.ts`; glossary terms (Pendiente de ingreso, Triaje, Boxes, Observación, Sala de espera); Manchester colours always with the number

## Architecture Check

- [x] KPI/board/chart logic only in `src/domain/kpis/`; presentational components take plain props; containers use hooks from `src/data/hooks/`
- [x] No adapter imports in UI; no `Date.now()` / `new Date()` for "now"; tokens only (no hex colours)
- [x] Only `recharts` added (listed in `specs/tech-stack.md`); no schema change

## Definition of Done

All boxes ticked, roadmap Phase 8 items ticked by `ship-feature`, CHANGELOG updated, branch merged and deleted.
