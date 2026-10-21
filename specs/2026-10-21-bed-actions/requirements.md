# Requirements: Bed Management — Actions & Turnaround

**Roadmap phase:** 7 — Bed Management — Actions & Turnaround
**Branch:** `phase-7-bed-actions`
**Status:** Draft — 2026-10-21

## Scope

Operate beds from the dashboard. The commands already exist (Phase 5: `reserveBed`, `releaseBedReservation`, `blockBed`, `unblockBed`, `startCleaning`, `finishCleaning`); this phase adds the people-facing side: the open bed-request list, a guided reservation with suggestions, per-bed actions, the bed-turnaround KPI and the pending-cleaning exception. No schema change, no new events.

### Included

**1. Open bed requests** — section "Solicitudes de cama" on `/camas`, between the exceptions list and the unit grid.
- Shows `OPEN` requests sorted by **priority (P1 → P3), then longest wait first**. Row: priority badge, patient initials, "Urgencias · triaje 2" or "Programado", requested specialty (full name), required unit type, isolation marker, wait time (`DurationText`, amber ≥ 60 min, red ≥ 120 min), "Asignar cama" button.
- Header line with counts: "N abiertas · M con cama reservada".
- Honours the census filters that make sense for a request (unit type ↔ required unit type, specialty ↔ requested specialty); the building filter does not apply (a request has no unit yet).
- Empty state: "No hay solicitudes de cama abiertas."

**2. Reserve / assign a bed** — side sheet opened by "Asignar cama".
- Header: the request (patient initials, specialty, unit type, isolation, wait).
- **Suggestions** (top 5, ranked) from `suggestBeds`: free beds of the required unit type; isolation-capable only when the request requires isolation (isolation beds are kept free otherwise); ranked: same specialty first, then outlier beds (wards only, never for Pediatría, Ginecología y Obstetricia or Psiquiatría), then longest-free first. Each suggestion shows unit, bed, building/floor, and tags "Mismo servicio" / "Ectópico" / "Aislamiento".
- "Ver todas las camas libres compatibles" expands the full list.
- Selecting a bed enables **"Reservar cama"**; on success the sheet closes and a toast reads "Cama 512-A reservada para M. G. R.". ETA is set to now + 30 min (constant).
- Failure (request no longer open, bed taken by the simulator in the meantime): inline error in the sheet "Esa cama o solicitud ya no está disponible. Actualizando sugerencias…" and the list refreshes; nothing is written.

**3. Per-bed actions** — on the bed map every tile opens a side sheet (bed, status, patient initials, unit) with the actions allowed for its status and the user's role:

| Status | Actions |
|---|---|
| `AVAILABLE` | Bloquear (reason required: preset list + free text) |
| `RESERVED` | Liberar reserva (optional reason) |
| `OCCUPIED` | none (information only) |
| `PENDING_CLEANING` | Iniciar limpieza · Bloquear |
| `CLEANING` | Terminar limpieza · Bloquear |
| `BLOCKED` | Desbloquear |

Each action confirms with a toast naming the result ("Cama 512-A: limpieza iniciada"). Releasing a reservation also cancels the pending transfer (already done by the command).

**4. Roles** (`specs/domain.md` → Roles), one shared rule `canActOnBed(role, action, { unitId, userUnitId })` in `src/domain/access.ts`:

| Role | Can |
|---|---|
| `ADMISSIONS_HEAD`, `BED_MANAGER` | every action, any unit |
| `NURSE_SUPERVISOR` | `startCleaning` / `finishCleaning` on **their own unit** only |
| `ED_COORDINATOR`, `MANAGEMENT` | nothing (read-only: they see the request list and tiles, no buttons) |
| `PORTER` | no access to Camas |

The UI hides forbidden actions and the action hook refuses them (defence in depth). Real enforcement arrives with row-level security (Phase 17).

**5. Bed turnaround KPI** — 7th tile **"Rotación de cama"** on the census and unit KPI strips.
- Value: **median minutes** from `PatientDischarged.occurredAt` to the next `BedCleaningFinished.occurredAt` of the same bed, for cleanings **finished today** (local day, simulated time), for the beds in scope (filters / unit). Computed from the event log by a pure function.
- Display "1 h 12 min" style via `formatDuration`; context "N camas hoy" (or "sin datos todavía" with value "—"); target line "objetivo ≤ 90 min".
- Status: ok < 90 min, warn ≥ 90, critical ≥ 150, neutral without data.

**6. Pending-cleaning exception** — added to "Necesita atención": `PENDING_CLEANING` for **> 60 min → warn, > 120 min → critical**, "Cama 512-A pendiente de limpieza desde hace 1 h 20 min", linking to the unit.

### Not included
- Moving a patient between beds, dispatching porters by hand (Phase 10), editing expected discharges (Phase 9), alerts (Phase 12), turnaround trends.
- Choosing an ETA in the UI; undoing an action.
- Real authorization (Phase 17).

### Routes / roles
No new routes. `/camas` and `/camas/:unitCode` keep their guards (Phase 6); this phase only adds what appears on them per role.

## Decisions

- **Roles per `specs/domain.md`** (not "everyone can act"): the demo story differs per role, and it mirrors the hospital's real division of work.
- **Layout:** request list on `/camas` and side sheets for assignment and per-bed actions (UX guideline: actions in a side sheet/dialog with confirmation and a toast). No new route.
- **Suggestions are pure domain logic** (`suggestBeds`), tested on fixtures; the sheet only renders them. Specialty match and isolation are rules, not hard-coded UI order.
- **Turnaround from events, not stored:** `turnaroundMinutes` is derived from the log (single source of truth); no new field. Uses the last 5,000 events (covers a simulated day); Phase 14 reviews indexes.
- **Median today, target 90 min** (warn ≥ 90, critical ≥ 150). Targets live in `CENSUS_THRESHOLDS`.
- **Races with the simulator** (its bed manager also reserves beds): commands reject stale input; the UI shows a clear message and refreshes — no locking.
- **Actor:** events carry the logged-in user's id (as in Phase 5 controls), so the event log shows who acted.
- Domain doc: `BED_PENDING_CLEANING_LONG` keeps WARNING for alerts (Phase 12); the dashboard exception adds CRITICAL > 120 min.
- No new dependencies (side sheet = existing shadcn `Sheet`).

## Context

- Commands: `src/domain/commands/beds.ts`, `executeCommand`; hooks/pattern for UI commands: `src/features/simulation/useSimulationControls.ts`.
- Dashboard: `src/features/beds/` (census page, unit page, `BedTile`), `src/components/dashboard/`, `dashboard-widget` skill, `specs/ux-guidelines.md` (interaction: side sheet + toast).
- Simulator interplay: the "normal day" bed-assignment policy keeps running; a human reservation is picked up by its transfer policy (`requestTransfer` → porter → admitted), so the demo shows the whole chain.
- Demo story: Jefe/a de Admisión at 60× sees boarding requests accumulate, assigns the oldest P1 to a suggested bed in two clicks, watches the transfer and admission appear in the event log; blocks a bed for maintenance; the nurse supervisor of that unit marks cleaning started/finished; "Rotación de cama" fills in as the day goes on.
