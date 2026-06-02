# Plan: Módulo de Arqueo de Caja (Cash Register)

**Fecha**: 2026-05-11
**Feature**: Sistema completo de arqueo de caja para taller automotriz, incluyendo registro de pagos por visita, apertura y cierre de caja, y reporte de diferencias.

---

## Resumen

Se implementará un módulo de **Arqueo de Caja** que permite:
1. Registrar **pagos** por visita de vehículo (efectivo, transferencia, tarjeta crédito/débito, mixto)
2. **Abrir** la caja al inicio del turno con un monto inicial
3. **Cerrar** la caja al final del turno, comparando lo esperado vs. lo real
4. Visualizar **historial** de arqueos anteriores

Los pagos se almacenan como un nuevo campo `pagos[]` dentro del subdocumento `visit` del modelo `Vehicle`. La caja registradora (`CashRegister`) es un modelo independiente que define ventanas de tiempo (apertura/cierre) y compute los totales agregando pagos de todas las visitas dentro de ese rango.

---

## Análisis de Arquitectura Actual

### Modelo de datos actual (backend)
- **Vehicle** → embebe `visits[]` como subdocumentos
- Cada `visit` tiene: `fechaIngreso`, `fechaSalida`, `photos`, `inspections`, `productosAsignados[]`, `notas`
- `productosAsignados[]` contiene: `productId`, `nombreProducto`, `cantidad`, `precioVenta`, `subtotal`, `fechaAsignacion`
- **No existe** modelo de pagos ni de caja

### Frontend actual
- Uso mixto de `createAsyncThunk` (vehicles) y RTK Query (products)
- Store con slices: `auth`, `vehicles`, y RTK Query `productApi`
- `VehiclesSlice` maneja toda la lógica CRUD de vehículos y visitas via thunks
- `AppLayout.tsx` tiene tabs de navegación: Recepción de Vehículos, Turnos, Stock
- `VehicleDetail.tsx` muestra visits en un `Collapse` con datos de inspección y productos

### Patrón de API
- Backend en Express con rutas REST bajo `/api/`
- Proxy de Vite: `http://127.0.0.1:5005`
- Autenticación via JWT en header `Authorization: Bearer <token>`
- `api.ts` (axios instance) es el service base; se usa directo en thunks

---

## Decisiones Técnicas

### 1. ¿Dónde almacenar los pagos de cada visita?

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **A: Campo `pagos[]` dentro del subdocumento `visit`** | Misma transacción, consistencia, sin joins | Visitas ya son embedded, puede crecer | ✅ **Elegido** |
| B: Colección `Payment` separada con ref a `visitId` | Normalización, consultas independientes | Complejidad adicional, need migración | ❌ |

**Decisión**: Los pagos son inherentes a cada visita. Como las visitas ya están embebidas en Vehicle, agregar `pagos[]` al subdocumento `visit` es consistente con el patrón actual. El subdocumento `visit` ya tiene `_id` propio, lo que permite identificar cada pago con `visitId`.

### 2. CashRegister: ¿modelo separado o embedded?

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **A: Modelo `CashRegister` separado** | Consultas eficientes, ciclo de vida propio, independiente de vehicles | Una colección más | ✅ **Elegido** |
| B: Embedded en User | Sin colección extra | Escalabilidad limitada, consultas complejas | ❌ |

**Decisión**: Modelo Mongoose independiente. La caja tiene su propio ciclo de vida (abrir → cerrar) y agrega datos de múltiples vehículos.

### 3. ¿RTK Query o createAsyncThunk para CashRegister?

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **A: createAsyncThunk + slice** | Consistente con el patrón existente de vehicles | Más boilerplate | ✅ **Elegido** |
| B: RTK Query (injectEndpoints) | Menos boilerplate, caché automático | Inconsistente con vehicles (el resto del módulo similar usa thunks) | ❌ |

**Decisión**: Usar `createAsyncThunk` + `createSlice` para mantener consistencia con el módulo de vehicles. Si en el futuro se refactoriza todo a RTK Query, se haría como tarea separada.

