# Plan: Bed Management — Actions & Turnaround

Every group ends with `npm run typecheck && npm run lint && npm test` green and a commit `feat(phase-7): group K – <name>`. UI follows the `dashboard-widget` skill and `specs/ux-guidelines.md`. No schema or event changes, so `data-model-change` does not apply (only `specs/domain.md` wording).

## Group 1: Domain rules (permissions, suggestions, turnaround)

1. `specs/domain.md`: bed turnaround definition (median of today's cleanings, derived from events), dashboard exception for `BED_PENDING_CLEANING_LONG` (CRITICAL > 120 min), bed actions per role.
2. `src/domain/access.ts`: `BED_ACTIONS` (`reserve`, `release`, `block`, `unblock`, `startCleaning`, `finishCleaning`) and `canActOnBed(role, action, { unitId, userUnitId })`; tests for the full role × action matrix incl. own vs other unit.
3. `src/domain/kpis/thresholds.ts`: `turnaroundWarnMin 90`, `turnaroundCriticalMin 150`, `cleaningLongWarnMin 60`, `cleaningLongCriticalMin 120`, `requestWaitWarnMin 60`, `requestWaitCriticalMin 120`, `reservationEtaMin 30`, `OUTLIER_EXCLUDED_SPECIALTIES`.
4. `src/domain/kpis/bedRequests.ts`: `openBedRequests({ requests, admissions, patients, edVisits, specialties, now })` → rows (priority, initials, source, specialty name, unit type, isolation, `waitMs`) sorted priority → wait; `suggestBeds({ request, beds, units })` → ranked `{ bed, unit, tags }[]` + `allCandidates`.
5. `src/domain/kpis/turnaround.ts`: `bedTurnaround({ events, bedIds, now })` → `{ medianMs, count }` (pairs each `BedCleaningFinished` today with the latest earlier `PatientDischarged` of the same bed; ignores unpaired ones).
6. `src/domain/kpis/census.ts`: `censusExceptions` gains `cleaningLong` (`warn` > 60 min, `critical` > 120 min).
7. Tests with fixtures: sorting, specialty/isolation/outlier ranking (incl. excluded specialties, ICU), no candidates, turnaround across local-day edges, unpaired events, median with even counts, exception thresholds.

## Group 2: Data hooks and the action hook

8. `src/data/hooks/index.ts`: `useBedRequests`, `useEdVisits`; tests in `hooks.test.tsx`.
9. `src/features/beds/useTurnaround.ts`: `useRecentEvents(5000)` + `bedTurnaround` for the beds in scope (memoised).
10. `src/features/beds/useBedActions.ts`: wraps `executeCommand` (backend, simulation clock, session user as actor); `run(action, input)` checks `canActOnBed` (refuses otherwise), maps `InvalidTransitionError` / `InvalidCommandError` / `ConcurrencyError` to `{ ok: false, reason }`, toasts on success with a Spanish message; exposes `busy`.
11. Tests: actor is the user, forbidden action refused without writing, stale request returns `ok: false`, success toast text.

## Group 3: Turnaround tile and cleaning exception (read-only UI)

12. `src/components/dashboard/KpiStrip.tsx`: 2 → 4 → 7 columns; update layout tests.
13. `src/features/beds/components/CensusKpis.tsx`: 7th tile "Rotación de cama" (value, context, target, status via `turnaroundStatus` in `src/domain/kpis/censusStatus.ts`); takes `turnaround` as a prop; census and unit pages pass it (scoped to the beds in view).
14. `CensusExceptions.tsx`: `cleaningLong` item ("Cama 512-A pendiente de limpieza desde hace 1 h 20 min").
15. `src/i18n/es.ts`: strings for the tile, exception, requests, sheets, actions, toasts, errors (Spanish; glossary terms).
16. Tests: tile values/status/no-data, strip layout, exception text and severity ordering.

## Group 4: Open bed requests and assignment

17. `src/features/beds/components/BedRequestList.tsx` (presentational: rows, empty state, counts, `canAssign`), `BedRequestRow.tsx`, wired in `BedsPage` with `openBedRequests`; census filters applied (unit type, specialty).
18. `src/features/beds/components/AssignBedSheet.tsx` (shadcn `Sheet`): request header, ranked suggestions with tags, "Ver todas", selection, "Reservar cama", inline error, focus management.
19. `BedsPage`: opening/closing the sheet, calling `useBedActions().reserve`; request list refreshes live.
20. Tests: list order/empty/read-only (no buttons), sheet suggestions order on a fixture, reserve success appends `BedReserved` (actor = user) and the request leaves the list, stale-request error path, keyboard use of the sheet.

## Group 5: Per-bed actions on the bed map

21. `src/features/beds/components/BedActionSheet.tsx`: bed summary + actions per status (table in requirements), block reason (preset reasons + free text, required), optional release reason, confirmation by explicit button, `busy` state.
22. `BedTile.tsx` opens the sheet on click/Enter (keeps tooltip); `UnitPage`/`BedMap` pass `onSelect` and the user's permissions; read-only roles get an information-only sheet.
23. Tests: every status shows exactly its actions, block requires a reason, success appends the right event and toasts, nurse supervisor sees only cleaning actions on their unit, read-only roles see none.

## Group 6: Roles, e2e and docs

24. Integration tests per role on `/camas` and `/camas/:unitCode` (head, bed manager: all; nurse supervisor: cleaning on own unit; ED coordinator, management: read-only; porter: redirected).
25. `e2e/bed-actions.spec.ts`: head assigns the first request to a suggested bed (toast, request disappears, `BedReserved` in the event log); blocks a free bed and unblocks it; with the simulator at 300× "Rotación de cama" gets a value; nurse supervisor starts/finishes cleaning of a dirty bed in their unit (finds one by running the simulator or by blocking-free path); management has no action buttons.
26. READMEs (`src/features`, `src/domain`); note the simulator race handling.
