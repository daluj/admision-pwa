# Domain Model

The shared language of the project. Code uses the **English** names; the UI shows the **Spanish** labels. When a feature changes an entity, state machine, event or KPI, update this file in the same branch (see the `data-model-change` skill).

## Glossary

| Code term (EN) | UI label (ES) | Meaning |
|---|---|---|
| Unit | Unidad / Planta | A ward or care unit with beds (e.g. Medicina Interna 5ª Norte, UCI). |
| Specialty | Servicio / Especialidad | Clinical service responsible for a patient (Cardiología, Cirugía General…). |
| Bed | Cama | A physical bed in a unit. |
| Census | Censo | Patients currently occupying beds. |
| Occupancy | Ocupación | Occupied beds / operational beds. |
| Operational bed | Cama operativa | A bed that is not blocked. |
| Outlier patient | Paciente ectópico | Inpatient placed in a unit belonging to a different specialty. |
| ED visit | Episodio de Urgencias | A patient's stay in the Emergency Department. |
| Triage level | Nivel de triaje | Manchester Triage System level 1–5. |
| Boarding | Pendiente de ingreso / Ingreso pendiente de cama | ED patient with an admission decision still waiting for a ward bed. |
| Admission | Ingreso | An inpatient episode. Type: `URGENT` (from ED) or `SCHEDULED` (programado). |
| Bed request | Solicitud de cama | Request to place a patient (from ED, scheduled admission or transfer). |
| Expected discharge | Alta prevista | Planned discharge date/time set by the unit. |
| Discharge | Alta | End of an inpatient episode. |
| Discharge before noon | Alta antes de las 12:00 | Discharges completed before 12:00 — key input metric. |
| Bed turnaround | Tiempo de rotación de cama | Time from discharge to bed available again (includes cleaning). |
| Transfer | Traslado interno | Physical movement of a patient between locations, executed by a porter. |
| Porter | Celador/a | Staff who moves patients. |
| Length of stay (LOS) | Estancia | Time in ED or in hospital. |
| Hospital status level | Nivel de alerta del hospital | Normal / Alerta / Crítico, derived from KPIs (mirrors a hospital contingency plan). |
| Event | Evento | Immutable record of something that happened. |

## Entities

All entities have `id: string`, `createdAt`, `updatedAt` (ISO UTC). Patient data is **synthetic** in the MVP.

| Entity | Key fields |
|---|---|
| **Specialty** | `code` (e.g. `CAR`), `name` |
| **Unit** | `code`, `name`, `building`, `floor`, `type` (`WARD` \| `ICU` \| `INTERMEDIATE` \| `ED` \| `OTHER`), `specialtyCodes[]`, `capacity` |
| **Bed** | `unitId`, `label` (e.g. `512-A`), `status` (see state machine), `patientId?`, `admissionId?`, `isolation?: boolean`, `blockedReason?`, `statusChangedAt` |
| **Patient** | `mrn` (NHC — synthetic), `firstName`, `lastName`, `sex` (`F` \| `M` \| `X`), `birthYear` |
| **EdVisit** | `patientId`, `arrivedAt`, `phase` (see state machine), `triageLevel?: 1..5`, `triagedAt?`, `seenAt?`, `admitDecisionAt?`, `area` (`BOXES` \| `OBSERVATION` \| `RESUS` \| `WAITING_ROOM`), `chiefComplaint`, `targetSpecialtyCode?`, `endedAt?`, `outcome?` (`ADMITTED` \| `DISCHARGED_HOME` \| `LWBS` \| `TRANSFERRED_OUT` \| `DECEASED`) |
| **Admission** | `patientId`, `type` (`URGENT` \| `SCHEDULED`), `specialtyCode`, `status` (see state machine), `scheduledFor?`, `admittedAt?`, `bedId?`, `expectedDischargeAt?`, `dischargeOrderedAt?`, `dischargedAt?`, `edVisitId?` |
| **BedRequest** | `admissionId`, `requestedAt`, `priority` (`P1` urgent \| `P2` \| `P3`), `requiredUnitType`, `preferredSpecialtyCode`, `isolationRequired`, `status` (`OPEN` \| `ASSIGNED` \| `FULFILLED` \| `CANCELLED`), `assignedBedId?`, `etaAt?` |
| **TransferRequest** | `patientId`, `fromLocation`, `toLocation`, `reason` (`ADMISSION` \| `INTER_UNIT` \| `TEST` \| `SURGERY` \| `RETURN`), `priority` (`URGENT` \| `NORMAL`), `requestedAt`, `status` (see state machine), `porterId?`, `assignedAt?`, `pickedUpAt?`, `deliveredAt?`, `slaDueAt` |
| **Porter** | `name`, `shift` (`MORNING` \| `AFTERNOON` \| `NIGHT`), `status` (`AVAILABLE` \| `BUSY` \| `OFF_SHIFT`) |
| **User** (simulated) | `username`, `displayName`, `role`, `unitId?` (for nurse supervisors) |
| **HospitalEvent** | `id` (UUID), `seq` (monotonic, gap-free, assigned by the event store), `type`, `occurredAt`, `actor` (`userId` \| `"simulator"`), `entityType`, `entityId`, `payload` (typed per event, see Event payloads) |
| **Alert** | `ruleId`, `severity` (`INFO` \| `WARNING` \| `CRITICAL`), `entityType`, `entityId`, `message`, `raisedAt`, `acknowledgedAt?`, `acknowledgedBy?`, `resolvedAt?` |
| **SimulationState** | singleton (`id: "current"`): `seed`, `scenarioId`, `speed`, `running`, `simNow` (simulated clock), `startedAt` |

