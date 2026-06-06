import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';
import { savePhoto, deletePhoto, getPhotoUrl } from '../middleware/photoHandler';

const router = Router();

// ============================================================================
// GET /api/vehicles - Listar vehículos con búsqueda y filtros
// ============================================================================
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { search, brand, model, year } = req.query;

    let sql = `
      SELECT
        v.id AS _id,
        v.owner_name AS ownerName,
        v.license_plate AS licensePlate,
        v.brand,
        v.model,
        v.year,
        v.color,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM visits WHERE vehicle_id = v.id) AS visitCount,
        (SELECT MAX(fecha_ingreso) FROM visits WHERE vehicle_id = v.id) AS lastVisitDate
      FROM vehicles v
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (search) {
      sql += ` AND (v.owner_name LIKE ? OR v.license_plate LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    if (brand) {
      sql += ` AND v.brand = ?`;
      params.push(brand);
    }
    if (model) {
      sql += ` AND v.model = ?`;
      params.push(model);
    }
    if (year) {
      sql += ` AND v.year = ?`;
      params.push(Number(year));
    }

    sql += ` ORDER BY v.updated_at DESC`;

    const vehicles = db.prepare(sql).all(...params);
    res.json(vehicles);
  } catch (error) {
    console.error('Error al listar vehículos:', error);
    res.status(500).json({ message: 'Error al listar vehículos' });
  }
});

// ============================================================================
// GET /api/vehicles/debts - Calcular deudas de vehículos
// ============================================================================
router.get('/debts', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const sql = `
      SELECT
        v.id AS vehicleId,
        v.owner_name AS ownerName,
        v.license_plate AS licensePlate,
        v.brand,
        v.model,
        COALESCE(SUM(
          vi.total - COALESCE(
            (SELECT SUM(p.monto) FROM payments p WHERE p.visit_id = vi.id), 0
          ) + COALESCE(
            (SELECT SUM(cn.monto) FROM credit_notes cn WHERE cn.visit_id = vi.id), 0
          )
        ), 0) AS totalDeuda,
        COUNT(DISTINCT CASE WHEN (
          vi.total - COALESCE(
            (SELECT SUM(p.monto) FROM payments p WHERE p.visit_id = vi.id), 0
          ) + COALESCE(
            (SELECT SUM(cn.monto) FROM credit_notes cn WHERE cn.visit_id = vi.id), 0
          )
        ) > 0 THEN vi.id END) AS visitasConDeuda,
        MAX(vi.fecha_ingreso) AS fechaIngreso,
        (SELECT MAX(p.fecha_pago) FROM payments p JOIN visits vi2 ON p.visit_id = vi2.id WHERE vi2.vehicle_id = v.id) AS ultimoPago
      FROM vehicles v
      LEFT JOIN visits vi ON vi.vehicle_id = v.id
      GROUP BY v.id
      HAVING totalDeuda > 0
      ORDER BY totalDeuda DESC
    `;

    const debts = db.prepare(sql).all();
    res.json(debts);
  } catch (error) {
    console.error('Error al calcular deudas:', error);
    res.status(500).json({ message: 'Error al calcular deudas' });
  }
});

