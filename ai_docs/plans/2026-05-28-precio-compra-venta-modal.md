# Plan: Mostrar y Modificar PrecioCompra + PrecioVenta en Modal de Asignación

**Fecha:** 2026-05-28
**Feature:** Añadir campo `precioCompra` (precio de costo) al modal de asignación de productos/servicios en VehicleDetail.tsx, junto al campo existente `precioVenta`, permitiendo su modificación y persistencia.

---

## Resumen

El modal de asignación de productos/servicios en `VehicleDetail.tsx` actualmente solo permite ver/modificar el precio de venta (`precioVenta`). Se requiere añadir también el precio de costo (`precioCompra`) para que el usuario pueda visualizar y modificar ambos precios al asignar un producto del stock a una visita de vehículo.

---

## Análisis del Estado Actual

### Frontend — VehicleDetail.tsx

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| Estado `customPrice` | 75 | Solo almacena precio de venta |
| Modal de asignación | 1252–1425 | Un solo InputNumber para precio |
| `onChange` del Select de producto | 1273–1277 | Auto-completa solo `precioVenta` |
| `addPendingProduct()` | 432–458 | Crea `PendingItem` sin `precioCompra` |
| `PendingItem` interface | 33–40 | No tiene campo `precioCompra` |
| `handleSaveProductos()` | 489–544 | Envía solo `precioVenta` al backend |
| Display de productos asignados | 855–878 | Muestra solo `precioVenta` |

### Frontend — types/index.ts

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| `Product.precioCompra` | 116 | ✅ Existe en el modelo de producto |
| `ProductoAsignado` | 133–140 | ❌ No tiene campo `precioCompra` |

### Frontend — api.ts

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| `assignProductToVisit()` | 232–239 | ❌ Tipo `data` solo acepta `precioVenta` |

### Backend — Vehicle.js (modelo)

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| `productosAsignados` subdoc | 41–70 | ❌ No tiene campo `precioCompra` |

### Backend — stock.js (route)

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| `assign-product` endpoint | 91–159 | ❌ No recibe ni persiste `precioCompra` |

### Backend — StockMovement.js

| Elemento | Línea(s) | Estado Actual |
|----------|----------|---------------|
| Schema | 1–43 | ❌ No tiene `precioCompraAplicado` |

---

## Cambios Necesarios

### FASE 1: Backend — Modelo Vehicle.js

**Archivo:** `backend/src/models/Vehicle.js`

Añadir campo `precioCompra` al subdocumento `productosAsignados` (después de `precioVenta`, ~línea 59):

```javascript
precioVenta: { type: Number, required: true, min: 0 },
precioCompra: { type: Number, min: 0, default: 0 },  // ← NUEVO
```

### FASE 2: Backend — Modelo StockMovement.js (opcional, auditoría)

**Archivo:** `backend/src/models/StockMovement.js`

Añadir campo después de `precioVentaAplicado` (~línea 31):

```javascript
precioVentaAplicado: { type: Number, min: 0 },
precioCompraAplicado: { type: Number, min: 0 },  // ← NUEVO
```

### FASE 3: Backend — Route stock.js

**Archivo:** `backend/src/routes/stock.js`

1. **Línea 93**: Desestructurar `precioCompra` del body
2. **Después de línea 122**: Calcular `precioCompraFinal`
3. **Líneas 125–131**: Incluir `precioCompra` en el push a `productosAsignados`
4. **Líneas 144–152**: Incluir `precioCompraAplicado` en el StockMovement

### FASE 4: Frontend — types/index.ts

**Archivo:** `src/types/index.ts`

Añadir `precioCompra` a la interfaz `ProductoAsignado` (~línea 138).

### FASE 5: Frontend — api.ts

**Archivo:** `src/services/api.ts`

Añadir `precioCompra?: number` al tipo `data` de `assignProductToVisit()` (~línea 235).

### FASE 6: Frontend — VehicleDetail.tsx

**Archivo:** `src/pages/VehicleDetail.tsx`

| # | Cambio | Línea(s) |
|---|--------|----------|
| 6a | Añadir `precioCompra?` a `PendingItem` | 33–40 |
| 6b | Añadir estado `customPriceCompra` | ~76 |
| 6c | Resetear `customPriceCompra` en `openProductoModal` | ~412 |
| 6d | Auto-poblar ambos precios al seleccionar producto | 1273–1277 |
| 6e | Añadir InputNumber para precio de costo en el JSX | ~1308 |
| 6f | Incluir `precioCompra` en `addPendingProduct` | 432–458 |
| 6g | Mostrar ambos precios en items pendientes | 1331–1347 |
| 6h | Enviar `precioCompra` en `handleSaveProductos` | 511–515 |
| 6i | Mostrar `precioCompra` en productos ya asignados | 855–878 |

---

## Flujo de Datos

```
Usuario selecciona producto → auto-puebla precioVenta + precioCompra
       ↓
Usuario modifica (opcional) ambos precios
       ↓
Click "Agregar" → PendingItem { precio, precioCompra }
       ↓
Click "Guardar" → handleSaveProductos()
       ↓
assignProductToVisit({ productId, cantidad, precioVenta, precioCompra })
       ↓
POST /stock/vehicles/:id/visits/:visitId/assign-product
       ↓
Backend persiste en visit.productosAsignados[].precioCompra
       ↓
dispatch(fetchVehicleById) → UI actualizada con ambos precios
```

---

## Archivos Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `backend/src/models/Vehicle.js` | Backend | +1 campo schema |
| `backend/src/models/StockMovement.js` | Backend | +1 campo schema (opcional) |
| `backend/src/routes/stock.js` | Backend | +aceptar/persistir precioCompra |
| `src/types/index.ts` | Frontend | +1 campo interface |
| `src/services/api.ts` | Frontend | +1 campo type |
| `src/pages/VehicleDetail.tsx` | Frontend | +estado, +UI, +lógica |

---

## Estimación de Esfuerzo

**Bajo-Medio** (~50–80 líneas de cambios totales)

---

## Verificación

1. `pnpm lint` sin errores
2. `pnpm build` exitoso
3. Prueba visual: modal muestra ambos campos de precio
4. Prueba funcional: al guardar, el backend persiste `precioCompra`
5. Prueba de regresión: productos existentes sin `precioCompra` no se rompen (campo opcional default 0)
