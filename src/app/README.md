# app

Application wiring: route table (`routes.tsx`) mapping each nav item in `src/components/layout/nav.ts` to a lazy-loaded feature page.

**May import:** `src/features/` (route pages only), `src/components/`.

**Guards (Phase 4):** the route tree is `SessionRoot` (provides the simulated session) → `/login` (public) or `RequireSession` → `AppShell` → one `RequireArea` per nav area. Allowed areas per role live in `src/domain/access.ts` (`ROLE_AREAS`, `ROLE_HOME`); a forbidden area redirects to the role's home with a toast.
