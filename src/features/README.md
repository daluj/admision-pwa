# features

One folder per area: `overview/`, `beds/`, `emergency/`, `admissions/`, `transfers/`, `tracking/`, `settings/` (and `auth/` from Phase 4). Each exposes a route page `<Area>Page.tsx` (default export for lazy loading) plus its own `components/`.

**May import:** `src/components/`, `src/data/hooks/`, `src/data/dataContext.ts` (to pass the backend to actions), `src/domain/` (types, commands), `src/simulator` public API (`src/simulator/index.ts`, for demo actions), `src/i18n/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, or another feature's internals.

**`auth/` (Phase 4):** simulated login. `SessionProvider` resolves a `userId` stored in localStorage (`sessionStorage.ts` is the only place that touches it) against the `users` table. Use `useSession()` (`status`, `user`, `can(area)`, `logout`) and `useUnitScope()` (`{ restricted: false }`, or `{ restricted: true, unitId }` for nurse supervisors — `unitId` is `null` when they have no unit, and the dashboard must then show "sin unidad", never the whole hospital). Scoping is done in the UI for now; real enforcement comes with row-level security (Phase 17). The layout components (`NavList`, `UserMenu`) read the session through `useSession()`.

**`simulation/` (Phase 5):** `SimulationClockProvider` / `useSimulationClock()` (the simulated `Clock` for commands issued from the UI), `SimulationControls` (play/pause/speed, `ADMISSIONS_HEAD` only), `SimulationRunnerHost` (starts the runner in the Web Lock leader tab). The event log lives in `settings/` (`EventLogCard`, pure filters in `eventLog.ts`).

**`beds/` (Phase 6):** the census dashboard. `BedsPage` (`/camas`) and `UnitPage` (`/camas/:unitCode`) are containers: hooks (`useCensus`, `useBedFilters`) → pure functions in `src/domain/kpis/` → presentational components under `components/`. Nurse supervisors never see the hospital view: `/camas` and other units redirect to their own. Shared widgets (`KpiTile`, `ExceptionList`, `StatusBadge`…) live in `src/components/dashboard/`.

**Bed actions (Phase 7):** every action on a bed goes through `useBedActions()` — it checks `canActOnBed(role, action, { unitId, userUnitId })` (`src/domain/access.ts`), runs the domain command with the logged-in user as actor and the simulated clock, toasts the result and maps stale input (the simulator was faster) to `{ ok: false, reason: 'stale' }`. Suggestions (`suggestBeds`), the request list (`openBedRequests`) and the turnaround KPI (`bedTurnaround`) are pure functions in `src/domain/kpis/`. Sheets (`AssignBedSheet`, `BedActionSheet`) are presentational and follow live data; they return focus to the element that opened them. The human and the simulator's own bed manager can race: commands reject stale input and nothing is locked.

Known limits of the turnaround tile: it reads the latest 5,000 events (`TURNAROUND_EVENT_WINDOW`), enough for a simulated day; a discharge that has scrolled out of the window leaves its cleaning unpaired and ignored, and moves between beds (`PatientTransferredBetweenBeds`) are not counted. Phase 14 revisits this with indexes.
