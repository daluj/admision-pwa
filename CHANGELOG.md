# Changelog

<!-- last-commit: c25331856632ce74b67d19ba997a7f807a469891 -->

## 2026-10-21

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