// ============================================================================
// GET /api/vehicles/:id - Detalle completo del vehículo
// ============================================================================
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const getVehicleDetail = db.transaction((vehicleId: string) => {
      // Obtener vehículo
      const vehicle = db.prepare(`
        SELECT
          id AS _id,
          owner_name AS ownerName,
          license_plate AS licensePlate,
          brand, model, year, color,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM vehicles WHERE id = ?
      `).get(vehicleId) as Record<string, unknown> | undefined;

      if (!vehicle) return null;

      // Obtener visitas
      const visits = db.prepare(`
        SELECT
          id AS _id,
          fecha_ingreso AS fechaIngreso,
          fecha_salida AS fechaSalida,
          total, notas,
          created_at AS createdAt
        FROM visits WHERE vehicle_id = ? ORDER BY created_at ASC
      `).all(vehicleId) as Array<Record<string, unknown>>;

      // Para cada visita, cargar datos relacionados
      for (const visit of visits) {
        const visitId = visit._id as string;

        // Fotos - convertir de array a objeto
        const photos = db.prepare(
          'SELECT position, file_path FROM visit_photos WHERE visit_id = ?'
        ).all(visitId) as Array<{ position: string; file_path: string }>;

        const photoObj: Record<string, string> = {};
        for (const p of photos) {
          photoObj[p.position] = getPhotoUrl(p.file_path);
        }
        visit.photos = photoObj;

        // Inspecciones - sectores con items
        const sectors = db.prepare(
          'SELECT id, sector FROM inspection_sectors WHERE visit_id = ?'
        ).all(visitId) as Array<{ id: string; sector: string }>;

        visit.inspections = sectors.map(s => {
          const items = db.prepare(
            'SELECT name, status, needs_replacement AS needsReplacement, notes FROM inspection_items WHERE sector_id = ?'
          ).all(s.id) as Array<{ name: string; status: string; needsReplacement: number; notes: string }>;

          return {
            sector: s.sector,
            items: items.map(i => ({
              name: i.name,
              status: i.status,
              needsReplacement: !!i.needsReplacement,
              notes: i.notes
            }))
          };
        });

        // Productos asignados
        visit.productosAsignados = db.prepare(`
          SELECT
            product_id AS productId,
            nombre_producto AS nombreProducto,
            cantidad,
            precio_venta AS precioVenta,
            precio_compra AS precioCompra,
            subtotal,
            fecha_asignacion AS fechaAsignacion
          FROM assigned_products WHERE visit_id = ?
        `).all(visitId);

        // Servicios
        visit.servicios = db.prepare(`
          SELECT nombre, precio FROM visit_services WHERE visit_id = ?
        `).all(visitId);

        // Pagos
        visit.pagos = db.prepare(`
          SELECT
            id AS _id,
            metodo,
            monto,
            referencia,
            fecha_pago AS fechaPago
          FROM payments WHERE visit_id = ? ORDER BY fecha_pago ASC
        `).all(visitId);

        // Notas de crédito
        visit.notasCredito = db.prepare(`
          SELECT
            id AS _id,
            monto,
            motivo,
            fecha
          FROM credit_notes WHERE visit_id = ? ORDER BY fecha ASC
        `).all(visitId);
      }

      vehicle.visits = visits;
      return vehicle;
    });

    const result = getVehicleDetail(id);
    if (!result) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error al obtener vehículo:', error);
    res.status(500).json({ message: 'Error al obtener vehículo' });
  }
});

