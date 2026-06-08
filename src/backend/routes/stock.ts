import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/stock/movements - Listar movimientos de stock
// ============================================================================
router.get('/movements', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { productId, from, to, type } = req.query;

    let sql = `
      SELECT
        sm.id AS _id,
        sm.product_id AS productId,
        p.nombre_producto AS nombreProducto,
        sm.tipo,
        sm.cantidad,
        sm.motivo,
        sm.referencia_vehiculo_id AS referenciaVehiculoId,
        sm.precio_venta_aplicado AS precioVentaAplicado,
        sm.precio_compra_aplicado AS precioCompraAplicado,
        sm.created_at AS createdAt
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (productId) {
      sql += ` AND sm.product_id = ?`;
      params.push(productId);
    }
    if (from) {
      sql += ` AND sm.created_at >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND sm.created_at <= ?`;
      params.push(to);
    }
    if (type) {
      sql += ` AND sm.tipo = ?`;
      params.push(type);
    }

    sql += ` ORDER BY sm.created_at DESC LIMIT 200`;

    const movements = db.prepare(sql).all(...params);
    res.json(movements);
  } catch (error) {
    console.error('Error al listar movimientos:', error);
    res.status(500).json({ message: 'Error al listar movimientos de stock' });
  }
});

// ============================================================================
// POST /api/stock/exit - Salida de stock (disminuir cantidad)
// ============================================================================
router.post('/exit', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { productId, cantidad, motivo, referenciaVehiculoId } = req.body;

    if (!productId || !cantidad || cantidad <= 0 || !motivo) {
      return res.status(400).json({ message: 'Faltan campos: productId, cantidad, motivo' });
    }

    const validMotivos = ['compra', 'ajuste', 'uso_reparacion', 'devolucion'];
    if (!validMotivos.includes(motivo)) {
      return res.status(400).json({ message: `Motivo inválido. Debe ser: ${validMotivos.join(', ')}` });
    }

    const product = db.prepare('SELECT id, cantidad, precio_venta, precio_compra FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined;
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if ((product.cantidad as number) < cantidad) {
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${product.cantidad}, solicitado: ${cantidad}` });
    }

    const now = new Date().toISOString();

    const doExit = db.transaction(() => {
      const newCantidad = (product.cantidad as number) - cantidad;
      db.prepare('UPDATE products SET cantidad = ?, updated_at = ? WHERE id = ?').run(newCantidad, now, productId);

      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, referencia_vehiculo_id, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'salida', ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), productId, cantidad, motivo, referenciaVehiculoId || null, product.precio_venta, product.precio_compra, now);
    });

    doExit();

    const updatedProduct = db.prepare(`
      SELECT
        id AS _id,
        nombre_producto AS nombreProducto,
        codigo_barra AS codigoBarra,
        categoria,
        subcategoria,
        cantidad,
        precio_compra AS precioCompra,
        precio_venta AS precioVenta,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM products WHERE id = ?
    `).get(productId);

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error al registrar salida de stock:', error);
    res.status(500).json({ message: 'Error al registrar salida de stock' });
  }
});

// ============================================================================
// POST /api/stock/vehicles/:id/visits/:visitId/assign-product - Asignar producto a visita
// ============================================================================
router.post('/vehicles/:id/visits/:visitId/assign-product', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId } = req.params;
    const { productId, cantidad, precioVenta, precioCompra } = req.body;

    if (!productId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ message: 'Faltan campos: productId, cantidad' });
    }

    // Verificar que la visita existe
    const visit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!visit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    // Obtener producto
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined;
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if ((product.cantidad as number) < cantidad) {
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${product.cantidad}, solicitado: ${cantidad}` });
    }

    const now = new Date().toISOString();
    const pVenta = precioVenta !== undefined ? precioVenta : product.precio_venta;
    const pCompra = precioCompra !== undefined ? precioCompra : product.precio_compra;
    const subtotal = cantidad * pVenta;

    const doAssign = db.transaction(() => {
      // Disminuir stock
      const newCantidad = (product.cantidad as number) - cantidad;
      db.prepare('UPDATE products SET cantidad = ?, updated_at = ? WHERE id = ?').run(newCantidad, now, productId);

      // Crear movimiento de stock
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, referencia_vehiculo_id, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'salida', ?, 'uso_reparacion', ?, ?, ?, ?)
      `).run(randomUUID(), productId, cantidad, id, pVenta, pCompra, now);

      // Agregar a assigned_products
      db.prepare(`
        INSERT INTO assigned_products (id, visit_id, product_id, nombre_producto, cantidad, precio_venta, precio_compra, subtotal, fecha_asignacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), visitId, productId, product.nombre_producto, cantidad, pVenta, pCompra, subtotal, now);

      // Recalcular total de la visita
      const totalProductos = db.prepare('SELECT COALESCE(SUM(subtotal), 0) AS total FROM assigned_products WHERE visit_id = ?').get(visitId) as { total: number };
      const totalServicios = db.prepare('SELECT COALESCE(SUM(precio), 0) AS total FROM visit_services WHERE visit_id = ?').get(visitId) as { total: number };
      const newTotal = totalProductos.total + totalServicios.total;

      db.prepare('UPDATE visits SET total = ? WHERE id = ?').run(newTotal, visitId);

      // Actualizar updated_at del vehículo
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    doAssign();

    res.json({
      productId,
      nombreProducto: product.nombre_producto,
      cantidad,
      precioVenta: pVenta,
      precioCompra: pCompra,
      subtotal,
      fechaAsignacion: now
    });
  } catch (error) {
    console.error('Error al asignar producto:', error);
    res.status(500).json({ message: 'Error al asignar producto a la visita' });
  }
});

// ============================================================================
// DELETE /api/stock/vehicles/:id/visits/:visitId/remove-product/:productId
// Eliminar producto asignado de una visita (devuelve stock)
// ============================================================================
router.delete('/vehicles/:id/visits/:visitId/remove-product/:productId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id, visitId, productId } = req.params;

    // Verificar que la visita existe
    const visit = db.prepare('SELECT id FROM visits WHERE id = ? AND vehicle_id = ?').get(visitId, id);
    if (!visit) {
      return res.status(404).json({ message: 'Visita no encontrada' });
    }

    // Obtener el producto asignado
    const assigned = db.prepare(
      'SELECT id, product_id, cantidad, precio_venta, precio_compra FROM assigned_products WHERE visit_id = ? AND product_id = ?'
    ).get(visitId, productId) as Record<string, unknown> | undefined;

    if (!assigned) {
      return res.status(404).json({ message: 'Producto no asignado a esta visita' });
    }

    const now = new Date().toISOString();

    const doRemove = db.transaction(() => {
      const cantidad = assigned.cantidad as number;
      const pVenta = assigned.precio_venta as number;
      const pCompra = assigned.precio_compra as number;

      // Devolver al stock
      const product = db.prepare('SELECT cantidad FROM products WHERE id = ?').get(productId) as { cantidad: number };
      const newCantidad = product.cantidad + cantidad;
      db.prepare('UPDATE products SET cantidad = ?, updated_at = ? WHERE id = ?').run(newCantidad, now, productId);

      // Crear movimiento de devolución
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, referencia_vehiculo_id, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'entrada', ?, 'devolucion', ?, ?, ?, ?)
      `).run(randomUUID(), productId, cantidad, id, pVenta, pCompra, now);

      // Eliminar de assigned_products
      db.prepare('DELETE FROM assigned_products WHERE id = ?').run(assigned.id);

      // Recalcular total de la visita
      const totalProductos = db.prepare('SELECT COALESCE(SUM(subtotal), 0) AS total FROM assigned_products WHERE visit_id = ?').get(visitId) as { total: number };
      const totalServicios = db.prepare('SELECT COALESCE(SUM(precio), 0) AS total FROM visit_services WHERE visit_id = ?').get(visitId) as { total: number };
      const newTotal = totalProductos.total + totalServicios.total;

      db.prepare('UPDATE visits SET total = ? WHERE id = ?').run(newTotal, visitId);

      // Actualizar updated_at del vehículo
      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    doRemove();

    res.json({ message: 'Producto removido de la visita y stock restaurado' });
  } catch (error) {
    console.error('Error al remover producto:', error);
    res.status(500).json({ message: 'Error al remover producto de la visita' });
  }
});

