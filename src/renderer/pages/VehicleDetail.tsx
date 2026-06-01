import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Button, Space, Image, Tag, Divider, Popconfirm, Collapse, Empty, Modal, Select, InputNumber, Input, Alert, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, PlusOutlined, CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@hooks/useAppDispatch';
import { fetchVehicleById, deleteVehicle, clearSelectedVehicle, setSelectedVisit } from '@store/vehicleSlice';
import InspectionSectorCard from '@components/InspectionSectorCard';
import { formatDate } from '@utils/helpers';
import { sectorNames, createEmptyInspections } from '@utils/inspectionData';
import {
  registerPago, deletePago, createNotaCredito, deleteNotaCredito,
  assignProductToVisit, removeProductFromVisit, updateVisitServices,
} from '@services/api';
import type { Visit, CashRegister, PagoEntry, Product } from '@/types';


const { Title, Text } = Typography;

// ── Tipos locales ──────────────────────────────────────────

/**
 * Fila individual en el formulario de pagos múltiples.
 * Cada fila equivale a una llamada a registerPago.
 */
interface PagoFormRow {
  id: string;
  metodo: string;
  monto: number;
  referencia: string;
}

/** Item pendiente de asignar en el modal de productos/servicios */
interface PendingItem {
  id: string;
  tipo: 'producto' | 'servicio';
  nombre: string;
  cantidad?: number;
  precio: number;
  precioCompra?: number;
  productId?: string;
}

