# Validation: Internal Transfers — Dispatch

## Automated
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0
### Specific coverage required
- [ ] `User.porterId` schema + seed link; `reserveBed` creates the transfer atomically (events, SLA, priority, destination label); release/cancel still cancel it
- [ ] `computeTransfers`: KPIs (median pickup today, % within SLA, porters), queue order, SLA states, exceptions severities, porter view
- [ ] `canActOnTransfer` matrix; action hook refuses forbidden actions, handles stale input
- [ ] Dispatch board: assign (available porters only), cancel, create; read-only for management
- [ ] Porter view: my work → recoger → entregar, Aceptar only when available, only own jobs
- [ ] E2E: auto transfer after reserving a bed, assign from board, porter flow, management read-only
## Manual
- [ ] Simulator at 60×: queue moves, SLA badges, porters status; assign by hand then watch it complete
## Copy / Architecture
- [ ] Strings from `es.ts`; KPI logic in `src/domain/kpis`; no adapter imports; no wall clock; no new dependencies
## Definition of Done
All ticked, roadmap Phase 10 ticked, CHANGELOG, merged.
