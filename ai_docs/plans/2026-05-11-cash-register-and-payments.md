# Plan Técnico: Módulo de Arqueo de Caja, Pagos, Notas de Crédito y Reporte Mensual

**Fecha:** 2026-05-11 (Actualizado)
**Objetivo:** Implementar página de arqueo de caja, sección de pagos en VehicleDetail, notas de crédito (devoluciones), reporte mensual exportable, tabs de navegación y rutas.

---

## 0. Estado Actual del Código Base

### Ya implementado (no requiere cambios)

| Componente | Archivo | Estado |
|------------|---------|--------|
| CashRegister Model (backend) | `backend/src/models/CashRegister.js` | ✅ |
| `pagos[]` en visitSchema (backend) | `backend/src/models/Vehicle.js` | ✅ |
| Pagos CRUD routes (backend) | `backend/src/routes/vehicles.js` | ✅ |
| CashRegister routes (backend) | `backend/src/routes/cashRegister.js` | ✅ |
| CashRegister route registration | `backend/src/index.js` | ✅ |
| cashRegisterSlice (Redux) | `src/store/cashRegisterSlice.ts` | ✅ |
| Store index con cashRegister | `src/store/index.ts` | ✅ |
| Tipos: PagoEntry, Visit.pagos, CashRegister, etc. | `src/types/index.ts` | ✅ |
| API: registerPago, deletePago, getDebts | `src/services/api.ts` | ✅ |
| Página Deudas | `src/pages/Debts.tsx` | ✅ |

### Por implementar (plan original + nuevos requerimientos)

| Componente | Archivo | Estado |
|------------|---------|--------|
| Página Caja | `src/pages/CashRegister.tsx` | ❌ Nuevo |
| Estilos Caja | `src/pages/CashRegister.module.css` | ❌ Nuevo |
| PaymentSection en VehicleDetail | `src/pages/VehicleDetail.tsx` | ❌ Modificar |
| Tabs en AppLayout | `src/components/AppLayout.tsx` | ❌ Modificar |
| Rutas en App | `src/App.tsx` | ❌ Modificar |
| NotaCreditoEntry + CashRegisterResumen | `src/types/index.ts` | ❌ Agregar |
| createNotaCredito, deleteNotaCredito, getCashReport | `src/services/api.ts` | ❌ Agregar |
| notasCredito[] en visitSchema | `backend/src/models/Vehicle.js` | ❌ Agregar |
| Notas crédito routes | `backend/src/routes/vehicles.js` | ❌ Agregar |
| /close + /report en cashRegister | `backend/src/routes/cashRegister.js` | ❌ Modificar |

---

## 1. Resumen de Cambios por Archivo

### 1.1. Archivos Nuevos

| Archivo | Propósito | Líneas Estimadas |
|---------|-----------|-----------------|
| `src/pages/CashRegister.tsx` | Página completa de arqueo de caja + reporte mensual | ~380 |
| `src/pages/CashRegister.module.css` | Estilos CSS Modules para CashRegister | ~100 |

### 1.2. Archivos a Modificar

| Archivo | Cambio | Líneas Afectadas |
|---------|--------|-----------------|
| `backend/src/models/Vehicle.js` | Agregar `notasCredito[]` al visitSchema | +10 |
| `backend/src/routes/vehicles.js` | Agregar rutas notas de crédito, actualizar `/debts` | +65 |
| `backend/src/routes/cashRegister.js` | Actualizar `/close`, agregar `/report` | +80 |
| `src/types/index.ts` | Agregar `NotaCreditoEntry`, actualizar `Visit`, `CashRegisterResumen` | +25 |
| `src/services/api.ts` | Agregar `createNotaCredito`, `deleteNotaCredito`, `getCashReport` | +30 |
| `src/pages/VehicleDetail.tsx` | Agregar PaymentSection + CreditNoteSection | +130 |
| `src/components/AppLayout.tsx` | Agregar tabs "Caja" y "Deudas" | ~15 |
| `src/App.tsx` | Agregar rutas `/cash-register` y `/debts` | ~20 |

---

## 2. Dependencias Entre Tareas

```
App.tsx (rutas)
  └── Requiere: CashRegister.tsx, Debts.tsx (ya existe)
  └── Depende de: AppLayout.tsx (tabs)

AppLayout.tsx (tabs)
  └── Requiere: rutas /cash-register y /debts existan en App.tsx
  └── Independiente de: VehicleDetail.tsx

CashRegister.tsx (página nueva)
  └── Depende de: cashRegisterSlice (ya existe), types actualizados
  └── Independiente de: VehicleDetail, AppLayout

VehicleDetail.tsx (PaymentSection + CreditNotes)
  └── Depende de: api.ts (nuevas funciones de notas de crédito)
  └── Independiente de: CashRegister, AppLayout

Backend: Vehicle.js → vehicles.js → cashRegister.js
  └── Secuencial: model → routes → cashRegister (no hay blockers entre back y front)
```

