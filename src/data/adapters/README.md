# data/adapters

Implementations of `src/data/ports/`:

- `dexie/` — MVP implementation on IndexedDB (database `torre-control`, schema in `dexie/db.ts`).
- `memory/` — in-memory implementation for unit tests.
- `supabase/` — post-MVP.

**May import:** `src/data/ports/`, `src/domain/`, the storage library of that adapter.
**Must not be imported by:** components, features or domain code. Only `src/data/DataProvider.tsx` selects and constructs an adapter (via `VITE_DATA_BACKEND`).
