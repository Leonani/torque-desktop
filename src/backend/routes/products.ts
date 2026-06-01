import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/products - Listar productos con filtros
// ============================================================================
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { search, barcode, stockLow, categoria } = req.query;

    let sql = `
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
      FROM products
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (search) {
      sql += ` AND (nombre_producto LIKE ? OR codigo_barra LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (barcode) {
      sql += ` AND codigo_barra = ?`;
      params.push(barcode);
    }
    if (stockLow === 'true') {
      sql += ` AND cantidad <= 5`;
    }
    if (categoria) {
      sql += ` AND categoria = ?`;
      params.push(categoria);
    }

    sql += ` ORDER BY nombre_producto ASC`;

    const products = db.prepare(sql).all(...params);
    res.json(products);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ message: 'Error al listar productos' });
  }
});

// ============================================================================
// GET /api/products/barcode/:code - Buscar producto por código de barras
// ============================================================================
router.get('/barcode/:code', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { code } = req.params;

    const product = db.prepare(`
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
      FROM products WHERE codigo_barra = ?
    `).get(code);

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error al buscar producto por código de barras:', error);
    res.status(500).json({ message: 'Error al buscar producto' });
  }
});

// ============================================================================
// GET /api/products/:id - Obtener producto por ID
// ============================================================================
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const product = db.prepare(`
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
    `).get(id);

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ message: 'Error al obtener producto' });
  }
});

// ============================================================================
// POST /api/products - Crear producto
// ============================================================================
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { nombreProducto, codigoBarra, categoria, subcategoria, cantidad, precioCompra, precioVenta } = req.body;

    if (!nombreProducto) {
      return res.status(400).json({ message: 'El campo nombreProducto es requerido' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (id, nombre_producto, codigo_barra, categoria, subcategoria, cantidad, precio_compra, precio_venta, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nombreProducto, codigoBarra || null, categoria || null, subcategoria || null, cantidad || 0, precioCompra || 0, precioVenta || 0, now, now);

    // Crear movimiento de stock inicial si la cantidad es > 0
    if (cantidad && cantidad > 0) {
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'entrada', ?, 'compra', ?, ?, ?)
      `).run(randomUUID(), id, cantidad, precioVenta || 0, precioCompra || 0, now);
    }

    const product = db.prepare(`
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
    `).get(id);

    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error al crear producto' });
  }
});

// ============================================================================
// PUT /api/products/:id - Actualizar producto
// ============================================================================
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { nombreProducto, codigoBarra, categoria, subcategoria, cantidad, precioCompra, precioVenta } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products
      SET nombre_producto = ?, codigo_barra = ?, categoria = ?, subcategoria = ?,
          cantidad = ?, precio_compra = ?, precio_venta = ?, updated_at = ?
      WHERE id = ?
    `).run(nombreProducto, codigoBarra || null, categoria || null, subcategoria || null, cantidad || 0, precioCompra || 0, precioVenta || 0, now, id);

    const product = db.prepare(`
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
    `).get(id);

    res.json(product);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
});

// ============================================================================
// DELETE /api/products/:id - Eliminar producto
// ============================================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
});

// ============================================================================
// POST /api/products/stock/entry - Entrada de stock (incrementar cantidad)
// ============================================================================
router.post('/stock/entry', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { productId, cantidad, precioCompra, precioVenta } = req.body;

    if (!productId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ message: 'Faltan campos: productId, cantidad' });
    }

    const product = db.prepare('SELECT id, cantidad, precio_compra, precio_venta FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined;
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const now = new Date().toISOString();

    const doEntry = db.transaction(() => {
      // Actualizar cantidad y precios en el producto
      const newCantidad = (product.cantidad as number) + cantidad;
      const newPrecioCompra = precioCompra !== undefined ? precioCompra : product.precio_compra;
      const newPrecioVenta = precioVenta !== undefined ? precioVenta : product.precio_venta;

      db.prepare(`
        UPDATE products SET cantidad = ?, precio_compra = ?, precio_venta = ?, updated_at = ? WHERE id = ?
      `).run(newCantidad, newPrecioCompra, newPrecioVenta, now, productId);

      // Crear movimiento de stock
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, tipo, cantidad, motivo, precio_venta_aplicado, precio_compra_aplicado, created_at)
        VALUES (?, ?, 'entrada', ?, 'compra', ?, ?, ?)
      `).run(randomUUID(), productId, cantidad, newPrecioVenta, newPrecioCompra, now);
    });

    doEntry();

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
    console.error('Error al registrar entrada de stock:', error);
    res.status(500).json({ message: 'Error al registrar entrada de stock' });
  }
});

export default router;
