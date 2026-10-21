# Requirements: Patient Journey Tracking

**Roadmap phase:** 11 — Patient Journey Tracking ("Track & Trace")
**Branch:** `phase-11-patient-journey`
**Status:** Complete — 2026-10-21

> Autonomous run (phases 9–12): no interview; the "Recommended" options of earlier interviews were applied. Choices are listed under **Decisions**.

## Scope

Amazon-style tracking for one patient: find them, see where they are, what already happened with durations, and what comes next.

### Included

**1. Search** (`/seguimiento`)
- One search box: NHC (synthetic `SIM-…`) or name; case- and accent-insensitive; every word must match first name, last name or NHC (prefix match). Minimum 2 characters. At most 20 results, most recently active first.
- A result row: initials, NHC, current status chip ("En Urgencias · pendiente de ingreso", "Ingresado · 512-A", "Alta", "Sin episodio activo"), link to the journey.
- Empty states: nothing typed, no match.

**2. Journey** (`/seguimiento/:patientId`)
- Header: full name, NHC, age (from `birthYear`), sex, and the **current location** + **status** with time in it.
- **Timeline** of the most relevant episode (the active one, else the latest), ordered by time. Steps (each with time, and the duration since the previous step):
  ED: *Llegada a Urgencias*, *Triaje* (level), *Atención médica*, *Decisión de ingreso*, *Salida de Urgencias* (outcome).
  Admission: *Ingreso programado* (planned time), *Solicitud de cama*, *Cama reservada* (bed), *Traslado solicitado / recogido / entregado*, *Ingreso en planta* (bed), *Alta prevista*, *Alta ordenada*, *Alta*, or *Ingreso cancelado* (reason).
  Steps done show their time and duration; the **current** step is highlighted with the elapsed time; **upcoming** steps are listed greyed with the expected time when the data has one.
- **Next expected step and ETA**: derived from the state (waiting for triage → triage; admit decision → bed; bed reserved → arrival ETA `etaAt`; transfer open → pickup due `slaDueAt`; admitted → expected discharge `expectedDischargeAt`; discharge ordered → discharge). No invented ETAs: when nothing in the data gives one, only the next step name is shown.
- Previous episodes of the same patient are listed below (collapsed) with their date and outcome; each opens its own timeline.

**3. Deep links** — every dashboard row that identifies a patient links to their journey: ED board cards and boarding table, bed map (occupied/reserved bed sheet), bed requests, transfer queue (and Mi cola is not linked: porters have no access), discharge worklist, scheduled admissions. Links are shown only to roles that can open Seguimiento.

**4. Pure logic** — `src/domain/kpis/journey.ts`: `searchPatients`, `buildJourney` (steps, current location, status, next step/ETA). Definitions in `specs/domain.md`.

### Not included
- Editing anything from the journey (read-only), alerts on journeys (Phase 12), printing/export, cross-hospital history, charts.

### Routes / roles
`/seguimiento` and `/seguimiento/:patientId`, guard `tracking` (head, management, bed manager, ED coordination, nurse supervisor; porters do not have it). **Nurse supervisors are scoped to their unit**: search and journeys only cover patients whose admission bed is in their unit; fail closed without a unit (UI-only until Phase 17, like the other dashboards).

## Decisions (autonomous)
- **The timeline is built from the entities' timestamps** (`EdVisit`, `Admission`, `BedRequest`, `TransferRequest`), which are the projection of the events: this works for the seeded history (which has no events) and does not depend on the event-log window. Events are used for one thing only: the *Cama reservada* time (`BedReserved`, matched by `admissionId`, from the latest 5,000 events); without it the step is shown without a time.
- **This is the one screen that shows full name and NHC** (needed to confirm you are looking at the right patient). Everywhere else initials stay the rule; links from dashboards carry only the patient id in the URL.
- Search by NHC or name only; no filters.
- Previous episodes are shown, not merged into one timeline.
- No new dependencies, no new events, commands or schema changes.

- **The search text never goes in the URL** (it can be a name or NHC): it lives in component state and is carried through router state so "Volver a la búsqueda" restores it. Episode ids and patient ids are the only things in Seguimiento URLs.
- A nurse supervisor sees only the **episodes** that took place in a bed of their unit (not the patient's other episodes); dashboard links are hidden for them except on their own unit's bed map.
- The admission transfer is matched by destination bed (the bed the admission had or was offered) inside the admission's own time window, because transfers carry no admission id.

## Context
Phase 8/9/10 dashboards (row shapes), `specs/domain.md` → state machines (ED visit, Admission, Transfer), Events and payloads.
