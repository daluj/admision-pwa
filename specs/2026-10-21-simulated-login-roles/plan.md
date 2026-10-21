# Plan: Simulated Login & Roles

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-4): group K – <name>`. UI follows `specs/ux-guidelines.md`. No schema change, so `data-model-change` is not needed.

## Group 1: Role Access Rules (domain)

1. `src/domain/access.ts` (pure TS): `ROLE_AREAS`, `ROLE_HOME`, `canAccess(role, area)`, `homeFor(role)`. `AreaId` type moves to the domain (or is imported type-only from `nav.ts` — avoid a domain → components import; define `AREA_IDS` in domain and derive `AreaId`).
2. `src/domain/access.test.ts`: matrix per role (table-driven), every role has ≥ 1 area, home ∈ allowed areas, MANAGEMENT lacks `settings`.

## Group 2: Session & Data Hooks

3. `src/data/hooks/index.ts`: add `useUsers()` (repository `user.observeList()`).
4. `src/features/auth/sessionStorage.ts`: `readSession()`, `writeSession(userId)`, `clearSession()` — localStorage in try/catch, validates shape with Zod.
5. `src/features/auth/SessionProvider.tsx` + `useSession.ts`: resolves `userId` against `useUsers()`; states `loading | anonymous | authenticated`; exposes `login(userId)`, `logout()`, `can(area)`; stale user ⇒ clear session.
6. `src/features/auth/useUnitScope.ts`: `unitId | null` (only non-null for `NURSE_SUPERVISOR`).
7. Tests: storage tolerates throwing/corrupt localStorage; provider resolves a valid user, drops an unknown one, login/logout persist.

## Group 3: Login Page

8. `src/i18n/es.ts`: `login` (title, "Acceso simulado — sin contraseña", per-role label/description, unit select label, "Entrar"), `roles` labels (match `specs/domain.md`), `errors.forbidden`, `topBar.user.logout`.
9. `src/features/auth/LoginPage.tsx` + `RoleCard.tsx`: card grid (1 col phone, 2 tablet, 3 desktop), demo banner visible, nurse-supervisor unit select, keyboard accessible; empty state if no users yet ("Cargando datos de demostración…").
10. Component tests: renders one card per role, supervisor requires a unit, submit calls `login` with the right user, redirects after login.

## Group 4: Guards & Routing

11. `src/app/routes.tsx`: add public `/login` route; `RequireSession` layout wraps `AppShell`; `RequireArea` per area route using `can()`; forbidden ⇒ `<Navigate to={homeFor(role)}>` + toast; `/login` when authenticated ⇒ role home. Loading state while session resolves (no login flash).
12. `src/app/routes.test.ts` + `src/test/renderApp.tsx`: helper option `{ as: Role | userId }` that seeds the memory backend and preloads the session.
13. Tests: anonymous → `/login`; each role reaching an allowed and a forbidden path; 404 only when authenticated.

## Group 5: Role-Based Navigation & User Menu

14. `src/components/layout/nav.ts`: drop reserved `roles?`; `Sidebar`/`MobileNav`/`NavList` filter by `can(area)`.
15. `UserMenu.tsx`: dropdown (shadcn `dropdown-menu`) with name, role, unit (supervisor), "Cerrar sesión"; replace static "Invitado".
16. Nurse supervisor notice on `src/features/beds/BedsPage.tsx` using `useUnitScope()` + `useUnits()` ("Mostrando solo: <unidad>").
17. Update existing shell/sidebar tests for the logged-in default; add nav-by-role tests.

## Group 6: E2E & Docs

18. `e2e/auth.spec.ts`: login as Jefe/a → all 7 nav items; logout; login as Celador/a → only Traslados, `/ajustes` redirects to `/traslados`; supervisor → scope notice; session survives reload; reset demo with seed 7 ⇒ back to `/login`. Update `e2e/shell.spec.ts` to log in first.
19. READMEs (`src/features`, `src/app`, `src/components/layout`): session, guards, `useSession`/`useUnitScope`. Note the `AreaId`/`ROLE_AREAS` source of truth in `specs/tech-stack.md` folder layout (`features/auth/`) if wording changes.