**Unique fields** (enforced by every adapter): `Specialty.code`, `Unit.code`, `Patient.mrn`, `User.username`. `Alert.entityType` and `HospitalEvent.entityType` use the same entity-type enum (`Specialty`, `Unit`, `Bed`, …, `SimulationState`).

Locations (`fromLocation`, `toLocation`) are `{ kind: 'BED' | 'ED' | 'RADIOLOGY' | 'OR' | 'OTHER', refId?, label }`.

## State Machines

Transitions not listed are invalid and must be rejected by domain commands (unit-tested).

### Bed

```
AVAILABLE ──reserve──▶ RESERVED ──occupy──▶ OCCUPIED ──discharge──▶ PENDING_CLEANING ──startCleaning──▶ CLEANING ──finishCleaning──▶ AVAILABLE
RESERVED ──release──▶ AVAILABLE
AVAILABLE | PENDING_CLEANING | CLEANING ──block──▶ BLOCKED ──unblock──▶ AVAILABLE
OCCUPIED ──transferOut──▶ PENDING_CLEANING
```
UI labels: Libre, Reservada, Ocupada, Pendiente de limpieza, En limpieza, Bloqueada.

### EdVisit phase

```
ARRIVED ─▶ TRIAGED ─▶ IN_ASSESSMENT ─▶ ADMIT_DECISION (boarding) ─▶ LEFT_ED (outcome ADMITTED)
                          └──────────▶ LEFT_ED (outcome DISCHARGED_HOME | TRANSFERRED_OUT | DECEASED)
ARRIVED | TRIAGED ─▶ LEFT_ED (outcome LWBS)
```
UI labels: Llegada, Triado, En atención, Pendiente de ingreso, Fuera de Urgencias.

### Admission

```
SCHEDULED ─▶ AWAITING_BED ─▶ BED_ASSIGNED ─▶ IN_TRANSFER ─▶ ADMITTED ─▶ DISCHARGE_ORDERED ─▶ DISCHARGED
(URGENT admissions start at AWAITING_BED)
SCHEDULED | AWAITING_BED | BED_ASSIGNED ─▶ CANCELLED
BED_ASSIGNED ─▶ AWAITING_BED   (reservation released)
```

### TransferRequest ("order tracking")

```
REQUESTED ─▶ ASSIGNED ─▶ PICKED_UP ─▶ DELIVERED
REQUESTED | ASSIGNED ─▶ CANCELLED
```
UI labels: Solicitado, Asignado, En camino, Entregado, Cancelado.

## Events

Event `type` is `PascalCase` past tense. Each has a Zod payload schema in `src/domain/schemas/events.ts`. The HL7 v2 ADT column documents the future integration mapping.

