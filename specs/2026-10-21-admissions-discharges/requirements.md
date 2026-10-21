# Requirements: Admissions & Discharges

**Roadmap phase:** 9 — Admissions & Discharges
**Branch:** `phase-9-admissions-discharges`
**Status:** Draft — 2026-10-21

> Interview skipped on request (autonomous run, phases 9–12): the options marked "Recommended" in earlier interviews were applied. Every such choice is listed under **Decisions**.

## Scope

Plan the day's bed balance. `/ingresos-altas` follows the dashboard order: KPI strip → "Necesita atención" → main views (scheduled admissions, discharges per unit, discharge worklist with actions) → bed-balance forecast. Commands already exist (`setExpectedDischarge`, `orderDischarge`; scheduled admissions are produced by the simulator); this phase adds KPI functions, the page and the discharge actions.

### Included

**1. KPI strip** (six tiles; definitions in `specs/domain.md` → Admissions & Discharges)

| Tile | Value | Context | Status |
|---|---|---|---|
| Ingresos hoy | admissions with `admittedAt` today | "N urgentes · N programados" | neutral |
| Programados pendientes | scheduled today, not arrived/cancelled/admitted | "N ya han llegado" | neutral |
| Altas realizadas | discharges completed today | "de N previstas hoy" | neutral |
| Altas antes de las 12:00 | % of today's discharges completed before 12:00 | "N de M" · "objetivo ≥ 30 %" | ok ≥ 30 %, warn ≥ 15 %, critical < 15 %, neutral without data |
| Balance de camas | forecast (see 4) | "camas libres + altas previstas − pendientes" | ok ≥ 0, warn < 0, critical < −10 |
| Cancelados por falta de cama | `AdmissionCancelled` with reason `NO_BED` today | — | neutral; warn when > 0 |

**2. Exceptions — "Necesita atención"**: bed-balance deficit (warn < 0, critical < −10), scheduled admissions waiting for a bed more than 2 h after their time (warn; > 3 h critical = about to be cancelled), discharge ordered but patient still in bed after 3 h (warn).

**3. Scheduled admissions of the day** — table: time, patient initials, specialty, status `Pendiente` (not arrived), `Llegado · esperando cama`, `Cama reservada`, `Ingresado`, `Cancelado` (with reason "sin cama / paciente / clínico / otro" from the event), sorted by scheduled time. Counts per status above the table.

**4. Bed balance forecast** (card): `camas libres ahora + altas previstas pendientes hoy − (pacientes pendientes de ingreso + programados pendientes)`, shown as a breakdown (four numbers) and a result with status and the deficit warning text. Pending expected discharges = expected today and still `ADMITTED`/`DISCHARGE_ORDERED`.

**5. Discharges per unit** — table: unit, expected today, done, pending (still in bed), orders issued, % before 12:00, sorted by pending desc. Hospital totals row.

**6. Discharge worklist** (the supervisor's tool) — inpatients (`ADMITTED` / `DISCHARGE_ORDERED`) with tabs *Previstas hoy* (default), *Ordenadas*, *Mañana*, *Sin fecha prevista*; columns: bed/unit, patient initials, specialty, stay, expected discharge, status. Sorted by expected time; first 50 rows + "Ver más".
- **Actions** (side sheets, toasts, event with the user as actor):
  - *Fijar / editar alta prevista* — day (hoy / mañana / pasado mañana) + time (`HH:mm`, 24 h); must be in the future (simulated time) and ≤ 7 days ahead; only for `ADMITTED`.
  - *Ordenar alta* — confirmation button; only for `ADMITTED`.
- Permissions: `canActOnDischarge(role, action, { unitId, userUnitId })`: `ADMISSIONS_HEAD` any unit; `NURSE_SUPERVISOR` only their own unit; everyone else read-only. Judged on the bed's real unit (read inside the hook), fails closed for a supervisor without a unit.

**7. Nurse supervisor scope**: sees only their unit's discharges and worklist, the scheduled admissions whose specialty their unit treats, and a unit-level forecast (free beds of the unit + the unit's pending expected discharges − scheduled pending of its specialties − boarding patients bound for its specialties). Others see hospital-wide numbers.

### Not included
- Creating or cancelling scheduled admissions by hand, bed assignment from here (stays in Camas), editing a discharge after it is ordered, hourly projection of the balance, alert engine (Phase 12), journey links (Phase 11).

### Routes / roles
`/ingresos-altas`: `ADMISSIONS_HEAD`, `MANAGEMENT` (read-only), `BED_MANAGER` (read-only), `NURSE_SUPERVISOR` (own unit; can act). Guard unchanged.

## Decisions (autonomous)

- Discharge actions for the head and supervisors only; bed managers and management read-only (domain.md roles).
- Read-only dashboard + actions limited to the two discharge commands that exist; no new commands, events or schema.
- Thresholds as constants in `ADMISSION_THRESHOLDS` (configurable in Phase 12): 30 % before noon objective, balance warn < 0 / critical < −10 (alert rule `BED_BALANCE_NEGATIVE`), scheduled late 2 h / 3 h.
- Cancel reasons come from the `AdmissionCancelled` events (latest 5,000, same window as the turnaround KPI).
- One pure module `src/domain/kpis/admissions.ts`; pages wire hooks → function → presentational components.
- No new dependencies.

## Context
Follows Phases 6–8 (`src/features/beds/`, `src/features/emergency/`, `src/components/dashboard/`), `useBedActions` for the action-hook pattern, `specs/domain.md` → KPIs → Admissions & Discharges and Alert Rules. The "normal day" scenario already creates 15 scheduled admissions at 07:00, sets expected discharges, orders and discharges.