### 4. ¿Modal para registrar pago o sección inline en VehicleDetail?

**Decisión**: Sección expandible inline dentro del `Collapse` de cada visita, usando un subcomponente `PaymentSection` que muestra el resumen de pagos y un botón "Registrar Pago" que abre un `Modal` con el formulario.

---

## Modelo de Datos

### Backend: Schema `Payment` (embedded en visit)

```javascript
// Agregar a visitSchema en Vehicle.js
pagos: [{
  metodo: {
    type: String,
    required: true,
    enum: ['efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito']
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  referencia: {
    type: String,
    default: ''  // N° de transferencia, autorización, etc.
  },
  fechaPago: {
    type: Date,
    default: Date.now
  }
}]
```

### Backend: Schema `CashRegister` (nuevo modelo)

```javascript
const cashRegisterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fechaApertura: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaCierre: {
    type: Date
  },
  montoInicial: {
    type: Number,
    required: true,
    min: 0
  },
  montoFinalDeclarado: {
    type: Number,
    min: 0
  },
  estado: {
    type: String,
    enum: ['abierta', 'cerrada'],
    default: 'abierta'
  },
  observaciones: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
cashRegisterSchema.index({ userId: 1, estado: 1 });
cashRegisterSchema.index({ userId: 1, fechaApertura: -1 });
```

### Backend: CashRegisterSummary (DTO de cierre, no se persiste)

```javascript
// Computado al cerrar la caja:
{
  // ...datos del CashRegister...
  totalEsperado: Number,           // Suma de todos los pagos en visits durante el período
  desglose: {
    efectivo: Number,
    transferencia: Number,
    tarjeta_credito: Number,
    tarjeta_debito: Number
  },
  totalProductos: Number,          // Suma de subtotales de productosAsignados en visits del período
  diferencia: Number,              // montoFinalDeclarado - totalEsperado
  visitasEnPeriodo: Number,        // Cantidad de visits con pagos en el período
}
```

### Frontend: TypeScript Types (`src/types/index.ts`)

```typescript
/** Método de pago disponible */
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito';

/** Entrada de pago individual dentro de una visita */
export interface PagoEntry {
  _id?: string;
  metodo: MetodoPago;
  monto: number;
  referencia?: string;
  fechaPago?: string;
}

/** Estado del arqueo de caja */
export type CashRegisterStatus = 'abierta' | 'cerrada';

/** Arqueo de caja */
export interface CashRegister {
  _id?: string;
  userId?: string;
  fechaApertura: string;
  fechaCierre?: string;
  montoInicial: number;
  montoFinalDeclarado?: number;
  estado: CashRegisterStatus;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Desglose de pagos por método */
export interface DesglosePagos {
  efectivo: number;
  transferencia: number;
  tarjeta_credito: number;
  tarjeta_debito: number;
}

/** Resumen de cierre de caja (respuesta del backend al cerrar) */
export interface CashRegisterSummary {
  caja: CashRegister;
  totalEsperado: number;
  desglose: DesglosePagos;
  totalProductos: number;
  diferencia: number;
  visitasEnPeriodo: number;
}

/** Estado del slice de caja en Redux */
export interface CashRegisterState {
  registers: CashRegister[];
  activeRegister: CashRegister | null;
  lastSummary: CashRegisterSummary | null;
  loading: boolean;
  error: string | null;
}

// --- También se debe actualizar la interfaz Visit para incluir pagos ---

/** Extender la interfaz Visit existente */
// En la interface Visit actual, agregar:
export interface Visit {
  _id?: string;
  fechaIngreso: string;
  fechaSalida?: string;
  photos: { /* ...existing... */ };
  inspections: InspectionSector[];
  productosAsignados: ProductoAsignado[];
  notas?: string;
  /** @since 2026-05-11 - Pagos registrados para esta visita */
  pagos?: PagoEntry[];
}

/** Constantes para labels de métodos de pago */
export const METODOS_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria',
  tarjeta_credito: 'Tarjeta de Crédito',
  tarjeta_debito: 'Tarjeta de Débito',
};

/** Constantes para iconos de métodos de pago */
export const METODOS_PAGO_COLORS: Record<MetodoPago, string> = {
  efectivo: '#52c41a',        // verde
  transferencia: '#1890ff',   // azul
  tarjeta_credito: '#722ed1', // púrpura
  tarjeta_debito: '#fa8c16',  // naranja
};
```

