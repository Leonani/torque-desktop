import React, { useState, useEffect, useCallback } from 'react';
import styles from './UpdateBanner.module.css';

/**
 * Banner de actualización automática
 * Muestra el estado de la búsqueda/descarga de actualizaciones
 * Se integra con electron-updater vía window.electronAPI
 */
export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Escuchar eventos de actualización desde el main process
    const cleanup = window.electronAPI?.onUpdateStatus((data) => {
      setStatus(data);

      // Auto-ocultar si no hay actualización disponible
      if (data.type === 'not-available') {
        setTimeout(() => setDismissed(true), 3000);
      }
    });

    return cleanup;
  }, []);

  const handleCheckNow = useCallback(async () => {
    if (window.electronAPI?.checkForUpdates) {
      await window.electronAPI.checkForUpdates();
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (window.electronAPI?.restartAndUpdate) {
      window.electronAPI.restartAndUpdate();
    }
  }, []);

  // No mostrar si está descartado o no hay status
  if (dismissed || !status) return null;

  // ── Renderizado según el tipo de status ──────────────────────────────

  /** Verificando */
  if (status.type === 'checking') {
    return (
      <div className={`${styles.banner} ${styles.checking}`}>
        <span className={styles.spinner} />
        <span>Buscando actualizaciones...</span>
      </div>
    );
  }

  /** Actualización disponible (no descargando aún) */
  if (status.type === 'available') {
    return (
      <div className={`${styles.banner} ${styles.available}`}>
        <span>📦 Nueva versión <strong>{status.version}</strong> disponible</span>
        <button className={`${styles.bannerBtn} ${styles.bannerBtnLight}`} onClick={handleCheckNow}>
          Descargar ahora
        </button>
        <button className={styles.closeBtn} onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  /** Descargando */
  if (status.type === 'downloading') {
    return (
      <div className={`${styles.banner} ${styles.downloading}`}>
        <span className={styles.spinner} />
        <span>Descargando actualización... {status.percent}%</span>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${status.percent}%` }} />
        </div>
      </div>
    );
  }

  /** Descargada - lista para instalar */
  if (status.type === 'downloaded') {
    return (
      <div className={`${styles.banner} ${styles.downloaded}`}>
        <span>✅ Actualización <strong>{status.version}</strong> descargada</span>
        <button className={`${styles.bannerBtn} ${styles.bannerBtnDark}`} onClick={handleRestart}>
          Reiniciar e instalar
        </button>
        <button className={styles.closeBtn} onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  /** Error */
  if (status.type === 'error') {
    return (
      <div className={`${styles.banner} ${styles.error}`}>
        <span>⚠️ Error al buscar actualización: {status.message}</span>
        <button className={`${styles.bannerBtn} ${styles.bannerBtnLight}`} onClick={handleCheckNow}>
          Reintentar
        </button>
        <button className={styles.closeBtn} onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  /** No disponible */
  if (status.type === 'not-available') {
    return (
      <div className={`${styles.banner} ${styles.checking}`}>
        <span>✅ Tienes la última versión</span>
      </div>
    );
  }

  return null;
}
