# Recharts is still part of the initial load

Phase 8 added Recharts (needed for the Urgencias chart). It is split into its own `vendor-charts` chunk (see `vite.config.ts`), but `index.html` still preloads that chunk: the shared `vendor-ui` chunk imports a helper that Rolldown placed in `vendor-charts`, so every page pays ~350 kB (≈ 110 kB gzipped) up front. The service worker precaches it anyway, so the cost is only the first visit.

Phase 14 (performance): find the shared helper (try `build.rolldownOptions.output.codeSplitting` with `minSize`/`maxSize`, or load the chart with `React.lazy`) so charts load only with the pages that draw them. `TrendChart` is deliberately not re-exported from `components/dashboard/index.ts` for that reason.
