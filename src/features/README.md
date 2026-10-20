# features

One folder per area: `overview/`, `beds/`, `emergency/`, `admissions/`, `transfers/`, `tracking/`, `settings/` (and `auth/` from Phase 4). Each exposes a route page `<Area>Page.tsx` (default export for lazy loading) plus its own `components/`.

**May import:** `src/components/`, `src/data/hooks/`, `src/domain/` (types, commands), `src/i18n/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, or another feature's internals.
