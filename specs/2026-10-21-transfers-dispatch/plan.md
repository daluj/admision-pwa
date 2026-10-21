# Plan: Internal Transfers — Dispatch

## Group 1: Domain and data
1. `User.porterId` (Zod, `specs/domain.md`, seed links PORTER user; tests) — data-model-change.
2. `reserveBed` auto-creates the transfer; fix dependent tests (commands, flow, Phase 7 UI tests); simulator keeps working (covered check).
3. `canActOnTransfer`, `TRANSFER_THRESHOLDS`, `src/domain/kpis/transfers.ts` (`computeTransfers`: KPIs, queue rows, porter rows, exceptions, porter-scoped view) + status helpers; tests.
## Group 2: Hooks
4. `useTransfersData`, `useTransferActions` (assign / cancel / create / accept / pickUp / deliver; permission on the transfer's porter; stale handling), tests.
## Group 3: Dispatch board UI
5. KPI strip, exceptions, queue table, porters panel, assign / cancel / new-transfer sheets, strings, tests.
## Group 4: Porter view
6. Mi cola (my work with next step, open queue with Aceptar, done today), tests.
## Group 5: Page, roles, e2e, docs
7. `TransfersPage` chooses the view by role, integration tests, `e2e/transfers.spec.ts`, READMEs.
