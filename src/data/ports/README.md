# data/ports

The persistence contract. Every adapter (`dexie`, `memory`, later `supabase`) implements it, and the same contract test suite (`../adapters/contract.ts`) runs against each.

- `Subscribable<T>` — `subscribe(onValue, onError?) → unsubscribe`; emits the current value, then after every change.
- `Clock` — `now()` as an ISO UTC string. Domain/simulator code never reads the system time directly.
- `Repositories` — one read-only `Repository<T>` per entity (`get`, `list`, `observeList`, `count`, `observeCount`), plus intent-named queries (`listBedsByUnit`).
- `EventStore` — `append(events, changes)` writes events (assigning `seq`) and state changes (`put` / `delete`) in **one transaction**; `list`, `observeRecent`, `lastSeq`.
- `DataBackend` — bundles the above with `info` and `observeTableCounts`.

**May import:** `src/domain/` types only.
**Must not import:** Dexie, any adapter, React.