---

## Backend: Rutas Necesarias

### Nuevo archivo: `backend/src/routes/cashRegister.js`

| Método | Ruta | Descripción | Request Body | Response |
|--------|------|-------------|-------------|----------|
| `GET` | `/api/cash-register` | Listar arqueos del usuario | Query: `?estado=abierta&limit=10` | `CashRegister[]` |
| `GET` | `/api/cash-register/active` | Obtener caja abierta actual (si existe) | — | `CashRegister \| null` |
| `POST` | `/api/cash-register/open` | Abrir nueva caja | `{ montoInicial, observaciones? }` | `CashRegister` |
| `POST` | `/api/cash-register/:id/close` | Cerrar caja con resumen | `{ montoFinalDeclarado, observaciones? }` | `CashRegisterSummary` |
| `GET` | `/api/cash-register/:id` | Obtener un arqueo específico | — | `CashRegister` |
| `GET` | `/api/cash-register/:id/summary` | Obtener resumen detallado (desglose) | — | `CashRegisterSummary` |

### Modificar: `backend/src/routes/vehicles.js`

Agregar endpoint para registrar pago en una visita:

| Método | Ruta | Descripción | Request Body | Response |
|--------|------|-------------|-------------|----------|
| `POST` | `/api/vehicles/:id/visits/:visitId/pagos` | Agregar pago(s) a una visita | `{ pagos: PagoEntry[] }` | `Vehicle` (actualizado) |
| `PUT` | `/api/vehicles/:id/visits/:visitId/pagos/:pagoId` | Actualizar un pago existente | `{ metodo?, monto?, referencia? }` | `Vehicle` |
| `DELETE` | `/api/vehicles/:id/visits/:visitId/pagos/:pagoId` | Eliminar un pago | — | `Vehicle` |

### Nuevo archivo: `backend/src/models/CashRegister.js`

Schema completo de CashRegister como se definió arriba.

### Modificar: `backend/src/index.js`

Agregar la nueva ruta:
```javascript
app.use('/api/cash-register', require('./routes/cashRegister'));
```

---

## Lógica de Negocio en Backend

### `POST /api/cash-register/open`
1. Verificar que NO exista una caja con `estado: 'abierta'` para el mismo `userId`
2. Si existe, devolver `400 Bad Request: "Ya hay una caja abierta"`
3. Crear nuevo CashRegister con `estado: 'abierta'`, `fechaApertura: new Date()`, `montoInicial`
4. Devolver el documento creado

### `POST /api/cash-register/:id/close`
1. Verificar que la caja existe y pertenece al usuario
2. Verificar que `estado === 'abierta'`
3. **Calcular totales**:
   - Buscar todos los Vehicles del usuario
   - Para cada Vehicle, buscar visits que tengan `pagos` con `fechaPago` entre `fechaApertura` y `fechaCierre` (now)
   - Sumar montos agrupados por `metodo`
   - Calcular `totalEsperado = suma de todos los pagos`
   - Calcular `totalProductos = suma de subtotales de productosAsignados` (opcional, informativo)
4. Actualizar la caja: `fechaCierre`, `montoFinalDeclarado`, `estado: 'cerrada'`, `observaciones`
5. Calcular `diferencia = montoFinalDeclarado - totalEsperado`
6. Devolver `CashRegisterSummary`

### `POST /api/vehicles/:id/visits/:visitId/pagos`
1. Validar que el vehicle existe y pertenece al usuario
2. Validar que la visit existe dentro del vehicle
3. Validar que la suma de los nuevos pagos no exceda el total de `productosAsignados` (opcional, warning)
4. Agregar los `PagoEntry[]` al array `visit.pagos`
5. Guardar y devolver el vehicle actualizado

