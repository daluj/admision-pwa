# simulator

Synthetic hospital: seeded PRNG, demo seed, and (from Phase 5) scenarios, simulated clock and runner. Same seed ⇒ same hospital / event sequence.

- `random/` — `createRng(seed)` (mulberry32: `int`, `pick`, `weighted`, `shuffle`, `uuid`, `fork`) and fictitious Spanish names.
- `seed/hospital.ts` — **the hospital profile (data only)**: specialties, units, bed counts, porters and live-state targets. Real figures replace this file, not code.
- `seed/generate*.ts` — pure generators: structure → census → ED & flows → `generateHospital({ seed, anchorAt })`.
- `seed/seedDemo.ts` — `ensureDemoSeeded` (first launch) and `resetDemo` ("Restablecer demo"), via the `resetDemo` domain command.
- `index.ts` — public API; the only entry point other layers may import.

**May import:** `src/domain/` (commands, schemas), `src/data/ports/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, React. Never `Math.random()` or the system time: use `Rng` and the `Clock` port.

Writes only through domain commands, exactly as a future HIS integration would. Synthetic data only — never real patients, staff or identifiers.
