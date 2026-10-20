# components

Shared UI used across features.

- `layout/` — app shell: `AppShell`, `Sidebar`, `TopBar`, `DemoBanner`, `ThemeToggle`, `nav.ts`.
- `theme/` — `ThemeProvider` and `useTheme`.
- `common/` — small shared pieces (`PageHeader`, `EmptyState`).
- `pwa/` — service-worker update prompt.
- `ui/` — shadcn/ui primitives (generated; keep edits minimal).

**May import:** React, `src/data/hooks/`, `src/domain/` types, `src/i18n/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, `src/features/`.

All visible text comes from `src/i18n/es.ts`.
