import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../database';

const router = Router();

// ============================================================================
// GET /api/cash-register/current - Obtener caja abierta actual
// ============================================================================
router.get('/current', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const register = db.prepare(`
      SELECT
        id AS _id,
        fecha_apertura AS fechaApertura,
        fecha_cierre AS fechaCierre,
        monto_inicial AS montoInicial,
        monto_final_declarado AS montoFinalDeclarado,
        estado,
        observaciones,
        resumen,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM cash_registers
      WHERE estado = 'abierta'
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as Record<string, unknown> | undefined;

    if (!register) {
      return res.json(null);
    }

    // Parsear el resumen JSON
    if (register.resumen && typeof register.resumen === 'string') {
      try {
        register.resumen = JSON.parse(register.resumen as string);
      } catch {
        register.resumen = {};
      }
    }

    res.json(register);
  } catch (error) {
    console.error('Error al obtener caja actual:', error);
    res.status(500).json({ message: 'Error al obtener caja actual' });
  }
});

// ============================================================================
// POST /api/cash-register/open - Abrir caja
// ============================================================================
router.post('/open', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { montoInicial, observaciones } = req.body;

    // Verificar que no haya una caja abierta
    const openRegister = db.prepare("SELECT id FROM cash_registers WHERE estado = 'abierta' LIMIT 1").get();
    if (openRegister) {
      return res.status(400).json({ message: 'Ya hay una caja abierta. Debe cerrarla primero.' });
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO cash_registers (id, fecha_apertura, monto_inicial, estado, observaciones, resumen, created_at, updated_at)
      VALUES (?, ?, ?, 'abierta', ?, '{}', ?, ?)
    `).run(id, now, montoInicial || 0, observaciones || '', now, now);

    const register = db.prepare(`
      SELECT
        id AS _id,
        fecha_apertura AS fechaApertura,
        fecha_cierre AS fechaCierre,
        monto_inicial AS montoInicial,
        monto_final_declarado AS montoFinalDeclarado,
        estado,
        observaciones,
        resumen,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM cash_registers WHERE id = ?
    `).get(id) as Record<string, unknown>;

    if (register.resumen && typeof register.resumen === 'string') {
      try {
        register.resumen = JSON.parse(register.resumen as string);
      } catch {
        register.resumen = {};
      }
    }

    res.status(201).json(register);
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({ message: 'Error al abrir caja' });
  }
});

