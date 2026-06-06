/**
 * Lazy access to Electron's app object.
 * In dev mode (VITE_DEV_SERVER_URL), electron may not be available
 * (e.g. when running the API server standalone with pnpm dev:api).
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
    const mock = {
      getPath: () => process.cwd(),
      isPackaged: !isDev,
      resourcesPath: path.join(process.cwd(), 'resources'),
      getAppPath: () => process.cwd(),
    };
    (globalThis as any).__electronMock = mock;
    return mock;
  }
}