---

## 3. Especificación Técnica Detallada

### 3.1. Backend: Vehicle.js - Agregar `notasCredito[]` al visitSchema

**Archivo:** `backend/src/models/Vehicle.js`

Agregar después del campo `pagos` (línea 88, después del cierre `]` de `pagos`):

```javascript
notasCredito: [{
  monto: { type: Number, required: true, min: 0 },
  motivo: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
}],
```

Esto queda entre `pagos` y `notas` en el schema; ambos arrays embebidos dentro del subdocumento `visit`.

### 3.2. Backend: vehicles.js - Rutas Notas de Crédito + Actualizar /debts

**Archivo:** `backend/src/routes/vehicles.js`

#### 3.2.1. Agregar después de la sección de pagos (después del DELETE /pagos/:pagoId, línea 393):

**POST `/:id/visits/:visitId/notas-credito`**
- Validar vehículo, ownership, visita existente
- Validar `monto` > 0 y `motivo` no vacío
- Validar que el monto no exceda el total pagado en la visita
- Hacer `visit.notasCredito.push({ monto, motivo })`
- Guardar y retornar vehicle completo

**DELETE `/:id/visits/:visitId/notas-credito/:notaId`**
- Validar vehículo, ownership, visita
- Validar que la nota de crédito existe
- Hacer `visit.notasCredito.pull({ _id: notaId })`
- Guardar y retornar vehicle completo

#### 3.2.2. Actualizar GET `/debts` (líneas 397-439)

Cambiar el cálculo de deuda de:
```
deuda = total - pagado
```
a:
```
deuda = total - (pagado - devuelto)
// donde devuelto = suma de notasCredito.monto
```

Específicamente, dentro del reduce que calcula `totalDeuda`, agregar:
```javascript
const totalDevuelto = (visit.notasCredito || []).reduce(function(s, nc) {
  return s + (nc.monto || 0);
}, 0);
return sum + Math.max(0, (visit.total || 0) - (totalPagado - totalDevuelto));
```

Además, actualizar el `.select()` del query para incluir `'visits.notasCredito': 1`.

### 3.3. Backend: cashRegister.js - Actualizar /close + Agregar /report

**Archivo:** `backend/src/routes/cashRegister.js`

#### 3.3.1. Actualizar POST `/close` (líneas 63-130)

En el cálculo de totales (después de la línea 105), agregar:
```javascript
let totalDevoluciones = 0;

// ...dentro del forEach de visits (después de sumar pagos)...
(visit.notasCredito || []).forEach(function(nc) {
  totalDevoluciones += (nc.monto || 0);
});
```

Y en el resumen retornado (líneas 115-126), agregar:
```javascript
saldoNeto: Math.round((totalIngresos - totalDevoluciones) * 100) / 100,
totalDevoluciones: Math.round(totalDevoluciones * 100) / 100,
```

Además, actualizar `totalVentas` para que siga siendo el total de ventas sin descuentos (no cambiar su cálculo). El `saldoNeto` es el nuevo campo que indica ingresos - devoluciones.

#### 3.3.2. Nuevo GET `/report`

Agregar antes del GET `/:id` (línea 144):

```javascript
// GET /cash-register/report?startDate=X&endDate=Y - Reporte mensual
router.get('/report', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate y endDate son requeridos' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Obtener vehicles del usuario con visits en el rango
    const vehicles = await Vehicle.find({ userId: req.userId }).select({
      'visits._id': 1,
      'visits.total': 1,
      'visits.pagos': 1,
      'visits.notasCredito': 1,
      'visits.fechaIngreso': 1
    });

    let totalIngresos = 0;
    let efectivo = 0;
    let transferencia = 0;
    let tarjeta_credito = 0;
    let tarjeta_debito = 0;
    let totalDevoluciones = 0;
    let cantidadNotas = 0;
    let cantidadVisitas = 0;

    vehicles.forEach(function(v) {
      (v.visits || []).forEach(function(visit) {
        const fecha = new Date(visit.fechaIngreso);
        if (fecha >= start && fecha <= end) {
          cantidadVisitas++;
          (visit.pagos || []).forEach(function(p) {
            if (p.metodo === 'efectivo') efectivo += (p.monto || 0);
            else if (p.metodo === 'transferencia') transferencia += (p.monto || 0);
            else if (p.metodo === 'tarjeta_credito') tarjeta_credito += (p.monto || 0);
            else if (p.metodo === 'tarjeta_debito') tarjeta_debito += (p.monto || 0);
            totalIngresos += (p.monto || 0);
          });
          (visit.notasCredito || []).forEach(function(nc) {
            totalDevoluciones += (nc.monto || 0);
            cantidadNotas++;
          });
        }
      });
    });

    res.json({
      activos: {
        totalIngresos: Math.round(totalIngresos * 100) / 100,
        efectivo: Math.round(efectivo * 100) / 100,
        transferencia: Math.round(transferencia * 100) / 100,
        tarjeta_credito: Math.round(tarjeta_credito * 100) / 100,
        tarjeta_debito: Math.round(tarjeta_debito * 100) / 100,
      },
      pasivos: {
        totalDevoluciones: Math.round(totalDevoluciones * 100) / 100,
        cantidadNotas,
      },
      saldoNeto: Math.round((totalIngresos - totalDevoluciones) * 100) / 100,
      cantidadVisitas,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generando reporte', error: error.message });
  }
});
```