// ============================================================================
// POST /api/vehicles - Crear vehículo (con visita opcional)
// ============================================================================
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      ownerName, licensePlate, brand, model, year, color,
      visits: firstVisit,
      photos,
      inspections,
      productosAsignados,
      servicios,
    } = req.body;

    if (!ownerName || !licensePlate || !brand || !model || !year) {
      return res.status(400).json({ message: 'Faltan campos requeridos: ownerName, licensePlate, brand, model, year' });
    }

    const vehicleId = randomUUID();
    const now = new Date().toISOString();
    let createdVisitId: string | null = null;

    const insertVehicle = db.transaction(() => {
      db.prepare(`
        INSERT INTO vehicles (id, owner_name, license_plate, brand, model, year, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(vehicleId, ownerName, licensePlate, brand, model, year, color || '', now, now);

      // Determinar si hay datos de visita (desde visits object o top-level)
      const serviciosToProcess = firstVisit?.servicios || servicios || [];
      const hasVisitData =
        (firstVisit && firstVisit.fechaIngreso) ||
        (Array.isArray(serviciosToProcess) && serviciosToProcess.length > 0) ||
        (Array.isArray(productosAsignados) && productosAsignados.length > 0) ||
        (Array.isArray(inspections) && inspections.length > 0) ||
        (photos && typeof photos === 'object' && Object.values(photos).some(Boolean));

      if (hasVisitData) {
        const visitId = randomUUID();
        createdVisitId = visitId;

        // Calcular total combinado de servicios + productos
        const serviciosTotal = Array.isArray(serviciosToProcess)
          ? serviciosToProcess.reduce((sum: number, s: any) => sum + (Number(s.precio) || 0), 0)
          : 0;
        const productosTotal = Array.isArray(productosAsignados)
          ? productosAsignados.reduce((sum: number, p: any) => sum + (Number(p.subtotal) || 0), 0)
          : 0;

        db.prepare(`
          INSERT INTO visits (id, vehicle_id, fecha_ingreso, fecha_salida, total, notas, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          visitId,
          vehicleId,
          firstVisit?.fechaIngreso || now,
          firstVisit?.fechaSalida || null,
          serviciosTotal + productosTotal,
          firstVisit?.notas || '',
          now
        );

        // ── Servicios ──
        if (Array.isArray(serviciosToProcess)) {
          for (const svc of serviciosToProcess) {
            db.prepare(`
              INSERT INTO visit_services (id, visit_id, nombre, precio)
              VALUES (?, ?, ?, ?)
            `).run(randomUUID(), visitId, svc.nombre, svc.precio);
          }
        }

        // ── Productos asignados ──
        if (Array.isArray(productosAsignados)) {
          for (const prod of productosAsignados) {
            db.prepare(`
              INSERT INTO assigned_products (id, visit_id, product_id, nombre_producto, cantidad, precio_venta, precio_compra, subtotal)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              randomUUID(),
              visitId,
              prod.productId,
              prod.nombreProducto,
              prod.cantidad,
              prod.precioVenta,
              prod.precioCompra || 0,
              prod.subtotal
            );
          }
        }

        // ── Inspecciones ──
        if (Array.isArray(inspections)) {
          for (const sec of inspections) {
            const sectorId = randomUUID();
            db.prepare(`
              INSERT INTO inspection_sectors (id, visit_id, sector)
              VALUES (?, ?, ?)
            `).run(sectorId, visitId, sec.sector);

            if (Array.isArray(sec.items)) {
              for (const item of sec.items) {
                db.prepare(`
                  INSERT INTO inspection_items (id, sector_id, name, status, needs_replacement, notes)
                  VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                  randomUUID(),
                  sectorId,
                  item.name,
                  item.status || 'ok',
                  item.needsReplacement ? 1 : 0,
                  item.notes || ''
                );
              }
            }
          }
        }
      }
    });

    insertVehicle();

    // ── Fotos (después de la transacción: operación de filesystem) ──
    if (createdVisitId && photos && typeof photos === 'object') {
      const validPositions = ['front', 'back', 'left', 'right', 'motor', 'dashboard'];
      for (const position of validPositions) {
        const photoData = photos[position];
        if (photoData && typeof photoData === 'string' && photoData.startsWith('data:')) {
          try {
            const filePath = savePhoto(photoData, vehicleId, createdVisitId, position);
            db.prepare(`
              INSERT INTO visit_photos (id, visit_id, position, file_path, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(randomUUID(), createdVisitId, position, filePath, now);
          } catch (err) {
            console.error(`Error al guardar foto ${position}:`, err);
          }
        }
      }
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, vehicleId);
    }

    // Devolver el vehículo creado con todos sus datos
    const vehicle = db.prepare(`
      SELECT
        id AS _id,
        owner_name AS ownerName,
        license_plate AS licensePlate,
        brand, model, year, color,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM vehicles WHERE id = ?
    `).get(vehicleId) as Record<string, unknown>;

    const visits = db.prepare(`
      SELECT
        id AS _id,
        fecha_ingreso AS fechaIngreso,
        fecha_salida AS fechaSalida,
        total, notas, created_at AS createdAt
      FROM visits WHERE vehicle_id = ? ORDER BY created_at ASC
    `).all(vehicleId);

    vehicle.visits = visits;
    res.status(201).json(vehicle);
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe un vehículo con esa patente' });
    }
    console.error('Error al crear vehículo:', error);
    res.status(500).json({ message: 'Error al crear vehículo' });
  }
});

// ============================================================================
// PUT /api/vehicles/:id - Actualizar vehículo
// ============================================================================
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { ownerName, licensePlate, brand, model, year, color } = req.body;

    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE vehicles
      SET owner_name = ?, license_plate = ?, brand = ?, model = ?, year = ?, color = ?, updated_at = ?
      WHERE id = ?
    `).run(ownerName, licensePlate, brand, model, year, color || '', now, id);

    const vehicle = db.prepare(`
      SELECT
        id AS _id,
        owner_name AS ownerName,
        license_plate AS licensePlate,
        brand, model, year, color,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM vehicles WHERE id = ?
    `).get(id);

    res.json(vehicle);
  } catch (error: any) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'Ya existe un vehículo con esa patente' });
    }
    console.error('Error al actualizar vehículo:', error);
    res.status(500).json({ message: 'Error al actualizar vehículo' });
  }
});