| Event | Produced by | HL7 v2 ADT (future) |
|---|---|---|
| `EdPatientArrived` | ED registration | A04 |
| `EdPatientTriaged` | Triage | A08 |
| `EdAssessmentStarted` | Physician sees patient | A08 |
| `AdmissionDecided` | ED physician | A08 / A14 (pending admit) |
| `EdPatientLeft` | ED discharge / LWBS / admitted | A03 (ED) |
| `ScheduledAdmissionCreated` | Admissions | A05 (pre-admit) |
| `BedRequested` | Admissions | — |
| `BedReserved` / `BedReservationReleased` | Bed manager | — |
| `PatientAdmitted` | Patient arrives in bed | A01 |
| `ExpectedDischargeSet` | Unit supervisor | A08 |
| `DischargeOrdered` | Physician | A16 (pending discharge) |
| `PatientDischarged` | Unit | A03 |
| `PatientTransferredBetweenBeds` | Admissions | A02 |
| `BedCleaningStarted` / `BedCleaningFinished` | Housekeeping | — |
| `BedBlocked` / `BedUnblocked` | Bed manager | — |
| `TransferRequested` / `TransferAssigned` / `TransferPickedUp` / `TransferDelivered` / `TransferCancelled` | Transfer coordination / porters | — |
| `AdmissionCancelled` | Admissions | A11 |
| `AlertRaised` / `AlertAcknowledged` / `AlertResolved` | Alert engine / users | — |
| `DemoSeeded` | Demo seed / "Restablecer demo" (always seq 1 after a reset) | — |
| `SimulationStarted` / `SimulationPaused` / `SimulationSpeedChanged` | Simulator controls (Admissions head) | — |

### Event payloads

`entityType` / `entityId` identify the aggregate the event belongs to; the payload carries only what the event adds. Timestamps not in the payload are the event's `occurredAt` (e.g. `EdPatientTriaged.occurredAt` becomes `EdVisit.triagedAt`).

| Event | `entityType` | Payload |
|---|---|---|
| `EdPatientArrived` | EdVisit | `patientId`, `area`, `chiefComplaint` |
| `EdPatientTriaged` | EdVisit | `triageLevel`, `area?` |
| `EdAssessmentStarted` | EdVisit | — |
| `AdmissionDecided` | EdVisit | `admissionId`, `targetSpecialtyCode` |
| `EdPatientLeft` | EdVisit | `outcome` |
| `ScheduledAdmissionCreated` | Admission | `patientId`, `specialtyCode`, `scheduledFor` |
| `BedRequested` | BedRequest | `admissionId`, `priority`, `requiredUnitType`, `preferredSpecialtyCode`, `isolationRequired` |
| `BedReserved` | Bed | `bedRequestId`, `admissionId`, `etaAt?` |
| `BedReservationReleased` | Bed | `bedRequestId?`, `reason?` |
| `PatientAdmitted` | Admission | `patientId`, `bedId` |
| `ExpectedDischargeSet` | Admission | `expectedDischargeAt` |
| `DischargeOrdered` | Admission | — |
| `PatientDischarged` | Admission | `bedId` |
| `PatientTransferredBetweenBeds` | Admission | `fromBedId`, `toBedId` |
| `BedCleaningStarted` / `BedCleaningFinished` | Bed | — |
| `BedBlocked` | Bed | `reason` |
| `BedUnblocked` | Bed | — |
| `TransferRequested` | TransferRequest | `patientId`, `fromLocation`, `toLocation`, `reason`, `priority`, `slaDueAt` |
| `TransferAssigned` | TransferRequest | `porterId` |
| `TransferPickedUp` / `TransferDelivered` | TransferRequest | — |
| `TransferCancelled` | TransferRequest | `reason?` |
| `AdmissionCancelled` | Admission | `reason` (`NO_BED` \| `PATIENT` \| `CLINICAL` \| `OTHER`) |
| `AlertRaised` | Alert | `ruleId`, `severity`, `entityType`, `entityId`, `message` |
| `AlertAcknowledged` | Alert | `acknowledgedBy` |
| `AlertResolved` | Alert | — |
| `DemoSeeded` | SimulationState (`current`) | `seed`, `profileId`, `anchorAt`, `counts` (rows per entity) |
| `SimulationStarted` / `SimulationPaused` | SimulationState (`current`) | — |
| `SimulationSpeedChanged` | SimulationState (`current`) | `speed` (1 \| 10 \| 60 \| 300) |