### Query para agregar pagos en período (usado en close/summary)

```javascript
// Buscar todas las visits con pagos en el período [fechaApertura, fechaCierre]
const vehicles = await Vehicle.find(
  { userId: req.userId },
  {
    'visits': {
      $filter: {
        input: '$visits',
        as: 'visit',
        cond: {
          $and: [
            { $gte: ['$$visit.pagos.fechaPago', fechaApertura] },
            { $lte: ['$$visit.pagos.fechaPago', fechaCierre] },
            { $gt: [{ $size: { $ifNull: ['$$visit.pagos', []] } }, 0] }
          ]
        }
      }
    }
  }
);
```

> **Nota**: Como `pagos` está dentro de un array anidado (`visits.pagos`), esta agregación usa `$filter`. Como los datos son por usuario y el volumen esperado es bajo (decenas de visits por día), no se anticipan problemas de performance. Si en el futuro escala, se puede considerar una colección separada de pagos.

---

## Frontend: Estructura de Páginas y Componentes

### Nuevas páginas

| Archivo | Propósito |
|---------|-----------|
| `src/pages/CashRegister.tsx` | Página principal del módulo de caja |
| `src/pages/CashRegisterHistory.tsx` | Historial de arqueos cerrados |

### Nuevos componentes

| Archivo | Propósito |
|---------|-----------|
| `src/components/CashRegisterStatusBadge/CashRegisterStatusBadge.tsx` | Badge de estado (abierto/cerrado) |
| `src/components/CashRegisterStatusBadge/CashRegisterStatusBadge.module.css` | Estilos del badge |
| `src/components/CashRegisterOpenForm/CashRegisterOpenForm.tsx` | Formulario de apertura de caja |
| `src/components/CashRegisterOpenForm/CashRegisterOpenForm.module.css` | Estilos del formulario |
| `src/components/CashRegisterCloseForm/CashRegisterCloseForm.tsx` | Formulario de cierre con resumen |
| `src/components/CashRegisterCloseForm/CashRegisterCloseForm.module.css` | Estilos del formulario |
| `src/components/CashRegisterSummaryCard/CashRegisterSummaryCard.tsx` | Tarjeta de resumen de cierre |
| `src/components/CashRegisterSummaryCard/CashRegisterSummaryCard.module.css` | Estilos de la tarjeta |
| `src/components/PaymentSection/PaymentSection.tsx` | Sección de pagos dentro de VehicleDetail (por visita) |
| `src/components/PaymentSection/PaymentSection.module.css` | Estilos de la sección |
| `src/components/PaymentModal/PaymentModal.tsx` | Modal para registrar/editar pagos |
| `src/components/PaymentModal/PaymentModal.module.css` | Estilos del modal |

### Nuevo store/slice

| Archivo | Propósito |
|---------|-----------|
| `src/store/cashRegisterSlice.ts` | Slice de Redux para caja (thunks + state) |

### Modificaciones a archivos existentes

| Archivo | Cambio |
|---------|--------|
| `src/types/index.ts` | Agregar interfaces `PagoEntry`, `CashRegister`, `CashRegisterSummary`, `CashRegisterState`, tipos `MetodoPago`, constantes |
| `src/store/index.ts` | Agregar `cashRegisterReducer` al store |
| `src/services/api.ts` | Agregar funciones API para caja y pagos |
| `src/pages/VehicleDetail.tsx` | Agregar `PaymentSection` en cada visita del Collapse |
| `src/App.tsx` | Agregar rutas para `/cash-register` y `/cash-register/history` |
| `src/components/AppLayout.tsx` | Agregar tab "Caja" en la navegación |

---

## Estructura del Store (Slice)

### `src/store/cashRegisterSlice.ts`