// ============================================================================
// DELETE /api/vehicles/:id - Eliminar vehículo (cascade elimina visitas, etc.)
// ============================================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Eliminar fotos del sistema de archivos antes de borrar el vehículo
    const photos = db.prepare(`
      SELECT vp.file_path FROM visit_photos vp
      JOIN visits v ON vp.visit_id = v.id
      WHERE v.vehicle_id = ?
    `).all(id) as Array<{ file_path: string }>;

    for (const photo of photos) {
      deletePhoto(photo.file_path);
    }

    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ message: 'Error al eliminar vehículo' });
  }
});

// ============================================================================
// POST /api/vehicles/:id/visits - Agregar visita a vehículo
// ============================================================================
router.post('/:id/visits', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { fechaIngreso, fechaSalida, total, notas, servicios } = req.body;

    const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    const visitId = randomUUID();
    const now = new Date().toISOString();

    const insertVisit = db.transaction(() => {
      db.prepare(`
        INSERT INTO visits (id, vehicle_id, fecha_ingreso, fecha_salida, total, notas, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(visitId, id, fechaIngreso || now, fechaSalida || null, total || 0, notas || '', now);

      // Servicios
      if (servicios && Array.isArray(servicios)) {
        for (const svc of servicios) {
          db.prepare(`
            INSERT INTO visit_services (id, visit_id, nombre, precio)
            VALUES (?, ?, ?, ?)
          `).run(randomUUID(), visitId, svc.nombre, svc.precio);
        }
      }

      // Actualizar updated_at del vehículo
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    insertVisit();

    // Devolver el vehículo completo actualizado
    res.redirect(303, `/api/vehicles/${id}`);
  } catch (error) {
    console.error('Error al agregar visita:', error);
    res.status(500).json({ message: 'Error al agregar visita' });
  }
});

// ============================================================================
// PUT /api/vehicles/:id/visits/:visitId - Actualizar visita
// ============================================================================
router.put('/:id/visits/:visitId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { fechaIngreso, fechaSalida, total, notas, servicios } = req.body;

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    const now = new Date().toISOString();

    const updateVisit = db.transaction(() => {
      // Usar COALESCE + ?? null para preservar valores existentes cuando
      // el campo no se envía (undefined). sql.js NO acepta undefined
      // como valor de binding, solo null | number | string | Uint8Array.
      db.prepare(`
        UPDATE visits
        SET fecha_ingreso = COALESCE(?, fecha_ingreso),
            fecha_salida = COALESCE(?, fecha_salida),
            total = COALESCE(?, total),
            notas = COALESCE(?, notas)
        WHERE id = ?
      `).run(fechaIngreso ?? null, fechaSalida ?? null, total ?? null, notas ?? null, visitId);

      // Actualizar servicios: reemplazar todos
      if (servicios !== undefined) {
        db.prepare('DELETE FROM visit_services WHERE visit_id = ?').run(visitId);
        if (Array.isArray(servicios)) {
          for (const svc of servicios) {
            db.prepare(`
              INSERT INTO visit_services (id, visit_id, nombre, precio)
              VALUES (?, ?, ?, ?)
            `).run(randomUUID(), visitId, svc.nombre, svc.precio);
          }
        }
      }

      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    updateVisit();

    res.redirect(303, `/api/vehicles/${id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error al actualizar visita:', errorMessage, error);
    res.status(500).json({ message: `Error al actualizar visita: ${errorMessage}` });
  }
});

// ============================================================================
// DELETE /api/vehicles/:id/visits/:visitId - Eliminar visita
// ============================================================================
router.delete('/:id/visits/:visitId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    // Eliminar fotos del sistema de archivos
    const photos = db.prepare('SELECT file_path FROM visit_photos WHERE visit_id = ?').all(visitId) as Array<{ file_path: string }>;
    for (const photo of photos) {
      deletePhoto(photo.file_path);
    }

    const now = new Date().toISOString();
    const deleteVisit = db.transaction(() => {
      db.prepare('DELETE FROM visits WHERE id = ?').run(visitId);
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    deleteVisit();
    res.json({ message: 'Visita eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar visita:', error);
    res.status(500).json({ message: 'Error al eliminar visita' });
  }
});

// ============================================================================
// POST /api/vehicles/:id/visits/:visitId/photos - Guardar/actualizar foto
// ============================================================================
router.post('/:id/visits/:visitId/photos', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { position, data } = req.body;

    if (!position || !data) {
      return res.status(400).json({ message: 'Faltan campos: position, data (base64)' });
    }

    const validPositions = ['front', 'back', 'left', 'right', 'motor', 'dashboard'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({ message: `Posición inválida. Debe ser: ${validPositions.join(', ')}` });
    }

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    // Guardar foto en el sistema de archivos
    const filePath = savePhoto(data, id, visitId, position);

    // Upsert en la base de datos
    const now = new Date().toISOString();
    const existingPhoto = db.prepare('SELECT id FROM visit_photos WHERE visit_id = ? AND position = ?').get(visitId, position);

    if (existingPhoto) {
      // Eliminar archivo anterior
      const oldPhoto = db.prepare('SELECT file_path FROM visit_photos WHERE id = ?').get((existingPhoto as any).id) as { file_path: string };
      deletePhoto(oldPhoto.file_path);

      db.prepare('UPDATE visit_photos SET file_path = ?, created_at = ? WHERE id = ?')
        .run(filePath, now, (existingPhoto as any).id);
    } else {
      db.prepare('INSERT INTO visit_photos (id, visit_id, position, file_path, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(randomUUID(), visitId, position, filePath, now);
    }

    // Actualizar updated_at del vehículo
    db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);

    res.json({ filePath, url: getPhotoUrl(filePath) });
  } catch (error) {
    console.error('Error al guardar foto:', error);
    res.status(500).json({ message: 'Error al guardar foto' });
  }
});

// ============================================================================
// DELETE /api/vehicles/:id/visits/:visitId/photos/:position - Eliminar foto
// ============================================================================
router.delete('/:id/visits/:visitId/photos/:position', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId, position } = req.params;

    const photo = db.prepare('SELECT id, file_path FROM visit_photos WHERE visit_id = ? AND position = ?')
      .get(visitId, position) as { id: string; file_path: string } | undefined;

    if (!photo) {
      return res.status(404).json({ message: 'Foto no encontrada' });
    }

    deletePhoto(photo.file_path);
    db.prepare('DELETE FROM visit_photos WHERE id = ?').run(photo.id);

    const now = new Date().toISOString();
    db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);

    res.json({ message: 'Foto eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ message: 'Error al eliminar foto' });
  }
});

