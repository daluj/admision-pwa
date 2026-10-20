# Tech Stack

Pin exact versions in `package.json` at scaffold time (latest stable releases). Do not add dependencies beyond this list without user approval; propose them in the feature spec's *Decisions* section first.

## Language & Runtime

- **TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`. No `any` in domain or data layers.
- **Node.js LTS** — for tooling only (the MVP has no server).
- **npm** — package manager.

## Frontend

- **React** (latest stable) with function components and hooks.
- **Vite** — dev server and build.
- **React Router** (data/declarative router) — client-side routing, lazy-loaded feature routes.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — styling, with design tokens defined as CSS variables (see `specs/ux-guidelines.md`).
- **shadcn/ui** (Radix primitives) — accessible base components, copied into `src/components/ui/`. Runtime packages it brings: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` (dev), and **sonner** for toasts. (`next-themes` is not used: the toaster reads our own `ThemeProvider`.)
- **lucide-react** — icons.
- **Recharts** — charts (bar, line, area, small multiples).
- **date-fns** with the `es` locale — all date formatting and arithmetic.
- **No global state library.** Data state comes from the database via live queries; UI/session state uses React context and component state.

## PWA

- **vite-plugin-pwa** (Workbox, with its `workbox-window` peer) — web app manifest, service worker, precaching of the app shell, installable on desktop and tablets.
- App must load and work fully **offline** in the MVP (all data is local).
- `registerType: 'prompt'` — show an "update available" toast rather than reloading silently.

## Database / Persistence (MVP)

- **IndexedDB via Dexie.js 4.** Live queries use Dexie `liveQuery` *inside the Dexie adapter*, wrapped in our `Subscribable`; React hooks consume `Subscribable` via `useSyncExternalStore`. (`dexie-react-hooks` is deliberately not used: it would make hooks depend on Dexie — decided in Phase 2.)
  - Database name: `torre-control`.
  - Schema declared in `src/data/adapters/dexie/db.ts` with explicit `db.version(n).stores({...})`; every schema change bumps the version and adds an `upgrade()` when data must be transformed.
  - Live queries give real-time updates, including **across browser tabs** (so a wall-display tab updates when the simulator runs in another tab).
- **Zod** — runtime schemas for all domain entities and events (`src/domain/schemas/`). Types are inferred from Zod (`z.infer`). The same schemas will validate API payloads after the MVP.

### Ports & adapters (mandatory)

```
src/
  app/               # Route table: maps nav items (components/layout/nav.ts) to lazy feature pages
  domain/            # Pure TypeScript: Zod schemas, types, state machines, KPI calculators, alert rules. No React, no Dexie.
  data/
    ports/           # Repository + EventStore + Clock interfaces (the contract)
    adapters/
      dexie/         # MVP implementation (IndexedDB)
      memory/        # In-memory implementation for unit tests
      # supabase/    # Post-MVP (see backlog/2026-10-20-backend-database-options.md)
    DataProvider.tsx # Selects adapter from VITE_DATA_BACKEND (default "dexie"), exposes repositories via context
    hooks/           # useBeds(), useEdVisits()... wrap repository.observe*() for React
  simulator/         # Event generator: seeded PRNG, scenarios, simulated clock, runner
  features/          # One folder per area: overview/, beds/, emergency/, admissions/, transfers/, tracking/, settings/, auth/
  components/        # Shared UI: layout/, theme/, common/, pwa/, KPI tiles, status badges + ui/ (shadcn)
  lib/               # Generic utilities (formatting, ids)
```

Rules:
- **Components never import Dexie** or anything under `data/adapters/`. They use hooks from `data/hooks/`.
- **All writes go through domain commands** (`src/domain/commands/`) that validate the transition, produce one or more `HospitalEvent`s and persist them **with** the resulting state change in a single transaction via the port (`EventStore.append(events, stateChanges)`).
- Repository read methods return plain domain objects; observable methods return a `Subscribable<T>` (`subscribe(cb) → unsubscribe`) so the Supabase Realtime / Postgres `LISTEN/NOTIFY` adapter can implement the same contract later.
- **Time comes from the `Clock` port**, never `Date.now()` directly in domain/simulator code, so the simulator can run at 1×, 10×, 60× speed and tests are deterministic.

## Simulator

- Runs in the browser on the main thread for the MVP (move to a Web Worker only if profiling shows jank).
- **Seeded PRNG** (small in-repo implementation, e.g. mulberry32) — the same seed + scenario always produces the same demo.
- Writes only through domain commands (exactly as a future HIS integration would), never directly to tables.
- Controls: start / pause / speed (1×, 10×, 60×, 300×) / reset to seed / choose scenario.

## Testing

- **Vitest** + **@testing-library/react** (with `@testing-library/dom`, `jest-dom`, `user-event`) + **jsdom** — unit and component tests.
- **fake-indexeddb** — Dexie adapter tests.
- **Playwright** — end-to-end smoke tests and the demo walkthrough (`e2e/`).
- Test layout mirrors `src/` (`src/domain/kpis/occupancy.test.ts` next to its source).
- Domain logic (state machines, KPI calculators, alert rules, simulator) must have unit tests; every feature adds at least one component test and extends the e2e smoke test.

## Tooling & Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build (includes service worker) |
| `npm run preview` | Serve the production build (used to test PWA/offline) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y, eslint-config-prettier) — stay on 9 until eslint-plugin-jsx-a11y supports ESLint 10 |
| `npm run format` | Prettier |
| `npm test` | `vitest run` |
| `npm run test:e2e` | Playwright |

## Conventions

- **Code, identifiers, comments, commits and specs in English. UI copy in Spanish (es-ES).** All UI strings live in `src/i18n/es.ts` (single locale for now, but centralised so a second locale can be added).
- Timezone `Europe/Madrid`; store timestamps as ISO 8601 UTC strings; format in the UI with date-fns.
- IDs: `crypto.randomUUID()` (or seeded UUID-like ids in the simulator for determinism).
- Conventional, small commits; one branch per roadmap phase (`phase-N-<kebab-name>`).

## Post-MVP Target (summary — details in `backlog/2026-10-20-backend-database-options.md`)

- **PostgreSQL is the system of record**, hosted on hospital / Comunidad de Madrid infrastructure.
- **Supabase (self-hosted)** is the recommended accelerator: Postgres + Realtime + Auth + Row Level Security + auto-generated API. The Dexie adapter is replaced by a `supabase` adapter implementing the same ports.
- Real data enters via the hospital's integration engine (**HL7 v2 ADT** and/or **FHIR**) → mapped to the same `HospitalEvent`s the simulator produces.
- Authentication via the hospital's identity provider (SSO: SAML/OIDC); authorisation via roles + RLS.
- Predictive services (discharge and arrival forecasting) as a separate **Python** service.

## Gaps / Future Considerations

- No CI pipeline yet — add GitHub Actions (lint, typecheck, test, build) once the repo is on GitHub.
- Error monitoring (e.g. Sentry self-hosted) — post-MVP, must not send patient data.
- Accessibility audit with axe in Playwright — planned in the MVP hardening phase.
