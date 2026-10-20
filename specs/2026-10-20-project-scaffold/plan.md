# Plan: Project Scaffold & App Shell

## Group 0: Repository

1. If not a git repo: `git init -b main`, commit the existing `specs/`, `backlog/`, `.claude/`, `README.md`, `CLAUDE.md` as "chore: add specs and skills".
2. Create branch `phase-1-project-scaffold`.
3. Add `.gitignore` (node_modules, dist, coverage, playwright-report, test-results, .env*).

---

## Group 1: Project & Tooling

4. Scaffold Vite React-TS in the repo root without overwriting existing files (scaffold in a temp dir and move files if needed).
5. `tsconfig`: `strict`, `noUncheckedIndexedAccess`, path alias `@/*` → `src/*` (also in `vite.config.ts`).
6. ESLint flat config (typescript-eslint, react-hooks, jsx-a11y) + Prettier config; `lint` and `format` scripts.
7. Vitest with jsdom + Testing Library setup file (`src/test/setup.ts`); `test` script.
8. Playwright config (Chromium only for now, `webServer` = `npm run preview`); `test:e2e` script.
9. `typecheck`, `build` (`tsc -b && vite build`), `preview` scripts. Pin dependency versions.

---

## Group 2: Styling & Design Tokens

10. Install and configure Tailwind CSS v4 (Vite plugin) in `src/styles/globals.css`.
11. Define tokens as CSS variables for light and dark: background/foreground/surfaces, `--status-ok|warn|critical|info|neutral`, `--triage-1..5`; expose them as Tailwind theme colours.
12. Initialise shadcn/ui; add `button`, `card`, `badge`, `dropdown-menu`, `sheet`, `tooltip`, `sonner` (toasts), `separator`.
13. `ThemeProvider` + `ThemeToggle` (light/dark/system), persisted with try/catch around localStorage.

---

## Group 3: Folder Skeleton & i18n

14. Create `src/domain/`, `src/data/ports/`, `src/data/adapters/`, `src/data/hooks/`, `src/simulator/`, `src/features/`, `src/components/layout/`, `src/lib/`, `src/i18n/`, each with a `README.md` describing responsibility and allowed imports (copy rules from `specs/tech-stack.md`).
15. `src/i18n/es.ts`: typed nested object with all strings for nav, top bar, banner, page titles/descriptions, empty states, 404, PWA toasts.

---

## Group 4: App Shell & Routing

16. `src/components/layout/nav.ts` — typed nav items (path, labelKey, lucide icon).
17. `Sidebar` (collapsible, active route, keyboard accessible, collapses to icons < 1280 px, becomes a sheet on phones).
18. `TopBar` with `StatusLevelBadge` ("Normal"), static `SimClock` placeholder, `AlertBell` (0), `UserMenu` ("Invitado"), `ThemeToggle`.
19. `DemoBanner` ("Entorno de demostración — datos ficticios").
20. `AppShell` composing the above with `<Outlet />`.
21. Router with lazy routes for the seven pages + 404; each page in `src/features/<area>/<Area>Page.tsx` using a shared `PageHeader` and `EmptyState` component.

---

## Group 5: PWA

22. Install and configure vite-plugin-pwa: manifest (see requirements), `registerType: 'prompt'`, precache app shell, SPA navigation fallback.
23. Generate icons (192, 512, maskable 512, apple-touch-icon 180) into `public/icons/` from a simple original SVG (tower/radar motif, no third-party branding).
24. `PwaUpdatePrompt` component using `useRegisterSW`: "Actualización disponible" toast with "Actualizar" button; "Lista para usar sin conexión" toast once.
25. `index.html`: `lang="es"`, title, meta description, theme-color, apple meta tags.

---

## Group 6: Tests

26. Component tests: `AppShell` renders sidebar items and banner; `Sidebar` marks active route; `ThemeToggle` switches the `dark` class; 404 page renders for unknown routes.
27. Unit test: every nav item has a matching route and an i18n label.
28. Playwright smoke (`e2e/shell.spec.ts`): open `/`, navigate through all sidebar items and assert each page title; check `manifest.webmanifest` is served and a service worker registers in the preview build.
