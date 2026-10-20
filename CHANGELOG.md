# Changelog

<!-- last-commit: 58f51bf35574c3db2bd50cd786fd1ba650582d05 -->

## 2026-10-20

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
