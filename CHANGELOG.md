# Changelog

<!-- last-commit: 7e21f2cdae648a705f955e6dfdd1a30d3653768e -->

## 2026-10-21

- Alert engine: the six rules of the hospital contingency plan (ED triage target breaches, long boarding, beds pending cleaning too long, transfers not picked up in time, full units with open requests, negative bed balance) are evaluated every simulated minute; alerts are raised, escalated and resolved automatically and every change is logged
- Alert bell and centre: the bell counts unacknowledged alerts, coloured by the worst; the centre lists open alerts (critical first, then oldest) with filters by severity and area, an Reconocer action that records who and when, a link to the area and the recently resolved ones. Each role only sees the alerts of its areas and nurse supervisors only those of their own unit
- Hospital status level (Normal / Alerta / Crítico) in the top bar, computed from occupancy, boarding count and longest boarding, with the reasons shown on the overview
- Control tower overview: status level, headline KPIs of beds, admissions, Urgencias, transfers and alerts (each linking to its dashboard), the open alerts as the attention list, and 24-hour charts (ED % seen within target, admissions and discharges per hour)
- Modo pantalla (/pantalla): full-screen dark wall display that rotates through the dashboards the role can open every N seconds, with pause, previous/next, full screen and Esc to exit
- Ajustes: thresholds card (status level limits, long-boarding hours, cleaning minutes, bed-balance limit, wall rotation seconds) with validation and restore defaults, shared across browser tabs
- Seguimiento de pacientes: search by NHC or name (accent- and case-insensitive) and an Amazon-style journey per patient — current location and situation, the next expected step with its ETA when the data has one, and a timeline from Urgencias arrival to discharge with the time each step took
- Journeys cover scheduled and urgent admissions, cancelled admissions with their reason, transfers (requested, picked up, delivered) and earlier episodes of the same patient
- Every dashboard row that identifies a patient (ED board and boarding list, bed sheet, bed requests, transfer queue, scheduled admissions, discharge worklist) links to the journey for roles that can open Seguimiento
- Privacy: the search text never goes in the URL; nurse supervisors only find and see episodes of their own unit; this is the one screen that shows full name and NHC
- Traslados dispatch board: six live indicators (open transfers, unassigned, median time to pickup, % picked up within SLA, free porters, completed today), a "Necesita atención" list for pickups past their SLA (critical when urgent) and the open queue — urgent first, then closest to its SLA — with the time left shown as text and icon
- Porters panel with who is available or busy and their current job; the head of admissions and bed managers can assign an available porter (suggested: free the longest), cancel a transfer before pickup and request a new transfer for an inpatient. Management sees it read-only
- "Mi cola" for porters: their own job with the next step (Recoger → Entregar) and the open queue to accept from while available; a porter can only act on their own jobs
- Reserving a bed now automatically requests the admission transfer (urgent for P1 requests); the Celador/a login is linked to a porter
- Ingresos y altas page: six live indicators (admissions today, scheduled still pending, discharges done vs expected, % of discharges before 12:00, bed balance, scheduled admissions cancelled for lack of a bed) and a "Necesita atención" list for bed-balance deficits, scheduled patients waiting too long for a bed and discharge orders that were not carried out
- The day's scheduled admissions with their state (pending, arrived, bed reserved, admitted, cancelled with the reason), discharges per unit, and a bed-balance forecast for today with its breakdown and a deficit warning
- Discharge worklist (today, ordered, coming days, no date): the head of admissions and nurse supervisors (own unit only) can set or edit the expected discharge and order the discharge; management and bed managers see it read-only. Each action is logged under the name of the person who made it
- Expected discharges must be in the future and at most 7 days ahead; a nurse supervisor without a unit sees nothing
- Urgencias dashboard: six live indicators (patients present, waiting for triage, waiting for a physician, pending admission, longest wait for a bed, % seen within target) and a "Necesita atención" list for patients waiting longer than their Manchester target and for boarders over 4 h (critical over 8 h)
- ED board in four columns — Llegada, Triado, En atención, Pendiente de ingreso — with each patient's Manchester level as colour and number, initials, complaint, area and time in the phase; names and NHC only in the tooltip
- Boarding list with the time since the admit decision and the bed request state (no bed, bed reserved, on its way), longest wait first; the head can jump to Camas to assign a bed
- Chart of the % of patients seen within their target, hour by hour over the last 24 hours, with the 85 % objective line and a table for screen readers
- Late waits now show an icon and a text alternative as well as colour; every ED threshold means "over" (exactly at the limit is not late yet)
- New shared widgets: Manchester triage badge and a trend chart (Recharts)
- Bed requests on Camas: a "Solicitudes de cama" list with every open request (most urgent first, then longest wait), showing patient initials, where it comes from, the specialty, unit type, isolation and how long it has waited
- "Asignar cama" opens a side sheet with ranked suggestions — same specialty first, outlier beds after (never for Pediatría, Ginecología y Obstetricia or Psiquiatría), isolation beds only when needed — and reserves the chosen bed with a confirmation message
- Every bed on a unit's map opens a sheet with the actions that fit its state: block (with a reason), release a reservation, start or finish cleaning, unblock
- Roles: the head of admissions and bed managers can do everything; nurse supervisors can start and finish cleaning in their own unit only; ED coordination and management are read-only. Every action is logged under the name of the person who did it
- New "Rotación de cama" indicator: median time from discharge to bed cleaned today (target ≤ 90 min), and a "pendiente de limpieza" exception after 60 min (critical after 2 h)
- If the simulation or a colleague gets there first, the sheet explains it instead of failing silently, and a release can never cancel a newer reservation
- Bed census dashboard on Camas: six live KPIs (occupancy, free beds, pending cleaning, blocked, expected discharges today, outlier patients), a "Necesita atención" list (beds blocked > 72 h, units at 92 % or more, outliers) and a card per unit with its status breakdown
- Filters by building, unit type and specialty apply to everything on the page and are remembered per user
- Bed map per unit (`/camas/<unidad>`): every bed by room with its status, patient initials, length of stay and expected discharge; full name and NHC only in the tooltip
- Everything updates live while the simulation runs
- Nurse supervisors go straight to their own unit and cannot open another; a supervisor without a unit sees nothing instead of the whole hospital
- Reusable dashboard components (KPI tiles, exception list, status badges) and duration/date formatting for the next dashboards
- The hospital comes alive: a simulated clock with play/pause and speeds 1×, 10×, 60× and 300× in the top bar (Jefe/a de Admisión only; every role sees the live time, also on phones)
- "Normal day" scenario: ED arrivals by hour of day, triage and assessment against Manchester targets, admission decisions, bed reservations, porter transfers, scheduled admissions, expected discharges, cleaning and occasional bed blocks — all through the same validated commands a real system would use
- Every change is recorded as an event together with the state it causes; the simulated time survives reloads and a second tab follows it live; only one tab runs the simulation
- Same seed, same day: the event sequence is identical whatever the speed
- Ajustes → "Registro de eventos": live log of every event in Spanish, with filters by type, entity and period, and "Cargar más"
- Cancelling an admission or releasing a bed also cancels its pending transfer and frees the porter
- Start, pause and speed changes are logged under the name of the user who made them
- Restablecer demo stops the simulation and returns the clock to 08:00
- Simulated login: pick a fictitious user per role (clearly labelled "Acceso simulado — sin contraseña"); nurse supervisors also choose their unit
- Each role sees only its areas: Jefe/a de Admisión everything, Dirección everything except Ajustes, Celador/a only Traslados, and so on; opening a forbidden page redirects to the role's home with a notice
- User menu in the top bar shows name, role and unit, with "Cerrar sesión"; the session survives a reload
- Nurse supervisors see a "Mostrando solo: <unidad>" notice on Camas; dashboards will use this unit scope
- Restablecer demo signs everyone out, since the simulated users are regenerated
- Tests for access rules, session, guards, login and navigation, plus end-to-end login flows
- Synthetic hospital seed validated and released (Phase 3)

