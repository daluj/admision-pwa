# simulator

Synthetic event generator: seeded PRNG, scenarios, simulated clock and runner. Same seed + scenario ⇒ same event sequence.

**May import:** `src/domain/` (commands, schemas), `src/data/ports/`, `src/lib/`.
**Must not import:** Dexie, `src/data/adapters/`, React components.

Writes only through domain commands, exactly as a future HIS integration would. Synthetic data only — never real patients, staff or identifiers.
