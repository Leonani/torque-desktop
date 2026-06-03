import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/categories - Listar categorías con sus subcategorías
// ============================================================================
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const categories = db.prepare(`
      SELECT id, name, created_at AS createdAt
      FROM categories
      ORDER BY name ASC
    `).all() as Array<{ id: string; name: string; createdAt: string }>;

    const result = categories.map(cat => {
      const subcategories = db.prepare(`
        SELECT id, name, created_at AS createdAt
        FROM subcategories
        WHERE category_id = ?
        ORDER BY name ASC
      `).all(cat.id) as Array<{ id: string; name: string; createdAt: string }>;

      return {
        _id: cat.id,
        name: cat.name,
        subcategories: subcategories.map(sub => ({
          _id: sub.id,
          name: sub.name,
        })),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({ message: 'Error al listar categorías' });
  }
});

// ============================================================================
// POST /api/categories - Crear nueva categoría
// ============================================================================
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'El nombre de la categoría es requerido' });
    }

    const id = randomUUID();
    const trimmedName = name.trim();

    db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, trimmedName);

    res.status(201).json({ _id: id, name: trimmedName, subcategories: [] });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear categoría' });
  }
});

// ============================================================================
// POST /api/categories/subcategories - Crear nueva subcategoría
// ============================================================================
router.post('/subcategories', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { categoryId, name } = req.body;

    if (!categoryId || !name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'categoryId y name son requeridos' });
    }

    // Verificar que la categoría existe
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    const id = randomUUID();
    const trimmedName = name.trim();

    db.prepare('INSERT INTO subcategories (id, category_id, name) VALUES (?, ?, ?)').run(id, categoryId, trimmedName);

    res.status(201).json({ _id: id, name: trimmedName, categoryId });
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe una subcategoría con ese nombre en esta categoría' });
    }
    console.error('Error al crear subcategoría:', error);
    res.status(500).json({ message: 'Error al crear subcategoría' });
  }
});

export default router;
