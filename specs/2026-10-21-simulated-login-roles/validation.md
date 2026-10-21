# Validation: Simulated Login & Roles

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0 with no warnings
- [x] `npm test` exits 0
- [x] `npm run build` exits 0
- [x] `npm run test:e2e` exits 0

### Specific coverage required

- [x] Access matrix matches the table in `requirements.md` for all 6 roles; MANAGEMENT cannot reach `settings`
- [x] Session storage: read/write/clear survive throwing or corrupt `localStorage`
- [x] SessionProvider: valid user resolves; unknown user clears session; login/logout persist
- [x] Guards: anonymous ⇒ `/login`; forbidden area ⇒ role home + toast; authenticated `/login` ⇒ role home; no login flash while loading
- [x] LoginPage: one card per role from DB users; supervisor needs a unit; "acceso simulado" label present
- [x] Navigation (sidebar and mobile) shows only allowed areas per role
- [x] UserMenu shows name/role/unit and logs out
- [x] BedsPage scope notice for `NURSE_SUPERVISOR` only
- [x] E2E: login/logout per role, forbidden redirect, session survives reload, demo reset with another seed returns to `/login`

## Manual (simulator not required yet)

- [x] Fresh profile: app opens on `/login`, cards appear after seeding
- [x] Jefe/a de Admisión sees all 7 areas; Dirección sees 6 (no Ajustes); Celador/a only Traslados
- [x] Typing `/ajustes` as Celador/a lands on `/traslados` with a toast
- [x] Supervisor/a of two different units: Camas notice names the correct unit
- [x] Reload keeps the session; logout then browser Back does not reveal protected pages
- [x] Ajustes → Restablecer demo (seed 7) logs out; seed 42 logs in again fine
- [ ] Keyboard only: login cards, unit select, user menu; light/dark; 390 px and 1024 px without horizontal scroll

## Copy Check

- [x] All strings from `src/i18n/es.ts`; role labels match `specs/domain.md` (Jefe/a de Admisión, Gestor/a de camas, Supervisor/a de enfermería, Coordinación de Urgencias, Celador/a, Dirección)
- [x] "Acceso simulado" label always visible on login; demo banner intact

## Architecture Check

- [x] No Dexie / `data/adapters` imports in `features/auth` or components; session reads users via hooks
- [x] `src/domain/access.ts` has no React imports
- [x] No schema change / Dexie version bump; no new dependencies
- [x] localStorage access only in `sessionStorage.ts`, always in try/catch

## Definition of Done

All boxes above ticked, roadmap Phase 4 items ticked by `ship-feature`, CHANGELOG updated, branch merged and deleted.
