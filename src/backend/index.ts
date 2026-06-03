import express from 'express';
import cors from 'cors';
import path from 'path';
import { app } from 'electron';
import { initDatabase, getDatabase, closeDatabase } from './database';
import vehicleRoutes from './routes/vehicles';
import productRoutes from './routes/products';
import stockRoutes from './routes/stock';
import cashRegisterRoutes from './routes/cashRegister';
import ownerRoutes from './routes/owners';
import appointmentRoutes from './routes/appointments';
import categoryRoutes from './routes/categories';

export { getDatabase, closeDatabase };

/**
 * Inicia el servidor Express en el puerto especificado
 * Si el puerto está ocupado, intenta con el siguiente (puerto + 1)
 */
export async function startServer(port: number): Promise<number> {
  // Inicializar base de datos antes de arrancar el servidor
  await initDatabase();
  console.log('[Torque API] Base de datos inicializada');

  return new Promise((resolve, reject) => {
    const server = express();

    // Middleware global
    server.use(cors());
    server.use(express.json({ limit: '50mb' }));
    server.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Servir fotos estáticamente
    let photosDir: string;
    if (process.env.VITE_DEV_SERVER_URL) {
      photosDir = path.join(process.cwd(), 'data', 'photos');
    } else {
      photosDir = path.join(app.getPath('userData'), 'photos');
    }
    server.use('/photos', express.static(photosDir));

    // Montar rutas de la API
    server.use('/api/vehicles', vehicleRoutes);
    server.use('/api/products', productRoutes);
    server.use('/api/stock', stockRoutes);
    server.use('/api/cash-register', cashRegisterRoutes);
    server.use('/api/owners', ownerRoutes);
    server.use('/api/appointments', appointmentRoutes);
    server.use('/api/categories', categoryRoutes);

    // Health check
    server.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Manejador de errores global
    server.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error no manejado:', err);
      res.status(500).json({ message: 'Error interno del servidor' });
    });

    // Iniciar servidor
    const httpServer = server.listen(port, () => {
      console.log(`[Torque API] Servidor iniciado en puerto ${port}`);
      resolve(port);
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Torque API] Puerto ${port} ocupado, intentando puerto ${port + 1}...`);
        httpServer.close();
        resolve(startServer(port + 1));
      } else {
        console.error('[Torque API] Error al iniciar servidor:', err);
        reject(err);
      }
    });
  });
}
