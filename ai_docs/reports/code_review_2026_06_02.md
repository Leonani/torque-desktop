# Code Review Report: Fix empty frame in packaged Electron app

**Date**: 2026-06-02  
**Files Reviewed**: `src/main/index.ts`, `dist/main/index.js`, `dist/main/index.cjs`  
**Reviewer**: Software Developer Orchestrator

## Summary

Fixed a production bug where the packaged Electron app showed only an empty window frame with no rendered content. The root cause was that `dist/main/index.js` used `import.meta.url` → `__dirname` polyfill for path resolution, which is fragile inside Electron's ASAR archive. The fix replaces `__dirname`-based paths with `app.getAppPath()` — the standard Electron API for resolving paths in both development and production.

## Root Cause

- `dist/main/index.js` (loaded at runtime per `package.json` `"main"`) used:
  ```javascript
  preload: path.join(__dirname, '../preload/preload.js'),
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  ```
  where `__dirname` was polyfilled from `import.meta.url`.

- `dist/main/index.cjs` (NOT loaded) already used the correct approach:
  ```javascript
  preload: path.join(app.getAppPath(), 'dist/preload/preload.js'),
  mainWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  ```

- `app.getAppPath()` correctly resolves paths both in dev (project root) and production (ASAR archive path), while `import.meta.url` → `__dirname` can fail or produce incorrect paths inside the ASAR context.

## Changes

### `src/main/index.ts` (source fix)
- Line 43: `path.join(__dirname, '../preload/preload.js')` → `path.join(app.getAppPath(), 'dist/preload/preload.js')`
- Line 53: `path.join(__dirname, '../renderer/index.html')` → `path.join(app.getAppPath(), 'dist/renderer/index.html')`

### `dist/main/index.js` (regenerated output)
- Now correctly uses `app.getAppPath()` for both preload and loadFile paths.

### `dist/main/index.cjs` (regenerated output)
- Already correct, now consistent with `index.js`.

## Compliance Checklist

- [x] TypeScript: No new `any` types
- [x] Styles: Not applicable (no JSX changes)
- [x] AntD: Not applicable (main process code)
- [x] React Hooks: Not applicable
- [x] Tone: No tone issues
- [x] Quality: `pnpm build` passes clean (renderer + main + preload + sqljs fix)

## Action Items

1. **Test**: Run `pnpm electron:build` to create a new release and verify the packaged app renders correctly.
2. **Verify**: After reinstalling, confirm the app window shows content (not just an empty frame).

## Notes

The fix is minimal and surgical — only 2 lines changed in the source file. The `globalThis.__dirname` and `globalThis.exports` polyfills are preserved at the top of the file because they are still needed by bundled dependencies (sql.js, express) that reference `__dirname` and `exports` as free variables.