const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedVehicle, selectedVisit, loading } = useAppSelector((state) => state.vehicles);
  const [activeVisitId, setActiveVisitId] = useState<string | undefined>(undefined);

  // ── Payment modal state (multi-row) ──────────────────────
  const [pagoModal, setPagoModal] = useState(false);
  const [pagoVisit, setPagoVisit] = useState<Visit | null>(null);
  const [pagoRows, setPagoRows] = useState<PagoFormRow[]>([]);
  const [pagoSaving, setPagoSaving] = useState(false);
  const [pagoErrors, setPagoErrors] = useState<Record<string, string>>({});

  // ── Credit note modal state ──────────────────────────────
  const [notaModal, setNotaModal] = useState(false);
  const [notaVisit, setNotaVisit] = useState<Visit | null>(null);
  const [notaMonto, setNotaMonto] = useState<number>(0);
  const [notaMotivo, setNotaMotivo] = useState<string>('');

  // ── Cash register state ──────────────────────────────────
  const [cashOpen, setCashOpen] = useState<boolean | null>(null);
  const [closedRegisters, setClosedRegisters] = useState<CashRegister[]>([]);

  // ── Product / Service modal state ─────────────────────────
  const [productoModal, setProductoModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [asignarSaving, setAsignarSaving] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customPriceCompra, setCustomPriceCompra] = useState<number>(0);
  const [servicioNombre, setServicioNombre] = useState<string>('');
  const [servicioPrecio, setServicioPrecio] = useState<number>(0);

  useEffect(() => {
    // Verificar si la caja está abierta y obtener cierres cerrados
    const checkCashRegister = async () => {
      try {
        // Obtener caja actual
        const currentRes = await fetch('/api/cash-register/current');
        const currentData = await currentRes.json();
        setCashOpen(currentData && currentData.estado === 'abierta');

        // Obtener historial de cierres para saber qué pagos están protegidos
        const historyRes = await fetch('/api/cash-register/history');
        const historyData = await historyRes.json();
        // Solo nos interesan las cajas cerradas
        setClosedRegisters(
          (Array.isArray(historyData) ? historyData : []).filter(
            (r: CashRegister) => r.estado === 'cerrada' && r.fechaApertura && r.fechaCierre
          )
        );
      } catch {
        setCashOpen(false);
      }
    };
    checkCashRegister();
  }, []);

  useEffect(() => {
    if (id) {
      dispatch(fetchVehicleById(id));
    }
    return () => {
      dispatch(clearSelectedVehicle());
    };
  }, [dispatch, id]);

  // Cuando se carga el vehículo, seleccionar la última visita
  useEffect(() => {
    if (selectedVehicle?.visits && selectedVehicle.visits.length > 0) {
      const lastVisit = selectedVehicle.visits[selectedVehicle.visits.length - 1];
      if (lastVisit._id) {
        setActiveVisitId(lastVisit._id);
        dispatch(setSelectedVisit(lastVisit));
      }
    }
  }, [selectedVehicle]);

  const handleDelete = async () => {
    if (id && window.confirm('¿Está seguro de eliminar este vehículo?')) {
      await dispatch(deleteVehicle(id));
      navigate('/vehicles');
    }
  };

  const handlePrint = () => {
    if (!selectedVehicle) return;
    const visit = selectedVisit || selectedVehicle.visits?.[selectedVehicle.visits.length - 1];
    if (!visit) return;

    const visitDate = visit.fechaIngreso ? formatDate(visit.fechaIngreso) : formatDate(selectedVehicle.createdAt || '');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Trabajo - ${selectedVehicle.licensePlate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          h2 { border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 20px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { margin-bottom: 5px; }
          .label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .photos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .photo { width: 100%; height: 120px; object-fit: cover; border: 1px solid #ddd; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          .signature { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
          .sig-line { border-top: 1px solid #333; padding-top: 5px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Taller Mecánico</h1>
        <h2>Datos del Vehículo</h2>
        <div class="info-grid">
          <div class="info-item"><span class="label">Patente:</span> ${selectedVehicle.licensePlate.toUpperCase()}</div>
          <div class="info-item"><span class="label">Marca/Modelo:</span> ${selectedVehicle.brand} ${selectedVehicle.model}</div>
          <div class="info-item"><span class="label">Año:</span> ${selectedVehicle.year}</div>
          <div class="info-item"><span class="label">Color:</span> ${selectedVehicle.color || '-'}</div>
          <div class="info-item"><span class="label">Dueño:</span> ${selectedVehicle.ownerName}</div>
          <div class="info-item"><span class="label">Visita del:</span> ${visitDate}</div>
        </div>
        
        <h2>Inspección</h2>
        ${(() => {
          const mergedInspections = mergeInspections(visit);
          return mergedInspections.map((sector: { sector: string; items: Array<{ name: string; status?: string; notes?: string }> }) => `
            <h3>${sectorNames[sector.sector as keyof typeof sectorNames] || sector.sector}</h3>
            <table>
              <tr><th>Item</th><th>Estado</th><th>Notas</th></tr>
              ${sector.items.map((item: { name: string; status?: string; notes?: string }) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.status === 'revision' ? 'R' : 'OK'}</td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </table>
          `).join('');
        })()}
        
        ${visit.productosAsignados && visit.productosAsignados.length > 0 ? `
          <h2>Productos Asignados</h2>
          <table>
            <tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr>
            ${visit.productosAsignados.map((p: { nombreProducto: string; cantidad: number; precioVenta: number; precioCompra?: number; subtotal: number }) => `
              <tr>
                <td>${p.nombreProducto}</td>
                <td>${p.cantidad}</td>
                <td>$${p.precioVenta}${p.precioCompra ? ` (Costo: $${p.precioCompra})` : ''}</td>
                <td>$${p.subtotal}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        <div class="signature">
          <div class="sig-line">Firma del Cliente</div>
          <div class="sig-line">Firma del Taller</div>
        </div>
        
        <div class="footer">
          Documento generado el ${new Date().toLocaleDateString()} - Taller Mecánico
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleVisitChange = (key: string | string[]) => {
    const visitId = Array.isArray(key) ? key[0] : key;
    setActiveVisitId(visitId);
    if (visitId && selectedVehicle?.visits) {
      const visit = selectedVehicle.visits.find(v => v._id === visitId);
      if (visit) dispatch(setSelectedVisit(visit));
    }
  };

  // ── Payment & Credit Note handlers ────────────────────────

  // ── Helpers para el modal multi-fila ──────────────────────

  let rowIdCounter = 0;
  const generateRowId = () => {
    rowIdCounter++;
    return `row-${rowIdCounter}`;
  };

  const calcularTotalPagoRows = (): number => {
    return pagoRows.reduce((sum, row) => sum + (row.monto || 0), 0);
  };

  const addRow = () => {
    setPagoRows(prev => [
      ...prev,
      { id: generateRowId(), metodo: 'efectivo', monto: 0, referencia: '' },
    ]);
  };

  const removeRow = (id: string) => {
    setPagoRows(prev => {
      if (prev.length <= 1) return prev; // No eliminar la única fila
      return prev.filter(row => row.id !== id);
    });
  };

  const updateRow = (id: string, field: keyof PagoFormRow, value: string | number) => {
    setPagoRows(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
    // Limpiar error de la fila al modificar
    if (pagoErrors[id]) {
      setPagoErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const validateRows = (): string[] => {
    const errors: string[] = [];
    pagoRows.forEach((row, index) => {
      if (!row.monto || row.monto <= 0) {
        errors.push(`Fila ${index + 1}: El monto debe ser mayor a 0`);
        setPagoErrors(prev => ({ ...prev, [row.id]: 'El monto debe ser mayor a 0' }));
      }
    });
    return errors;
  };

  // ── Handler principal: guardar todos los pagos ────────────

  const handleSaveAll = async () => {
    if (!pagoVisit || !id) return;

    // Validar
    setPagoErrors({});
    const errors = validateRows();
    if (errors.length > 0) {
      errors.forEach(err => message.warning(err));
      return;
    }

    // Enviar pagos secuencialmente
    setPagoSaving(true);
    const successfulIds: string[] = [];
    const failedRows: Array<{ rowId: string; error: string }> = [];

    for (const row of pagoRows) {
      try {
        await registerPago(id, pagoVisit._id!, {
          metodo: row.metodo as PagoEntry['metodo'],
          monto: row.monto,
          referencia: row.referencia || undefined,
        });
        successfulIds.push(row.id);
      } catch (err) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'Error al registrar pago';
        failedRows.push({ rowId: row.id, error: msg });
        setPagoErrors(prev => ({ ...prev, [row.id]: msg }));
      }
    }

    setPagoSaving(false);

    // Resultados
    if (failedRows.length === 0) {
      // Éxito total
      message.success(`${successfulIds.length} pago(s) registrado(s) correctamente`);
      setPagoModal(false);
      dispatch(fetchVehicleById(id));
    } else if (successfulIds.length > 0) {
      // Éxito parcial
      message.warning(
        `${successfulIds.length} pago(s) registrados, ${failedRows.length} fallaron. Corrige y vuelve a intentar.`,
      );
      // Quitar filas exitosas, dejar solo las fallidas
      setPagoRows(prev => prev.filter(row => failedRows.some(f => f.rowId === row.id)));
      dispatch(fetchVehicleById(id));
    } else {
      // Error total
      message.error('No se pudo registrar ningún pago. Verifica los errores en cada fila.');
    }
  };

  const openPagoModal = (visit: Visit) => {
    setPagoVisit(visit);
    setPagoRows([
      { id: generateRowId(), metodo: 'efectivo', monto: 0, referencia: '' },
    ]);
    setPagoErrors({});
    setPagoSaving(false);
    setPagoModal(true);
  };

  const handleDeletePago = async (visit: Visit, pagoId: string) => {
    if (!id) return;
    try {
      await deletePago(id, visit._id!, pagoId);
      message.success('Pago eliminado');
      dispatch(fetchVehicleById(id));
    } catch {
      message.error('Error al eliminar el pago');
    }
  };

  const openNotaCreditoModal = (visit: Visit) => {
    setNotaVisit(visit);
    setNotaMonto(0);
    setNotaMotivo('');
    setNotaModal(true);
  };

  const handleCreateNotaCredito = async () => {
    if (!notaVisit || !id) return;
    if (notaMonto <= 0) {
      message.warning('El monto debe ser mayor a 0');
      return;
    }
    if (!notaMotivo.trim()) {
      message.warning('El motivo es obligatorio');
      return;
    }
    try {
      await createNotaCredito(id, notaVisit._id!, {
        monto: notaMonto,
        motivo: notaMotivo,
      });
      message.success('Nota de crédito creada correctamente');
      setNotaModal(false);
      dispatch(fetchVehicleById(id));
    } catch {
      message.error('Error al crear la nota de crédito');
    }
  };

  const handleDeleteNota = async (visit: Visit, notaId: string) => {
    if (!id) return;
    try {
      await deleteNotaCredito(id, visit._id!, notaId);
      message.success('Nota de crédito eliminada');
      dispatch(fetchVehicleById(id));
    } catch {
      message.error('Error al eliminar la nota de crédito');
    }
  };

  // ── Product / Service handlers ──────────────────────────────

  const openProductoModal = async () => {
    setPendingItems([]);
    setSelectedProductId('');
    setSelectedProductQty(1);
    setCustomPrice(0);
    setCustomPriceCompra(0);
    setServicioNombre('');
    setServicioPrecio(0);
    setProductoModal(true);

    // Cargar productos disponibles
    if (availableProducts.length === 0) {
      setLoadingProducts(true);
      try {
        const { default: api } = await import('../services/api');
        const response = await api.get('/products');
        setAvailableProducts(response.data);
      } catch {
        message.error('Error al cargar productos');
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const addPendingProduct = () => {
    if (!selectedProductId) {
      message.warning('Seleccione un producto');
      return;
    }
    const product = availableProducts.find(p => p._id === selectedProductId);
    if (!product) return;
    if (selectedProductQty <= 0) {
      message.warning('La cantidad debe ser mayor a 0');
      return;
    }

    const precioCompraFinal = customPriceCompra > 0 ? customPriceCompra : product.precioCompra;

    setPendingItems(prev => [
      ...prev,
      {
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tipo: 'producto',
        nombre: product.nombreProducto,
        cantidad: selectedProductQty,
        precio: customPrice > 0 ? customPrice : product.precioVenta,
        precioCompra: precioCompraFinal,
        productId: product._id,
      },
    ]);

    setSelectedProductId('');
    setSelectedProductQty(1);
    setCustomPrice(0);
    setCustomPriceCompra(0);
  };

  const addPendingService = () => {
    if (!servicioNombre.trim()) {
      message.warning('Ingrese un nombre para el servicio');
      return;
    }
    if (servicioPrecio <= 0) {
      message.warning('El precio debe ser mayor a 0');
      return;
    }

    setPendingItems(prev => [
      ...prev,
      {
        id: `serv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tipo: 'servicio',
        nombre: servicioNombre.trim(),
        precio: servicioPrecio,
      },
    ]);

    setServicioNombre('');
    setServicioPrecio(0);
  };

  const removePendingItem = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveProductos = async () => {
    if (!id) return;
    const visit = selectedVisit || (selectedVehicle?.visits && selectedVehicle.visits.length > 0
      ? selectedVehicle.visits[selectedVehicle.visits.length - 1]
      : null);
    if (!visit || !visit._id) {
      message.warning('No hay una visita activa para asignar productos');
      return;
    }

    if (pendingItems.length === 0) {
      message.warning('Agregue al menos un producto o servicio');
      return;
    }

    setAsignarSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingItems) {
      try {
        if (item.tipo === 'producto' && item.productId) {
          await assignProductToVisit(id, visit._id, {
            productId: item.productId,
            cantidad: item.cantidad || 1,
            precioVenta: item.precio,
            precioCompra: item.precioCompra,
          });
          successCount++;
        } else if (item.tipo === 'servicio') {
          // Get current servicios + add new one
          const currentServicios = visit.servicios || [];
          await updateVisitServices(id, visit._id, [
            ...currentServicios,
            { nombre: item.nombre, precio: item.precio },
          ]);
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setAsignarSaving(false);

    if (failCount === 0) {
      message.success(`${successCount} ítem(s) asignado(s) correctamente`);
      setProductoModal(false);
      dispatch(fetchVehicleById(id));
    } else if (successCount > 0) {
      message.warning(`${successCount} asignados, ${failCount} fallaron`);
      setPendingItems(prev => prev.filter((_, i) => i >= successCount));
      dispatch(fetchVehicleById(id));
    } else {
      message.error('No se pudo asignar ningún ítem');
    }
  };

  const handleRemoveProductoAsignado = async (
    visitId: string,
    productId: string,
  ) => {
    if (!id) return;
    try {
      await removeProductFromVisit(id, visitId, productId);
      message.success('Producto quitado de la visita');
      dispatch(fetchVehicleById(id));
    } catch {
      message.error('Error al quitar el producto');
    }
  };

  const handleRemoveServicio = async (
    visit: Visit,
    servicioIndex: number,
  ) => {
    if (!id) return;
    try {
      const serviciosActualizados = (visit.servicios || []).filter(
        (_, i) => i !== servicioIndex,
      );
      await updateVisitServices(id, visit._id!, serviciosActualizados);
      message.success('Servicio quitado de la visita');
      dispatch(fetchVehicleById(id));
    } catch {
      message.error('Error al quitar el servicio');
    }
  };

  // ── Calculated helpers ──────────────────────────────────────

  const calcularTotal = (visit: Visit): number => {
    return visit.total || 0;
  };

  const calcularPagado = (visit: Visit): number => {
    if (!visit.pagos || visit.pagos.length === 0) return 0;
    return visit.pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  };

  const calcularDevuelto = (visit: Visit): number => {
    if (!visit.notasCredito || visit.notasCredito.length === 0) return 0;
    return visit.notasCredito.reduce((sum, n) => sum + (n.monto || 0), 0);
  };

  const calcularSaldo = (visit: Visit): number => {
    return calcularTotal(visit) - calcularPagado(visit) + calcularDevuelto(visit);
  };

  /**
   * Verifica si un pago está protegido (cae dentro de una caja ya cerrada).
   * Un pago protegido NO debe poder eliminarse para no alterar informes pasados.
   */
  const isPagoProtegido = (fechaPago?: string): boolean => {
    if (!fechaPago || closedRegisters.length === 0) return false;
    const pagoDate = new Date(fechaPago).getTime();
    return closedRegisters.some((reg) => {
      const apertura = new Date(reg.fechaApertura).getTime();
      const cierre = reg.fechaCierre ? new Date(reg.fechaCierre).getTime() : Infinity;
      return pagoDate >= apertura && pagoDate <= cierre;
    });
  };

  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta_credito: 'Tarjeta Crédito',
    tarjeta_debito: 'Tarjeta Débito',
  };

  const metodoColor: Record<string, string> = {
    efectivo: 'green',
    transferencia: 'blue',
    tarjeta_credito: 'purple',
    tarjeta_debito: 'orange',
  };

  const getPhotoCount = (visit: Visit) => {
    if (!visit.photos) return 0;
    return Object.values(visit.photos).filter(Boolean).length;
  };

  /**
   * Mergea las inspecciones de una visita con la estructura completa de sectores,
   * para que sectores nuevos (varios) e items nuevos (Tren Delantero/Trasero)
   * aparezcan aunque la visita se haya creado antes de agregarlos.
   */
  const mergeInspections = (visit: Visit) => {
    if (!visit.inspections || visit.inspections.length === 0) return createEmptyInspections();
    const fullInspections = createEmptyInspections();
    return fullInspections.map((fullSector) => {
      const existing = visit.inspections.find((s) => s.sector === fullSector.sector);
      if (!existing) return fullSector;
      const mergedItems = fullSector.items.map((fullItem) => {
        const existingItem = existing.items.find((i) => i.name === fullItem.name);
        if (existingItem) {
          return {
            ...fullItem,
            status: existingItem.status || 'ok',
            notes: existingItem.notes || '',
            needsReplacement: existingItem.needsReplacement ?? false,
          };
        }
        return fullItem;
      });
      return { ...fullSector, items: mergedItems };
    });
  };

  const getInspectionSummary = (visit: Visit) => {
    const merged = mergeInspections(visit);
    let total = 0;
    let ok = 0;
    let revision = 0;
    merged.forEach(sector => {
      sector?.items?.forEach(item => {
        total++;
        if (item.status === 'revision') revision++;
        else ok++;
      });
    });
    return { total, ok, revision };
  };

  if (!selectedVehicle && !loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Text type="secondary">Vehículo no encontrado</Text>
          <Button onClick={() => navigate('/vehicles')} style={{ marginTop: '16px' }}>
            Volver a la lista
          </Button>
        </Card>
      </div>
    );
  }

  const visits = selectedVehicle?.visits || [];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')}>
            Volver
          </Button>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => navigate(`/vehicles/new?ownerName=${encodeURIComponent(selectedVehicle?.ownerName || '')}`)}
            >
              Nuevo Ingreso
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              Imprimir
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/vehicles/edit/${id}`)}
            >
              Editar
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Eliminar
            </Button>
          </Space>
        </Col>
      </Row>

      <Card loading={loading}>
        {selectedVehicle && (
          <>
            {/* Master Data */}
            <Row gutter={24}>
              <Col xs={24} md={16}>
                <Title level={2}>
                  {selectedVehicle.brand} {selectedVehicle.model}
                </Title>
                <Space size="middle" wrap>
                  <div>
                    <Text strong>Dueño: </Text>
                    <Text>{selectedVehicle.ownerName}</Text>
                  </div>
                  <div>
                    <Text strong>Patente: </Text>
                    <Tag color="blue" style={{ fontSize: '16px' }}>
                      {selectedVehicle.licensePlate.toUpperCase()}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Año: </Text>
                    <Text>{selectedVehicle.year}</Text>
                  </div>
                  {selectedVehicle.color && (
                    <div>
                      <Text strong>Color: </Text>
                      <Text>{selectedVehicle.color}</Text>
                    </div>
                  )}
                  <div>
                    <Text strong>Visitas: </Text>
                    <Text>{visits.length}</Text>
                  </div>
                </Space>
              </Col>
            </Row>

            <Divider />

            {/* Visit Timeline */}
            <Title level={4}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              Historial de Visitas
            </Title>

            {visits.length === 0 ? (
              <Empty description="Este vehículo no tiene visitas registradas" />
            ) : (
              <Collapse
                accordion
                activeKey={activeVisitId}
                onChange={handleVisitChange}
                items={visits.map((visit, index) => {
                  const inspSummary = getInspectionSummary(visit);
                  const photoCount = getPhotoCount(visit);
                  const visitNumber = visits.length - index;

                  return {
                    key: visit._id || `visit-${index}`,
                    label: (
                      <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                        <Col>
                          <Space>
                            <Tag color="blue">#{visitNumber}</Tag>
                            <Text strong>{formatDate(visit.fechaIngreso)}</Text>
                          </Space>
                        </Col>
                        <Col>
                          <Space size="middle">
                            <Text type="secondary">
                              {photoCount > 0 ? `${photoCount} fotos` : 'Sin fotos'}
                            </Text>
                            <Text type="secondary">
                              {inspSummary.total} ítems ({inspSummary.revision > 0 ? `${inspSummary.revision} R` : 'OK'})
                            </Text>
                            {visit.productosAsignados && visit.productosAsignados.length > 0 && (
                              <Text type="secondary">
                                {visit.productosAsignados.length} productos
                              </Text>
                            )}
                          </Space>
                        </Col>
                      </Row>
                    ),
                    children: (
                      <div>
                        {/* Photos */}
                        {photoCount > 0 && (
                          <>
                            <Title level={5}>Fotos</Title>
                            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                              {[
                                { key: 'front' as const, label: 'Frente' },
                                { key: 'back' as const, label: 'Trasera' },
                                { key: 'left' as const, label: 'Izquierda' },
                                { key: 'right' as const, label: 'Derecha' },
                                { key: 'motor' as const, label: 'Motor' },
                                { key: 'dashboard' as const, label: 'Tablero' },
                              ].map(({ key, label }) => (
                                visit.photos[key] ? (
                                  <Col xs={12} md={4} key={key}>
                                    <div style={{ textAlign: 'center' }}>
                                      <Text style={{ display: 'block', marginBottom: '4px' }}>{label}</Text>
                                      <Image
                                        src={visit.photos[key]}
                                        alt={label}
                                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                                      />
                                    </div>
                                  </Col>
                                ) : null
                              ))}
                            </Row>
                            <Divider />
                          </>
                        )}

                        {/* Inspection */}
                        <Title level={5}>Inspección</Title>
                        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                          {mergeInspections(visit).map((sector) => (
                            <Col xs={24} md={12} lg={sector.sector === 'iluminacion' ? 16 : 8} key={sector.sector}>
                              <InspectionSectorCard
                                sector={sector}
                                onItemChange={() => {}}
                                onNoteChange={() => {}}
                                readOnly
                              />
                            </Col>
                          ))}
                        </Row>

                        <Divider />

                        {/* Products & Services */}
                        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                          <Col>
                            <Title level={5} style={{ margin: 0 }}>Productos / Servicios</Title>
                          </Col>
                          <Col>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              size="small"
                              onClick={openProductoModal}
                            >
                              Agregar
                            </Button>
                          </Col>
                        </Row>

                        {/* Tabla de Productos / Servicios */}
                        {(visit.productosAsignados?.length ?? 0) > 0 || (visit.servicios?.length ?? 0) > 0 ? (
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 60px 100px 100px 40px',
                                gap: '4px 8px',
                                alignItems: 'center',
                                background: 'var(--theme-bg-container)',
                                border: '1px solid var(--theme-border)',
                                borderRadius: 8,
                                padding: '8px 12px',
                              }}
                            >
                              {/* Header */}
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>Nombre</Text>
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>Cant</Text>
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>P.Venta</Text>
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Subtotal</Text>
                              <div />

                              {/* Separator */}
                              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border-secondary)' }} />

                              {/* Productos */}
                              {visit.productosAsignados?.map((item) => (
                                <React.Fragment key={item.productId}>
                                  <Text style={{ fontSize: 14 }}>{item.nombreProducto}</Text>
                                  <Text style={{ fontSize: 14, textAlign: 'center' }}>{item.cantidad}</Text>
                                  <Text style={{ fontSize: 14, textAlign: 'right' }}>${item.precioVenta}</Text>
                                  <Text strong style={{ fontSize: 14, textAlign: 'right' }}>${item.subtotal}</Text>
                                  <Popconfirm
                                    title="¿Quitar este producto?"
                                    description="Se devolverá al stock"
                                    onConfirm={() => handleRemoveProductoAsignado(visit._id!, item.productId)}
                                  >
                                    <Button type="link" danger icon={<DeleteOutlined />} size="small" style={{ padding: 0 }} />
                                  </Popconfirm>
                                </React.Fragment>
                              ))}

                              {/* Servicios */}
                              {visit.servicios?.map((serv, index) => (
                                <React.Fragment key={`serv-${index}`}>
                                  <Text style={{ fontSize: 14 }}>{serv.nombre}</Text>
                                  <Text style={{ fontSize: 14, textAlign: 'center' }}>-</Text>
                                  <Text style={{ fontSize: 14, textAlign: 'right' }}>${serv.precio}</Text>
                                  <Text style={{ fontSize: 14, textAlign: 'right' }}>${serv.precio}</Text>
                                  <Popconfirm
                                    title="¿Quitar este servicio?"
                                    onConfirm={() => handleRemoveServicio(visit, index)}
                                  >
                                    <Button type="link" danger icon={<DeleteOutlined />} size="small" style={{ padding: 0 }} />
                                  </Popconfirm>
                                </React.Fragment>
                              ))}

                              {/* Separator + Total */}
                              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border)' }} />
                              <div />
                              <div />
                              <Text strong style={{ textAlign: 'right' }}>Total:</Text>
                              <Text strong style={{ textAlign: 'right', color: 'var(--theme-primary)' }}>
                                ${(calcularTotal(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                              <div />
                            </div>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            No hay productos ni servicios asignados a esta visita
                          </Text>
                        )}

                        {/* Cash register warning */}
                        {cashOpen === false && (
                          <Alert
                            message="La caja está cerrada"
                            description="Debe abrir la caja para poder registrar pagos o notas de crédito"
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginBottom: 16 }}
                          />
                        )}

                        {/* Payments */}
                        <Divider />
                        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                          <Col>
                            <Title level={5} style={{ margin: 0 }}>Pagos</Title>
                          </Col>
                          <Col>
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              size="small"
                              disabled={cashOpen === false}
                              onClick={() => openPagoModal(visit)}
                            >
                              Registrar Pago
                            </Button>
                          </Col>
                        </Row>
                        {visit.pagos && visit.pagos.length > 0 ? (
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 120px 40px',
                                gap: '4px 8px',
                                alignItems: 'center',
                                background: 'var(--theme-bg-container)',
                                border: '1px solid var(--theme-border)',
                                borderRadius: 8,
                                padding: '8px 12px',
                              }}
                            >
                              {/* Header */}
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>Método</Text>
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>Referencia</Text>
                              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Monto</Text>
                              <div />

                              {/* Separator */}
                              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border-secondary)' }} />

                              {/* Pagos */}
                              {visit.pagos.map((pago) => (
                                <React.Fragment key={pago._id}>
                                  <div>
                                    <Tag color={metodoColor[pago.metodo] || 'default'}>
                                      {metodoLabel[pago.metodo] || pago.metodo}
                                    </Tag>
                                  </div>
                                  <Text style={{ fontSize: 14 }}>
                                    {pago.referencia || '-'}
                                  </Text>
                                  <Text strong style={{ fontSize: 14, textAlign: 'right' }}>
                                    ${(pago.monto || 0).toLocaleString('es-AR')}
                                  </Text>
                                  {/* Solo mostrar eliminar si el pago NO está protegido por un cierre */}
                                  {!isPagoProtegido(pago.fechaPago) ? (
                                    <Popconfirm
                                      title="¿Eliminar pago?"
                                      onConfirm={() => handleDeletePago(visit, pago._id!)}
                                    >
                                      <Button
                                        type="link"
                                        danger
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        style={{ padding: 0 }}
                                      />
                                    </Popconfirm>
                                  ) : (
                                    <div />
                                  )}
                                </React.Fragment>
                              ))}

                              {/* Separator + Total */}
                              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border)' }} />
                              <Text strong style={{ gridColumn: '1 / 3', textAlign: 'right' }}>Total:</Text>
                              <Text strong style={{ textAlign: 'right', color: 'var(--theme-primary)' }}>
                                ${(calcularPagado(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                              <div />
                            </div>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            No hay pagos registrados
                          </Text>
                        )}

                        {/* Credit Notes */}
                        <Divider />
                        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                          <Col>
                            <Title level={5} style={{ margin: 0 }}>Notas de Crédito (Devoluciones)</Title>
                          </Col>
                          <Col>
                            <Button
                              icon={<PlusOutlined />}
                              size="small"
                              disabled={cashOpen === false}
                              onClick={() => openNotaCreditoModal(visit)}
                            >
                              Nota de Crédito
                            </Button>
                          </Col>
                        </Row>
                        {visit.notasCredito && visit.notasCredito.length > 0 ? (
                          <div style={{ marginBottom: 16 }}>
                            {visit.notasCredito.map((nota) => (
                              <Row
                                key={nota._id}
                                justify="space-between"
                                align="middle"
                                style={{ marginBottom: 8 }}
                              >
                                <Col>
                                  <Text style={{ color: '#cf1322' }}>
                                    -${(nota.monto || 0).toLocaleString('es-AR')}
                                  </Text>
                                  <Text type="secondary" style={{ marginLeft: 8 }}>
                                    {nota.motivo}
                                  </Text>
                                </Col>
                                <Col>
                                  <Popconfirm
                                    title="¿Eliminar nota?"
                                    onConfirm={() => handleDeleteNota(visit, nota._id!)}
                                  >
                                    <Button
                                      type="link"
                                      danger
                                      icon={<DeleteOutlined />}
                                      size="small"
                                    />
                                  </Popconfirm>
                                </Col>
                              </Row>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            No hay notas de crédito
                          </Text>
                        )}

                        {/* Summary */}
                        <Divider />
                        <Card
                          size="small"
                          style={{ background: 'var(--theme-bg-spotlight)', marginBottom: 16 }}
                        >
                          <Row gutter={[12, 12]}>
                            <Col xs={12} sm={6}>
                              <Text type="secondary">Total: </Text>
                              <Text strong>
                                ${(calcularTotal(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                            </Col>
                            <Col xs={12} sm={6}>
                              <Text type="secondary">Pagado: </Text>
                              <Text strong style={{ color: '#52c41a' }}>
                                ${(calcularPagado(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                            </Col>
                            <Col xs={12} sm={6}>
                              <Text type="secondary">Devuelto: </Text>
                              <Text strong style={{ color: '#cf1322' }}>
                                -${(calcularDevuelto(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                            </Col>
                            <Col xs={12} sm={6}>
                              <Text type="secondary">Saldo: </Text>
                              <Text
                                strong
                                style={{
                                  color: calcularSaldo(visit) > 0 ? '#cf1322' : '#52c41a',
                                }}
                              >
                                ${(calcularSaldo(visit) || 0).toLocaleString('es-AR')}
                              </Text>
                            </Col>
                          </Row>
                        </Card>

                        {/* Notas */}
                        {visit.notas && (
                          <>
                            <Divider />
                            <Title level={5}>Notas</Title>
                            <Text>{visit.notas}</Text>
                          </>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            )}
          </>
        )}
      </Card>
      {/* ════════════════════════════════════════════ */}
      {/* Modals */}
      {/* ════════════════════════════════════════════ */}

      {/* ── Modal: Registrar Pago (multi-fila) ───────────── */}
      <Modal
        title="Registrar Pago"
        open={pagoModal}
        onCancel={() => {
          if (!pagoSaving) setPagoModal(false);
        }}
        onOk={handleSaveAll}
        okText={`Guardar Todos (${pagoRows.length})`}
        confirmLoading={pagoSaving}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
        width={640}
      >
        <div>
          {pagoRows.map((row, index) => (
            <div key={row.id} style={{ marginBottom: index < pagoRows.length - 1 ? 16 : 0 }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                <Col>
                  <Text strong>Pago #{index + 1}</Text>
                </Col>
                <Col>
                  {pagoRows.length > 1 && (
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => removeRow(row.id)}
                    />
                  )}
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Select
                    value={row.metodo}
                    onChange={(val) => updateRow(row.id, 'metodo', val)}
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    <Select.Option value="efectivo">Efectivo</Select.Option>
                    <Select.Option value="transferencia">Transferencia</Select.Option>
                    <Select.Option value="tarjeta_credito">Tarjeta Crédito</Select.Option>
                    <Select.Option value="tarjeta_debito">Tarjeta Débito</Select.Option>
                  </Select>
                </Col>
                <Col xs={12} sm={8}>
                  <InputNumber
                    value={row.monto}
                    onChange={(val) => updateRow(row.id, 'monto', val || 0)}
                    style={{ width: '100%' }}
                    prefix="$"
                    placeholder="0.00"
                    size="middle"
                    min={0}
                    precision={2}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Input
                    value={row.referencia}
                    onChange={(e) => updateRow(row.id, 'referencia', e.target.value)}
                    placeholder="Referencia (opcional)"
                    size="middle"
                  />
                </Col>
              </Row>
              {pagoErrors[row.id] && (
                <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {pagoErrors[row.id]}
                </Text>
              )}
            </div>
          ))}
        </div>

        <Button
          type="dashed"
          onClick={addRow}
          block
          icon={<PlusOutlined />}
          style={{ marginTop: 12 }}
          disabled={pagoSaving}
        >
          Agregar otro pago
        </Button>

        <Divider style={{ margin: '16px 0' }} />
        <Row justify="space-between">
          <Col>
            <Text strong>Total a registrar:</Text>
          </Col>
          <Col>
            <Text strong style={{ fontSize: 16 }}>
              ${calcularTotalPagoRows().toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </Col>
        </Row>
      </Modal>

      {/* Modal: Nota de Crédito */}
      <Modal
        title="Crear Nota de Crédito"
        open={notaModal}
        onCancel={() => setNotaModal(false)}
        onOk={handleCreateNotaCredito}
        okText="Guardar Nota"
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            <Text strong>Monto</Text>
            <InputNumber
              value={notaMonto}
              onChange={(val) => setNotaMonto(val || 0)}
              style={{ width: '100%' }}
              prefix="$"
              placeholder="0.00"
              size="large"
              min={0}
              precision={2}
              autoFocus
            />
          </div>
          <div>
            <Text strong>Motivo *</Text>
            <Input.TextArea
              value={notaMotivo}
              onChange={(e) => setNotaMotivo(e.target.value)}
              placeholder="Describa el motivo de la devolución"
              rows={3}
              size="large"
            />
          </div>
        </Space>
      </Modal>

      {/* ── Modal: Asignar Productos / Servicios ──────────────── */}
      <Modal
        title="Asignar Productos / Servicios"
        open={productoModal}
        onCancel={() => {
          if (!asignarSaving) setProductoModal(false);
        }}
        onOk={handleSaveProductos}
        okText={`Guardar (${pendingItems.length} items)`}
        confirmLoading={asignarSaving}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
        width={640}
      >
        <Spin spinning={loadingProducts}>
          {/* ── Productos del Stock ── */}
          <Title level={5}>Productos del Stock</Title>
          <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 8 }}>
            <Col xs={24} sm={8}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>&nbsp;</div>
              <Select
                placeholder="Seleccionar producto"
                value={selectedProductId || undefined}
                onChange={(value) => {
                  setSelectedProductId(value);
                  const product = availableProducts.find(p => p._id === value);
                  if (product) {
                    setCustomPrice(product.precioVenta);
                    setCustomPriceCompra(product.precioCompra);
                  }
                }}
                style={{ width: '100%' }}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={availableProducts.map(p => ({
                  value: p._id!,
                  label: `${p.nombreProducto} (Stock: ${p.cantidad})`,
                }))}
              />
            </Col>
            <Col xs={12} sm={4}>
              <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Cantidad</div>
              <InputNumber
                min={1}
                value={selectedProductQty}
                onChange={(val) => setSelectedProductQty(Number(val) || 1)}
                style={{ width: '100%' }}
                placeholder="Cant"
              />
            </Col>
            <Col xs={12} sm={4}>
              <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Precio Venta</div>
              <InputNumber
                min={0}
                value={customPrice}
                onChange={(val) => setCustomPrice(Number(val) || 0)}
                style={{ width: '100%' }}
                prefix="$"
                placeholder="P. Venta"
                precision={2}
              />
            </Col>
            <Col xs={12} sm={4}>
              <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Precio Costo</div>
              <InputNumber
                min={0}
                value={customPriceCompra}
                onChange={(val) => setCustomPriceCompra(Number(val) || 0)}
                style={{ width: '100%' }}
                prefix="$"
                placeholder="P. Costo"
                precision={2}
              />
            </Col>
            <Col xs={24} sm={4}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>&nbsp;</div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addPendingProduct}
                block
              >
                Agregar
              </Button>
            </Col>
          </Row>

          {/* Lista de productos pendientes */}
          {pendingItems.filter(i => i.tipo === 'producto').length > 0 && (
            <>
              <Text strong style={{ display: 'block', marginBottom: 8, marginTop: 12 }}>
                Productos pendientes:
              </Text>
              <Card size="small" style={{ marginBottom: 16 }}>
                {pendingItems
                  .filter(i => i.tipo === 'producto')
                  .map(item => (
                    <Row key={item.id} justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                      <Col flex="auto">
                        <Text>{item.nombre}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          (Cant: {item.cantidad} - Venta: ${item.precio} | Costo: ${item.precioCompra})
                        </Text>
                      </Col>
                      <Col>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={() => removePendingItem(item.id)}
                        />
                      </Col>
                    </Row>
                  ))}
              </Card>
            </>
          )}

          <Divider />

          {/* ── Mano de Obra / Servicios ── */}
          <Title level={5}>Mano de Obra</Title>
          <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 8 }}>
            <Col xs={24} sm={12}>
              <Input
                placeholder="Nombre del servicio"
                value={servicioNombre}
                onChange={(e) => setServicioNombre(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <InputNumber
                min={0}
                value={servicioPrecio}
                onChange={(val) => setServicioPrecio(Number(val) || 0)}
                style={{ width: '100%' }}
                prefix="$"
                placeholder="Precio"
                precision={2}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addPendingService}
                block
              >
                Agregar
              </Button>
            </Col>
          </Row>

          {/* Lista de servicios pendientes */}
          {pendingItems.filter(i => i.tipo === 'servicio').length > 0 && (
            <>
              <Text strong style={{ display: 'block', marginBottom: 8, marginTop: 12 }}>
                Servicios pendientes:
              </Text>
              <Card size="small" style={{ marginBottom: 16 }}>
                {pendingItems
                  .filter(i => i.tipo === 'servicio')
                  .map(item => (
                    <Row key={item.id} justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                      <Col flex="auto">
                        <Text>{item.nombre}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          ${item.precio}
                        </Text>
                      </Col>
                      <Col>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={() => removePendingItem(item.id)}
                        />
                      </Col>
                    </Row>
                  ))}
              </Card>
            </>
          )}

          {pendingItems.length === 0 && (
            <Empty description="No hay items pendientes" style={{ margin: '24px 0' }} />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default VehicleDetail;
