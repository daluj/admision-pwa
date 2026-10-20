# data/ports

The persistence contract: repository interfaces, `EventStore`, `Clock` and `Subscribable<T>` (`subscribe(cb) → unsubscribe`).

**May import:** `src/domain/` types only.
**Must not import:** Dexie, any adapter, React.

Observable methods return `Subscribable<T>` so a future Supabase/PostgreSQL adapter can implement the same contract.
