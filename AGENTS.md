# Torque Desktop - Agent Guide

## Build / Lint / Test Commands

```bash
pnpm dev              # Start Vite dev server + Electron
pnpm build            # Build renderer only (vite build)
pnpm electron:build   # Full build: vite + sqljs fix + electron-builder
pnpm electron:build:win  # Full build targeting Windows
pnpm lint             # Run ESLint — currently a no-op (no ESLint config)
pnpm postinstall      # electron-builder install-app-deps
pnpm dev              # uses port 3005, starts Vite + Electron
```

**Testing** (vitest):
```bash
pnpm vitest run                   # Run all tests once
pnpm vitest                       # Watch mode
pnpm vitest run --reporter=verbose # Verbose output
pnpm vitest run src/renderer_tmp/__tests__/pages/StockList.test.tsx  # Single test file
```

Tests live in `src/renderer_tmp/__tests__/`. Test setup: `src/renderer_tmp/test/setup.ts` (polyfills `matchMedia` for Ant Design). Uses `vitest` + `@testing-library/react` + `@testing-library/jest-dom/vitest`.

## Project Architecture

- **Electron** main process: `src/main/index.ts` (port 3456, auto-updater, IPC handlers)
- **Preload**: `src/main/preload.ts` (uses `require()` not `import` — sandbox restriction)
- **Backend**: Express server (`src/backend/`) running inside Electron, SQLite via sql.js
- **Renderer**: React 18 + Redux Toolkit + RTK Query + Ant Design 6 + React Router 6
- **Package manager**: pnpm (v10.28.0), module system: ESM (`"type": "module"`)

### Vite Config

- **Plugins**: `@vitejs/plugin-react`, `vite-plugin-electron` (main + preload), `vite-plugin-electron-renderer`
- **Electron main entry**: `src/main/index.ts` → `dist/main` (CJS format)
- **Preload entry**: `src/main/preload.ts` → `dist/preload` (CJS format)
- **Renderer entry**: `index.html` → `dist/renderer`
- **Dev server port**: 3005

## Import Conventions

Use `@/` path aliases for renderer imports (defined in tsconfig.json and vite.config.ts):

```typescript
import { store } from '@/store';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import StockList from '@/components/StockList/StockList';
import type { Product } from '@/types';
```

**Available path aliases**: `@/` → `src/renderer/`, `@components/` → `src/renderer/components/`, `@pages/` → `src/renderer/pages/`, `@services/` → `src/renderer/services/`, `@utils/` → `src/renderer/utils/`, `@types/` → `src/renderer/types/`, `@store/` → `src/renderer/store/`, `@hooks/` → `src/renderer/hooks/`.

Order imports: external libs first, then `@/` aliases, then relative paths (backend only). Group React/layout imports before page imports before component imports.

Backend (`src/backend/`) uses relative imports only: `import { getDatabase } from '../database'`.

## File Naming

| Type | Convention | Examples |
|------|-----------|---------|
| Components | PascalCase.tsx | `StockList.tsx`, `ProductForm.tsx` |
| Pages | PascalCase.tsx | `VehicleList.tsx`, `CashRegister.tsx` |
| Utils | camelCase.ts | `helpers.ts`, `colorUtils.ts` |
| Services | camelCase.ts | `api.ts`, `productApi.ts` |
| Hooks | camelCase (useXxx).ts | `useTheme.ts`, `useAppDispatch.ts` |
| Store slices | camelCase + Slice.ts | `vehicleSlice.ts`, `themeSlice.ts` |
| CSS Modules | PascalCase.module.css | `StockList.module.css` |
| Backend routes | camelCase.ts | `vehicles.ts`, `products.ts` |

Components with CSS live in folders: `StockList/StockList.tsx` + `StockList.module.css`. Simpler components can be flat: `AppLayout.tsx` + `AppLayout.module.css`.

## Export Conventions

- **Default exports** for pages and primary components (`export default StockList`).
- **Named exports** for secondary/small components (`export function UpdateBanner()`, `export function ThemeToggle()`).

## TypeScript & Types

- Use **`interface`** for all object shapes; use **`type`** only for unions/constants (`type ThemeMode = 'light' | 'dark'`).
- No `I` prefix on interface names.
- Props interfaces: `ComponentNameProps`, defined locally above the component (not exported unless reused).
- Primary keys use `_id: string` (UUID, generated via `randomUUID()`).
- Spanish `snake_case` field names in domain models: `nombreProducto`, `fechaIngreso`, `precioCompra`.
- Type definitions in `src/renderer/types/index.ts` and `src/backend/types.ts` (duplicated between them).
- Use `import type { ... }` for type-only imports where possible.

