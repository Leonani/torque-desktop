import { Router, Request, Response } from 'express';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/workshop - Obtener configuración del taller
// ============================================================================
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM workshop_settings').all() as Array<{ key: string; value: string }>;

    const settings: Record<string, string | null> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Valores por defecto
    res.json({
      nombre: settings.nombre || 'Torque Desktop',
      direccion: settings.direccion || '',
      telefono: settings.telefono || '',
      email: settings.email || '',
      ciudad: settings.ciudad || '',
      logo: settings.logo || null,
    });
  } catch (error) {
    console.error('Error al obtener configuración del taller:', error);
    res.status(500).json({ message: 'Error al obtener configuración del taller' });
  }
});

// ============================================================================
// PUT /api/workshop - Actualizar configuración del taller
// ============================================================================
router.put('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { nombre, direccion, telefono, email, ciudad, logo } = req.body;

    const save = db.transaction(() => {
      const upsert = (key: string, value: string | null) => {
        if (value === null || value === undefined) {
          db.prepare('DELETE FROM workshop_settings WHERE key = ?').run(key);
        } else {
          db.prepare(`
            INSERT INTO workshop_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).run(key, value);
        }
      };

      upsert('nombre', nombre ?? 'Torque Desktop');
      upsert('direccion', direccion ?? '');
      upsert('telefono', telefono ?? '');
      upsert('email', email ?? '');
      upsert('ciudad', ciudad ?? '');
      upsert('logo', logo ?? null);
    });

    save();

    res.json({ message: 'Configuración del taller actualizada' });
  } catch (error) {
    console.error('Error al actualizar configuración del taller:', error);
    res.status(500).json({ message: 'Error al actualizar configuración del taller' });
  }
});

export default router;
