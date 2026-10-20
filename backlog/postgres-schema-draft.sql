-- Torre de Control — PostgreSQL schema draft (post-MVP, see backlog/2026-10-20-backend-database-options.md)
-- Mirrors the Dexie v1 schema (src/data/adapters/dexie/db.ts) and Zod schemas (src/domain/schemas/).
-- Keep in sync via the data-model-change skill. Timestamps are timestamptz (UTC); ids are text (UUIDs).
-- Not executed anywhere yet.

create table specialties (
  id          text primary key,
  code        text not null unique check (code ~ '^[A-Z0-9_-]{2,16}$'),
  name        text not null,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

create table units (
  id               text primary key,
  code             text not null unique,
  name             text not null,
  building         text not null,
  floor            integer not null,
  type             text not null check (type in ('WARD', 'ICU', 'INTERMEDIATE', 'ED', 'OTHER')),
  specialty_codes  text[] not null default '{}',
  capacity         integer not null check (capacity >= 0),
  created_at       timestamptz not null,
  updated_at       timestamptz not null
);
create index units_type_idx on units (type);

create table patients (
  id          text primary key,
  mrn         text not null unique,          -- NHC (synthetic in the MVP)
  first_name  text not null,
  last_name   text not null,
  sex         text not null check (sex in ('F', 'M', 'X')),
  birth_year  integer not null check (birth_year between 1900 and 2100),
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

create table beds (
  id                 text primary key,
  unit_id            text not null references units (id),
  label              text not null,
  status             text not null check (status in ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'PENDING_CLEANING', 'CLEANING', 'BLOCKED')),
  patient_id         text references patients (id),
  admission_id       text,
  isolation          boolean,
  blocked_reason     text,
  status_changed_at  timestamptz not null,
  created_at         timestamptz not null,
  updated_at         timestamptz not null
);
create index beds_unit_id_idx on beds (unit_id);
create index beds_status_idx on beds (status);
create index beds_unit_id_status_idx on beds (unit_id, status);
create index beds_patient_id_idx on beds (patient_id);
create index beds_admission_id_idx on beds (admission_id);

create table ed_visits (
  id                     text primary key,
  patient_id             text not null references patients (id),
  arrived_at             timestamptz not null,
  phase                  text not null check (phase in ('ARRIVED', 'TRIAGED', 'IN_ASSESSMENT', 'ADMIT_DECISION', 'LEFT_ED')),
  triage_level           smallint check (triage_level between 1 and 5),
  triaged_at             timestamptz,
  seen_at                timestamptz,
  admit_decision_at      timestamptz,
  area                   text not null check (area in ('BOXES', 'OBSERVATION', 'RESUS', 'WAITING_ROOM')),
  chief_complaint        text not null,
  target_specialty_code  text,
  ended_at               timestamptz,
  outcome                text check (outcome in ('ADMITTED', 'DISCHARGED_HOME', 'LWBS', 'TRANSFERRED_OUT', 'DECEASED')),
  created_at             timestamptz not null,
  updated_at             timestamptz not null
);
create index ed_visits_patient_id_idx on ed_visits (patient_id);
create index ed_visits_phase_idx on ed_visits (phase);
create index ed_visits_triage_level_idx on ed_visits (triage_level);
create index ed_visits_arrived_at_idx on ed_visits (arrived_at);

create table admissions (
  id                     text primary key,
  patient_id             text not null references patients (id),
  type                   text not null check (type in ('URGENT', 'SCHEDULED')),
  specialty_code         text not null,
  status                 text not null check (status in ('SCHEDULED', 'AWAITING_BED', 'BED_ASSIGNED', 'IN_TRANSFER', 'ADMITTED', 'DISCHARGE_ORDERED', 'DISCHARGED', 'CANCELLED')),
  scheduled_for          timestamptz,
  admitted_at            timestamptz,
  bed_id                 text references beds (id),
  expected_discharge_at  timestamptz,
  discharge_ordered_at   timestamptz,
  discharged_at          timestamptz,
  ed_visit_id            text references ed_visits (id),
  created_at             timestamptz not null,
  updated_at             timestamptz not null
);
create index admissions_patient_id_idx on admissions (patient_id);
create index admissions_status_idx on admissions (status);
create index admissions_type_idx on admissions (type);
create index admissions_specialty_code_idx on admissions (specialty_code);
create index admissions_bed_id_idx on admissions (bed_id);
create index admissions_expected_discharge_at_idx on admissions (expected_discharge_at);

create table bed_requests (
  id                        text primary key,
  admission_id              text not null references admissions (id),
  requested_at              timestamptz not null,
  priority                  text not null check (priority in ('P1', 'P2', 'P3')),
  required_unit_type        text not null check (required_unit_type in ('WARD', 'ICU', 'INTERMEDIATE', 'ED', 'OTHER')),
  preferred_specialty_code  text not null,
  isolation_required        boolean not null,
  status                    text not null check (status in ('OPEN', 'ASSIGNED', 'FULFILLED', 'CANCELLED')),
  assigned_bed_id           text references beds (id),
  eta_at                    timestamptz,
  created_at                timestamptz not null,
  updated_at                timestamptz not null
);
create index bed_requests_admission_id_idx on bed_requests (admission_id);
create index bed_requests_status_idx on bed_requests (status);
create index bed_requests_priority_idx on bed_requests (priority);

create table porters (
  id          text primary key,
  name        text not null,
  shift       text not null check (shift in ('MORNING', 'AFTERNOON', 'NIGHT')),
  status      text not null check (status in ('AVAILABLE', 'BUSY', 'OFF_SHIFT')),
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);
create index porters_status_idx on porters (status);
create index porters_shift_idx on porters (shift);

create table transfer_requests (
  id             text primary key,
  patient_id     text not null references patients (id),
  from_location  jsonb not null,   -- { kind: BED|ED|RADIOLOGY|OR|OTHER, refId?, label }
  to_location    jsonb not null,
  reason         text not null check (reason in ('ADMISSION', 'INTER_UNIT', 'TEST', 'SURGERY', 'RETURN')),
  priority       text not null check (priority in ('URGENT', 'NORMAL')),
  requested_at   timestamptz not null,
  status         text not null check (status in ('REQUESTED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')),
  porter_id      text references porters (id),
  assigned_at    timestamptz,
  picked_up_at   timestamptz,
  delivered_at   timestamptz,
  sla_due_at     timestamptz not null,
  created_at     timestamptz not null,
  updated_at     timestamptz not null
);
create index transfer_requests_patient_id_idx on transfer_requests (patient_id);
create index transfer_requests_status_idx on transfer_requests (status);
create index transfer_requests_porter_id_idx on transfer_requests (porter_id);
create index transfer_requests_sla_due_at_idx on transfer_requests (sla_due_at);

create table users (
  id            text primary key,
  username      text not null unique,
  display_name  text not null,
  role          text not null check (role in ('ADMISSIONS_HEAD', 'BED_MANAGER', 'NURSE_SUPERVISOR', 'ED_COORDINATOR', 'PORTER', 'MANAGEMENT')),
  unit_id       text references units (id),
  created_at    timestamptz not null,
  updated_at    timestamptz not null
);
create index users_role_idx on users (role);

create table alerts (
  id               text primary key,
  rule_id          text not null,
  severity         text not null check (severity in ('INFO', 'WARNING', 'CRITICAL')),
  entity_type      text not null,
  entity_id        text not null,
  message          text not null,
  raised_at        timestamptz not null,
  acknowledged_at  timestamptz,
  acknowledged_by  text references users (id),
  resolved_at      timestamptz,
  created_at       timestamptz not null,
  updated_at       timestamptz not null
);
create index alerts_rule_id_idx on alerts (rule_id);
create index alerts_severity_idx on alerts (severity);
create index alerts_entity_idx on alerts (entity_type, entity_id);
create index alerts_resolved_at_idx on alerts (resolved_at);

create table simulation_state (
  id           text primary key check (id = 'current'),
  seed         integer not null,
  scenario_id  text not null,
  speed        integer not null check (speed in (1, 10, 60, 300)),
  running      boolean not null,
  sim_now      timestamptz not null,
  started_at   timestamptz not null,
  created_at   timestamptz not null,
  updated_at   timestamptz not null
);

-- Append-only event log. seq is gap-free per database (assigned inside the append transaction).
create table events (
  seq          bigserial primary key,
  id           uuid not null unique,
  type         text not null,
  occurred_at  timestamptz not null,
  actor        text not null,            -- user id or 'simulator'
  entity_type  text not null,
  entity_id    text not null,
  payload      jsonb not null
);
create index events_type_idx on events (type);
create index events_occurred_at_idx on events (occurred_at);
create index events_entity_idx on events (entity_type, entity_id);
