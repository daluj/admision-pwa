# features

One folder per area: `overview/`, `beds/`, `emergency/`, `admissions/`, `transfers/`, `tracking/`, `settings/` (and `auth/` from Phase 4). Each exposes a route page `<Area>Page.tsx` (default export for lazy loading) plus its own `components/`.

**May import:** `src/components/`, `src/data/hooks/`, `src/data/dataContext.ts` (to pass the backend to actions), `src/domain/` (types, commands), `src/simulator` public API (`src/simulator/index.ts`, for demo actions), `src/i18n/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, or another feature's internals.

**`auth/` (Phase 4):** simulated login. `SessionProvider` resolves a `userId` stored in localStorage (`sessionStorage.ts` is the only place that touches it) against the `users` table. Use `useSession()` (`status`, `user`, `can(area)`, `logout`) and `useUnitScope()` (the nurse supervisor's unit id, otherwise `null`) — dashboards must filter by the unit scope. The layout components (`NavList`, `UserMenu`) read the session through `useSession()`.
