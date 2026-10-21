# components/layout

The app shell. `nav.ts` is the single source of navigation items, shared by the sidebar and the router.

**May import:** `src/components/ui/`, `src/components/theme/`, `src/i18n/`, `src/lib/`, `src/data/hooks/`.
**Must not import:** Dexie, `src/data/adapters/`, `src/features/`.

Navigation is filtered by role: `NavList` shows only the areas the session's role may open (`useSession().can(area)`); `UserMenu` shows the simulated user and logs out.