### 3.4. Frontend: types/index.ts - Agregar interfaces

**Archivo:** `src/types/index.ts`

#### 3.4.1. Agregar interfaz `NotaCreditoEntry` (después de `PagoEntry`, línea 26):

```typescript
/** Entrada de nota de crédito (devolución) dentro de una visita */
export interface NotaCreditoEntry {
  _id?: string;
  monto: number;
  motivo: string;
  fecha?: string;
}
```

#### 3.4.2. Actualizar interfaz `Visit` (agregar campo `notasCredito` después de `pagos`, línea 50):

```typescript
export interface Visit {
  _id?: string;
  fechaIngreso: string;
  fechaSalida?: string;
  photos: { /* ... */ };
  inspections: InspectionSector[];
  productosAsignados: ProductoAsignado[];
  servicios?: ServicioEntry[];
  total: number;
  pagos: PagoEntry[];
  /** @since 2026-05-11 - Notas de crédito (devoluciones) */
  notasCredito?: NotaCreditoEntry[];
  notas?: string;
}
```

#### 3.4.3. Actualizar interfaz `CashRegisterResumen` (reemplazar la existente si está, o agregarla nueva):

```typescript
/** Resumen de cierre de caja */
export interface CashRegisterResumen {
  montoInicial: number;
  totalVentas: number;
  totalIngresos: number;
  desglosePagos: {
    efectivo: number;
    transferencia: number;
    tarjeta_credito: number;
    tarjeta_debito: number;
  };
  montoFinalComputado: number;
  montoFinalDeclarado: number;
  diferencia: number;
  /** @since 2026-05-11 - Total devuelto en notas de crédito */
  totalDevoluciones: number;
  /** @since 2026-05-11 - Ingresos netos (ingresos - devoluciones) */
  saldoNeto: number;
}

/** Reporte mensual (contable: activos vs pasivos) */
export interface CashRegisterReport {
  activos: {
    totalIngresos: number;
    efectivo: number;
    transferencia: number;
    tarjeta_credito: number;
    tarjeta_debito: number;
  };
  pasivos: {
    totalDevoluciones: number;
    cantidadNotas: number;
  };
  saldoNeto: number;
  cantidadVisitas: number;
}
```

### 3.5. Frontend: api.ts - Agregar funciones

**Archivo:** `src/services/api.ts`

Agregar después de la sección de pagos (después de `deletePago`, línea 192):

```typescript
// ─── Credit Notes (Notas de Crédito) ────────────────────────────

export const createNotaCredito = async (vehicleId: string, visitId: string, data: {
  monto: number;
  motivo: string;
}) => {
  const response = await api.post(`/vehicles/${vehicleId}/visits/${visitId}/notas-credito`, data);
  return response.data;
};

export const deleteNotaCredito = async (vehicleId: string, visitId: string, notaId: string) => {
  const response = await api.delete(`/vehicles/${vehicleId}/visits/${visitId}/notas-credito/${notaId}`);
  return response.data;
};

// ─── Cash Register Report ──────────────────────────────────────

export const getCashReport = async (startDate: string, endDate: string) => {
  const response = await api.get('/cash-register/report', {
    params: { startDate, endDate },
  });
  return response.data;
};
```

### 3.6. Frontend: VehicleDetail.tsx - PaymentSection + CreditNoteSection

**Archivo:** `src/pages/VehicleDetail.tsx`

#### 3.6.1. Imports a agregar (después de línea 10):

```typescript
import { Modal, Form, InputNumber, Select, Input, Table, Popconfirm, message, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { registerPago, deletePago, createNotaCredito, deleteNotaCredito } from '../services/api';
import type { NotaCreditoEntry } from '../types';
```

#### 3.6.2. Estado local a agregar (después de `activeVisitId`, línea 20):

