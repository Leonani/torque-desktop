# Remediation Plan: Dynamic Categories Feature

**Date**: 2026-06-03
**Files Reviewed**: 9 files (schema.ts, database.ts, categories.ts, index.ts, categoryApi.ts, store/index.ts, types/index.ts, ProductForm.tsx, StockList.tsx)

## Priority Matrix

| Priority | Issue | File | Line(s) | Type |
|----------|-------|------|---------|------|
| **P0 - Critical** | Error code mismatch for unique constraint detection | categories.ts | 64, 97 | Runtime Bug |
| **P1 - High** | Inline styles violating project standards | ProductForm.tsx | 185, 190, 203, 208, 312, 339 | Style Violation |
| **P1 - High** | Stale `ProductCategory` import and type annotation | ProductForm.tsx | 19, 102 | Type Misuse |
| **P2 - Medium** | Navigation fires in modal context | ProductForm.tsx | 117 | UX Logic |
| **P3 - Low** | Dead constants left in types | types/index.ts | 73-88 | Cleanup |
| **P3 - Low** | N+1 query in categories route | categories.ts | 20-26 | Performance |

## Detailed Remediation Steps

### P0: Error code mismatch (categories.ts lines 64, 97)

**Problem**: The code checks `error?.code === 'SQLITE_CONSTRAINT_UNIQUE'` but sql.js may use a different code format. The existing codebase uses this pattern consistently (vehicles.ts, owners.ts), so this is a systemic issue. If it's wrong here, it's wrong everywhere.

**Fix**: Verify the actual error code format from sql.js v1.14.1. If needed, change to a broader check like `String(error?.code).includes('SQLITE_CONSTRAINT')` to catch all constraint violations.

**Affected**: `src/backend/routes/categories.ts` lines 64, 97
**Risk**: Low (the code falls through to generic 500 error — no crash, just wrong status code)

### P1: Inline styles (ProductForm.tsx — 6 locations)

**Problem**: Six instances of inline `style={{...}}` props violate the project's "Zero inline styles" rule.

**Locations**:
1. Line 185: `<Divider style={{ margin: '4px 0' }} />`
2. Line 190: `<Button style={{ width: '100%', textAlign: 'left', padding: '4px 12px', height: 36 }}>`
3. Line 203: `<Divider style={{ margin: '4px 0' }} />`
4. Line 208: `<Button style={{ width: '100%', textAlign: 'left', padding: '4px 12px', height: 36 }}>`
5. Line 312: `<Space direction="vertical" style={{ width: '100%' }}>`
6. Line 339: `<Space direction="vertical" style={{ width: '100%' }}>`

**Fix**: Move all styles to `ProductForm.module.css`. Add CSS Module classes:
- `.dropdownDivider { margin: 4px 0; }`
- `.dropdownButton { width: 100%; text-align: left; padding: 4px 12px; height: 36px; }`
- `.fullWidthSpace { width: 100%; }`

**Affected**: `src/renderer/components/ProductForm/ProductForm.tsx`, `src/renderer/components/ProductForm/ProductForm.module.css`
**Risk**: None (pure style refactor)

### P1: Stale type import (ProductForm.tsx lines 19, 102)

**Problem**: `import { ProductCategory } from '@/types'` is imported but the component now uses dynamic `string`-based categories. `handleCategoryChange` parameter typed as `ProductCategory | null` should be `string | null`.

**Fix**: Remove the `ProductCategory` import from line 19. Change `handleCategoryChange` signature to `(value: string | null)`.

**Note**: `ProductCategory` is still used in `renderer_tmp/` test files, so do NOT remove the type export from `types/index.ts` unless cleaning up tests.

**Affected**: `src/renderer/components/ProductForm/ProductForm.tsx` lines 19, 102
**Risk**: None

### P2: Navigation in modal context (ProductForm.tsx line 117)

**Problem**: `navigate('/products')` fires unconditionally after form submit. When `isModal=true` (ProductForm embedded in StockList), this redirects away from the StockList page.

**Fix**: Gate the navigation behind `!isModal`:
```typescript
if (!isModal) navigate('/products');
onDone?.();
```

**Affected**: `src/renderer/components/ProductForm/ProductForm.tsx` line 117
**Risk**: Low (modal behavior currently broken)

### P3: Dead constants (types/index.ts lines 73-88)

**Problem**: `PRODUCT_CATEGORIES`, `PRODUCT_SUBCATEGORIES`, and `ProductCategory` type are no longer referenced by any production source files (only in `renderer_tmp/` test files).

**Fix**: Remove from production types if `renderer_tmp` is temporary. Otherwise, keep as-is since they're exported and may be used in tests.

**Affected**: `src/renderer/types/index.ts`
**Risk**: None if kept; low if removed (test files would need updating)

### P3: N+1 query (categories.ts lines 20-26)

**Problem**: Each category triggers a separate SQL query to fetch subcategories. For N categories, this is N+1 queries.

**Fix**: Use a single JOIN-based query for fetching all categories with subcategories, or batch-fetch all subcategories with one `WHERE category_id IN (...)` query.

**Affected**: `src/backend/routes/categories.ts`
**Risk**: Low (performance improvement only; categories are few)