// ============================================================================
// POST /api/cash-register/close - Cerrar caja
// ============================================================================
router.post('/close', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { montoFinalDeclarado, observaciones } = req.body;

    // Obtener la caja abierta
    const openRegister = db.prepare(`
      SELECT id, fecha_apertura, monto_inicial FROM cash_registers WHERE estado = 'abierta' ORDER BY created_at DESC LIMIT 1
    `).get() as { id: string; fecha_apertura: string; monto_inicial: number } | undefined;

    if (!openRegister) {
      return res.status(400).json({ message: 'No hay ninguna caja abierta' });
    }

    const now = new Date().toISOString();
    const fechaApertura = openRegister.fecha_apertura;

    // Calcular totales en el período
    const payments = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN p.metodo = 'efectivo' THEN p.monto ELSE 0 END), 0) AS efectivo,
        COALESCE(SUM(CASE WHEN p.metodo = 'transferencia' THEN p.monto ELSE 0 END), 0) AS transferencia,
        COALESCE(SUM(CASE WHEN p.metodo = 'tarjeta_credito' THEN p.monto ELSE 0 END), 0) AS tarjeta_credito,
        COALESCE(SUM(CASE WHEN p.metodo = 'tarjeta_debito' THEN p.monto ELSE 0 END), 0) AS tarjeta_debito,
        COALESCE(SUM(p.monto), 0) AS totalPagos
      FROM payments p
      JOIN visits v ON p.visit_id = v.id
      WHERE p.fecha_pago >= ? AND p.fecha_pago <= ?
    `).get(fechaApertura, now) as {
      efectivo: number;
      transferencia: number;
      tarjeta_credito: number;
      tarjeta_debito: number;
      totalPagos: number;
    };

    const creditNotes = db.prepare(`
      SELECT COALESCE(SUM(monto), 0) AS totalNotas, COUNT(*) AS cantidadNotas
      FROM credit_notes
      WHERE fecha >= ? AND fecha <= ?
    `).get(fechaApertura, now) as { totalNotas: number; cantidadNotas: number };

    const stockPurchases = db.prepare(`
      SELECT
        COALESCE(SUM(cantidad * precio_compra_aplicado), 0) AS totalCompras,
        COUNT(*) AS cantidadCompras
      FROM stock_movements
      WHERE tipo = 'entrada' AND motivo = 'compra' AND created_at >= ? AND created_at <= ?
    `).get(fechaApertura, now) as { totalCompras: number; cantidadCompras: number };

    // Construir resumen
    const totalIngresos = payments.totalPagos;
    const totalDevoluciones = creditNotes.totalNotas;
    const totalVentas = totalIngresos - totalDevoluciones;
    const saldoNeto = openRegister.monto_inicial + totalVentas - stockPurchases.totalCompras;

    const montoDeclarado = montoFinalDeclarado !== undefined ? montoFinalDeclarado : saldoNeto;
    const diferencia = montoDeclarado - saldoNeto;

    const resumen = {
      montoInicial: openRegister.monto_inicial,
      totalVentas,
      totalIngresos,
      totalDevoluciones,
      saldoNeto,
      desglosePagos: {
        efectivo: payments.efectivo,
        transferencia: payments.transferencia,
        tarjeta_credito: payments.tarjeta_credito,
        tarjeta_debito: payments.tarjeta_debito
      },
      montoFinalComputado: saldoNeto,
      montoFinalDeclarado: montoDeclarado,
      diferencia
    };

    // Actualizar la caja
    db.prepare(`
      UPDATE cash_registers
      SET fecha_cierre = ?, monto_final_declarado = ?, estado = 'cerrada', observaciones = ?, resumen = ?, updated_at = ?
      WHERE id = ?
    `).run(now, montoDeclarado, observaciones || '', JSON.stringify(resumen), now, openRegister.id);

    const register = db.prepare(`
      SELECT
        id AS _id,
        fecha_apertura AS fechaApertura,
        fecha_cierre AS fechaCierre,
        monto_inicial AS montoInicial,
        monto_final_declarado AS montoFinalDeclarado,
        estado,
        observaciones,
        resumen,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM cash_registers WHERE id = ?
    `).get(openRegister.id) as Record<string, unknown>;

    if (register.resumen && typeof register.resumen === 'string') {
      try {
        register.resumen = JSON.parse(register.resumen as string);
      } catch {
        register.resumen = {};
      }
    }

    res.json(register);
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ message: 'Error al cerrar caja' });
  }
});

// ============================================================================
// GET /api/cash-register/history - Historial de cierres de caja
// ============================================================================
router.get('/history', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const registers = db.prepare(`
      SELECT
        id AS _id,
        fecha_apertura AS fechaApertura,
        fecha_cierre AS fechaCierre,
        monto_inicial AS montoInicial,
        monto_final_declarado AS montoFinalDeclarado,
        estado,
        observaciones,
        resumen,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM cash_registers
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as Array<Record<string, unknown>>;

    // Parsear resumen JSON
    for (const reg of registers) {
      if (reg.resumen && typeof reg.resumen === 'string') {
        try {
          reg.resumen = JSON.parse(reg.resumen as string);
        } catch {
          reg.resumen = {};
        }
      }
    }

    res.json(registers);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de caja' });
  }
});

