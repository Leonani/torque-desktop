/// <reference types="vite/client" />

/** Status de actualización recibido desde el main process vía IPC */
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

/** API expuesta por el preload script (contextBridge) */
interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getApiBaseUrl: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  restartAndUpdate: () => void;
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