```typescript
// Estado
interface CashRegisterState {
  registers: CashRegister[];           // Lista de arqueos
  activeRegister: CashRegister | null;  // Caja actualmente abierta (o null)
  lastSummary: CashRegisterSummary | null; // Último resumen de cierre
  loading: boolean;
  error: string | null;
}

// Thunks
fetchRegisters(params?: { estado?: string; limit?: number }) → GET /api/cash-register
fetchActiveRegister() → GET /api/cash-register/active
openRegister(data: { montoInicial: number; observaciones?: string }) → POST /api/cash-register/open
closeRegister(id: string, data: { montoFinalDeclarado: number; observaciones?: string }) → POST /api/cash-register/:id/close
fetchRegisterSummary(id: string) → GET /api/cash-register/:id/summary

// Reducers (síncronos)
clearError
clearLastSummary
```

### Servicios API (`src/services/api.ts`)

```typescript
// ─── Cash Register ───────────────────────────────────────────────
export const getRegisters = async (params?: { estado?: string; limit?: number }) => {
  const response = await api.get('/cash-register', { params });
  return response.data;
};

export const getActiveRegister = async () => {
  const response = await api.get('/cash-register/active');
  return response.data;
};

export const openRegister = async (data: { montoInicial: number; observaciones?: string }) => {
  const response = await api.post('/cash-register/open', data);
  return response.data;
};

export const closeRegister = async (id: string, data: { montoFinalDeclarado: number; observaciones?: string }) => {
  const response = await api.post(`/cash-register/${id}/close`, data);
  return response.data;
};

export const getRegisterSummary = async (id: string) => {
  const response = await api.get(`/cash-register/${id}/summary`);
  return response.data;
};

// ─── Pagos en Visitas ────────────────────────────────────────────
export const addPagosToVisit = async (vehicleId: string, visitId: string, pagos: PagoEntry[]) => {
  const response = await api.post(`/vehicles/${vehicleId}/visits/${visitId}/pagos`, { pagos });
  return response.data;
};

export const updatePagoInVisit = async (vehicleId: string, visitId: string, pagoId: string, data: Partial<PagoEntry>) => {
  const response = await api.put(`/vehicles/${vehicleId}/visits/${visitId}/pagos/${pagoId}`, data);
  return response.data;
};

export const deletePagoFromVisit = async (vehicleId: string, visitId: string, pagoId: string) => {
  const response = await api.delete(`/vehicles/${vehicleId}/visits/${visitId}/pagos/${pagoId}`);
  return response.data;
};
```

---

## Flujo de UI

### Página Principal de Caja (`CashRegister.tsx`)