// ============================================================================
// GET /api/cash-register/report - Reporte por rango de fechas
// ============================================================================
router.get('/report', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Faltan parámetros: startDate, endDate' });
    }

    const inicio = startDate as string;
    const fin = endDate as string;

    // Pagos en el período
    const payments = db.prepare(`
      SELECT
        p.id,
        p.metodo,
        p.monto,
        p.fecha_pago AS fechaPago,
        v.owner_name AS ownerName,
        v.license_plate AS licensePlate
      FROM payments p
      JOIN visits vi ON p.visit_id = vi.id
      JOIN vehicles v ON vi.vehicle_id = v.id
      WHERE p.fecha_pago >= ? AND p.fecha_pago <= ?
      ORDER BY p.fecha_pago ASC
    `).all(inicio, fin) as Array<{
      id: string;
      metodo: string;
      monto: number;
      fechaPago: string;
      ownerName: string;
      licensePlate: string;
    }>;

    // Notas de crédito en el período
    const creditNotes = db.prepare(`
      SELECT
        cn.id,
        cn.monto,
        cn.motivo,
        cn.fecha,
        v.owner_name AS ownerName,
        v.license_plate AS licensePlate
      FROM credit_notes cn
      JOIN visits vi ON cn.visit_id = vi.id
      JOIN vehicles v ON vi.vehicle_id = v.id
      WHERE cn.fecha >= ? AND cn.fecha <= ?
      ORDER BY cn.fecha ASC
    `).all(inicio, fin) as Array<{
      id: string;
      monto: number;
      motivo: string;
      fecha: string;
      ownerName: string;
      licensePlate: string;
    }>;

    // Compras de stock en el período
    const stockPurchases = db.prepare(`
      SELECT
        sm.id,
        sm.cantidad,
        sm.precio_compra_aplicado AS precioCompra,
        sm.created_at AS fecha,
        p.nombre_producto AS nombreProducto
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.tipo = 'entrada' AND sm.motivo = 'compra'
        AND sm.created_at >= ? AND sm.created_at <= ?
      ORDER BY sm.created_at ASC
    `).all(inicio, fin) as Array<{
      id: string;
      cantidad: number;
      precioCompra: number;
      fecha: string;
      nombreProducto: string;
    }>;

    // Visitas en el período
    const visitCount = db.prepare(`
      SELECT COUNT(DISTINCT id) AS cantidad
      FROM visits
      WHERE (fecha_ingreso >= ? AND fecha_ingreso <= ?)
         OR (fecha_salida >= ? AND fecha_salida <= ?)
    `).get(inicio, fin, inicio, fin) as { cantidad: number };

    // Calcular totales
    const totalEfectivo = payments.filter(p => p.metodo === 'efectivo').reduce((s, p) => s + p.monto, 0);
    const totalTransferencia = payments.filter(p => p.metodo === 'transferencia').reduce((s, p) => s + p.monto, 0);
    const totalTarjetaCredito = payments.filter(p => p.metodo === 'tarjeta_credito').reduce((s, p) => s + p.monto, 0);
    const totalTarjetaDebito = payments.filter(p => p.metodo === 'tarjeta_debito').reduce((s, p) => s + p.monto, 0);
    const totalIngresos = totalEfectivo + totalTransferencia + totalTarjetaCredito + totalTarjetaDebito;

    const totalDevoluciones = creditNotes.reduce((s, cn) => s + cn.monto, 0);
    const totalComprasStock = stockPurchases.reduce((s, sp) => s + (sp.cantidad * sp.precioCompra), 0);

    const saldoNeto = totalIngresos - totalDevoluciones - totalComprasStock;

    // Construir transacciones
    const transacciones: Array<{ fecha: string; descripcion: string; importe: number }> = [];

    for (const p of payments) {
      transacciones.push({
        fecha: p.fechaPago,
        descripcion: `Pago ${p.metodo} - ${p.ownerName} (${p.licensePlate})`,
        importe: p.monto
      });
    }

    for (const cn of creditNotes) {
      transacciones.push({
        fecha: cn.fecha,
        descripcion: `Nota de crédito - ${cn.ownerName} (${cn.licensePlate}): ${cn.motivo}`,
        importe: -cn.monto
      });
    }

    for (const sp of stockPurchases) {
      transacciones.push({
        fecha: sp.fecha,
        descripcion: `Compra de stock: ${sp.nombreProducto} x${sp.cantidad}`,
        importe: -(sp.cantidad * sp.precioCompra)
      });
    }

    // Ordenar por fecha
    transacciones.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const report = {
      periodo: { inicio, fin },
      activos: {
        totalIngresos,
        efectivo: totalEfectivo,
        transferencia: totalTransferencia,
        tarjeta_credito: totalTarjetaCredito,
        tarjeta_debito: totalTarjetaDebito
      },
      pasivos: {
        totalDevoluciones,
        cantidadNotas: creditNotes.length,
        totalComprasStock,
        cantidadComprasStock: stockPurchases.length
      },
      saldoNeto,
      cantidadVisitas: visitCount.cantidad,
      transacciones
    };

    res.json(report);
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ message: 'Error al generar reporte de caja' });
  }
});

// ============================================================================
// GET /api/cash-register/:id - Obtener detalle de caja
// ============================================================================
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const register = db.prepare(`
      SELECT
        id AS _id,
        fecha_apertura AS fechaApertura,
        fecha_cierre AS fechaCierre,
        monto_inicial AS montoInicial,
        monto_final_declarado AS montoFinalDeclarado,
        estado,
        observaciones,
        resumen,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM cash_registers WHERE id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!register) {
      return res.status(404).json({ message: 'Registro de caja no encontrado' });
    }

    if (register.resumen && typeof register.resumen === 'string') {
      try {
        register.resumen = JSON.parse(register.resumen as string);
      } catch {
        register.resumen = {};
      }
    }

    res.json(register);
  } catch (error) {
    console.error('Error al obtener detalle de caja:', error);
    res.status(500).json({ message: 'Error al obtener detalle de caja' });
  }
});

export default router;
