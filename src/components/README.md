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

`dashboard/` (Phase 6): shared dashboard widgets — `KpiStrip`/`KpiTile`, `ExceptionList`, `StatusBadge`, `DurationText`. Presentational only: plain props, no data hooks. Status is always colour **and** icon/text.

Phase 8 added `TriageBadge` (Manchester colour + number) and `TrendChart` (Recharts line chart with a reference line, gaps for missing data and a visually hidden table). In tests `ResponsiveContainer` is replaced with a fixed size (`src/test/setup.ts`) because jsdom has no layout.
