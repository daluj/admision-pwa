# Validation: Project Scaffold & App Shell

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with no warnings
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0 and produces `dist/sw.js` (or equivalent) and `dist/manifest.webmanifest`
- [ ] `npm run test:e2e` exits 0

### Specific coverage required

- [ ] `AppShell` renders all 7 nav items with Spanish labels and the demo banner
- [ ] Active nav item reflects the current route
- [ ] Theme toggle adds/removes `dark` on `<html>` and survives reload
- [ ] Unknown route renders the 404 page
- [ ] Every nav item has a route and an `es.ts` label (unit test)
- [ ] E2E: each sidebar link navigates to the page with the expected title

## Manual

- [ ] `npm run dev` shows the shell at 1920×1080, 1280×800 and 1024×768 without overflow; sidebar collapses to icons below 1280 px
- [ ] Phone width (390 px): sidebar becomes a sheet; no horizontal scroll
- [ ] Keyboard only: can reach and activate every nav item and top-bar control; focus is visible
- [ ] Light and dark themes both readable; status colour tokens visible on a temporary swatch story or the Ajustes placeholder
- [ ] `npm run build && npm run preview`: Chrome/Edge show the install button; installed app opens standalone
- [ ] With DevTools "Offline" after first load, reload works and all pages navigate
- [ ] Changing a string and rebuilding shows the "Actualización disponible" toast in the open preview

## Copy Check

- [ ] All visible text is Spanish and comes from `src/i18n/es.ts`
- [ ] Demo banner reads exactly "Entorno de demostración — datos ficticios"
- [ ] No hospital, SERMAS or third-party logos/branding anywhere

## Architecture Check

- [ ] Folder skeleton matches `specs/tech-stack.md`, each folder has its `README.md`
- [ ] No component imports from `src/data/adapters/`
- [ ] Only dependencies listed in `specs/tech-stack.md` were added; versions pinned

## Definition of Done

All automated checks pass, manual checks confirmed, Phase 1 items ticked in `specs/roadmap.md`, `CHANGELOG.md` updated, no leftover `console.log`, branch merged into `main`.
