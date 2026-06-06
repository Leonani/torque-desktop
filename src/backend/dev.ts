/**
 * Script de desarrollo para arrancar el backend Express independientemente
 * de Electron. Útil para probar APIs desde el navegador o Postman.
 *
 * Uso: npx tsx src/backend/dev.ts
 * O con pnpm: pnpm dev:api
 */

// Polyfill mínimo de Electron para desarrollo
// @ts-ignore - no importar electron real
globalThis.__electron_dev = true;

// Configurar paths para modo desarrollo
process.env.VITE_DEV_SERVER_URL = 'http://localhost:3005';

import path from 'path';
import { startServer } from './index';

const PORT = 3456;

async function main() {
  console.log('[Torque Dev API] Iniciando servidor Express independiente...');
  console.log(`[Torque Dev API] Base de datos en: ${path.join(process.cwd(), 'data', 'torque.db')}`);
  
  try {
    const port = await startServer(PORT);
    console.log(`[Torque Dev API] ✅ Servidor listo en http://localhost:${port}/api`);
    console.log('[Torque Dev API] Endpoints:');
    console.log(`  GET  http://localhost:${port}/api/health`);
    console.log(`  GET  http://localhost:${port}/api/vehicles`);
    console.log(`  POST http://localhost:${port}/api/owners`);
    console.log('[Torque Dev API] Presiona Ctrl+C para detener');
  } catch (error) {
    console.error('[Torque Dev API] Error al iniciar servidor:', error);
    process.exit(1);
  }
}

main();
