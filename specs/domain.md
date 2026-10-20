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

## KPIs

Calculators are pure functions in `src/domain/kpis/`, taking entities + `now` and returning numbers; unit-tested with fixtures.

### Beds
- **Occupancy %** = occupied ÷ operational beds (hospital, per unit, per specialty).
- **Beds by status** (count per status).
- **Expected discharges today** (with `expectedDischargeAt` today) and **completed discharges today**.
- **Bed turnaround (median, min)** = `BedCleaningFinished.occurredAt − PatientDischarged.occurredAt`.
- **Outlier patients** count.
- **Average LOS** of current inpatients (days).

### Emergency Department
- **Patients present** by phase and by triage level.
- **Time to triage** and **time to physician** (median, minutes) vs targets.
- **% seen within target** by triage level. Manchester targets: L1 0 min, L2 10 min, L3 60 min, L4 120 min, L5 240 min (configurable).
- **Boarding count** and **boarding time** (now − `admitDecisionAt`): median and longest.
- **ED LOS** (median, hours); **LWBS** count today.

### Admissions & Discharges
- **Admissions today** split `URGENT` / `SCHEDULED`; scheduled pending arrival.
- **Discharges today** done vs expected; **% discharges before 12:00**.
- **Bed balance forecast** = available beds now + expected discharges remaining today − (boarding patients + scheduled admissions pending today). Negative → deficit warning.
- **Cancelled scheduled admissions due to no bed** (today).

### Transfers
- **Open requests** by status; **median time to pickup**; **% within SLA** (default SLA: URGENT 10 min, NORMAL 30 min to pickup); **porters available / busy**.

### Hospital status level
- `NORMAL`, `ALERT`, `CRITICAL` computed from configurable thresholds (defaults: occupancy ≥ 92% → ALERT, ≥ 97% → CRITICAL; boarding > 10 patients or longest boarding > 6 h → ALERT; > 20 or > 12 h → CRITICAL). Highest triggered level wins.

## Alert Rules (defaults, configurable in Settings)

| Rule id | Condition | Severity |
|---|---|---|
| `ED_TRIAGE_TARGET_BREACH` | Patient waiting for physician beyond their triage level target | WARNING (L3–5) / CRITICAL (L1–2) |
| `BOARDING_LONG` | Boarding > 4 h (WARNING), > 8 h (CRITICAL) | WARNING / CRITICAL |
| `BED_PENDING_CLEANING_LONG` | Bed in PENDING_CLEANING > 60 min | WARNING |
| `TRANSFER_SLA_BREACH` | Transfer not picked up by `slaDueAt` | WARNING (NORMAL) / CRITICAL (URGENT) |
| `UNIT_FULL` | Unit occupancy 100% with open bed requests for its specialty | WARNING |
| `BED_BALANCE_NEGATIVE` | Bed balance forecast < 0 | WARNING; < −10 CRITICAL |

Alerts are raised and resolved automatically by an evaluator that runs on every event batch; users can acknowledge them.

## Roles (simulated login)

| Role | UI label | Sees / can do |
|---|---|---|
| `ADMISSIONS_HEAD` | Jefe/a de Admisión | Everything; settings; simulator controls |
| `BED_MANAGER` | Gestor/a de camas | Beds, admissions, transfers; reserve/assign/block beds |
| `NURSE_SUPERVISOR` | Supervisor/a de enfermería | Own unit's beds and incoming patients; set expected discharges; cleaning status |
| `ED_COORDINATOR` | Coordinación de Urgencias | ED dashboard, boarding, bed requests |
| `PORTER` | Celador/a | Own transfer queue: accept, pick up, deliver |
| `MANAGEMENT` | Dirección | Overview and all dashboards, read-only |

## Synthetic Hospital (seed)

Configurable in `src/simulator/seed/hospital.ts`. Default: a tertiary hospital of **~600 inpatient beds in ~20 units** across 2 buildings, plus ED with ~40 treatment spaces, ICU (~20 beds), Coronary Unit (~10). Specialties: Medicina Interna, Cardiología, Neumología, Digestivo, Neurología, Nefrología, Oncología, Hematología, Geriatría, Cirugía General, Traumatología, Urología, Neurocirugía, Ginecología y Obstetricia, Pediatría, Psiquiatría. Starting occupancy ~85%; ~20 porters across shifts. Names are fictitious and generated from common Spanish first names/surnames by the seeded PRNG. Real figures for the hospital's structure will be provided later and must only change seed data, not code.
