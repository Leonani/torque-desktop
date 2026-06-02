# Plan: Selector de Vehículos para Autocompletado por Dueño

**Fecha**: 2026-05-11
**Feature**: Cuando un dueño tiene múltiples vehículos, mostrar una lista seleccionable en lugar de solo un mensaje informativo.

---

## Resumen

Actualmente, al seleccionar un dueño en `VehicleForm.tsx`, si `getVehiclesByOwnerName` devuelve más de 1 vehículo, solo se muestra un `message.info()`. Se implementará un **Modal con Lista seleccionable** que permita al usuario elegir qué vehículo cargar en el formulario. Los campos `brand`, `model`, `year`, `licensePlate` se autocompletarán al hacer clic en un vehículo.

---

## Análisis

### Código actual (`src/pages/VehicleForm.tsx`)

- La función `handleOwnerChange` (línea 199) maneja el cambio de dueño.
- Cuando `vehicles.length > 1` (línea 235), solo muestra `message.info(...)`.
- Los estados locales ya existen: `selectedBrand`, `brandModels`, `loadingOwnerVehicles`.
- Se usan `form.setFieldValue()` para autocompletar cuando hay exactamente 1 vehículo.

### Estructura de datos `Vehicle` (desde `src/types/index.ts`)

```typescript
interface Vehicle {
  _id?: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  // ... otros campos no relevantes para el selector
}
```

### API (`src/services/api.ts`)

- `getVehiclesByOwnerName(ownerName: string)` → `GET /vehicles?search=<ownerName>` → devuelve `Vehicle[]`.
- Ya está importada y usada en el componente.

### Patrones existentes

- El formulario usa **Ant Design 6** con `Form`, `Select`, `Input`, `InputNumber`, `Modal`, `Button`, etc.
- Se usan **CSS Modules** en otros componentes (ej: `ProductDetail.module.css`).
- **No existe** un CSS Module para `VehicleForm` actualmente (se creará uno).
- Los `message` estáticos (`message.info()`, `message.error()`) se usan en todo el archivo — se mantendrá consistencia por ahora.

---

## Decisión Técnica: Modal con List

Se elige **`Modal` + `List`** de Ant Design por las siguientes razones:

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Modal + List | UX clara (acción bloqueante), muestra toda la info, familiar | Un paso extra | ✅ **Elegido** |
| Select condicional | Integrado en el flujo | El texto de opciones puede ser largo, menos visible | ❌ |
| Drawer | Panel lateral, no bloqueante | Exceso para esta acción simple | ❌ |
| Dropdown reemplazo | Mínimo impacto visual | Difícil de formatear bien, limita info mostrada | ❌ |

**Razones**: `Modal` es el estándar de Ant Design para disambiguación, permite mostrar toda la información del vehículo (marca, modelo, año, patente) de forma legible, y el usuario puede cerrarlo sin seleccionar si prefiere escribir manualmente.

---

## Pasos Técnicos

### Paso 1: Crear CSS Module (`src/pages/VehicleForm.module.css`)

Crear estilos para el contenido del Modal selector de vehículos:

```css
/* VehicleForm.module.css */
.vehicleListContainer {
  max-height: 400px;
  overflow-y: auto;
}

.vehicleListItem {
  cursor: pointer;
  transition: background-color 0.2s;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.vehicleListItem:hover {
  background-color: #e6f4ff;
  border-color: #91caff;
}

.vehicleListItemActive {
  background-color: #e6f4ff;
  border-color: #1677ff;
}

.vehicleInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vehicleTitle {
  font-weight: 600;
  font-size: 15px;
}

.vehicleSubtitle {
  color: #666;
  font-size: 13px;
}

.vehicleLicensePlate {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #1677ff;
  font-size: 14px;
}
```

### Paso 2: Agregar estados locales en `VehicleForm.tsx`

Insertar después de la línea 75 (`const [loadingOwnerVehicles, setLoadingOwnerVehicles] = useState(false);`):

```typescript
// --- Vehicle selector state ---
/** Lista de vehículos del dueño seleccionado (>1 activa el modal) */
const [ownerVehicles, setOwnerVehicles] = useState<Vehicle[]>([]);
/** Controla la visibilidad del modal selector de vehículos */
const [vehicleSelectorVisible, setVehicleSelectorVisible] = useState(false);
/** Nombre formateado del dueño seleccionado (para mostrar en el modal) */
const [selectedOwnerName, setSelectedOwnerName] = useState('');
```

