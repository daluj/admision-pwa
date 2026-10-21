# Requirements: Simulated Login & Roles

**Roadmap phase:** 4 — Simulated Login & Roles
**Branch:** `phase-4-simulated-login-roles`
**Status:** Draft — 2026-10-21

## Scope

Show how each role sees the hospital. A clearly labelled **simulated** login lets the presenter pick a fictitious user; the session drives role-based navigation, route guards and (for nurse supervisors) a unit scope that later dashboards consume. No real authentication (see `specs/mission.md` non-goals).

### Included

- `/login` page (outside the app shell): one card per role, built from the seeded `users` table, with a permanent "Acceso simulado — sin contraseña" label. `NURSE_SUPERVISOR` card has a unit `<select>` (only units that have a supervisor), then "Entrar".
- Session = `{ userId }` in `localStorage` (key `torre-control.session`, every access in try/catch). Resolved against the DB on each load: a missing user (e.g. after "Restablecer demo" with another seed) clears the session and redirects to `/login`.
- Logout from the user menu (top bar); user menu shows display name, role label and, for supervisors, the unit.
- Route guards: unauthenticated → `/login`; authenticated but area not allowed → role home page (with toast "No tienes acceso a esa sección").
- Role-based navigation: sidebar and mobile nav show only allowed areas.
- `useSession()` (`user`, `role`, `unitId`, `can(area)`, `logout()`) and `useUnitScope()` (`unitId | null`) for later dashboards. Real unit filtering of data lands in Phases 6–9.
- Nurse supervisor on `/camas` placeholder shows a scope notice with the unit name ("Mostrando solo: <unidad>").
- `/login` while authenticated → redirect to role home.

### Not included

- Passwords, permissions at action level (reserve/assign/block — Phases 7+), Row Level Security, audit log (Phase 17).
- Filtering real data by unit (Phases 6–9); simulator controls visibility (Phase 5).

### Area access (from `specs/domain.md` → Roles)

| Role | Areas | Home |
|---|---|---|
| `ADMISSIONS_HEAD` | all (incl. Ajustes) | `/` |
| `MANAGEMENT` | all except Ajustes (read-only) | `/` |
| `BED_MANAGER` | Overview, Camas, Ingresos y altas, Traslados, Seguimiento | `/` |
| `ED_COORDINATOR` | Overview, Urgencias, Camas, Seguimiento | `/urgencias` |
| `NURSE_SUPERVISOR` | Camas, Ingresos y altas, Seguimiento | `/camas` |
| `PORTER` | Traslados | `/traslados` |

Single source: a `ROLE_AREAS: Record<Role, readonly AreaId[]>` map (replaces the reserved `roles?` field on `NavItem`) plus `ROLE_HOME`.

### Routes

| Route | Access |
|---|---|
| `/login` | public |
| everything else | authenticated + area allowed |
| `*` (404) | authenticated |

## Decisions

- **Users are data.** Login cards come from the seeded `users` repository, not hard-coded lists, so the session stays consistent with the database. Reset with another seed logs out.
- **Session in localStorage, not the DB.** It is per-browser UI state; no schema change, no Dexie version bump.
- **Unit scoping is a hook only** in this phase; dashboards adopt `useUnitScope()` when they exist.
- **Guards in the route tree** (layout route loader/component using the session context), not per page. `PAGE_LOADERS` stays one per `AreaId`.
- No new dependencies.

## Context

- Roles/users: `src/domain/schemas/user.ts`, seed users in `src/simulator/seed/generateStructure.ts` (1 per role + 1 supervisor per ward/critical unit).
- Existing shell: `src/components/layout/` (`UserMenu` currently static "Invitado"), `src/components/layout/nav.ts`, `src/app/routes.tsx`.
- Demo story: open the app → login screen → "Jefe/a de Admisión" sees everything → logout → "Celador/a" sees only Traslados → "Supervisor/a" of a unit sees Camas scoped to that unit.
- Copy: Spanish in `src/i18n/es.ts` (`login`, `roles`, `topBar.user`, `errors.forbidden`).
