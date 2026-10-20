# data/hooks

React hooks (`useBeds()`, `useEdVisits()`, …) that wrap repository `observe*()` methods from the `DataProvider` context. This is the only way UI code reads data.

**May import:** React, `src/data/ports/`, `src/domain/`, the `DataProvider` context.
**Must not import:** Dexie or `src/data/adapters/`.
