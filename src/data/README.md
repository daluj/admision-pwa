# data

Persistence behind ports & adapters.

- `ports/` — the contract (repositories, `EventStore`, `Clock`, `Subscribable`, `DataBackend`).
- `adapters/` — implementations (Dexie, memory) + contract tests.
- `createBackend.ts` — chooses the adapter from `VITE_DATA_BACKEND` (`dexie` default | `memory`); called once in `main.tsx`.
- `DataProvider.tsx` / `dataContext.ts` — provide the `DataBackend` to React.
- `hooks/` — the only way UI reads data.

Writes go through `backend.events.append(events, changes)` (from Phase 5: via domain commands).
