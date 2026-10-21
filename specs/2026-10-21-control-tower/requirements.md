# Requirements: Control Tower Overview & Alerts

**Roadmap phase:** 12 — Control Tower Overview & Alerts
**Branch:** `phase-12-control-tower`
**Status:** Complete — 2026-10-21

> Autonomous run (phases 9–12): no interview; the "Recommended" options of earlier interviews were applied. Choices are listed under **Decisions**.

## Scope

One screen for the whole hospital, an alert engine that watches the rules in `specs/domain.md`, and a wall-display mode.

### Included

**1. Alert engine** (pure + command + host)
- Rules (`specs/domain.md` → Alert Rules): `ED_TRIAGE_TARGET_BREACH`, `BOARDING_LONG`, `BED_PENDING_CLEANING_LONG`, `TRANSFER_SLA_BREACH`, `UNIT_FULL`, `BED_BALANCE_NEGATIVE`. `src/domain/alerts/` turns the current data and thresholds into **candidates** (rule, entity, severity, params); `diffAlerts` compares them with the open alerts: new → `AlertRaised`; gone → `AlertResolved`; severity changed → resolve + raise.
- `evaluateAlerts` command (actor `simulator`, i.e. the engine) applies the diff in one transaction (`expectedLastSeq`, so two tabs cannot duplicate). `acknowledgeAlert` command (user actor, `AlertAcknowledged`). Alerts keep their history (resolved ones stay).
- `AlertEvaluatorHost` runs the evaluation in the Web Lock leader tab whenever the simulated minute or the event log changed (polling every 2 s, skipping unchanged state).
- `Alert.params` (optional map of strings/numbers) and the same on the `AlertRaised` payload carry what the Spanish message needs (initials, minutes, unit…); `message` stays a short English text.

**2. Alert bell + centre**
- Bell badge = unacknowledged open alerts (colour of the worst); opens a side sheet "Centro de alertas": open alerts (critical first, then oldest), filter by severity and area (Urgencias, Camas, Ingresos, Traslados), **Reconocer** button (not for porters), acknowledged shown with who/when, link to the area, and the last resolved alerts.
- Visibility follows roles: only alerts of areas the user can open; nurse supervisors only alerts of their own unit (alerts with `params.unitId`; hospital-level ones hidden); fails closed.

**3. Hospital status level**
- `computeStatusLevel` → `NORMAL | ALERT | CRITICAL` + the reasons that triggered it (occupancy, boarding count, longest boarding). Defaults from `specs/domain.md`. Shown in the top bar (replaces the static badge) and as the headline of the Overview.

**4. Overview** (`/`)
- Status level card with reasons; KPI tiles from every area (occupancy, free beds, ED present and waiting for physician, boarding count and longest, admissions / discharges today, bed balance, open transfers and % within SLA, open alerts); "Necesita atención": the top 10 exceptions across areas (critical first) each linking to its area; 24 h trends: ED % seen within target (hourly) and admissions vs discharges per hour.

**5. Wall mode** (`/pantalla`, "Modo pantalla")
- Full-screen layout without sidebar, larger type (zoom), dark, header with simulated clock, status level and alert count; auto-rotates between the dashboards the role can open (Overview, Camas, Urgencias, Ingresos y altas, Traslados) every N seconds (default 20, setting 5–120); pause/resume (space or button), previous/next (arrows), exit (Esc or button); browser fullscreen toggle. Entry from the user menu / top bar for roles with Overview access.

**6. Settings → thresholds**
- Card in Ajustes (head only): hospital status level thresholds, `BOARDING_LONG` hours, bed pending-cleaning minutes, bed-balance critical value, wall rotation seconds; validation (warn < critical, ranges), save, restore defaults. Stored in the browser (`localStorage`, shared across tabs via the `storage` event).

### Not included
- Per-unit or per-user thresholds; configurable Manchester targets, transfer SLAs and dashboard tile thresholds (dashboards keep their defaults — backlog); alert notifications outside the app; server-side persistence of the settings (Phase 17); alert history page.

### Routes / roles
`/` (overview: head, management, bed manager, ED coordinator), `/pantalla` (same roles), `/ajustes` (head). The bell is visible to every role, filtered as above.

## Decisions (autonomous)
- Candidates reuse the dashboards' own pure functions (`computeEd`, `computeCensus`, `computeTransfers`, `computeAdmissions`) so alerts and "Necesita atención" lists cannot disagree; the configurable rules (`BOARDING_LONG`, pending cleaning, bed balance) read their rows directly so the thresholds can be lower than the dashboards' defaults.
- Alert key = `ruleId + entityId`; an escalation is resolve + raise (every state change is an event, nothing is edited silently).
- Hospital-level alerts use `entityType: SimulationState`, `entityId: current`.
- Thresholds in `localStorage`, not the database: no Dexie bump, no new entity; documented limitation until Phase 17.
- Wall mode renders the existing pages inside the wall layout (no duplicate dashboards).
- "Top exceptions" on the Overview are the open alerts (critical first, oldest first, max 10): the alert engine already reuses the dashboards' calculators, so there is one list, not two.
- Acknowledging is a domain rule, not a button: `acknowledgeAlert` checks the actor's role (`canAcknowledgeAlert`) and the alert's scope (`visibleAlerts`) and raises `AlertForbiddenError`.
- A de-escalation (critical → warning) keeps the acknowledgement of the alert it replaces; an escalation starts unacknowledged so the bell lights up again.
- The UI (status level, overview) and the evaluator all use the start of the simulated minute as "now", so they cannot disagree by up to a minute.
- Known limitation: the top-bar status level recomputes the census and ED KPIs on every data change on every page (memoised by simulated minute, not by collection); revisit with indexes/selectors in Phase 14 (performance).
- No new dependencies.

## Context
`specs/domain.md` → Alert Rules, Hospital status level, Events; `specs/ux-guidelines.md` → Wall mode; Phases 6–10 dashboards (`compute*` functions); `src/components/layout/{AlertBell,StatusLevelBadge,TopBar}.tsx`.