// ============================================================================
// POST /api/stock/vehicles/:id/assign-product - [DEPRECATED] Usar /visits/:visitId/assign-product
// ============================================================================
router.post('/vehicles/:id/assign-product', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Obtener la última visita del vehículo
    const lastVisit = db.prepare(
      'SELECT id FROM visits WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(id) as { id: string } | undefined;

    if (!lastVisit) {
      return res.status(404).json({ message: 'El vehículo no tiene visitas' });
    }

    // Redirigir al endpoint con visitId
    req.params.visitId = lastVisit.id;
    // Re-escribir URL para que coincida con el patrón
    req.url = `/vehicles/${id}/visits/${lastVisit.id}/assign-product`;

    // Forward al handler adecuado cambiando la URL
    const { productId, cantidad, precioVenta, precioCompra } = req.body;
    // Llamar manualmente la lógica de asignación
    const visitId = lastVisit.id;

    if (!productId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ message: 'Faltan campos: productId, cantidad' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined;
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if ((product.cantidad as number) < cantidad) {
      return res.status(400).json({ message: `Stock insuficiente. Disponible: ${product.cantidad}` });
    }

    const now = new Date().toISOString();
    const pVenta = precioVenta !== undefined ? precioVenta : product.precio_venta;
    const pCompra = precioCompra !== undefined ? precioCompra : product.precio_compra;
    const subtotal = cantidad * pVenta;

    const doAssignLegacy = db.transaction(() => {
      const newCantidad = (product.cantidad as number) - cantidad;
      db.prepare('UPDATE products SET cantidad = ?, updated_at = ? WHERE id = ?').run(newCantidad, now, productId);

      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, referencia_vehiculo_id, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'salida', ?, 'uso_reparacion', ?, ?, ?, ?)
      `).run(randomUUID(), productId, cantidad, id, pVenta, pCompra, now);

      db.prepare(`
        INSERT INTO assigned_products (id, visit_id, product_id, nombre_producto, cantidad, precio_venta, precio_compra, subtotal, fecha_asignacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), visitId, productId, product.nombre_producto, cantidad, pVenta, pCompra, subtotal, now);

      const totalProductos = db.prepare('SELECT COALESCE(SUM(subtotal), 0) AS total FROM assigned_products WHERE visit_id = ?').get(visitId) as { total: number };
      const totalServicios = db.prepare('SELECT COALESCE(SUM(precio), 0) AS total FROM visit_services WHERE visit_id = ?').get(visitId) as { total: number };
      db.prepare('UPDATE visits SET total = ? WHERE id = ?').run(totalProductos.total + totalServicios.total, visitId);

      db.prepare('UPDATE vehicles SET updated_at = ? WHERE id = ?').run(now, id);
    });

    doAssignLegacy();

    res.json({
      productId,
      nombreProducto: product.nombre_producto,
      cantidad,
      precioVenta: pVenta,
      precioCompra: pCompra,
      subtotal,
      fechaAsignacion: now
    });
  } catch (error) {
    console.error('Error en asignación legacy:', error);
    res.status(500).json({ message: 'Error al asignar producto' });
  }
});

export default router;
