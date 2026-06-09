import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';
import { startServer, persistDatabase } from '../backend/index';

// ── Debug Logger ────────────────────────────────────────────────────────────
// Escribe logs a un archivo para depurar errores de producción
const LOG_PATH = path.join(app.getPath('userData'), 'torque-debug.log');
function debugLog(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack}`;
    try { return JSON.stringify(a); } catch { return String(a); }
  }).join(' ')}`;
  try { fs.appendFileSync(LOG_PATH, msg + '\n'); } catch {}
  console.log(msg);
}

let mainWindow: BrowserWindow | null = null;

const API_PORT = 3456;

// ── Polyfill global de __dirname / exports / module ─────────────────────────
// Rollup tree-shakea las variables locales __dirname/__filename en ESM,
// pero NO tree-shakea los assignments a globalThis (tienen side effects).
// Las dependencias bundleadas (sql.js, express) usan __dirname como free
// variable, y globalThis.__dirname es accesible desde la Global Environment.
//
// Ademas, sql.js bundleado hace `e.exports = u` donde `e` es el objeto module.
// En CJS esto funciona porque module/exports son inyectados por Node, pero en
// ESM no existen. Setear globalThis.exports y globalThis.module como polyfill
// para que el codigo bundleado pueda accederlos como free variables.
const __f = fileURLToPath(import.meta.url);
globalThis.__filename = __f;
globalThis.__dirname = path.dirname(__f);
(globalThis as any).exports = {};
(globalThis as any).module = { exports: (globalThis as any).exports };

// ── Configuración de Auto-Updater ──────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

// ── Creación de la ventana ─────────────────────────────────────────────────
async function createWindow() {
  // Start Express server
  try {
    await startServer(API_PORT);
  } catch (err) {
    debugLog('Error al iniciar servidor:', err);
    throw err;
  }

  const preloadPath = path.join(app.getAppPath(), 'dist/preload/preload.js');
  const rendererPath = path.join(app.getAppPath(), 'dist/renderer/index.html');
  const unpackedPreload = path.join(app.getAppPath() + '.unpacked', 'dist/preload/preload.js');
  const resourcesPreload = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist/preload/preload.js');

  debugLog('=== APP START ===');
  debugLog('app.isPackaged:', app.isPackaged);
  debugLog('app.getAppPath():', app.getAppPath());
  debugLog('process.resourcesPath:', process.resourcesPath);
  debugLog('preload path:', preloadPath);
  debugLog('unpacked preload:', unpackedPreload);
  debugLog('resources preload:', resourcesPreload);
  debugLog('renderer path:', rendererPath);
  debugLog('preload exists?', fs.existsSync(preloadPath));
  debugLog('unpacked preload exists?', fs.existsSync(unpackedPreload));
  debugLog('resources preload exists?', fs.existsSync(resourcesPreload));
  debugLog('renderer exists?', fs.existsSync(rendererPath));

  const actualPreload = fs.existsSync(unpackedPreload) ? unpackedPreload :
                         fs.existsSync(resourcesPreload) ? resourcesPreload :
                         preloadPath;

  debugLog('using preload:', actualPreload);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: actualPreload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Capturar errores de carga en la ventana
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    debugLog('did-fail-load:', { errorCode, errorDescription, validatedURL });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    debugLog('Loading file:', rendererPath);
    const fileURL = 'file://' + rendererPath.replace(/\\/g, '/');
    mainWindow!.loadFile(rendererPath).catch((err: Error) => {
      debugLog('loadFile ERROR, trying fallback URL:', err.message);
      mainWindow!.loadURL(fileURL).catch((err2: Error) => {
        debugLog('Fallback loadURL also failed:', err2.message);
      });
    });
  }

  // Abrir DevTools solo en desarrollo
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
}

// ── Eventos de Auto-Updater ────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', {
      type: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', { type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', {
      type: 'downloading',
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    // Persistir y respaldar la base de datos antes de instalar la actualización
    try {
      persistDatabase();
      const dbPath = path.join(app.getPath('userData'), 'torque.db');
      const backupPath = path.join(app.getPath('userData'), 'torque.db.backup');
      fs.copyFileSync(dbPath, backupPath);
      debugLog('Database backed up before update to:', backupPath);
    } catch (e) {
      debugLog('Failed to backup database before update:', e);
    }

    mainWindow?.webContents.send('update-status', {
      type: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (error) => {
    mainWindow?.webContents.send('update-status', {
      type: 'error',
      message: error.message,
    });
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-api-base-url', () => `http://localhost:${API_PORT}`);

ipcMain.handle('check-for-updates', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});

// ── Arranque ────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  debugLog('UNHANDLED REJECTION:', reason);
});

app.whenReady().then(async () => {
  // Pasar explícitamente el userDataPath al backend antes de iniciar el servidor
  // Esto asegura que la base de datos se guarde en la ruta correcta incluso si
  // require('electron') falla en el contexto bundleado (ver src/backend/electron.ts)
  (globalThis as any).__userDataPath = app.getPath('userData');
  debugLog('userDataPath:', (globalThis as any).__userDataPath);

  try {
    await createWindow();
  } catch (err) {
    debugLog('Error al crear ventana:', err);
  }
  setupAutoUpdater();

  // Verificar actualizaciones después de crear la ventana (solo en producción)
  if (!process.env.VITE_DEV_SERVER_URL) {
    // Esperar unos segundos para que la UI cargue primero
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        debugLog('checkForUpdates error:', err.message);
      });
    }, 5000);
  }
});

app.on('before-quit', () => {
  debugLog('App quitting, persisting and backing up database...');
  try {
    persistDatabase();
    // Crear backup al cerrar para tener siempre un respaldo reciente
    const dbPath = path.join(app.getPath('userData'), 'torque.db');
    const backupPath = path.join(app.getPath('userData'), 'torque.db.backup');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      debugLog('Database backed up on quit to:', backupPath);
    }
  } catch (e) {
    debugLog('Failed to persist/backup database on quit:', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
