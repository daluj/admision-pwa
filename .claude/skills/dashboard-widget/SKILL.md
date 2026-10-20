---
name: dashboard-widget
description: Conventions for building real-time dashboard UI in Torre de Control — KPI tiles, exception lists, operational boards (bed map, ED board, dispatch queue), timelines and charts — wired to live data through data hooks, with consistent colour semantics, Spanish copy, accessibility and wall-mode support. Use whenever creating or changing a dashboard page or any component under src/features/*/components or src/components/dashboard, or when the user asks for a KPI, chart, board, tile or widget.
---

# Dashboard Widget

Read `specs/ux-guidelines.md` and the KPI definitions in `specs/domain.md` first.

## Page structure (every dashboard)

```tsx
<PageHeader title={t.beds.title} description={t.beds.description} actions={<Filters/>} />
<KpiStrip>{/* 4–6 KpiTile */}</KpiStrip>
<ExceptionList items={exceptions} />   {/* "Necesita atención" */}
<MainBoard />                          {/* bed map / ED board / queue / timeline */}
<TrendsSection />                      {/* charts, last 24 h / 7 days */}
```

## Data flow

```
data/hooks/useX()  ──(observe* via Subscribable, live)──▶  domain/kpis/*.ts (pure)  ──▶  presentational component
```

- Pages/containers call hooks; **presentational components receive plain props** and never call hooks that read data. This keeps them testable and reusable in wall mode.
- Compute KPIs with the pure functions in `src/domain/kpis/` (add one there if missing, with a unit test) — never compute business metrics inline in JSX.
- "Now" comes from `useClock()` (simulated clock), never `new Date()`.
- Memoise derived data (`useMemo`) keyed on the live query result; dashboards must handle ~600 beds and hundreds of events per simulated hour without jank.
- Handle `undefined` (loading) from `useLiveQuery` with a skeleton, and empty arrays with `EmptyState`.

## Shared components (create once in `src/components/dashboard/`, then reuse)

| Component | Props (essentials) | Notes |
|---|---|---|
| `KpiTile` | `label`, `value`, `unit?`, `target?`, `status: 'ok'\|'warn'\|'critical'\|'neutral'`, `delta?` (vs yesterday same time), `href?` | Tabular numerals; status shown by colour **and** icon/text |
| `KpiStrip` | children | Responsive grid: 6 → 3 → 2 columns |
| `ExceptionList` | `items: {id, severity, title, detail, age, href}` | Sorted severity → age; max 8 + "ver todas" |
| `StatusBadge` | `kind: 'bed'\|'transfer'\|'edPhase'`, `status` | Labels from `es.ts`, colours from tokens |
| `TriageBadge` | `level: 1..5` | Manchester colours + number |
| `DurationText` | `from`, `now`, `target?` | "2 h 15 min", turns warn/critical vs target |
| `TrendChart` | `series`, `threshold?` | Recharts; includes a visually-hidden data table |
| `Timeline` | `steps: {label, at?, duration?, state}` | Used by tracking and transfers ("order tracking") |

Status thresholds come from settings/domain constants, never magic numbers in components.

## Styling

- Tailwind with tokens only (`bg-status-ok`, `text-triage-2`…). No hex colours in components.
- Both themes; check contrast. Respect `prefers-reduced-motion`.
- Value changes: brief highlight (≤ 300 ms), no layout shift (reserve space, fixed tile heights).
- **Wall mode:** components accept `density: 'default' | 'wall'` (larger type, fewer details); the page passes it from the `useWallMode()` context.

## Copy

All strings in `src/i18n/es.ts` under the feature's key. Durations and dates via helpers in `src/lib/format.ts` (date-fns, `es` locale, 24 h).

## Tests (per widget)

- Presentational component: renders values, status colour class/label for ok/warn/critical, empty state.
- KPI function: fixture-based unit test with a fixed `now`.
- Page: one test with the memory adapter seeded with a small fixture, asserting the KPI strip values.
- Extend the Playwright smoke test to open the page with the simulator running and assert a KPI value changes.
