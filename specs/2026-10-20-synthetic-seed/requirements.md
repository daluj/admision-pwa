# Requirements: Synthetic Hospital Seed

**Roadmap phase:** 3 — Synthetic Hospital Seed
**Branch:** `phase-3-synthetic-seed`
**Status:** Complete — 2026-10-21

## Scope

Generate a realistic, deterministic synthetic hospital as it looks at **08:00 on the current day (Europe/Madrid)** and load it into the local database: automatically on first launch, and on demand with "Restablecer demo" in Ajustes. Same seed ⇒ same hospital (only absolute dates shift with the day).

### Included

**Seeded randomness** (`src/simulator/random/`)
- `createRng(seed)` — mulberry32 PRNG with helpers: `float`, `int(min, max)`, `pick`, `weighted`, `shuffle`, `chance(p)`, `uuid()` (UUID v4-shaped, from the PRNG — deterministic ids).
- `names.ts` — fictitious Spanish names: first names (F/M) and surnames from short in-repo lists of common names; full name = first name + two surnames. Never real people.

**Hospital profile** (`src/simulator/seed/hospital.ts`) — data only, so real figures can replace it later without code changes:

| Item | Default |
|---|---|
| Specialties | the 16 in `specs/domain.md` (codes e.g. `MIN`, `CAR`, `NML`, `DIG`, `NRL`, `NEF`, `ONC`, `HEM`, `GER`, `CGD`, `TRA`, `URO`, `NCR`, `GOB`, `PED`, `PSQ`) |
| Units | ~20 across 2 buildings ("Edificio Norte", "Edificio Sur"): 17 wards (24–36 beds), ICU (20), Unidad Coronaria (10), Urgencias (`ED`, no beds) — ≈ 600 inpatient beds |
| Bed labels | `<floor><room>-<A/B>` (e.g. `512-A`), two beds per room |
| Porters | 20 (8 morning, 7 afternoon, 5 night) |
| Users | 1 per role + 1 `NURSE_SUPERVISOR` per ward and critical-care unit, fictitious names |

**Live state at 08:00** (generated, targets with tolerance):

| Item | Target |
|---|---|
| Occupancy (occupied ÷ operational beds) | 85 % ± 2 pp hospital-wide; ICU/UCO 90 %+ |
| Bed status mix | ~2 % `BLOCKED` (with reason), ~2 % `PENDING_CLEANING`, ~1 % `CLEANING`, up to 2 `RESERVED` (for boarding patients, only a bed of the requested unit type and — for wards — specialty), rest `AVAILABLE` |
| Inpatients | one `Patient` + one `ADMITTED` `Admission` (`URGENT` ~70 %, `SCHEDULED` ~30 %) per occupied bed; `admittedAt` 0–20 days ago (LOS skewed to short stays) |
| Expected discharges | ~30 % of inpatients `expectedDischargeAt` today (10:00–20:00), ~25 % tomorrow, rest unset; ~5 already `DISCHARGE_ORDERED` |
| Outliers | ~4 % of inpatients on adult general wards, from compatible specialties (never Pediatría, Ginecología y Obstetricia or Psiquiatría, in either direction) |
| ED patients | ~40 visits: `ARRIVED` ~6, `TRIAGED` ~10, `IN_ASSESSMENT` ~16, `ADMIT_DECISION` ~8; triage L1 1 %, L2 10 %, L3 35 %, L4 40 %, L5 14 %; arrivals spread over the last 0–14 h; waits follow Manchester targets (L1 seen immediately, L2 ≤ 10 min, L3–L5 ~85 % within target, the rest ≤ 1.5× target); L1/L2 never in the waiting room |
| Boarding | each `ADMIT_DECISION` visit has an `URGENT` admission (`AWAITING_BED`, or `BED_ASSIGNED` with a `RESERVED` bed) and a `BedRequest` (`OPEN` / `ASSIGNED`) |
| Scheduled admissions | ~15 `SCHEDULED` admissions for today 08:00–14:00 |
| Transfers | 2–4 `REQUESTED` transfers (to radiology / theatre) of `ADMITTED` inpatients |
| SimulationState | `id: 'current'`, `seed`, `scenarioId: 'normal-day'`, `speed: 60`, `running: false`, `simNow` = `startedAt` = anchor |