// ============================================================================
// POST /api/vehicles/:id/visits/:visitId/pagos - Registrar pago
// ============================================================================
router.post('/:id/visits/:visitId/pagos', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { metodo, monto, referencia, fechaPago } = req.body;

    if (!metodo || monto === undefined) {
      return res.status(400).json({ message: 'Faltan campos: metodo, monto' });
    }

    const validMetodos = ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito'];
    if (!validMetodos.includes(metodo)) {
      return res.status(400).json({ message: `Método inválido. Debe ser: ${validMetodos.join(', ')}` });
    }

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    const pagoId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payments (id, visit_id, metodo, monto, referencia, fecha_pago)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pagoId, visitId, metodo, monto, referencia || '', fechaPago || now);

    // Actualizar updated_at del vehículo
    db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);

    res.status(201).json({
      _id: pagoId,
      metodo,
      monto,
      referencia: referencia || '',
      fechaPago: fechaPago || now
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago' });
  }
});

// ============================================================================
// DELETE /api/vehicles/:id/visits/:visitId/pagos/:pagoId - Eliminar pago
// ============================================================================
router.delete('/:id/visits/:visitId/pagos/:pagoId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId, pagoId } = req.params;

    const existing = db.prepare('SELECT id FROM payments WHERE id = ? AND visit_id = ?').get(pagoId, visitId);
    if (!existing) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    db.prepare('DELETE FROM payments WHERE id = ?').run(pagoId);

    const now = new Date().toISOString();
    db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);

    res.json({ message: 'Pago eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ message: 'Error al eliminar pago' });
  }
});