### Paso 3: Modificar `handleOwnerChange` (línea 199)

Reemplazar el bloque `else if (vehicles.length > 1)` (líneas 235-237) con:

```typescript
} else if (vehicles.length > 1) {
  // Mostrar modal selector de vehículos
  setOwnerVehicles(vehicles);
  setSelectedOwnerName(`${selectedOwner.nombre} ${selectedOwner.apellido}`);
  setVehicleSelectorVisible(true);
}
```

### Paso 4: Agregar `handleVehicleSelect`

Nueva función que se ejecuta cuando el usuario hace clic en un vehículo del modal:

```typescript
/**
 * Autocompleta los campos del formulario con los datos del vehículo seleccionado
 * @param {Vehicle} vehicle - Vehículo seleccionado por el usuario
 */
const handleVehicleSelect = (vehicle: Vehicle) => {
  // Llenar campos del formulario
  form.setFieldValue('licensePlate', vehicle.licensePlate);
  form.setFieldValue('brand', vehicle.brand);
  form.setFieldValue('model', vehicle.model);
  form.setFieldValue('year', vehicle.year);

  // Actualizar estados de marca/modelo
  setSelectedBrand(vehicle.brand);
  setBrandModels(getModelsForBrand(vehicle.brand));

  // Cerrar modal y limpiar estado temporal
  setVehicleSelectorVisible(false);
  setOwnerVehicles([]);
};
```

### Paso 5: Agregar `handleVehicleSelectorClose`

```typescript
/**
 * Cierra el modal sin seleccionar vehículo
 */
const handleVehicleSelectorClose = () => {
  setVehicleSelectorVisible(false);
  setOwnerVehicles([]);
  // No se autocompleta ningún campo, el usuario ingresa datos manualmente
};
```

### Paso 6: Agregar el Modal en el render (después del Modal de "Agregar Nuevo Cliente", antes del cierre del contenedor)

Insertar después de la línea 888 (cierre del Modal de nuevo cliente) y antes de la línea 889 (cierre del div contenedor):

```tsx
{/* Modal selector de vehículos cuando el dueño tiene múltiples vehículos */}
<Modal
  title={`${selectedOwnerName} tiene ${ownerVehicles.length} vehículos registrados`}
  open={vehicleSelectorVisible}
  onCancel={handleVehicleSelectorClose}
  footer={null}
  width={520}
  destroyOnHidden
  styles={{ body: { padding: '16px 24px' } }}
>
  <Typography.Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
    Seleccione un vehículo para autocompletar los datos:
  </Typography.Text>
  <div className={styles.vehicleListContainer}>
    {ownerVehicles.map((vehicle) => (
      <div
        key={vehicle._id}
        className={styles.vehicleListItem}
        onClick={() => handleVehicleSelect(vehicle)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleVehicleSelect(vehicle);
          }
        }}
      >
        <div className={styles.vehicleInfo}>
          <span className={styles.vehicleTitle}>
            {vehicle.brand} {vehicle.model} · {vehicle.year}
          </span>
          <span className={styles.vehicleLicensePlate}>
            {vehicle.licensePlate}
          </span>
          <span className={styles.vehicleSubtitle}>
            Dueño: {vehicle.ownerName}
          </span>
        </div>
      </div>
    ))}
  </div>
</Modal>
```

**Nota de accesibilidad**: Se incluye `role="button"`, `tabIndex={0}` y manejador `onKeyDown` para soporte de teclado (Enter/Espacio para seleccionar).

### Paso 7: Importar CSS Module y Typography

- Modificar la línea 2 para importar también `Typography` (ya está importado en línea 2, confirmar que `Typography` esté en la importación de `antd` → ya está: `const { Title } = Typography;`)
- Agregar import del CSS Module al inicio del archivo:

```typescript
import styles from './VehicleForm.module.css';
```

### Paso 8: Consideración especial en `handleOwnerChange` — limpiar `ownerVehicles`

En el inicio de `handleOwnerChange`, cuando se limpian los campos, también se debe limpiar el estado del selector por si el modal estaba abierto:

```typescript
// Agregar al inicio de handleOwnerChange, después de la limpieza de campos:
setVehicleSelectorVisible(false);
setOwnerVehicles([]);
```

