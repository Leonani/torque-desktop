import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/owners - Listar todos los propietarios
// ============================================================================
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const owners = db.prepare(`
      SELECT
        id AS _id,
        nombre,
        apellido,
        nombre || ' ' || apellido AS nombreCompleto,
        dni,
        telefono,
        email,
        direccion,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM owners
      ORDER BY apellido ASC, nombre ASC
    `).all();

    res.json(owners);
  } catch (error) {
    console.error('Error al listar propietarios:', error);
    res.status(500).json({ message: 'Error al listar propietarios' });
  }
});

// ============================================================================
// GET /api/owners/search - Buscar propietarios
// ============================================================================
router.get('/search', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Parámetro de búsqueda requerido: q' });
    }

    const searchTerm = `%${q}%`;
    const owners = db.prepare(`
      SELECT
        id AS _id,
        nombre,
        apellido,
        nombre || ' ' || apellido AS nombreCompleto,
        dni,
        telefono,
        email,
        direccion,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM owners
      WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ?
      ORDER BY apellido ASC, nombre ASC
      LIMIT 20
    `).all(searchTerm, searchTerm, searchTerm);

    res.json(owners);
  } catch (error) {
    console.error('Error al buscar propietarios:', error);
    res.status(500).json({ message: 'Error al buscar propietarios' });
  }
});

// ============================================================================
// POST /api/owners - Crear propietario
// ============================================================================
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({ message: 'Faltan campos requeridos: nombre, apellido' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO owners (id, nombre, apellido, dni, telefono, email, direccion, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nombre, apellido, dni || null, telefono || null, email || null, direccion || null, now, now);

    const owner = db.prepare(`
      SELECT
        id AS _id,
        nombre,
        apellido,
        nombre || ' ' || apellido AS nombreCompleto,
        dni,
        telefono,
        email,
        direccion,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM owners WHERE id = ?
    `).get(id);

    res.status(201).json(owner);
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe un propietario con ese DNI' });
    }
    console.error('Error al crear propietario:', error);
    res.status(500).json({ message: 'Error al crear propietario' });
  }
});

// ============================================================================
// PUT /api/owners/:id - Actualizar propietario
// ============================================================================
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;

    const existing = db.prepare('SELECT id FROM owners WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE owners
      SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?, direccion = ?, updated_at = ?
      WHERE id = ?
    `).run(nombre, apellido, dni || null, telefono || null, email || null, direccion || null, now, id);

    const owner = db.prepare(`
      SELECT
        id AS _id,
        nombre,
        apellido,
        nombre || ' ' || apellido AS nombreCompleto,
        dni,
        telefono,
        email,
        direccion,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM owners WHERE id = ?
    `).get(id);

    res.json(owner);
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe un propietario con ese DNI' });
    }
    console.error('Error al actualizar propietario:', error);
    res.status(500).json({ message: 'Error al actualizar propietario' });
  }
});

// ============================================================================
// DELETE /api/owners/:id - Eliminar propietario
// ============================================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM owners WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    db.prepare('DELETE FROM owners WHERE id = ?').run(id);
    res.json({ message: 'Propietario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar propietario:', error);
    res.status(500).json({ message: 'Error al eliminar propietario' });
  }
});

export default router;
