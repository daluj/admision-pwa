# Requirements: MVP Hardening

**Roadmap phase:** 14 — MVP Hardening
**Branch:** `phase-14-mvp-hardening`
**Status:** Draft — 2026-10-21

> Autonomous run (phases 13–14): no interview; the "Recommended" options of earlier interviews were applied. Choices are listed under **Decisions**.

## Scope

Make the MVP safe to put in front of the hospital: fast with a week of data, usable offline and installed, accessible, resilient to errors, and documented.

### Included

**1. Performance (≈ 600 beds, 7 simulated days)**
- A measured baseline (`npm run perf`): headless 7-day run, then the cost of every dashboard calculator and of loading the tables, written to the spec's validation notes. Budget: each calculator ≤ 50 ms and all five together ≤ 150 ms at 7 days of data on a laptop.
- **One live query per table/limit, shared by every component** (today each hook instance opens its own Dexie `liveQuery`, so the top bar, overview, evaluator and page re-read the same table independently on every change).
- Indexes reviewed against the queries actually used (`specs/tech-stack.md`); a Dexie version bump only if a measured query needs one.
- Heavy per-tick work kept to the simulated minute (status level, overview) — already true; verified by test.

**2. Offline and install**
- E2E: every route loads offline after the first visit; the manifest and icons are valid; the service worker precaches the app shell. Update prompt covered.
- `docs/install-and-offline.md`: step-by-step verification on Chrome/Edge desktop and iPad Safari (Add to Home Screen) with expected results — iPad Safari and the real install prompt are **NEEDS HUMAN** (cannot be driven from CI).

**3. Accessibility pass**
- `@axe-core/playwright` (dev dependency, see Decisions): every page of every role scanned (WCAG 2.1 A/AA tags) in light and dark theme; violations fixed (contrast tokens, names, landmarks).
- Keyboard: skip link, nav, bell → alert centre → acknowledge, sheets open/close and return focus, wall mode keys — covered by e2e.
- `prefers-reduced-motion` respected (no autoplay animation beyond the wall rotation, which pauses on request).

**4. Error boundaries and empty/loading states**
- Root error boundary (app shell survives a page crash): route-level `errorElement` inside the layout with a Spanish message, "Reintentar" and "Volver al inicio"; a global boundary for crashes outside routes; errors logged to the console only (no telemetry).
- Every page and widget has a loading and an empty state (audited; gaps filled), tested.
- Unknown route and forbidden role already handled (kept).

**5. Documentation and release**
- README: quick start, demo instructions (scenario, speed, script), roles, architecture summary, commands, known limitations.
- `docs/known-limitations.md` (from the specs' "known limitations").
- Tag `v0.1.0-mvp` on `main` after the merge (local; not pushed).

### Not included
- New features; backend work (Phase 15+); real authentication; telemetry; i18n beyond Spanish; load testing beyond 7 days.

## Decisions (autonomous)
- **`@axe-core/playwright` is added as a dev dependency**: the roadmap names "axe in Playwright" and `specs/tech-stack.md` lists it as planned for this phase; it touches tests only, not the shipped bundle.
- Shared subscriptions are implemented in the hooks layer (`cachedSource` + one store per source), not in each adapter, so Dexie, memory and the future Supabase adapter all benefit.
- Performance targets are about calculators and loading; there is no automated frame-time test (jank is judged in the manual check with the 1800× runner).
- Hardening fixes accessibility violations in the tokens/components rather than disabling rules; any rule left disabled is listed with a reason in the spec.
- Release tag is local; pushing is left to the user.

## Context
`src/data/hooks`, `src/data/adapters/dexie`, `vite.config.ts` (PWA), `e2e/*`, `specs/tech-stack.md` (indexes, accessibility), `specs/ux-guidelines.md`.
