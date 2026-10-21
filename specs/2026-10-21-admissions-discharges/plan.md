# Plan: Admissions & Discharges

Each group ends with typecheck, lint, tests green and a commit `feat(phase-9): group K – <name>`. No schema/event change.

## Group 1: Domain
1. `specs/domain.md`: definitions (admissions today, pending scheduled, discharges, % before 12:00 on completed discharges, forecast formula incl. unit-level variant, cancel reasons from events).
2. `thresholds.ts`: `ADMISSION_THRESHOLDS`.
3. `src/domain/access.ts`: `DISCHARGE_ACTIONS`, `canActOnDischarge`; tests (role × action × own/other unit, fails closed).
4. `src/domain/kpis/admissions.ts`: `computeAdmissions` → `{ kpis, scheduled, balance, byUnit, worklist, exceptions }` and `scheduleStatus`, tab filters; scope option (`unitIds`, specialty codes) for supervisors.
5. `src/domain/kpis/admissionsStatus.ts`: tile statuses. Tests with fixtures (local-day boundaries, before noon, scopes, balance maths, cancelled reasons, status mapping, exceptions).

## Group 2: Hooks and actions
6. `useAdmissionsData` (combines hooks + events window), `useDischargeActions` (permission on the bed's real unit, `setExpectedDischarge` / `orderDischarge`, actor = user, toasts, stale → `{ ok:false }`), tests.

## Group 3: KPI strip and exceptions; Group 4: scheduled admissions table; Group 5: discharges per unit, worklist and sheets; Group 6: balance card
7. Components under `src/features/admissions/components/` (`AdmissionKpis`, `AdmissionExceptions`, `ScheduledTable`, `BalanceCard`, `UnitDischargeTable`, `DischargeWorklist`, `ExpectedSheet`, `OrderSheet`), strings in `es.ts`, component tests each (statuses, order, empty states, sheets validation, read-only).

## Group 7: Page, roles, e2e, docs
8. `AdmissionsPage` container, role/scope integration tests, `e2e/admissions.spec.ts` (head sees page and orders a discharge; supervisor sets expected discharge in own unit; management has no buttons), READMEs.
