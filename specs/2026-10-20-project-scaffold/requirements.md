# Requirements: Project Scaffold & App Shell

**Roadmap phase:** 1 — Project Scaffold & App Shell
**Branch:** `phase-1-project-scaffold`
**Status:** Complete — 2026-10-20

## Scope

Create the empty-but-real application: an installable, offline-capable React PWA with the final app shell (navigation, top bar, theming) and placeholder pages for every area. No domain data, database or simulator yet.

### Included

- Vite + React + TypeScript project at the repository root, `strict` mode, path alias `@/` → `src/`.
- Tooling: ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier, Vitest + Testing Library + jsdom, Playwright; all npm scripts listed in `specs/tech-stack.md`.
- Tailwind CSS v4 + shadcn/ui initialised (`src/components/ui/`), with design tokens from `specs/ux-guidelines.md` (status colours, triage colours, light/dark themes) as CSS variables.
- Folder skeleton from `specs/tech-stack.md` (`domain/`, `data/`, `simulator/`, `features/`, `components/`, `lib/`, `i18n/`), each with a short `README.md` stating its responsibility and import rules.
- **App shell**
  - Left sidebar (collapsible) with the areas below, icons from lucide-react, active state.
  - Top bar with placeholders for: hospital status level badge ("Normal"), simulated clock (static time for now), alert bell (0), user menu ("Invitado").
  - Theme toggle (light / dark / system), persisted in localStorage (try/catch).
  - Permanent banner: "Entorno de demostración — datos ficticios".
- **Routes and placeholder pages** (each with title, one-line description and an empty-state card):

| Path | Sidebar label | Page title |
|---|---|---|
| `/` | Torre de control | Visión general |
| `/camas` | Camas | Gestión de camas |
| `/urgencias` | Urgencias | Urgencias |
| `/ingresos-altas` | Ingresos y altas | Ingresos y altas |
| `/traslados` | Traslados | Traslados internos |
| `/seguimiento` | Seguimiento | Seguimiento de pacientes |
| `/ajustes` | Ajustes | Ajustes |
| `*` | — | Página no encontrada (404) |

- `src/i18n/es.ts` containing every user-facing string of this phase, plus a typed `t()` helper (or plain typed object access).
- **PWA:** vite-plugin-pwa with manifest (name "Torre de Control — Admisión", short_name "Torre Control", `lang: es`, `display: standalone`, theme colours from tokens), icons 192/512 + maskable, service worker precaching the app shell, `registerType: 'prompt'` with an "Actualización disponible" toast, and an offline-ready toast on first install.
- Basic `index.html` metadata: `lang="es"`, title, description, theme-color.

### Not included

- Domain model, IndexedDB, simulator, login (phases 2–5).
- Real KPIs or charts (Recharts is installed in Phase 6, not now).
- CI pipeline.

## Decisions

- **React Router** with lazy-loaded route components per feature folder (`src/features/<area>/<Area>Page.tsx`), so later phases only touch their own folder.
- **Layout components in separate files:** `AppShell`, `Sidebar`, `TopBar`, `DemoBanner`, `ThemeToggle` in `src/components/layout/`.
- **Navigation config** is a single typed array (`src/components/layout/nav.ts`: path, labelKey, icon, `roles?` reserved for Phase 4) used by both the sidebar and the router, to avoid duplication.
- **Theme** via a `ThemeProvider` setting `class="dark"` on `<html>`; Tailwind v4 dark variant bound to that class.
- **Spanish only** UI, centralised strings; no i18n library yet.
- **Placeholder icons** generated as simple SVG → PNG (no brand logos, no hospital or SERMAS branding).
- **Exact dependency versions pinned** after install.

## Context

- Follow `specs/tech-stack.md` (stack, scripts, folder layout) and `specs/ux-guidelines.md` (layout order, colour tokens, banner, accessibility).
- This phase defines patterns every later phase will copy: keep components small, typed props in a named `type XProps`, no default exports except route pages if required by lazy loading.
- The demo will be shown on a laptop connected to a big screen and on an iPad: test at 1280×800, 1920×1080 and 1024×768.
