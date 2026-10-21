# Requirements: Internal Transfers — Dispatch

**Roadmap phase:** 10 — Internal Transfers — Dispatch
**Branch:** `phase-10-transfers-dispatch`
**Status:** Draft — 2026-10-21

> Autonomous run (phases 9–12): no interview; the "Recommended" options of earlier interviews were applied. Choices are listed under **Decisions**.

## Scope

Porter dispatch like a delivery queue. `/traslados` shows two views depending on the role: the **dispatch board** (head, bed managers, management read-only) and **Mi cola** (porters). Transfers are created automatically when a bed is reserved and manually from the board; the simulator keeps driving the porters it has to.

### Included

**1. Transfer creation**
- **Automatic:** `reserveBed` (Phase 5 command) now also creates the admission `TransferRequest` (reason `ADMISSION`, from "Urgencias" or "Admisión" to the reserved bed, `URGENT` when the bed request is `P1`, otherwise `NORMAL`; SLA as in `requestTransfer`). It emits `BedReserved` + `TransferRequested` in one transaction. Releasing a reservation or cancelling the admission already cancels the pending transfer.
- **Manual:** "Nuevo traslado" sheet (head, bed manager): inpatient (searchable by bed/unit/initials), destination (Radiología, Quirófano, Otro), reason (Prueba, Cirugía, Entre unidades, Regreso) and priority (Normal/Urgente) → `requestTransfer` from the patient's bed.

**2. Dispatch board** (`ADMISSIONS_HEAD`, `BED_MANAGER` act; `MANAGEMENT` read-only)
- KPI strip (6 tiles): *Traslados abiertos* (requested + assigned + picked up; context by status), *Sin asignar* (oldest wait), *Tiempo medio hasta la recogida hoy* (**median** minutes requested → picked up, today), *Dentro de SLA* (% picked up on or before `slaDueAt`, today; objective ≥ 90 %), *Celadores libres* ("N ocupados · N fuera de turno"), *Completados hoy*.
- "Necesita atención": not picked up past `slaDueAt` → `WARNING` (normal) / `CRITICAL` (urgent) — mirrors `TRANSFER_SLA_BREACH`.
- **Queue** table (open transfers): priority, patient initials, from → to, reason, status, **time to SLA** ("recogida en 4 min" / "vencido hace 3 min", with icon and text), assigned porter, actions. Sorted: urgent first, then closest SLA.
- **Porters panel**: every on-duty porter with status (Disponible / Ocupado) and current job; off-shift ones collapsed in a count.
- Actions (side sheets, toasts, events with the user as actor): *Asignar celador* (list of available porters, suggested = the one free longest), *Cancelar traslado* (optional reason; only before pickup), *Nuevo traslado*.

**3. Porter view — "Mi cola"** (`PORTER`)
- Linked to a porter through `User.porterId` (new optional field; seed links the Celador/a user to a morning porter). Header: porter name and status.
- *Mi trabajo*: transfers assigned to me with the next step button — **Recoger** (`pickUpTransfer`) then **Entregar** (`deliverTransfer`).
- *Cola abierta*: unassigned transfers by priority/SLA with **Aceptar** (`assignTransfer` to me, only while I am `AVAILABLE`).
- *Completados hoy*: count and last deliveries.
- A porter can only act on their own jobs.

**4. Transfer KPIs** — pure `computeTransfers` in `src/domain/kpis/transfers.ts` (definitions in `specs/domain.md`).

**5. Simulator** — keeps assigning available porters and moving assigned jobs (pickup, delivery) with its delays, so the board is alive without human input; a human assignment or action simply takes precedence (stale input is handled).

### Not included
- Porter shifts changing during the day, routes/batching, patient transport equipment, notifications to porters' devices, alerts engine (Phase 12), journey links (Phase 11).

### Routes / roles
`/traslados` (guard unchanged: head, management, bed manager, porter). The view is chosen by role: porter → Mi cola; others → dispatch board.

## Decisions (autonomous)
- **`User.porterId`** (optional, Zod; no Dexie index → no version bump) so a login maps to a porter; the seed links the PORTER user to the first morning porter.
- **Auto-create on reservation inside `reserveBed`** (atomic, one source of truth) rather than a UI step; the simulator's own transfer policy still covers seeded reservations.
- Median (not mean) pickup time; SLA = existing `slaDueAt` (urgent 10 min, normal 30 min).
- Dispatch actions: head and bed managers; porters only their own jobs; management read-only (domain.md roles).
- No new dependencies; no new events or commands (all exist).

## Context
Phase 7 (`useBedActions`, sheets), Phase 9 (worklist/tabs), `src/domain/commands/transfers.ts`, `src/simulator/scenarios/policies/transfersFlow.ts`, `specs/domain.md` → KPIs → Transfers, Alert Rules, Roles.
