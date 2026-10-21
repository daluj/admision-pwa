# Plan: MVP Hardening

## Group 1: Performance
1. `npm run perf` (opt-in vitest file): 7-day run, load + calculator timings; record baseline.
2. `cachedSource` + shared stores in `src/data/hooks`; tests (one upstream per table, unsubscribe when idle, keyed by limit).
3. Index review; optimisations driven by the numbers.
## Group 2: Resilience
4. `AppErrorBoundary` (class) + `RouteError` element; wired in `routes.tsx` and `App.tsx`; strings; tests (crashing page keeps the shell, retry works).
5. Loading/empty-state audit of every page and widget; fill gaps; tests.
## Group 3: Accessibility
6. Install `@axe-core/playwright`; `e2e/a11y.spec.ts` (all pages × roles × themes); fix violations.
7. Keyboard e2e (skip link, bell/centre, sheets focus return); reduced motion.
## Group 4: Offline and install
8. `e2e/offline.spec.ts` (all routes offline, manifest); `docs/install-and-offline.md`.
## Group 5: Docs and release
9. README, `docs/known-limitations.md`, roadmap/changelog; tag after merge.