// ============================================================================
// POST /api/vehicles/:id/visits/:visitId/notas-credito - Crear nota de crédito
// ============================================================================
router.post('/:id/visits/:visitId/notas-credito', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { monto, motivo } = req.body;

    if (monto === undefined || !motivo) {
      return res.status(400).json({ message: 'Faltan campos: monto, motivo' });
    }

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    const notaId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO credit_notes (id, visit_id, monto, motivo, fecha)
      VALUES (?, ?, ?, ?, ?)
    `).run(notaId, visitId, monto, motivo, now);

    db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);

    res.status(201).json({
      _id: notaId,
      monto,
      motivo,
      fecha: now
    });
  } catch (error) {
    console.error('Error al crear nota de crédito:', error);
    res.status(500).json({ message: 'Error al crear nota de crédito' });
  }
});

// ============================================================================
// GET /api/vehicles/:id/visits/:visitId/inspection - Obtener inspección
// ============================================================================
router.get('/:id/visits/:visitId/inspection', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    const sectors = db.prepare(
      'SELECT id, sector FROM inspection_sectors WHERE visit_id = ?'
    ).all(visitId) as Array<{ id: string; sector: string }>;

    const inspections = sectors.map(s => {
      const items = db.prepare(
        'SELECT name, status, needs_replacement AS needsReplacement, notes FROM inspection_items WHERE sector_id = ?'
      ).all(s.id) as Array<{ name: string; status: string; needsReplacement: number; notes: string }>;

      return {
        sector: s.sector,
        items: items.map(i => ({
          name: i.name,
          status: i.status,
          needsReplacement: !!i.needsReplacement,
          notes: i.notes
        }))
      };
    });

    res.json(inspections);
  } catch (error) {
    console.error('Error al obtener inspección:', error);
    res.status(500).json({ message: 'Error al obtener inspección' });
  }
});

// ============================================================================
// POST /api/vehicles/:id/visits/:visitId/inspection - Guardar inspección completa
// Reemplaza todos los sectores e items existentes
// ============================================================================
router.post('/:id/visits/:visitId/inspection', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { inspections } = req.body;

    if (!Array.isArray(inspections)) {
      return res.status(400).json({ message: 'El campo inspections debe ser un array' });
    }

    const existingVisit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!existingVisit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    const saveInspection = db.transaction(() => {
      // Eliminar sectores existentes (CASCADE elimina items)
      db.prepare('DELETE FROM inspection_sectors WHERE visit_id = ?').run(visitId);

      // Insertar nuevos sectores e items
      for (const sec of inspections) {
        const sectorId = randomUUID();
        db.prepare(`
          INSERT INTO inspection_sectors (id, visit_id, sector)
          VALUES (?, ?, ?)
        `).run(sectorId, visitId, sec.sector);

        if (Array.isArray(sec.items)) {
          for (const item of sec.items) {
            db.prepare(`
              INSERT INTO inspection_items (id, sector_id, name, status, needs_replacement, notes)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(randomUUID(), sectorId, item.name, item.status || 'ok', item.needsReplacement ? 1 : 0, item.notes || '');
          }
        }
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    saveInspection();
    res.json({ message: 'Inspección guardada correctamente' });
  } catch (error) {
    console.error('Error al guardar inspección:', error);
    res.status(500).json({ message: 'Error al guardar inspección' });
  }
});

export default router;
