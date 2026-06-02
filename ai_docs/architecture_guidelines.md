# Architecture & Key Patterns

This repo follows the stack defined in [AGENTS.md](../AGENTS.md): React 19 + Vite + TypeScript, Ant Design 6, React Router, Redux Toolkit + RTK Query, CSS Modules, and Vitest.

## Project Structure (Recommended)

Keep code organized by responsibility:

- `src/app/`: app initialization (providers, base layout)
- `src/router/`: route definitions and navigation
- `src/pages/`: screen-level pages
- `src/components/`: reusable components
- `src/features/`: feature modules (feature UI + local state)
- `src/store/`: Redux store setup + typed hooks
- `src/services/`: RTK Query APIs/endpoints
- `src/styles/`: global styles (tokens/resets/helpers)
- `src/utils/`: pure helpers
- `src/types/`: shared types

## State Management (Redux Toolkit + RTK Query)

- Prefer RTK Query for server state (fetching, caching, invalidation).
- Use tags (`providesTags`/`invalidatesTags`) for coherent cache behavior.
- Avoid duplicating server state in slices when RTK Query already models it.
- Keep store configuration in `src/store/` and expose typed hooks (`useAppDispatch`, `useAppSelector`).

## Routing (React Router)

- Keep route definitions centralized (single module).
- Prefer lazy loading pages for bundle size.
- Keep shell/layout components separate from pages.

## UI (Ant Design 6)

- Prefer Ant Design components over custom rebuilds.
- Prefer theme tokens via `ConfigProvider` over CSS overrides.
- Use hook-based APIs where applicable (`message.useMessage`, `Modal.useModal`, `notification.useNotification`).

## Styling (Strict)

- No inline styles in JSX.
- Local styles must use CSS Modules: `*.module.css`.
- Use global CSS only for shared/reusable styles in `src/styles/*`.

## Testing (Vitest)

- Use Vitest for tests.
- When writing/modifying tests, follow the `vitest` skill (Browser Mode with real Chromium).

## References

- [Development Workflows](./development_guidelines.md)
- [Pull Request Guidelines](./pull_request_guidelines.md)
