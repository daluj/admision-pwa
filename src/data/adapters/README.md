# data/adapters

Implementations of `src/data/ports/`:

- `dexie/` — MVP implementation on IndexedDB (database `torre-control`, schema in `dexie/db.ts`; never edit an existing `db.version(n)` block).
- `memory/` — in-memory implementation for unit tests and `VITE_DATA_BACKEND=memory`.
- `clock/` — `systemClock` (the only place that reads the system time) and `createFixedClock` for tests.
- `validation.ts` — shared `append` validation (Zod in development/tests).
- `contract.ts` — the behavioural suite every adapter must pass (`*.contract.test.ts`).
- `supabase/` — post-MVP.

**May import:** `src/data/ports/`, `src/domain/`, the storage library of that adapter.
**Must not be imported by:** components, features, hooks or domain code. Only `src/data/createBackend.ts` constructs an adapter (tests may use them directly).
