# data/hooks

React hooks that wrap `observe*()` Subscribables from the `DataProvider` backend: `useDataInfo`, `useTableCounts`, `useUnits`, `useBeds`, `useBedsByUnit`, `useRecentEvents`. All are built on `useSubscribable` (`useSyncExternalStore`); they return `undefined` while the first value loads and rethrow errors to the nearest error boundary.

This is the only way UI code reads data.

**May import:** React, `src/data/ports/`, `src/data/dataContext.ts`, `src/domain/`.
**Must not import:** Dexie or `src/data/adapters/`.