**Recording the seed (events first)**
- New event **`DemoSeeded`** (`entityType: SimulationState`, `entityId: 'current'`), payload `{ seed, profileId, anchorAt, counts }` (`counts` = rows per entity).
- Domain command `src/domain/commands/resetDemo.ts`: validates the snapshot and returns `{ events: [DemoSeeded], changes }`.
- **Port additions** (both adapters + contract tests):
  - `EventStore.reset(events, changes)` — in **one transaction** wipe every entity table and the event log, then write; `seq` restarts at 1.
  - `EventStore.append(events, changes, { expectedLastSeq })` — rejects with `ConcurrencyError` (an `AppendError`) when the store's last `seq` differs; checked inside the transaction.

**Seed service** (`src/simulator/seed/seedDemo.ts`, ports only)
- `resetDemo(backend, seed)` — anchor = today 08:00 Madrid from `backend.clock`; generate; command; `events.reset`.
- `ensureDemoSeeded(backend, seed = 42)` — if `lastSeq() === 0`, generate and `append(..., { expectedLastSeq: 0 })`; a `ConcurrencyError` (another tab seeded first) is ignored. Called once at startup from `main.tsx`.

**UI — Ajustes "Datos de demostración" card** (follows `dashboard-widget`):

| Element | Spanish copy |
|---|---|
| Title / description | "Datos de demostración" / "El hospital simulado se genera a partir de una semilla: la misma semilla produce siempre el mismo hospital." |
| Current state | "Semilla actual: 42" · "Hora simulada de inicio: 20/10/2026 08:00" |
| Field | "Semilla" (integer 0–999999, default current seed) with validation "Introduzca un número entero entre 0 y 999999." |
| Button | "Restablecer demo" |
| Confirmation dialog | "¿Restablecer la demo?" / "Se borrarán todos los datos locales y el registro de eventos y se generará de nuevo el hospital con la semilla 42." / "Cancelar" · "Restablecer" |
| Toasts | "Demo restablecida con la semilla 42" / "No se pudo restablecer la demo" |
| Busy state | button shows "Restableciendo…" and is disabled |

New hook: `useSimulationState()`.

### Not included

- The simulator engine, simulated clock ticking and scenarios (Phase 5) — `SimulationState` is written but nothing runs.
- Login using the seeded users (Phase 4).
- Dashboards showing the seeded data (Phases 6+); the Ajustes database card shows the counts.
- Real hospital figures (to be provided later; only `hospital.ts` will change).

## Decisions

- **Full morning snapshot** so every later dashboard has realistic data from day one.
- **`DemoSeeded` event + snapshot changes in one write**, not back-dated history: keeps "every state change appends an event", the event log starts at `seq 1` with a clear marker, and a reset of ~2,000 rows is one transaction. Seeded rows' `createdAt`/`updatedAt` = anchor; their own timestamps (`admittedAt`, `arrivedAt`…) are back-dated realistically.
- **The seed is the first domain command** (`resetDemo`): the simulator never writes tables directly, matching `specs/tech-stack.md`. Phase 5 adds the operational commands.
- **Anchor = today 08:00 Europe/Madrid**, read once from the `Clock` port and converted with `Intl.DateTimeFormat` (`src/lib/time.ts`, DST-safe) — no new dependency. Generation is a pure function of `(seed, anchor, profile)`; changing the day shifts every timestamp by the same amount.
- **Deterministic ids** from the PRNG (UUID v4 shape) so the same seed yields identical ids — important for repeatable demo scripts and the Phase 5 determinism test.
- **First-launch race between tabs** is handled with optimistic concurrency (`expectedLastSeq: 0`) instead of locks; useful again for the simulator.
- **No Dexie version bump**: no new tables or indexes (event types are not part of the IndexedDB schema).
- **Features may import the simulator's public API** (`src/simulator/index.ts`) for demo actions; folder READMEs updated.
- New shadcn components `alert-dialog`, `input`, `label` (Radix primitives already in `radix-ui`; no new npm dependency).

## Context

- `specs/domain.md` → Synthetic Hospital, Entities, Events; `specs/tech-stack.md` → Simulator (seeded PRNG, writes via commands); `specs/ux-guidelines.md`.
- Follow the `data-model-change` skill (new event, port methods, contract tests, Postgres draft note) and `dashboard-widget` for the card.
- Phase 2 patterns: ports & adapters, contract suite, `sampleEntities`, hooks on `useSubscribable`.
- **Synthetic data only**: generated names from generic lists, MRNs `SIM-NNNNNN`, no real staff or patients.
- Demo story: open the app → Ajustes already shows ~600 camas, ~550 pacientes, 1 evento. Change the seed to 7 and "Restablecer demo" → "Semilla actual: 7" in this tab **and in a second open tab** (row counts stay the same — they come from the profile; names, ids, statuses and times change); back to 42 → identical to the first run.