**Exception to "every state change appends an event":** the advance of `SimulationState.simNow` while the simulator runs is the clock, not a domain fact, so it is persisted as a state-only change (`advanceSimulation`). Control actions (start, pause, speed) do append events.

## KPIs

Calculators are pure functions in `src/domain/kpis/`, taking entities + `now` and returning numbers; unit-tested with fixtures.

### Beds
- **Occupancy %** = occupied ÷ operational beds (hospital, per unit, per specialty). *Operational* = not `BLOCKED`; *occupied* = status `OCCUPIED` (reserved beds are not occupied yet).
- **Beds by status** (count per status). *Libres* = `AVAILABLE`; *pendientes de limpieza* = `PENDING_CLEANING` (beds being cleaned, `CLEANING`, are shown separately).
- **Expected discharges today** (admissions with `expectedDischargeAt` on the local day, whether already discharged or not) and **completed discharges today** (`dischargedAt` on the local day). "Today" is the local day in `Europe/Madrid` of the simulated time.
- **Bed turnaround (median, min)** = `BedCleaningFinished.occurredAt − PatientDischarged.occurredAt` for the same bed. Dashboards show the **median of the cleanings finished today** (local day of the simulated time, beds in scope), derived from the event log; target ≤ 90 min (warn ≥ 90, critical ≥ 150). Cleanings whose discharge is not in the loaded events are ignored.
- **Outlier patients** count = inpatients (`ADMITTED` / `DISCHARGE_ORDERED`) in a `WARD` unit whose `specialtyCodes` do not include the admission's specialty (ICU and intermediate units never count).
- **Average LOS** of current inpatients (days).

### Emergency Department
- **Patients present** by phase and by triage level (visits not `LEFT_ED`).
- **Time to triage** and **time to physician** (median, minutes) vs targets. Wait to physician = `seenAt − triagedAt` (for patients still waiting: `now − triagedAt`).
- **% seen within target** by triage level. Manchester targets: L1 0 min, L2 10 min, L3 60 min, L4 120 min, L5 240 min (configurable). The dashboard tile and chart cover **L2–L5 patients seen in the last 24 simulated hours**; L1 must be seen immediately, so it is not a statistic: any L1 waiting for a physician is a critical exception. Tile status: ok ≥ 85 %, warn ≥ 70 %, critical < 70 %.
- **Boarding count** and **boarding time** (now − `admitDecisionAt`): median and longest. Dashboard tiles: boarding count warn > 10 / critical > 20 (hospital status level); longest boarding warn > 4 h / critical > 8 h (the `BOARDING_LONG` rule). Every ED threshold is strict ("over"): a patient exactly at the target, or boarding exactly 4 h, is not late yet — tiles, cards and exceptions agree.
- **Hourly series** (chart): for each of the last 24 clock hours (Europe/Madrid), the share of L2–L5 patients seen in that hour (by `seenAt`) within target; hours without patients have no value.
- **ED LOS** (median, hours); **LWBS** count today.

### Admissions & Discharges
- **Admissions today** (`admittedAt` on the local day) split `URGENT` / `SCHEDULED`; **scheduled pending arrival** = scheduled for today and still `SCHEDULED` (arrived ones are `AWAITING_BED` onwards).
- **Discharges today** done (`dischargedAt` today) vs expected (`expectedDischargeAt` today); **% discharges before 12:00** = completed today before 12:00 (Europe/Madrid) ÷ completed today; objective ≥ 30 % (warn ≥ 15 %).
- **Bed balance forecast** = available beds now + expected discharges remaining today (expected today, still in bed) − (boarding patients **without a reserved bed** + scheduled admissions pending today) — a boarder whose bed is already reserved is not counted twice, because that bed is no longer free. Negative → deficit warning (`BED_BALANCE_NEGATIVE`: warn < 0, critical < −10). Unit-level variant for nurse supervisors: the unit's free beds and pending discharges, minus scheduled and boarding patients bound for the unit's specialties.
- **Cancelled scheduled admissions due to no bed** (today): `AdmissionCancelled` events with reason `NO_BED` (the reason lives in the event, not on the admission).
- **Expected-discharge rules**: only `ADMITTED` patients can have their expected discharge set or edited (future time, at most 7 days ahead); `ordering` the discharge moves them to `DISCHARGE_ORDERED`.

