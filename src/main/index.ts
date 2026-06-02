import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';
import { startServer } from '../backend/index';

let mainWindow: BrowserWindow | null = null;

const API_PORT = 3456;

// Polyfill __dirname para que funcione tanto en CJS como en ESM.
// En producción dentro del asar, import.meta.url se resuelve correctamente
// gracias al soporte integrado de Electron para asar en fileURLToPath.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuración de Auto-Updater ──────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

// ── Creación de la ventana ─────────────────────────────────────────────────
async function createWindow() {
  // Start Express server
  await startServer(API_PORT);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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
app.whenReady().then(async () => {
  await createWindow();
  setupAutoUpdater();

  // Verificar actualizaciones después de crear la ventana (solo en producción)
  if (!process.env.VITE_DEV_SERVER_URL) {
    // Esperar unos segundos para que la UI cargue primero
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000);
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
