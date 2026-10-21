# Validation: Bed Management — Actions & Turnaround

Implementation is complete and ready to merge when all of the following pass.

## Automated

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 with no warnings
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` exits 0

### Specific coverage required

- [ ] `canActOnBed`: full role × action matrix, nurse supervisor own vs other unit, porter never
- [ ] `openBedRequests`: priority then wait order, source text, specialty names, filters by unit type / specialty
- [ ] `suggestBeds`: unit type match, isolation only when required (and isolation beds kept free otherwise), same specialty first, outliers after, excluded specialties never outliers, ranking by longest free, no candidates
- [ ] `bedTurnaround`: median incl. even counts, local-day boundaries (incl. DST), unpaired events ignored, scoped to bed ids, no data
- [ ] `censusExceptions`: `cleaningLong` warn > 60 min / critical > 120 min, ordering with the other kinds
- [ ] Turnaround tile: value, "—" without data, ok/warn/critical thresholds, 7-tile strip layout
- [ ] Request list: order, empty state, read-only (no buttons), counts
- [ ] Assign sheet: ranked suggestions with tags, "Ver todas", reserve appends `BedReserved` with the user as actor, request leaves the list, stale request/bed error path leaves data unchanged
- [ ] Bed action sheet: exactly the actions of each status, block needs a reason, each action appends its event and toasts
- [ ] `useBedActions` refuses forbidden actions without writing
- [ ] Per-role integration: head/bed manager all, nurse supervisor cleaning on own unit only, ED coordinator/management read-only
- [ ] E2E: assign a request, block/unblock a bed, turnaround gets a value, nurse supervisor cleaning, read-only role

## Manual (simulator at 60×)

- [ ] `/camas` shows open requests sorted P1 first, oldest first; waits turn amber/red; counts correct
- [ ] "Asignar cama": suggestions make sense (same specialty first, isolation only when needed); reserve → toast; request leaves the list; the event log shows `BedReserved` by your user; the simulator then creates the transfer and the patient is admitted
- [ ] Race: with the simulator at 300×, try to assign a request the simulator just handled → clear message, no crash, list refreshes
- [ ] Block a free bed with a reason, see it in KPIs/exceptions rules, unblock it
- [ ] Mark cleaning started/finished; "Rotación de cama" fills in during the simulated day and its colour follows the thresholds
- [ ] Pending-cleaning exception appears after 60 min and turns critical after 120 min
- [ ] Per role: Jefe/a and Gestor/a act everywhere; Supervisor/a only cleaning in their unit; Coordinación and Dirección see no buttons
- [ ] Keyboard only: open/close both sheets, focus returns to the trigger, Escape closes; 1280 px, 1024 px and 390 px; light/dark

## Copy Check

- [ ] All strings from `src/i18n/es.ts`; glossary terms (Solicitud de cama, Reservar, Liberar, Bloquear, Limpieza, Rotación de cama); toasts name the bed and the patient initials

## Architecture Check

- [ ] Rules (permissions, suggestions, turnaround) only in `src/domain/`; presentational components take plain props
- [ ] Every action goes through a domain command via `executeCommand` and appends an event with the user as actor; no direct writes
- [ ] No adapter imports in UI; no `Date.now()` / `new Date()` for "now"; no new dependencies; no schema change

## Definition of Done

All boxes ticked, roadmap Phase 7 items ticked by `ship-feature`, CHANGELOG updated, branch merged and deleted.