### Transfers
- **Open requests** by status; **median time to pickup**; **% within SLA** (default SLA: URGENT 10 min, NORMAL 30 min to pickup); **porters available / busy**.

### Hospital status level
- `NORMAL`, `ALERT`, `CRITICAL` computed from configurable thresholds (defaults: occupancy ≥ 92% → ALERT, ≥ 97% → CRITICAL; boarding > 10 patients or longest boarding > 6 h → ALERT; > 20 or > 12 h → CRITICAL). Highest triggered level wins.

## Alert Rules (defaults, configurable in Settings)

| Rule id | Condition | Severity |
|---|---|---|
| `ED_TRIAGE_TARGET_BREACH` | Patient waiting for physician beyond their triage level target | WARNING (L3–5) / CRITICAL (L1–2) (the ED dashboard exceptions mirror this rule and `BOARDING_LONG`) |
| `BOARDING_LONG` | Boarding > 4 h (WARNING), > 8 h (CRITICAL) | WARNING / CRITICAL |
| `BED_PENDING_CLEANING_LONG` | Bed in PENDING_CLEANING > 60 min | WARNING (the dashboard exception also turns CRITICAL > 120 min) |
| `TRANSFER_SLA_BREACH` | Transfer not picked up by `slaDueAt` | WARNING (NORMAL) / CRITICAL (URGENT) |
| `UNIT_FULL` | Unit occupancy 100% with open bed requests for its specialty | WARNING |
| `BED_BALANCE_NEGATIVE` | Bed balance forecast < 0 | WARNING; < −10 CRITICAL |

Alerts are raised and resolved automatically by an evaluator that runs on every event batch; users can acknowledge them.

## Roles (simulated login)

| Role | UI label | Sees / can do |
|---|---|---|
| `ADMISSIONS_HEAD` | Jefe/a de Admisión | Everything; settings; simulator controls |
| `BED_MANAGER` | Gestor/a de camas | Beds, admissions, transfers; reserve/assign/release/block/unblock beds and cleaning |
| `NURSE_SUPERVISOR` | Supervisor/a de enfermería | Own unit's beds and incoming patients; set expected discharges and order discharges for their own unit; start/finish cleaning on their own unit (no reserve/block) |
| `ED_COORDINATOR` | Coordinación de Urgencias | ED dashboard, boarding, bed requests |
| `PORTER` | Celador/a | Own transfer queue: accept, pick up, deliver |
| `MANAGEMENT` | Dirección | Overview and all dashboards, read-only |

## Synthetic Hospital (seed)

Configurable in `src/simulator/seed/hospital.ts`. Default: a tertiary hospital of **~600 inpatient beds in ~20 units** across 2 buildings, plus ED with ~40 treatment spaces, ICU (~20 beds), Coronary Unit (~10). Specialties: Medicina Interna, Cardiología, Neumología, Digestivo, Neurología, Nefrología, Oncología, Hematología, Geriatría, Cirugía General, Traumatología, Urología, Neurocirugía, Ginecología y Obstetricia, Pediatría, Psiquiatría. Starting occupancy ~85%; ~20 porters across shifts. Names are fictitious and generated from common Spanish first names/surnames by the seeded PRNG. Real figures for the hospital's structure will be provided later and must only change seed data, not code.

The seed is a **snapshot of the hospital at 08:00 Europe/Madrid of the current day** (anchor from the `Clock`), generated as a pure function of `(seed, anchor, profile)` and written by the `resetDemo` command as one `DemoSeeded` event plus all rows. "Restablecer demo" wipes the database (events included) first, so `DemoSeeded` is always `seq 1`. Default seed `42`; ids are PRNG-derived UUIDs, so the same seed yields the same hospital and only absolute dates move with the day. Live-state targets: occupancy 85 % ± 2 pp; ~2 % blocked, ~2 % pending cleaning, ~1 % cleaning; ~30 % of inpatients with expected discharge today; ~4 % outliers (adult general wards only, compatible specialties); ~40 ED patients with Manchester-consistent waits (~8 boarding with bed requests); ~15 scheduled admissions today; 2–4 open transfers. See `specs/2026-10-20-synthetic-seed/requirements.md` for the full table.