```typescript
// Payment state
const [paymentModalOpen, setPaymentModalOpen] = useState(false);
const [paymentModalVisitId, setPaymentModalVisitId] = useState<string | null>(null);
const [paymentLoading, setPaymentLoading] = useState(false);
const [paymentForm] = Form.useForm();

// Credit note state
const [creditNoteModalOpen, setCreditNoteModalOpen] = useState(false);
const [creditNoteVisitId, setCreditNoteVisitId] = useState<string | null>(null);
const [creditNoteLoading, setCreditNoteLoading] = useState(false);
const [creditNoteForm] = Form.useForm();
```

#### 3.6.3. Constantes de método de pago (fuera del componente o dentro):

```typescript
const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta_credito: 'Tarjeta Crédito',
  tarjeta_debito: 'Tarjeta Débito',
};

const METODO_COLORS: Record<string, string> = {
  efectivo: 'green',
  transferencia: 'blue',
  tarjeta_credito: 'orange',
  tarjeta_debito: 'purple',
};
```

#### 3.6.4. Handlers de pagos a agregar (después de `handleVisitChange`):

```typescript
const handleRegisterPago = async (values: { metodo: string; monto: number; referencia?: string }) => {
  if (!paymentModalVisitId || !id) return;
  setPaymentLoading(true);
  try {
    await registerPago(id, paymentModalVisitId, values);
    message.success('Pago registrado exitosamente');
    setPaymentModalOpen(false);
    setPaymentModalVisitId(null);
    paymentForm.resetFields();
    dispatch(fetchVehicleById(id));
  } catch (error) {
    message.error('Error al registrar pago');
    console.error(error);
  } finally {
    setPaymentLoading(false);
  }
};

const handleDeletePago = async (visitId: string, pagoId: string) => {
  if (!id) return;
  try {
    await deletePago(id, visitId, pagoId);
    message.success('Pago eliminado');
    dispatch(fetchVehicleById(id));
  } catch (error) {
    message.error('Error al eliminar pago');
    console.error(error);
  }
};

const handleCreateNotaCredito = async (values: { monto: number; motivo: string }) => {
  if (!creditNoteVisitId || !id) return;
  setCreditNoteLoading(true);
  try {
    await createNotaCredito(id, creditNoteVisitId, values);
    message.success('Nota de crédito emitida');
    setCreditNoteModalOpen(false);
    setCreditNoteVisitId(null);
    creditNoteForm.resetFields();
    dispatch(fetchVehicleById(id));
  } catch (error) {
    message.error('Error al emitir nota de crédito');
    console.error(error);
  } finally {
    setCreditNoteLoading(false);
  }
};

const handleDeleteNotaCredito = async (visitId: string, notaId: string) => {
  if (!id) return;
  try {
    await deleteNotaCredito(id, visitId, notaId);
    message.success('Nota de crédito eliminada');
    dispatch(fetchVehicleById(id));
  } catch (error) {
    message.error('Error al eliminar nota de crédito');
    console.error(error);
  }
};
```

#### 3.6.5. PaymentSection UI - Agregar dentro del `children` de cada Collapse Panel

Después de la línea 370 (`</Text>` de "No hay productos asignados") y antes del Divider de Notas (línea 372 actualmente, pero cambiará):

```tsx
{/* Payments Section */}
<Divider />
<Title level={5}>Pagos</Title>

{/* Summary Row */}
<Row gutter={16} style={{ marginBottom: 16 }}>
  <Col>
    <Text strong>Total Visita: </Text>
    <Text>${visit.total?.toFixed(2) || '0.00'}</Text>
  </Col>
  <Col>
    <Text strong>Total Pagado: </Text>
    <Text style={{ color: '#52c41a' }}>
      ${(visit.pagos?.reduce((s, p) => s + p.monto, 0) || 0).toFixed(2)}
    </Text>
  </Col>
  <Col>
    <Text strong>Deuda Pendiente: </Text>
    <Text style={{ color: deuda > 0 ? '#cf1322' : '#52c41a' }}>
      ${deuda.toFixed(2)}
    </Text>
  </Col>
</Row>

{/* Payments Table */}
{visit.pagos && visit.pagos.length > 0 ? (
  <Table
    dataSource={visit.pagos}
    rowKey="_id"
    pagination={false}
    size="small"
    columns={[
      { title: 'Método', dataIndex: 'metodo', key: 'metodo', render: (m: string) => <Tag color={METODO_COLORS[m]}>{METODO_LABELS[m] || m}</Tag> },
      { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (m: number) => `$${m.toFixed(2)}` },
      { title: 'Fecha', dataIndex: 'fechaPago', key: 'fechaPago', render: (f: string) => f ? formatDate(f) : '-' },
      { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', render: (r: string) => r || '-' },
      {
        title: 'Acción',
        key: 'accion',
        width: 60,
        render: (_: unknown, record: { _id?: string }) => (
          <Popconfirm title="¿Eliminar pago?" onConfirm={() => handleDeletePago(visit._id!, record._id!)}>
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ),
      },
    ]}
  />
) : (
  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>No hay pagos registrados</Text>
)}

<Space style={{ marginTop: 12 }}>
  <Button
    type="primary"
    icon={<PlusOutlined />}
    onClick={() => { setPaymentModalVisitId(visit._id!); setPaymentModalOpen(true); }}
    disabled={deuda <= 0}
  >
    Registrar Pago
  </Button>
  <Button
    icon={<FileTextOutlined />}
    onClick={() => { setCreditNoteVisitId(visit._id!); setCreditNoteModalOpen(true); }}
    disabled={!visit.pagos || visit.pagos.length === 0}
  >
    Nota de Crédito
  </Button>
</Space>

{/* Credit Notes Section */}
{visit.notasCredito && visit.notasCredito.length > 0 && (
  <>
    <Divider />
    <Title level={5}>Notas de Crédito</Title>
    <Table
      dataSource={visit.notasCredito}
      rowKey="_id"
      pagination={false}
      size="small"
      columns={[
        { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (m: number) => <Text style={{ color: '#cf1322' }}>-$ {m.toFixed(2)}</Text> },
        { title: 'Motivo', dataIndex: 'motivo', key: 'motivo' },
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (f: string) => f ? formatDate(f) : '-' },
        {
          title: 'Acción',
          key: 'accion',
          width: 60,
          render: (_: unknown, record: { _id?: string }) => (
            <Popconfirm title="¿Eliminar nota de crédito?" onConfirm={() => handleDeleteNotaCredito(visit._id!, record._id!)}>
              <Button type="link" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          ),
        },
      ]}
    />
  </>
)}
```

