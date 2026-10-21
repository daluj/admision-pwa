# Validation: Internal Transfers — Dispatch

## Automated
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [x] `User.porterId` schema + seed link; `reserveBed` creates the transfer atomically (events, SLA, priority, destination label); release/cancel still cancel it
- [x] `computeTransfers`: KPIs (median pickup today, % within SLA, porters), queue order, SLA states, exceptions severities, porter view
- [x] `canActOnTransfer` matrix; action hook refuses forbidden actions, handles stale input
- [x] Dispatch board: assign (available porters only), cancel, create; read-only for management
- [x] Porter view: my work → recoger → entregar, Aceptar only when available, only own jobs
- [x] E2E: auto transfer after reserving a bed, assign from board, porter flow, management read-only
## Manual
- [x] Simulator at 60×: queue moves, SLA badges, porters status; assign by hand then watch it complete
## Copy / Architecture
- [x] Strings from `es.ts`; KPI logic in `src/domain/kpis`; no adapter imports; no wall clock; no new dependencies
## Definition of Done
All ticked, roadmap Phase 10 ticked, CHANGELOG, merged.
