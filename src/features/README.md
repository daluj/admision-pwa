# features

One folder per area: `overview/`, `beds/`, `emergency/`, `admissions/`, `transfers/`, `tracking/`, `settings/` (and `auth/` from Phase 4). Each exposes a route page `<Area>Page.tsx` (default export for lazy loading) plus its own `components/`.

**May import:** `src/components/`, `src/data/hooks/`, `src/data/dataContext.ts` (to pass the backend to actions), `src/domain/` (types, commands), `src/simulator` public API (`src/simulator/index.ts`, for demo actions), `src/i18n/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, or another feature's internals.