#### 3.6.6. Cálculo de deuda (local, dentro del map de visits):
Antes del JSX de PaymentSection (o inline):
```typescript
const totalPagado = visit.pagos?.reduce((s, p) => s + p.monto, 0) || 0;
const totalDevuelto = visit.notasCredito?.reduce((s, nc) => s + nc.monto, 0) || 0;
const deuda = (visit.total || 0) - (totalPagado - totalDevuelto);
```

#### 3.6.7. Modales a agregar (al nivel del componente, después del Collapse cerrar):

```tsx
{/* Modal: Registrar Pago */}
<Modal
  title="Registrar Pago"
  open={paymentModalOpen}
  onCancel={() => { setPaymentModalOpen(false); setPaymentModalVisitId(null); paymentForm.resetFields(); }}
  onOk={() => paymentForm.submit()}
  confirmLoading={paymentLoading}
  destroyOnHidden
>
  <Form form={paymentForm} layout="vertical" onFinish={handleRegisterPago}>
    <Form.Item name="metodo" label="Método de Pago" rules={[{ required: true, message: 'Seleccione un método' }]}>
      <Select placeholder="Seleccionar método">
        <Option value="efectivo">Efectivo</Option>
        <Option value="transferencia">Transferencia</Option>
        <Option value="tarjeta_credito">Tarjeta Crédito</Option>
        <Option value="tarjeta_debito">Tarjeta Débito</Option>
      </Select>
    </Form.Item>
    <Form.Item name="monto" label="Monto" rules={[{ required: true, message: 'Ingrese un monto' }]}>
      <InputNumber min={0.01} prefix="$" style={{ width: '100%' }} placeholder="0.00" />
    </Form.Item>
    <Form.Item name="referencia" label="Referencia (opcional)">
      <Input placeholder="N° de transferencia, autorización, etc." />
    </Form.Item>
  </Form>
</Modal>

{/* Modal: Nota de Crédito */}
<Modal
  title="Emitir Nota de Crédito"
  open={creditNoteModalOpen}
  onCancel={() => { setCreditNoteModalOpen(false); setCreditNoteVisitId(null); creditNoteForm.resetFields(); }}
  onOk={() => creditNoteForm.submit()}
  confirmLoading={creditNoteLoading}
  destroyOnHidden
>
  <Form form={creditNoteForm} layout="vertical" onFinish={handleCreateNotaCredito}>
    <Form.Item name="monto" label="Monto a Devolver" rules={[{ required: true, message: 'Ingrese un monto' }]}>
      <InputNumber min={0.01} prefix="$" style={{ width: '100%' }} placeholder="0.00" />
    </Form.Item>
    <Form.Item name="motivo" label="Motivo de la Devolución" rules={[
      { required: true, message: 'El motivo es obligatorio' },
      { min: 10, message: 'Describa el motivo con al menos 10 caracteres' },
    ]}>
      <Input.TextArea rows={3} placeholder="Ej: Error en el cobro, cambio de producto, etc." />
    </Form.Item>
  </Form>
</Modal>
```