## 2026-10-20

- The app now opens on a realistic, fictitious hospital at 08:00 today (Madrid time): ~600 beds at 85 % occupancy across 20 units, inpatients with expected discharges, ~40 ED patients by Manchester level (8 waiting for a ward bed), scheduled admissions, porters and users — loaded automatically on first launch
- Same seed, same hospital: names, ids and states are reproducible for repeatable demos; only the dates follow the current day
- Ajustes → "Datos de demostración": choose a seed and "Restablecer demo" (with confirmation) to rebuild the hospital; every open tab updates live
- Each reset is recorded as a single "DemoSeeded" event, and two tabs opening at once can never seed twice
- The hospital's structure is described in one data file, ready to be replaced with the real hospital's figures
- Local database in the browser (IndexedDB) for the whole hospital model — services, units, beds, patients, ED visits, admissions, bed requests, transfers, porters, users, alerts and simulator state — plus an append-only event log; everything works offline
- Every change is recorded as an event and saved together with the resulting state, all or nothing
- Hospital rules built in: valid status changes for beds, ED visits, admissions and transfers (e.g. a bed must be cleaned before it is free again)
- Storage is swappable: an in-memory version for tests, the same behaviour verified for both, and a draft PostgreSQL schema for the post-MVP hospital server
- Ajustes shows a live "Base de datos local" card: data source, schema version and record counts per table
- Clear error page if the data source is misconfigured
- Installable, offline-capable web app (PWA) with "Actualización disponible" and "Lista para usar sin conexión" notices
- App shell: collapsible sidebar (icons on tablets, slide-out menu on phones), top bar with hospital status level, simulated clock, alerts and user placeholders, and the permanent "Entorno de demostración — datos ficticios" banner
- Placeholder pages for Torre de control, Camas, Urgencias, Ingresos y altas, Traslados, Seguimiento and Ajustes, plus a 404 page
- Light, dark and system themes, remembered between visits; status and Manchester triage colours meeting WCAG AA contrast
- All interface text in Spanish, centralised in one file
- Project foundation: React + TypeScript + Vite, Tailwind CSS and shadcn/ui, linting, unit/component tests and end-to-end smoke tests
- Product specs, roadmap and development workflow skills
