import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/appointments - Listar turnos (con filtro opcional de fecha)
// ============================================================================
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { date, startDate, endDate, status } = req.query;

    let sql = `
      SELECT
        a.id AS _id,
        a.vehicle_id AS vehicleId,
        a.owner_name AS ownerName,
        a.license_plate AS licensePlate,
        a.brand,
        a.model,
        a.date,
        a.time,
        a.duration,
        a.type,
        a.notes,
        a.status,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
      FROM appointments a
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (date) {
      sql += ` AND a.date = ?`;
      params.push(date);
    }
    if (startDate) {
      sql += ` AND a.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND a.date <= ?`;
      params.push(endDate);
    }
    if (status) {
      sql += ` AND a.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.date ASC, a.time ASC`;

    const appointments = db.prepare(sql).all(...params);
    res.json(appointments);
  } catch (error) {
    console.error('Error al listar turnos:', error);
    res.status(500).json({ message: 'Error al listar turnos' });
  }
});

// ============================================================================
// POST /api/appointments - Crear turno
// ============================================================================
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { vehicleId, ownerName, licensePlate, brand, model, date, time, duration, type, notes, status } = req.body;

    if (!ownerName || !licensePlate || !date || !time) {
      return res.status(400).json({ message: 'Faltan campos requeridos: ownerName, licensePlate, date, time' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO appointments (id, vehicle_id, owner_name, license_plate, brand, model, date, time, duration, type, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      vehicleId || null,
      ownerName,
      licensePlate,
      brand || null,
      model || null,
      date,
      time,
      duration || 60,
      type || 'revision',
      notes || null,
      status || 'pendiente',
      now,
      now
    );

    const appointment = db.prepare(`
      SELECT
        id AS _id,
        vehicle_id AS vehicleId,
        owner_name AS ownerName,
        license_plate AS licensePlate,
        brand,
        model,
        date,
        time,
        duration,
        type,
        notes,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM appointments WHERE id = ?
    `).get(id);

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error al crear turno:', error);
    res.status(500).json({ message: 'Error al crear turno' });
  }
});

// ============================================================================
// PUT /api/appointments/:id - Actualizar turno
// ============================================================================
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { vehicleId, ownerName, licensePlate, brand, model, date, time, duration, type, notes, status } = req.body;

    const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Turno no encontrado' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE appointments
      SET vehicle_id = ?, owner_name = ?, license_plate = ?, brand = ?, model = ?,
          date = ?, time = ?, duration = ?, type = ?, notes = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      vehicleId || null,
      ownerName,
      licensePlate,
      brand || null,
      model || null,
      date,
      time,
      duration || 60,
      type || 'revision',
      notes || null,
      status || 'pendiente',
      now,
      id
    );

    const appointment = db.prepare(`
      SELECT
        id AS _id,
        vehicle_id AS vehicleId,
        owner_name AS ownerName,
        license_plate AS licensePlate,
        brand,
        model,
        date,
        time,
        duration,
        type,
        notes,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM appointments WHERE id = ?
    `).get(id);

    res.json(appointment);
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    res.status(500).json({ message: 'Error al actualizar turno' });
  }
});

// ============================================================================
// DELETE /api/appointments/:id - Eliminar turno
// ============================================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Turno no encontrado' });
    }

    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    res.json({ message: 'Turno eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar turno:', error);
    res.status(500).json({ message: 'Error al eliminar turno' });
  }
});

export default router;