---

## Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/VehicleForm.tsx` | Modificar | Agregar estados, modificar `handleOwnerChange`, nuevas funciones, nuevo Modal |
| `src/pages/VehicleForm.module.css` | **Crear** | Estilos para el selector de vehículos en el Modal |
| `ai_docs/plans/2026-05-11-vehicle-owner-autofill.md` | **Crear** | Este documento de plan |

**Ningún otro archivo necesita modificarse.** No se toca Redux (el estado es local), ni la API, ni los types.

---

## Impacto y Riesgos

### Impacto positivo
- ✅ UX mejorada: el usuario puede elegir exactamente qué vehículo cargar
- ✅ Consistente con el flujo existente (autofill para 1 vehículo se mantiene)
- ✅ Sin cambios en store, API, o tipos
- ✅ Código nuevo es autónomo y desacoplado

### Riesgos y mitigaciones
| Riesgo | Mitigación |
|--------|------------|
| El usuario selecciona dueño y cambia de opinión mientras el modal está abierto | Se limpia `ownerVehicles` al cambiar de dueño (Paso 8) |
| Modal abierto + error de red | El modal solo se abre si `getVehiclesByOwnerName` tuvo éxito; errores se manejan en el catch existente |
| Conflictos con modo edición (`isEditing`) | `handleOwnerChange` ya tiene el bloque `if (!isEditing)` que limpia campos; el modal es seguro porque solo se activa en contextos donde `ownerVehicles` tiene datos |
| Usar `message` estático (contra skill de ant-design) | El código existente ya usa estáticos; se mantiene consistencia. Se podría refactorizar a hook-based en el futuro |

---

## Plan de Verificación

### Pruebas unitarias (Vitest Browser Mode)

Se debe crear `src/__tests__/VehicleForm.test.tsx` (o agregar a uno existente si ya hay). Siguiendo el skill `vitest`:

1. **Caso 1: 0 vehículos devueltos**
   - Mock `getVehiclesByOwnerName` → `[]`
   - Seleccionar dueño
   - Verificar que NO se abre el modal
   - Verificar que los campos quedan vacíos

2. **Caso 2: 1 vehículo devuelto (autofill directo — comportamiento existente)**
   - Mock `getVehiclesByOwnerName` → `[mockVehicle]`
   - Seleccionar dueño
   - Verificar que los campos se llenan automáticamente

3. **Caso 3: Múltiples vehículos → se abre modal**
   - Mock `getVehiclesByOwnerName` → `[vehicle1, vehicle2, vehicle3]`
   - Seleccionar dueño
   - Verificar que el modal se abre con el título correcto
   - Verificar que se muestran N elementos en la lista

4. **Caso 4: Seleccionar vehículo del modal**
   - Mock `getVehiclesByOwnerName` → `[vehicle1, vehicle2]`
   - Seleccionar dueño → modal abierto
   - Hacer clic en `vehicle2`
   - Verificar que los campos se llenan con los datos de `vehicle2`
   - Verificar que el modal se cierra

5. **Caso 5: Cerrar modal sin seleccionar**
   - Mock `getVehiclesByOwnerName` → `[vehicle1, vehicle2]`
   - Seleccionar dueño → modal abierto
   - Hacer clic en botón de cerrar/cancelar
   - Verificar que los campos quedan vacíos

6. **Caso 6: Cambiar de dueño mientras el modal está abierto**
   - Seleccionar dueño A → modal abierto
   - Cambiar a dueño B (con 0 o 1 vehículo)
   - Verificar que el modal se cierra

### Verificación de lint

```bash
npm run lint
```

### Verificación de build

```bash
npm run build
```

---

## Orden de Implementación

1. Crear `VehicleForm.module.css`
2. Agregar estados (`ownerVehicles`, `vehicleSelectorVisible`, `selectedOwnerName`)
3. Modificar `handleOwnerChange` (agregar limpieza y apertura de modal)
4. Agregar `handleVehicleSelect`
5. Agregar `handleVehicleSelectorClose`
6. Agregar Modal en el render
7. Importar CSS Module
8. Ejecutar `npm run build` para verificar
9. Ejecutar `npm run lint -- --fix`
10. Crear pruebas
11. Ejecutar `npx vitest run` para verificar pruebas
