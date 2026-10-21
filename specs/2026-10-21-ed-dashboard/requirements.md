# Requirements: Emergency Department Dashboard

**Roadmap phase:** 8 — Emergency Department Dashboard
**Branch:** `phase-8-ed-dashboard`
**Status:** Complete — 2026-10-21

## Scope

ED flow and boarding at a glance, live as the simulator runs. `/urgencias` follows the standard dashboard order (`specs/ux-guidelines.md`): KPI strip → "Necesita atención" → main view (ED board and boarding list) → trend chart. **Read-only**: acting on ED patients is not part of this phase.

### Included

**1. KPI strip** (six tiles; definitions in `specs/domain.md` → KPIs → Emergency Department, clarified in this branch)

| Tile | Value | Context line | Status |
|---|---|---|---|
| Pacientes presentes | visits not `LEFT_ED` | "N en boxes · N en sala de espera" | neutral |
| Esperando triaje | phase `ARRIVED` | "espera máx. 12 min" | warn > 15 min oldest, critical > 30 min |
| Esperando médico | phase `TRIAGED` | "N por encima del objetivo" | critical if an L1/L2 is over target, warn if any other is, ok otherwise, neutral when none |
| Pendientes de ingreso | phase `ADMIT_DECISION` (boarding) | "N con cama reservada" | warn > 10, critical > 20 (hospital status level) |
| Mayor espera de cama | longest `now − admitDecisionAt` | "N pacientes > 4 h" | warn > 4 h, critical > 8 h (`BOARDING_LONG`) |
| Atendidos en objetivo | % of L2–L5 patients **seen** in the last 24 h with wait ≤ Manchester target | "N de M atendidos en 24 h" · "objetivo ≥ 85 %" | ok ≥ 85 %, warn ≥ 70 %, critical < 70 %, neutral without data |

- Manchester targets (triage → physician): L1 0, L2 10, L3 60, L4 120, L5 240 min (constants in `ED_THRESHOLDS`, configurable in Phase 12).
- **L1 is outside the % tile**: it must be seen immediately, so any L1 waiting for a physician is a critical exception instead of a statistic.
- Wait to physician = `seenAt − triagedAt` (waiting patients: `now − triagedAt`).

**2. "Necesita atención"** (reuses `ExceptionList`; max 8 + "Ver todas")
- Patient waiting for a physician beyond target: L1 any wait or L2 > 10 min → critical; L3–L5 over target → warn. "M. G. R. (triaje 2) espera médico desde hace 25 min · objetivo 10 min".
- Boarding > 4 h → warn, > 8 h → critical. "A. B. F. pendiente de cama desde hace 5 h 10 min".

**3. ED board** — four columns: *Llegada* (`ARRIVED`), *Triado* (`TRIAGED`), *En atención* (`IN_ASSESSMENT`), *Pendiente de ingreso* (`ADMIT_DECISION`).
- Header: phase name + count. Cards sorted by triage level (L1 first), then longest wait; *Llegada* has no level yet, so longest wait first.
- Card: `TriageBadge` (Manchester colour **and** number), patient **initials**, chief complaint, area (Boxes / Observación / Reanimación / Sala de espera), time in the phase (`DurationText`; `Triado` is coloured against the patient's target: amber ≥ target, red ≥ 1.5 × target; `Llegada` amber > 15 min, red > 30 min).
- Full name and NHC only in a tooltip (hover and keyboard focus), as on the bed map.
- Empty column: "Sin pacientes".

**4. Boarding list** — table below the board, longest first: patient initials + triage badge, requested specialty (full name) and unit type, isolation marker, **time since admit decision** (amber > 4 h, red > 8 h), **bed request status**: "Sin cama asignada" (`OPEN`) · "Cama 512-A reservada (<unidad>)" (`ASSIGNED`) · "En traslado a 512-A" (admission `IN_TRANSFER`). Link "Gestionar en Camas" for roles that can reserve beds (head); read-only for others. Empty state: "No hay pacientes pendientes de ingreso."

**5. Waiting-time chart** — "Atendidos en objetivo por hora (últimas 24 h)": one line of the % of L2–L5 patients seen within target in each of the last 24 clock hours (simulated time, Europe/Madrid labels), a dashed 85 % objective line, gaps for hours without patients, tooltip with "N de M". Built with Recharts (already in `specs/tech-stack.md`); includes a **visually-hidden data table** with the same numbers (`TrendChart` shared widget).

**6. Misc**
- New shared widgets in `src/components/dashboard/`: `TriageBadge`, `TrendChart`.
- Loading skeleton while data is not ready; `EmptyState` when there are no ED visits at all.
- Colours via tokens only (`bg-triage-N`, `bg-status-*`); light/dark both AA.

### Not included
- Actions on ED patients, bed assignment from this page (that stays in Camas), alerts, wall mode, per-level breakdown charts, patient journey links (Phase 11), LWBS and ED LOS KPIs (later).

### Routes / roles

| Route | Access |
|---|---|
| `/urgencias` | unchanged guard: `ADMISSIONS_HEAD`, `MANAGEMENT`, `ED_COORDINATOR` |

No new routes. The "Gestionar en Camas" link is shown only to roles that can reserve beds (`canActOnBed(role, 'reserve', …)`).

## Decisions

- **Read-only plus exceptions** (consistent with Camas; actions and the alert engine come later).
- **Chart = % seen within target per hour** with the 85 % objective: one series, glanceable, same definition as the KPI tile.
- **Columns by phase** for the board: the phase is the operational question ("who is waiting for what"); triage level orders the cards and carries the colour.
- **Pure functions in `src/domain/kpis/ed.ts`** (`computeEd`): board, boarding rows, KPIs, exceptions, hourly series; the page only wires hooks → function → presentational components (`dashboard-widget` skill).
- **L1 excluded from the % tile and chart**, handled as an exception (documented in `specs/domain.md`).
- **Boarding thresholds**: tile and exception use the `BOARDING_LONG` alert rule (4 h / 8 h); the count tile uses the hospital status-level thresholds (10 / 20).
- **Data from entities, not events**: waits come from `EdVisit` timestamps (`triagedAt`, `seenAt`, `admitDecisionAt`), so the chart covers the seeded history (visits that started up to 14 h before 08:00) from the first moment.
- **Dependency:** add `recharts` (already approved in `specs/tech-stack.md`; pinned to an exact version at install time). No other new dependencies; no schema change.

## Context

- Spec/skills: `dashboard-widget`, `specs/ux-guidelines.md`, `specs/domain.md` → KPIs → ED, Alert Rules; Phase 6 and 7 specs for patterns (`src/features/beds/`, `src/components/dashboard/`).
- Data: `useEdVisits`, `useAdmissions`, `useBedRequests`, `useBeds`, `useUnits`, `usePatients`, `useSpecialties`, `useSimNow` already exist; the ED flow itself is produced by the Phase 5 "normal day" scenario (arrivals by hour, triage delays, ~85 % within target, ~22 % admitted).
- Demo story: the head or the ED coordinator opens Urgencias at 08:00 (≈ 40 patients, 8 boarding), starts the simulator at 60×, watches cards move from Llegada to Triado to En atención, boarding patients accumulate as wards fill, the "Atendidos en objetivo" tile and chart react, and "Necesita atención" flags the oldest boarders; then follows the link to Camas to assign a bed.