#### 3.6.8. Actualizar imports de Ant Design (línea 2):
Reemplazar el import actual con los componentes necesarios:
```typescript
import { Card, Typography, Row, Col, Button, Space, Image, Tag, Divider, Popconfirm, Collapse, Empty, Modal, Form, InputNumber, Select, Input, Table, message } from 'antd';
```

### 3.7. Frontend: CashRegister.tsx (NUEVO)

**Archivo:** `src/pages/CashRegister.tsx`

#### Estructura del componente:

```tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Row, Col, Button, Space, Table, Tag, Modal,
  Form, InputNumber, Input, Statistic, DatePicker, message
} from 'antd';
import {
  DollarOutlined, BankOutlined, FileTextOutlined,
  ShoppingCartOutlined, ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  fetchCurrentRegister, openRegister, closeRegister, fetchRegisterHistory, clearCashRegisterError
} from '@/store/cashRegisterSlice';
import { getCashReport } from '@/services/api';
import type { CashRegisterResumen, CashRegisterReport } from '@/types';
import { formatDate } from '@/utils/helpers';
import dayjs from 'dayjs';
import styles from './CashRegister.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CashRegister() { ... }
```

#### Layout:

1. **Header**: Title "Arqueo de Caja" con acciones "Exportar Reporte"
2. **Current Status Card**: Estado actual de la caja (abierta/cerrada)
3. **Resumen de Cierre** (modal post-cierre)
4. **History Table**: Últimos arqueos

#### Estados locales:
```typescript
// Modal states
const [openModalOpen, setOpenModalOpen] = useState(false);
const [closeModalOpen, setCloseModalOpen] = useState(false);
const [closeResult, setCloseResult] = useState<CashRegisterResumen | null>(null);
const [showCloseResultModal, setShowCloseResultModal] = useState(false);

// Report modal
const [reportModalOpen, setReportModalOpen] = useState(false);
const [reportLoading, setReportLoading] = useState(false);
const [reportData, setReportData] = useState<CashRegisterReport | null>(null);
const [reportDates, setReportDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

// Forms
const [openForm] = Form.useForm();
const [closeForm] = Form.useForm();
```

#### Modal Abrir Caja:
- Form con `montoInicial` (InputNumber, required, min=0) y `observaciones` (Input.TextArea opcional)
- On submit: `dispatch(openRegister(values)).unwrap()`
- On success: `message.success()`, cerrar modal, refrescar current y history
- Usar `destroyOnHidden` en el Modal (antd v6)

#### Modal Cerrar Caja:
- Form con `montoFinalDeclarado` (InputNumber, required, min=0) y `observaciones` (opcional)
- On submit: `dispatch(closeRegister(values)).unwrap()`
- El payload del closeRegister.fulfilled es `{ register, resumen: CashRegisterResumen }`
- Setear `closeResult` y `showCloseResultModal`
- Usar `destroyOnHidden`

#### Modal Resultado de Cierre:
- Cards con Statistic por cada campo del resumen
- Incluir los nuevos campos: `totalDevoluciones` (rojo), `saldoNeto` (verde si positivo)
- Colores: diferencia 0 = verde, diferencia != 0 = rojo

#### Modal Exportar Reporte:
- RangePicker para seleccionar fechas
- Botón "Generar Reporte"
- Al hacer clic, llamar a `getCashReport(startDate, endDate)`
- Mostrar 3 Cards:
  - **Activos**: totalIngresos, desglose por método de pago (4 items con colorcitos)
  - **Pasivos**: totalDevoluciones, cantidadNotas (rojo)
  - **Saldo Neto**: saldoNeto (verde si positivo, rojo si negativo) + cantidadVisitas
- Layout responsivo con Row/Col

#### Formato de fecha/hora:
```typescript
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
};
```

### 3.8. Frontend: CashRegister.module.css (NUEVO)

**Archivo:** `src/pages/CashRegister.module.css`

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.statusCard {
  margin-bottom: 24px;
}