```
┌─────────────────────────────────────────────────────────┐
│  ARQUEO DE CAJA                                          │
│                                                          │
│  ┌──────────────── Slots de Acción ────────────────────┐ │
│  │  [Abrir Caja]  [Ver Historial]  [Exportar]         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Si NO hay caja abierta ──────────────────────────┐ │
│  │  Card: "No hay caja abierta"                        │ │
│  │  Botón: "Abrir Caja" → abre Modal/CashRegisterOpenForm │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Si HAY caja abierta ─────────────────────────────┐ │
│  │  Card: "Caja Abierta desde las 08:30"               │ │
│  │  Info: Monto inicial $5000                          │ │
│  │  Botón: "Cerrar Caja" → abre Modal de cierre        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─── Últimos arqueos (historial reciente) ────────────┐ │
│  │  Lista de últimos 5 arqueos cerrados                │ │
│  │  Cada item: fecha, monto inicial, total, diferencia │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Modal de Apertura (`CashRegisterOpenForm`)

```
┌──────────────────────────────────────────────┐
│  Abrir Caja                                   │
│                                               │
│  Monto Inicial (para cambio): [___$5000____]  │
│  Observaciones:        [___________________]  │
│                                               │
│  [Cancelar]  [Abrir Caja]                     │
└──────────────────────────────────────────────┘
```

### Modal de Cierre (`CashRegisterCloseForm`)

```
┌──────────────────────────────────────────────┐
│  Cerrar Caja                                  │
│                                               │
│  ┌─── Resumen Automático ───────────────────┐ │
│  │  Total Ingresos:          $45,200        │ │
│  │  Efectivo:                $22,500        │ │
│  │  Transferencia:           $12,700        │ │
│  │  Tarjeta Crédito:          $7,000        │ │
│  │  Tarjeta Débito:           $3,000        │ │
│  │  Visitas en período:       12            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Monto Final Declarado:   [___$45,500____]    │
│  (lo que contó en la caja física)             │
│                                               │
│  Observaciones:          [________________]   │
│                                               │
│  ────────────────────────────────────         │
│  Diferencia:                 +$300 ✅         │
│                                               │
│  [Cancelar]  [Cerrar Caja]                    │
└──────────────────────────────────────────────┘
```

### VehicleDetail — Sección de Pagos por Visita

Dentro del `Collapse` de cada visita, después de "Productos Asignados":

```
┌──────────────────────────────────────────────┐
│  Productos Asignados                          │
│  ┌─────────────────────────────────────────┐ │
│  │ Producto A   Cant: 2   Subtotal: $500  │ │
│  │ Producto B   Cant: 1   Subtotal: $300  │ │
│  │ Total: $800                            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ──── Pagos ────                               │
│  Si tiene pagos:                               │
│  ┌─────────────────────────────────────────┐ │
│  │ 💵 Efectivo: $500          [Editar][X] │ │
│  │ 🏦 Transferencia #123:    [Editar][X] │ │
│  │    $300                                  │ │
│  │ Total pagado: $800 ✅                    │ │
│  └─────────────────────────────────────────┘ │
│  [Registrar Pago]                             │
│                                               │
│  Si NO tiene pagos:                           │
│  [Registrar Pago] (botón primario)            │
└──────────────────────────────────────────────┘
```

---

## Navegación en App.tsx

Se agregan 3 nuevas rutas protegidas:

```tsx
// En src/App.tsx (dentro de ProtectedRoute + AppLayout)

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
  path="/cash-register/history"
  element={
    <ProtectedRoute>
      <AppLayout>
        <CashRegisterHistory />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

### Modificar AppLayout.tsx — Agregar tab "Caja"

En el array `items` del `Tabs` (línea 250), agregar:
```tsx
{ key: 'cash-register', label: <span style={{ padding: '0 8px' }}>Caja</span> }
```

Y actualizar la lógica de `activeTab` y `onChange`:
```typescript
const activeTab = location.pathname.startsWith('/products')
  ? 'products'
  : location.pathname.startsWith('/appointments')
    ? 'appointments'
    : location.pathname.startsWith('/cash-register')
      ? 'cash-register'
      : 'vehicles';

// En onChange:
if (key === 'cash-register') navigate('/cash-register');
```

---

## Archivos a Crear/Modificar (Lista Completa)

### Backend (6 archivos)

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/src/models/CashRegister.js` | **CREAR** | Schema de arqueo de caja |
| `backend/src/routes/cashRegister.js` | **CREAR** | Rutas REST de arqueo de caja |
| `backend/src/routes/vehicles.js` | **MODIFICAR** | Agregar rutas de pagos en visits (`POST/PUT/DELETE /:id/visits/:visitId/pagos`) |
| `backend/src/models/Vehicle.js` | **MODIFICAR** | Agregar campo `pagos[]` al `visitSchema` |
| `backend/src/index.js` | **MODIFICAR** | Agregar `app.use('/api/cash-register', ...)` |
| `backend/src/middleware/` | Sin cambios | Reutilizar `verifyToken` existente (ya en routes/vehicles.js pero inline) |

### Frontend (16 archivos)

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/types/index.ts` | **MODIFICAR** | Agregar `PagoEntry`, `MetodoPago`, `CashRegister`, `CashRegisterSummary`, `CashRegisterState`, constantes; extender `Visit` |
| `src/store/cashRegisterSlice.ts` | **CREAR** | Slice con thunks y reducers |
| `src/store/index.ts` | **MODIFICAR** | Agregar `cashRegister: cashRegisterReducer` |
| `src/services/api.ts` | **MODIFICAR** | Agregar funciones para caja y pagos |
| `src/pages/CashRegister.tsx` | **CREAR** | Página principal de caja |
| `src/pages/CashRegisterHistory.tsx` | **CREAR** | Historial de arqueos |
| `src/components/CashRegisterStatusBadge/CashRegisterStatusBadge.tsx` | **CREAR** | Badge de estado |
| `src/components/CashRegisterStatusBadge/CashRegisterStatusBadge.module.css` | **CREAR** | Estilos |
| `src/components/CashRegisterOpenForm/CashRegisterOpenForm.tsx` | **CREAR** | Formulario apertura |
| `src/components/CashRegisterOpenForm/CashRegisterOpenForm.module.css` | **CREAR** | Estilos |
| `src/components/CashRegisterCloseForm/CashRegisterCloseForm.tsx` | **CREAR** | Formulario cierre |
| `src/components/CashRegisterCloseForm/CashRegisterCloseForm.module.css` | **CREAR** | Estilos |
| `src/components/CashRegisterSummaryCard/CashRegisterSummaryCard.tsx` | **CREAR** | Tarjeta resumen |
| `src/components/CashRegisterSummaryCard/CashRegisterSummaryCard.module.css` | **CREAR** | Estilos |
| `src/components/PaymentSection/PaymentSection.tsx` | **CREAR** | Sección pagos por visita |
| `src/components/PaymentSection/PaymentSection.module.css` | **CREAR** | Estilos |
| `src/components/PaymentModal/PaymentModal.tsx` | **CREAR** | Modal registro pago |
| `src/components/PaymentModal/PaymentModal.module.css` | **CREAR** | Estilos |
| `src/pages/VehicleDetail.tsx` | **MODIFICAR** | Integrar `PaymentSection` en cada visita |
| `src/App.tsx` | **MODIFICAR** | Agregar rutas `/cash-register`, `/cash-register/history` |
| `src/components/AppLayout.tsx` | **MODIFICAR** | Agregar tab "Caja" en navegación |
| `src/__tests__/CashRegister.test.tsx` | **CREAR** | Tests del módulo |
| `src/__tests__/PaymentSection.test.tsx` | **CREAR** | Tests de pagos |
| `ai_docs/plans/2026-05-11-cash-register-module.md` | **CREAR** | Este documento |

**Total**: ~24 archivos (6 backend + 18 frontend)

---

## Orden de Implementación Sugerido

### Fase 1: Base de Datos y Tipos (Backend + Types)
1. **`backend/src/models/CashRegister.js`** — Crear schema
2. **`backend/src/models/Vehicle.js`** — Agregar `pagos[]` al `visitSchema`
3. **`src/types/index.ts`** — Agregar interfaces y constantes de pago/caja
4. Ejecutar `npm run build` para verificar tipos

### Fase 2: API de Pagos (Backend)
5. **`backend/src/routes/vehicles.js`** — Agregar rutas `POST/PUT/DELETE /:id/visits/:visitId/pagos`
6. Probar con curl/Postman los endpoints de pagos

### Fase 3: API de Caja (Backend)
7. **`backend/src/routes/cashRegister.js`** — Crear rutas de caja
8. **`backend/src/index.js`** — Registrar ruta `/api/cash-register`
9. Probar endpoints de apertura/cierre/summary

### Fase 4: Store y Servicios (Frontend)
10. **`src/services/api.ts`** — Agregar funciones para caja y pagos
11. **`src/store/cashRegisterSlice.ts`** — Crear slice con thunks
12. **`src/store/index.ts`** — Integrar slice al store

### Fase 5: Componentes de Pago (Frontend)
13. **`src/components/PaymentSection/PaymentSection.tsx`** + CSS Module
14. **`src/components/PaymentModal/PaymentModal.tsx`** + CSS Module
15. **`src/pages/VehicleDetail.tsx`** — Integrar `PaymentSection` en cada visita del Collapse
16. Verificar que los pagos se guardan y visualizan correctamente

### Fase 6: Página Principal de Caja (Frontend)
17. **`src/components/CashRegisterStatusBadge/`** — Badge
18. **`src/components/CashRegisterOpenForm/`** — Formulario apertura
19. **`src/components/CashRegisterCloseForm/`** — Formulario cierre
20. **`src/components/CashRegisterSummaryCard/`** — Tarjeta resumen
21. **`src/pages/CashRegister.tsx`** — Página principal
22. **`src/pages/CashRegisterHistory.tsx`** — Historial

### Fase 7: Integración y Navegación
23. **`src/components/AppLayout.tsx`** — Agregar tab "Caja"
24. **`src/App.tsx`** — Registrar rutas
25. Probar flujo completo: abrir caja → registrar pagos en visitas → cerrar caja → ver historial

### Fase 8: Pruebas
26. **`src/__tests__/PaymentSection.test.tsx`** — Tests de pagos
27. **`src/__tests__/CashRegister.test.tsx`** — Tests del módulo
28. Ejecutar `npx vitest run` y `npm run lint -- --fix`

---

## Impacto y Riesgos

### Impacto positivo
- ✅ Sistema completo de control de caja diario
- ✅ Trazabilidad de pagos por visita
- ✅ Detección de diferencias (sobrantes/faltantes)
- ✅ Historial consultable de arqueos
- ✅ Consistente con la arquitectura existente (mismos patrones que vehicles)

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **Performance**: Consultar pagos anidados en `visits.pagos` requiere escanear todos los vehicles del usuario | Para un taller típico (< 1000 vehicles, < 20 visits/día), es aceptable. Si escala, migrar a colección `Payment` separada |
| **Concurrencia**: Dos usuarios abren caja simultáneamente | El backend verifica que no exista caja abierta antes de crear una nueva (operación atómica) |
| **Datos inconsistentes**: Pago registrado pero sin caja abierta | Permitido. Los pagos se registran en visits independientemente del estado de la caja. La caja al cerrar agrega todos los pagos en el período |
| **Edición de pagos después del cierre**: Podría desviar arqueos cerrados | Los arqueos cerrados son inmutables. Al cerrar se guarda una foto de los datos. Si se edita un pago después del cierre, no afecta arqueos pasados |
| **React 19 / Ant Design v6**: `message` estático vs hook-based | Usar `message.useMessage()` y `Modal.useModal()` en CashRegister (hook-based), consistente con el skill de Ant Design |
| **DestroyOnClose deprecado en antd v6** | Usar `destroyOnHidden` en modales nuevos |

---

## Verificación Plan

### Pruebas unitarias (Vitest Browser Mode)

**PaymentSection.test.tsx**:
1. Renderizar sección de pagos sin pagos registrados → mostrar botón "Registrar Pago"
2. Renderizar sección con pagos existentes → mostrar lista de pagos con total
3. Abrir modal de registro → verificar campos (método, monto, referencia)
4. Registrar pago exitosamente → verificar que se llama a `addPagosToVisit`
5. Mostrar alerta cuando suma de pagos excede total de productos
6. Editar pago existente → verificar que se llama a `updatePagoInVisit`
7. Eliminar pago → verificar confirmación y llamada a `deletePagoFromVisit`

**CashRegister.test.tsx**:
1. Renderizar sin caja abierta → mostrar "No hay caja abierta"
2. Abrir caja → verificar que se llama a `openRegister`
3. Renderizar con caja abierta → mostrar información de caja activa
4. Abrir modal de cierre → verificar resumen con desglose
5. Cerrar caja con diferencia cero → verificar cálculo correcto
6. Cerrar caja con diferencia positiva/negativa → verificar cálculo
7. Ver historial → navegar a `/cash-register/history`

### Verificaciones

```bash
npm run build           # Build de producción
npm run lint -- --fix   # Linting
npx vitest run          # Pruebas
```

### Checklist de regresión (Ant Design)
- [ ] Provider: `message.useMessage()`, `Modal.useModal()` en CashRegister
- [ ] `destroyOnHidden` en modales nuevos (no `destroyOnClose`)
- [ ] `styles={{ body: ... }}` en modales (no `bodyStyle`)
- [ ] `variant="bordered"` en Cards (no `bordered`)
- [ ] Tipos: `MetodoPago` como union type, interfaces con JSDoc
- [ ] Imports: usar alias `@/` y orden según AGENTS.md
- [ ] CSS Modules para todos los componentes nuevos
