# Requirements: Bed Management — Census Dashboard

**Roadmap phase:** 6 — Bed Management — Census Dashboard
**Branch:** `phase-6-bed-census-dashboard`
**Status:** Complete — 2026-10-21

## Scope

The first real dashboard. `/camas` shows every bed of the hospital live: a KPI strip, a short "Necesita atención" list, and a grid of units with occupancy and status breakdown. Clicking a unit opens `/camas/:unitCode` with the **bed map** of that unit. Everything updates live as the simulator runs. Read-only: acting on beds (reserve, block, cleaning) is Phase 7.

### Included

**KPI strip** (`specs/domain.md` → KPIs → Beds). Hospital-wide on `/camas`, scoped to the unit on `/camas/:unitCode`; both follow the active filters on `/camas`.

| Tile | Value | Context line | Status colour |
|---|---|---|---|
| Ocupación | occupied ÷ operational beds, % | "N de M camas operativas" · "umbral de alerta 92 %" | ok < 92 %, warn ≥ 92 %, critical ≥ 97 % (thresholds from the hospital status level) |
| Camas libres | `AVAILABLE` count | "N reservadas" | neutral (ok when > 0, critical when 0) |
| Pendientes de limpieza | `PENDING_CLEANING` count | "N en limpieza" | neutral / warn when > 5 % of beds |
| Bloqueadas | `BLOCKED` count | share of beds | neutral |
| Altas previstas hoy | admissions `ADMITTED`/`DISCHARGE_ORDERED` with `expectedDischargeAt` in the local day, + done today | "N ya realizadas" (`dischargedAt` today) | neutral |
| Pacientes ectópicos | outlier inpatients | "en M unidades" | neutral / warn when > 5 % of inpatients |

- No "vs ayer" delta yet (no history before the first simulated day; arrives with Phase 12 trends). Tiles show the target/threshold line instead.

**Exceptions — "Necesita atención"** (census-level only, sorted severity → age, max 8 + "Ver todas")
- Bed `BLOCKED` > 72 h → warn, "Cama 512-A bloqueada desde hace 3 d" + reason.
- Unit occupancy ≥ 92 % (warn) / ≥ 97 % (critical).
- Outlier patient → info, "<initials> ectópico en <unidad> (servicio <código>)", age = length of stay.
- Pending cleaning > 60 min and bed-request exceptions are **Phase 7**.

**Unit grid** (`/camas`): one card per unit with beds (ED excluded): name, building/floor, type badge, occupancy % + bar, stacked status bar with counts (Libre, Reservada, Ocupada, Pendiente de limpieza, En limpieza, Bloqueada), outlier count. Card links to `/camas/<unit.code>`. Sorted by building, floor, name.

**Filters** (`/camas`): building, unit type, specialty (multi-value not required: one select each, "Todos" default). They filter the KPI strip, exceptions and unit grid together. Persisted per user in localStorage (`torre-control.filters.beds.<userId>`, try/catch).

**Bed map** (`/camas/:unitCode`): header (unit name, building, floor, type, specialties, back link), KPI strip for the unit, and one tile per bed grouped by room (`512-A`, `512-B` → room 512):
- Status shown by colour **and** text/icon.
- `OCCUPIED`: patient initials (e.g. "M. G. R."), length of stay ("3 d 4 h"), expected discharge ("hoy 14:00" / "mañana" / "—", with "alta ordenada" when `DISCHARGE_ORDERED`), outlier marker.
- `RESERVED`: initials of the incoming patient + "Reservada".
- `BLOCKED`: reason (tooltip + visible short text). `PENDING_CLEANING` / `CLEANING`: time since `statusChangedAt`.
- Tooltip / focus detail: full name, NHC, admitted at, specialty (full name + NHC only here, never on the tile face).
- Legend with all six statuses.

### Not included
- Actions on beds, bed-request list, cleaning exceptions (Phase 7); alerts, wall mode, trends and "vs ayer" deltas (Phase 12); patient journey links (Phase 11).
- Performance work beyond memoisation (Phase 14).

### Routes / roles

| Route | Access | Notes |
|---|---|---|
| `/camas` | `ADMISSIONS_HEAD`, `MANAGEMENT`, `BED_MANAGER`, `ED_COORDINATOR` | Hospital census. `NURSE_SUPERVISOR` is redirected to their unit |
| `/camas/:unitCode` | same + `NURSE_SUPERVISOR` (own unit only) | Unknown code → "Unidad no encontrada" state; supervisor opening another unit → redirected to their own |

Nurse supervisors never see other units' data: `useUnitScope()` (Phase 4) drives the redirect and the KPI scope. The Phase 4 placeholder notice on Camas is replaced by this behaviour.

## Decisions

- **Sub-route for the bed map** (`/camas/:unitCode`): deep-linkable, back button works, wall mode can rotate through units later.
- **Initials on the tile, full identity only in the detail** (privacy by design for wall displays and IT review).
- **Filters apply to KPIs, exceptions and grid together**, so "UCI only" shows the ICU's occupancy.
- **Definitions** (written into `specs/domain.md` in this branch): occupancy = `OCCUPIED` ÷ non-`BLOCKED` beds; "libres" = `AVAILABLE`; "pendientes de limpieza" = `PENDING_CLEANING` (cleaning in progress shown separately); outlier = inpatient in a `WARD` unit whose `specialtyCodes` do not include the admission's specialty; "hoy" = local day in `Europe/Madrid` of the simulated time.
- **Pure KPI functions** in `src/domain/kpis/census.ts` taking entities + `now`; the page only wires hooks → functions → presentational components.
- **"Now"** is the simulated time (`SimulationState.simNow`, via a `useSimNow()` hook); no wall clock in dashboards.
- **No new dependencies.** Shared widgets (`KpiTile`, `KpiStrip`, `ExceptionList`, `StatusBadge`, `DurationText`) go to `src/components/dashboard/` for reuse by later dashboards; `TriageBadge`, `TrendChart`, `Timeline` and the wall `density` prop are added by the phases that need them.

## Context

- Skills/specs: `dashboard-widget` skill, `specs/ux-guidelines.md` (colour semantics, KPI strip → exceptions → main view), `specs/domain.md` → KPIs.
- Existing: `useBeds`, `useUnits`, `useBedsByUnit`, `useSimulationState` in `src/data/hooks`; `useUnitScope` / `useSession` in `src/features/auth`; route table in `src/app/routes.tsx` (`PAGE_LOADERS`, `RequireArea`).
- Demo story: Jefe/a de Admisión opens Camas → occupancy 85 %, 20 units; presses ▶ at 60× in the top bar and watches counts move (pending cleaning ↑, free beds ↓ as ED patients are admitted); filters to "UCI"; opens a ward and sees initials, LOS and expected discharge; logs in as a nurse supervisor and lands directly on their unit.
