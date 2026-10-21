# Roadmap

Phases are intentionally small — each should be implementable in one focused Claude Code session and be demo-able when merged. Work one phase per branch (`phase-N-<kebab-name>`), with a dated spec directory under `specs/` created by the `feature-spec` skill.

Status markers: items are `[ ]` until implemented and validated; the `ship-feature` skill ticks them and adds "(Complete)" to the phase title.

---

# Part A — MVP (PWA + IndexedDB + simulator)

## Phase 1: Project Scaffold & App Shell (Complete)

**Goal:** An installable, offline-capable React PWA with the app shell and empty area pages.

- [x] Vite + React + TypeScript (strict) project with ESLint, Prettier, Vitest, Playwright and npm scripts from `specs/tech-stack.md`
- [x] Tailwind CSS v4 + shadcn/ui + design tokens (status colours, light/dark themes)
- [x] App shell: sidebar, top bar, main area, demo-data banner
- [x] Routes and placeholder pages for Overview, Camas, Urgencias, Ingresos y altas, Traslados, Seguimiento, Ajustes
- [x] `src/i18n/es.ts` with all shell strings
- [x] PWA manifest, icons and service worker (installable, works offline, update prompt)
- [x] Smoke tests (component + Playwright)

## Phase 2: Domain Model & Local Database (Complete)

**Goal:** The domain and persistence foundation behind ports & adapters.

- [x] Zod schemas + inferred types for all entities and events in `specs/domain.md`
- [x] State machines for Bed, EdVisit, Admission, TransferRequest with unit tests
- [x] Ports: repositories, `EventStore`, `Clock`, `Subscribable`
- [x] Dexie adapter (schema v1) and in-memory adapter
- [x] `DataProvider` (adapter chosen by `VITE_DATA_BACKEND`) and first hooks
- [x] Adapter contract tests run against both adapters (fake-indexeddb)

## Phase 3: Synthetic Hospital Seed (Complete)

**Goal:** A realistic, deterministic synthetic hospital to look at.

- [x] Seeded PRNG and synthetic name generator
- [x] Seed: specialties, units, beds, porters, users, initial census (~85% occupancy), ED patients
- [x] "Restablecer demo" action in Ajustes (wipe + reseed with chosen seed)
- [x] Seed is idempotent and runs on first launch

## Phase 4: Simulated Login & Roles (Complete)

**Goal:** Show how each role sees the hospital.

- [x] Login page with fictitious user cards per role (clearly labelled "acceso simulado")
- [x] Session context persisted in localStorage; logout
- [x] Role-based navigation and route guards (`specs/domain.md` → Roles)
- [x] Nurse supervisor scoped to their unit

## Phase 5: Event Store & Simulator Engine (Complete)

**Goal:** The hospital comes alive.

- [x] Domain commands that validate transitions and append events + state in one transaction
- [x] Simulated `Clock` with speed (1×, 10×, 60×, 300×), start/pause in the top bar
- [x] Simulator "normal day" scenario: ED arrivals by hour-of-day curve, triage, admit decisions, discharges, cleaning, scheduled admissions
- [x] Event log viewer (developer/Ajustes page) with filters
- [x] Determinism test: same seed + scenario + duration ⇒ identical event sequence

## Phase 6: Bed Management — Census Dashboard (Complete)

**Goal:** See every bed in the hospital in real time.

- [x] KPI strip: occupancy, free beds, pending cleaning, blocked, expected discharges today, outliers
- [x] Unit grid with per-unit occupancy and bed status breakdown
- [x] Bed map per unit (status colours, patient initials, LOS, expected discharge)
- [x] Filters by building, unit type, specialty; live updates

## Phase 7: Bed Management — Actions & Turnaround (Complete)

**Goal:** Operate beds from the dashboard.

- [x] Open bed requests list sorted by priority and wait time
- [x] Reserve/assign a bed to a request (with suggestions: matching specialty, isolation)
- [x] Block/unblock beds; mark cleaning started/finished
- [x] Bed turnaround KPI and "pending cleaning > 60 min" exceptions

## Phase 8: Emergency Department Dashboard (Complete)

**Goal:** ED flow and boarding at a glance.

- [x] KPI strip: patients present, waiting triage, waiting physician, boarding count, longest boarding, % within target
- [x] ED board by phase and triage level (Manchester colours)
- [x] Boarding list with time since admit decision and bed request status
- [x] Waiting time vs target chart (last 24 h)