## React Component Patterns

- Function components only (no classes). Use `const Component: React.FC<Props> = ({ ... }) => { ... }` or plain `function Component() { ... }`.
- Props typed inline or via an `interface ComponentNameProps` just above the component.
- CSS: import as `import styles from './ComponentName.module.css'`, use `className={styles.something}`.
- Ant Design theme via `ConfigProvider` with `cssVar: {}` mode.

### Redux Hooks

Use typed hooks from `@/hooks/useAppDispatch`:

```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Custom Hooks Pattern

Compose dispatch + selectors into a clean API (see `useTheme.ts`):

```typescript
export function useTheme() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  return { mode, isDark: mode === 'dark', toggleTheme: () => dispatch(setThemeMode(...)) };
}
```

## Redux Patterns

- `createSlice` with `createAsyncThunk` for async operations.
- Slice actions exported as named exports; reducer as default export.
- RTK Query for products (`productApi.ts`): `createApi` with `fetchBaseQuery`.
- Store config in `src/renderer/store/index.ts`, exports `RootState` and `AppDispatch` types.
- Error handling in thunks: `rejectWithValue(error.response?.data?.message || error.message)`.

## Backend (Express) Patterns

- Each resource is a `Router()` with all handlers wrapped in try/catch.
- Error response format: `res.status(code).json({ message: '...' })`.
- Database via `getDatabase()` returning a wrapper with `.prepare(sql).all(...)` / `.get(...)` / `.run(...)`.
- Transactions: `db.transaction(() => { ... })()`.
- Route params: `/api/vehicles/:id/visits/:visitId/pagos/:pagoId`.
- Validation: early return with 400 for missing fields, 404 for not-found, 409 for unique constraint violations.
- SQL: `snake_case` column names mapped to `camelCase` via `AS` in queries.

## Styling

- CSS Modules (`*.module.css`) for component-scoped styles.
- Ant Design tokens via `ConfigProvider` theme (colorPrimary, borderRadius, cssVar).
- CSS variables on `:root` / `[data-theme='dark']` for theme colors and gradients.
- No Tailwind, no styled-components.

## Error Handling

- Backend: each route handler wrapped in try/catch, returning `{ message: string }`.
- Async thunks: `rejectWithValue(error.response?.data?.message || error.message)`.
- Redux slices: handle `.rejected` cases by setting `state.error = action.payload`.
- Components: check `error` from selectors, display with Ant Design `Alert` or inline messages.

## Testing Patterns

- Mock RTK Query hooks via `vi.mock('@/services/productApi', ...)` at module level — mock both query and mutation hooks plus the api object.
- Mock `react-router-dom` with `vi.importActual` to preserve other exports while stubbing `useNavigate`.
- Re-mock hook return values in `beforeEach` with `.mockReturnValue()`.
- Wrap components in `<BrowserRouter>` for routing-dependent tests.
- Use `screen.getByText()`, `fireEvent.click()`, `waitFor()` patterns from `@testing-library/react`.
- Test files mirror page structure in `src/renderer_tmp/__tests__/pages/`.

## Release & Versioning

### Portable Executable Naming Convention

Use the `-draft` suffix for pre-release/test builds to distinguish them from production releases:

| Stage | File Name | Example |
|-------|-----------|---------|
| **Draft / Testing** | `Torque Desktop {version}-draft.exe` | `Torque Desktop 1.3.0-draft.exe` |
| **Production Release** | `Torque Desktop {version}.exe` | `Torque Desktop 1.3.0.exe` |

**Workflow:**
1. During development/testing, build with `-draft` suffix (rename after `electron-builder` completes)
2. When ready for release, remove `-draft` suffix from the filename
3. The GitHub release should always use the production name (without `-draft`)
4. Update the existing release assets rather than creating a new release for each draft iteration

This prevents confusion between test builds and actual releases, especially when sharing the executable for testing.

## sql.js Build Fix

The app uses sql.js (SQLite WASM) which has a Rollup bundling bug in ESM context.
The fix is in `fix-sqljs.mjs`, which runs automatically after `vite build` (via `postbuild`).

**Problem**: Rollup bundles sql.js as an IIFE where a parameter is set to `void 0`, breaking subsequent `t.exports = ...` assignments.

**Fix**: Replaces `<param>.exports[.<prop>] = <value>` with `(typeof <param> !== 'undefined' ? <param> : globalThis).exports[.<prop>] = <value>` within the sql.js IIFE. `globalThis.exports` is polyfilled in `src/main/index.ts`. The fix runs in both `pnpm dev` (via `vite.config.ts` `onstart()`) and `pnpm build` (via `postbuild`).
