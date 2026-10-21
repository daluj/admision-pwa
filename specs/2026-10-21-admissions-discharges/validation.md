# Validation: Admissions & Discharges

## Automated
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` exit 0

### Specific coverage required
- [x] KPI maths on fixtures: local-day boundaries (incl. DST), % before 12:00, scoped (unit/specialty) variants, balance formula, cancelled reasons
- [x] Scheduled status mapping and ordering
- [x] `canActOnDischarge` matrix; action hook refuses forbidden actions without writing, uses the bed's real unit, maps stale input
- [x] Worklist tabs, ordering, 50-row limit; expected-discharge sheet validation (future, ≤ 7 days) and order sheet
- [x] Page by role (head acts, supervisor own unit only, bed manager/management read-only), e2e flows

## Manual
- [x] Fresh profile: numbers match the tables; simulator at 60× moves discharges and the balance
- [ ] Head sets and orders; supervisor sees only their unit; event log shows who acted
- [ ] 1280/1024/390 px, light/dark, keyboard-only sheets

## Copy / Architecture
- [x] Strings from `es.ts`; KPI logic only in `src/domain/kpis`; presentational components take props; no adapter imports; no wall-clock; no new dependencies

## Definition of Done
All ticked, roadmap Phase 9 ticked by ship, CHANGELOG updated, branch merged and deleted.