## Phase 9: Admissions & Discharges

**Goal:** Plan the day's bed balance.

- [ ] Scheduled admissions of the day (pending / arrived / cancelled)
- [ ] Expected vs completed discharges, % before 12:00, per unit
- [ ] Nurse supervisor can set/edit expected discharge and order discharge
- [ ] Bed balance forecast for today with deficit warning

## Phase 10: Internal Transfers — Dispatch

**Goal:** Porter dispatch like a delivery queue.

- [ ] Transfer request creation (auto-created on bed assignment; manual creation)
- [ ] Dispatch board: queue by priority/SLA, porters available/busy, assign porter
- [ ] Porter view: my queue, accept → picked up → delivered
- [ ] Simulator drives porters; transfer SLA KPIs

## Phase 11: Patient Journey Tracking ("Track & Trace")

**Goal:** Amazon-style tracking for any patient.

- [ ] Search by NHC or name
- [ ] Journey timeline from events (arrival → triage → … → bed → discharge) with durations per step
- [ ] Current location, next expected step and ETA
- [ ] Deep links from every dashboard row to the patient's journey

## Phase 12: Control Tower Overview & Alerts

**Goal:** One screen for the whole hospital.

- [ ] Alert engine evaluating rules from `specs/domain.md` on each event batch
- [ ] Alert bell + alert centre (acknowledge, filter by severity/area)
- [ ] Overview: hospital status level, KPIs from all areas, top exceptions, 24 h trends
- [ ] Wall mode (Modo pantalla): full-screen, auto-rotate dashboards
- [ ] Settings page for thresholds and SLA targets

## Phase 13: Scenarios & Demo Mode

**Goal:** A compelling, repeatable demo.

- [ ] Scenarios: "Martes normal", "Lunes de alta presión", "Pico de gripe (plan de invierno)"
- [ ] Time-lapse: run a full simulated day in minutes; jump to a time of day
- [ ] Guided demo script (`docs/demo-script.md`) and a Playwright test that follows it

## Phase 14: MVP Hardening

**Goal:** Ready to show to the hospital.

- [ ] Performance with ~600 beds and 7 simulated days of events (no jank, fast live queries; indexes reviewed)
- [ ] Offline + install verified on Chrome/Edge desktop and iPad Safari
- [ ] Accessibility pass (axe in Playwright, keyboard, contrast)
- [ ] Error boundaries and empty/loading states everywhere
- [ ] README with demo instructions; tag `v0.1.0-mvp`

---

# Part B — Towards production (post-MVP, to be refined after the MVP demo)

Phases below are deliberately coarse; split them with `replan-roadmap` before starting.

## Phase 15: Backend Decision & Database Schema

- [ ] Architecture Decision Record from `backlog/2026-10-20-backend-database-options.md`, validated with hospital IT
- [ ] PostgreSQL schema (SQL migrations) mirroring the domain model; events table as append-only log
- [ ] Local stack with Docker (Supabase self-hosted or plain Postgres)

## Phase 16: Remote Data Adapter

- [ ] `supabase` (or `http`) adapter implementing the same ports; contract tests pass
- [ ] Realtime subscriptions (Supabase Realtime / LISTEN-NOTIFY) behind `Subscribable`
- [ ] Simulator moved server-side as a data feeder for staging environments

## Phase 17: Real Authentication & Authorisation

- [ ] SSO with the hospital identity provider (OIDC/SAML)
- [ ] Role mapping and Row Level Security policies
- [ ] Access audit log (who viewed which patient)

## Phase 18: HIS Integration

- [ ] Map HL7 v2 ADT (A01–A17) and/or FHIR (Encounter, Location, Patient) to `HospitalEvent`s
- [ ] Ingestion service connected to the hospital integration engine; idempotency and replay
- [ ] Reconciliation report (census in HIS vs Torre de Control)

## Phase 19: Security, Compliance & Deployment

- [ ] DPIA (EIPD), GDPR/LOPDGDD review, ENS controls
- [ ] Deployment on hospital / regional infrastructure; backups; monitoring
- [ ] Pilot with the Admissions Service

## Phase 20: Predictive Analytics (Python)

- [ ] Discharge probability per inpatient (next 24 h)
- [ ] ED arrivals forecast by hour
- [ ] Forecasts shown in bed balance and overview