.statContainer {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.tableCard {
  margin-top: 24px;
}

.reportCard {
  margin-bottom: 16px;
  height: 100%;
}

.activosCard {
  border-left: 4px solid #52c41a;
}

.pasivosCard {
  border-left: 4px solid #ff4d4f;
}

.saldoNetoCard {
  border-left: 4px solid #1890ff;
}

.positive {
  color: #52c41a;
}

.negative {
  color: #ff4d4f;
}

.neutral {
  color: #8c8c8c;
}

.reportHeader {
  text-align: center;
  margin-bottom: 24px;
}

.reportDateRange {
  text-align: center;
  margin-bottom: 24px;
  color: #8c8c8c;
}
```

### 3.9. Frontend: AppLayout.tsx - Agregar Tabs

**Archivo:** `src/components/AppLayout.tsx`

#### 3.9.1. Actualizar `activeTab` logic (reemplazar líneas 143-147):
```typescript
const activeTab = location.pathname.startsWith('/products')
  ? 'products'
  : location.pathname.startsWith('/appointments')
    ? 'appointments'
    : location.pathname.startsWith('/cash-register')
      ? 'cash-register'
      : location.pathname.startsWith('/debts')
        ? 'debts'
        : 'vehicles';
```

#### 3.9.2. Actualizar `onChange` handler (reemplazar líneas 245-248):
```typescript
onChange={(key) => {
  if (key === 'products') navigate('/products');
  else if (key === 'appointments') navigate('/appointments');
  else if (key === 'cash-register') navigate('/cash-register');
  else if (key === 'debts') navigate('/debts');
  else navigate('/vehicles');
}}
```

#### 3.9.3. Agregar items al Tabs (agregar después del tab products, línea 253):
```typescript
{ key: 'cash-register', label: <span style={{ padding: '0 8px' }}>Caja</span> },
{ key: 'debts', label: <span style={{ padding: '0 8px' }}>Deudas</span> },
```

### 3.10. Frontend: App.tsx - Agregar Rutas

**Archivo:** `src/App.tsx`

#### 3.10.1. Agregar imports (después de línea 19):
```typescript
import CashRegister from './pages/CashRegister';
import Debts from './pages/Debts';
```

#### 3.10.2. Agregar rutas protegidas (antes de la ruta `path="/"`, línea 248):
```tsx
<Route
  path="/cash-register"
  element={
    <ProtectedRoute>
      <AppLayout>
        <CashRegister />
      </AppLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/debts"
  element={
    <ProtectedRoute>
      <AppLayout>
        <Debts />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

---

## 4. Consideraciones Técnicas Importantes

### 4.1. Manejo de null en fetchCurrentRegister
El backend retorna `null` si no hay caja abierta. El componente debe verificar:
```typescript
if (currentRegister && currentRegister.estado === 'abierta') { /* mostrar abierta */ }
else { /* mostrar cerrada */ }
```

### 4.2. Captura del resumen de cierre
El `closeRegister.fulfilled` del slice pone `currentRegister = null`. Para capturar el resumen:
```typescript
const result = await dispatch(closeRegister(data)).unwrap();
// result = { register: CashRegister, resumen: CashRegisterResumen }
setCloseResult(result.resumen);
setShowCloseResultModal(true);
```

### 4.3. Refresco de datos en VehicleDetail
Después de operaciones de pago/nota de crédito, refrescar con:
```typescript
dispatch(fetchVehicleById(id)); // Dispara recarga completa del vehículo
```
Esto actualiza `selectedVehicle` y las visits en el store.

### 4.4. Cálculo de deuda con notas de crédito
```typescript
const totalPagado = visit.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
const totalDevuelto = visit.notasCredito?.reduce((sum, nc) => sum + nc.monto, 0) || 0;
const deuda = (visit.total || 0) - (totalPagado - totalDevuelto);
```

### 4.5. Uso de dayjs para el DatePicker
Ant Design 6 usa `dayjs` como dependencia. No es necesario instalarlo aparte. Importar:
```typescript
import dayjs from 'dayjs';
```

### 4.6. hook-based feedback APIs (Ant Design)
Usar `message` estático (consistente con el código existente en Debts.tsx, AppLayout.tsx).

### 4.7. Convención de imports
| Archivo | Patrón |
|---------|--------|
| `CashRegister.tsx` (nuevo) | Alias `@/` |
| `VehicleDetail.tsx` (modificado) | Relativo (consistente con el archivo) |
| `AppLayout.tsx` (modificado) | Relativo (consistente con el archivo) |
| `App.tsx` (modificado) | Relativo (consistente con el archivo) |

### 4.8. Deprecaciones Ant Design v6
- Usar `destroyOnHidden` en modales (NO `destroyOnClose`)
- Usar `styles={{ body: {...} }}` en modales (NO `bodyStyle`)
- Usar `variant="bordered"` en Cards (NO `bordered`)

---

## 5. Orden de Implementación

### Fase 1: Backend - Notas de Crédito
1. `backend/src/models/Vehicle.js` - Agregar `notasCredito[]` al visitSchema
2. `backend/src/routes/vehicles.js` - Agregar POST/DELETE notas-credito + actualizar /debts
3. `backend/src/routes/cashRegister.js` - Actualizar /close (devoluciones + saldoNeto) + agregar GET /report

### Fase 2: Frontend - Tipos y API
4. `src/types/index.ts` - Agregar NotaCreditoEntry, CashRegisterResumen, CashRegisterReport
5. `src/services/api.ts` - Agregar createNotaCredito, deleteNotaCredito, getCashReport

### Fase 3: Frontend - Componentes
6. `src/pages/VehicleDetail.tsx` - PaymentSection + CreditNoteSection + modales
7. `src/pages/CashRegister.module.css` - Estilos
8. `src/pages/CashRegister.tsx` - Página de caja + reporte

### Fase 4: Frontend - Navegación
9. `src/components/AppLayout.tsx` - Tabs Caja + Deudas
10. `src/App.tsx` - Rutas /cash-register y /debts

---

## 6. Impacto y Archivos Afectados

### Archivos a Modificar:
| Archivo | Tipo de Cambio | Riesgo |
|---------|---------------|--------|
| `backend/src/models/Vehicle.js` | Agregar campo a schema | Bajo |
| `backend/src/routes/vehicles.js` | Agregar rutas + modificar /debts | Medio |
| `backend/src/routes/cashRegister.js` | Modificar /close + agregar /report | Medio |
| `src/types/index.ts` | Adición de interfaces | Bajo |
| `src/services/api.ts` | Adición de funciones | Bajo |
| `src/pages/VehicleDetail.tsx` | Adición de secciones en collapse | Medio |
| `src/components/AppLayout.tsx` | Adición de tabs | Bajo |
| `src/App.tsx` | Adición de imports y rutas | Bajo |

### Archivos a Crear:
| Archivo | Dependencias |
|---------|-------------|
| `src/pages/CashRegister.tsx` | cashRegisterSlice, types, api |
| `src/pages/CashRegister.module.css` | Ninguna |

### Archivos NO Modificados:
- `src/store/cashRegisterSlice.ts` ✅
- `src/store/index.ts` ✅
- `src/store/vehicleSlice.ts` ✅
- `src/pages/Debts.tsx` ✅

---

## 7. Plan de Verificación

### 7.1. Compilación y Linting
- [ ] `npm run build` pasa sin errores de TypeScript
- [ ] `npm run lint` pasa sin errores

### 7.2. CashRegister Page
- [ ] Página carga sin errores en `/cash-register`
- [ ] Muestra estado "No hay caja abierta" cuando no hay ninguna
- [ ] Modal "Abrir Caja" funciona y persiste la caja
- [ ] Al recargar, muestra la caja como "Abierta"
- [ ] Modal "Cerrar Caja" funciona y muestra resumen con **totalDevoluciones** y **saldoNeto**
- [ ] Historial muestra registros correctamente
- [ ] Tags de colores correctos (verde/rojo)

### 7.3. Reporte Mensual (Exportar)
- [ ] Botón "Exportar Reporte" abre modal con DatePicker
- [ ] RangePicker permite seleccionar fechas
- [ ] Al generar reporte, muestra Cards de Activos, Pasivos y Saldo Neto
- [ ] Desglose por método de pago se muestra correctamente

### 7.4. PaymentSection + CreditNotes
- [ ] Sección de pagos aparece dentro de cada visita
- [ ] Muestra total, pagado, y deuda pendiente (con descuento de notas crédito)
- [ ] Botón "Registrar Pago" abre modal
- [ ] Botón "Nota de Crédito" abre modal con motivo obligatorio
- [ ] Registro de nota de crédito actualiza la deuda
- [ ] Notas de crédito existentes se muestran en tabla
- [ ] Eliminación de pago/nota funciona con confirmación

### 7.5. Navegación
- [ ] Tabs "Caja" y "Deudas" aparecen en AppLayout
- [ ] Tab activo se resalta según la ruta actual
- [ ] Navegación a `/cash-register` y `/debts` funciona
- [ ] Las rutas están protegidas

### 7.6. Backend
- [ ] POST notas-credito funciona y retorna vehicle actualizado
- [ ] DELETE notas-credito funciona
- [ ] GET /debts calcula deuda considerando devoluciones
- [ ] POST /close retorna totalDevoluciones y saldoNeto
- [ ] GET /report retorna activos/pasivos/saldoNeto correctamente

---

## 8. Notas Adicionales

### 8.1. Convención de commits
```bash
feat(backend): agregar notasCredito al modelo Vehicle
feat(backend): agregar rutas de notas de crédito y actualizar deudas
feat(backend): agregar reporte mensual y devoluciones en cierre de caja
feat(types): agregar interfaces NotaCreditoEntry y CashRegisterReport
feat(api): agregar funciones createNotaCredito, deleteNotaCredito, getCashReport
feat(vehicle-detail): agregar PaymentSection y CreditNotes en visitas
feat(cash-register): agregar página de arqueo de caja con reporte mensual
feat(layout): agregar tabs de caja y deudas
feat(routing): agregar rutas de caja y deudas
```

### 8.2. Mejoras futuras (no incluir ahora)
- Exportar reporte mensual a PDF
- Migrar de `message.success()` estático a hook-based
- Migrar imports relativos a alias en archivos existentes
- Agregar tests con Vitest Browser Mode
- Agregar lazy loading para CashRegister y Debts
- Filtros por fecha en el historial de arqueos
