// Usar require en lugar de import para evitar que Rollup genere
// imports ESM, que no son compatibles con el sandbox de Electron.
// El preload script siempre tiene acceso a require('electron') aunque
// nodeIntegration esté deshabilitado.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron');

/** Status de actualización enviado desde el main process */
interface UpdateStatus {
  type: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // General
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url'),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndUpdate: () => ipcRenderer.invoke('restart-and-update'),
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: UpdateStatus) => callback(data);
    ipcRenderer.on('update-status', handler);
    // Devolver función para limpiar el listener
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
