/**
 * Lazy access to Electron's app object.
 * In dev mode (VITE_DEV_SERVER_URL), electron may not be available
 * (e.g. when running the API server standalone with pnpm dev:api).
 *
 * The main process (src/main/index.ts) sets globalThis.__userDataPath
 * BEFORE starting the Express server, so the database always resolves
 * to the correct userData directory even if require('electron') fails.
 */
import path from 'path';

export function getElectronApp(): any {
  const e = (globalThis as any).__electronMock;
  if (e) return e;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('electron')?.app;
  } catch {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    // Use explicit path from main process if available, fallback to cwd
    const userDataPath = (globalThis as any).__userDataPath || process.cwd();
    console.log('[Torque Electron] require("electron") failed, using userDataPath:', userDataPath);
    const mock = {
      getPath: () => userDataPath,
      isPackaged: !isDev,
      resourcesPath: path.join(userDataPath, 'resources'),
      getAppPath: () => userDataPath,
    };
    (globalThis as any).__electronMock = mock;
    return mock;
  }
}
