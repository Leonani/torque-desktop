# Plan de Implementación: Autofill de Vehículo desde Dueño

## Summary
Implementar lógica en `VehicleForm.tsx` para autocompletar los campos `brand`, `model`, `year`, `licensePlate` cuando un usuario selecciona un dueño que tiene exactamente 1 vehículo registrado. Si el dueño tiene más de 1 vehículo, no se autocompleta nada.

## Analysis

### Estado Actual del Codebase
1. **Formulario de Vehículos** (`src/pages/VehicleForm.tsx`):
   - Usa Ant Design Form con `Form.useForm()`
   - El Select de dueños está en las líneas 525-538
   - Los dueños se cargan con `getOwners()` desde `api.ts` y se guardan en el estado `owners`
   - El Select de dueños usa `o._id` como value y `${o.nombre} ${o.apellido}` como label
   - No hay lógica de `onChange` en el Select de dueños actualmente

2. **Relación Owner-Vehicle**:
   - En el backend, los vehículos tienen un campo `ownerName` (string) que almacena el nombre completo del dueño en mayúsculas
   - Los dueños tienen `_id`, `nombre`, `apellido`, etc.
   - No hay una referencia directa por ID entre Owner y Vehicle

3. **Store de Vehículos** (`src/store/vehicleSlice.ts`):
   - Tiene un array `vehicles` que se llena con `fetchVehicles`
   - Actualmente no se carga en el formulario de vehículos

4. **Backend** (`backend/src/routes/vehicles.js`):
   - El endpoint `GET /vehicles` soporta filtros por query params (`search`, `brand`, `model`, `year`)
   - No tiene un filtro específico por `ownerName`, pero se puede usar el parámetro `search` para buscar por `ownerName`

### Enfoque Seleccionado
**Opción B: Fetch bajo demanda con filtro por ownerName**
- Cuando el usuario seleccione un dueño, hacer un fetch a `/vehicles?search={ownerName}` para obtener los vehículos de ese dueño
- Esto es más eficiente que cargar todos los vehículos al montar el formulario
- Aprovecha el filtro `$or` que ya existe en el backend (línea 35 de vehicles.js)

## Technical Steps

### 1. Agregar función para obtener vehículos por dueño en `api.ts`

Agregar una nueva función que filtre vehículos por el nombre del dueño:

```typescript
// En src/services/api.ts
export const getVehiclesByOwnerName = async (ownerName: string) => {
  const response = await api.get(`/vehicles?search=${encodeURIComponent(ownerName)}`);
  return response.data;
};
```

**Nota**: Usamos `search` porque el backend ya tiene lógica para buscar en `ownerName` (línea 35). Si necesitamos un filtro más preciso, podemos modificar el backend para agregar `ownerName` como parámetro de query específico.

### 2. Modificar el Select de dueños en `VehicleForm.tsx`

Agregar un `onChange` handler al Select de dueños (línea 525) para detectar cuando se selecciona un dueño y ejecutar la lógica de autofill.

#### 2.1 Agregar estados para manejo de carga
```typescript
// Agregar después de línea 74 (estados de owner)
const [loadingOwnerVehicles, setLoadingOwnerVehicles] = useState(false);
```

#### 2.2 Crear función handleOwnerChange
```typescript
// Función para manejar el cambio de dueño
const handleOwnerChange = async (ownerId: string) => {
  // Limpiar campos si se está creando un nuevo vehículo (no editando)
  if (!isEditing) {
    form.setFieldValue('licensePlate', '');
    form.setFieldValue('brand', '');
    form.setFieldValue('model', '');
    form.setFieldValue('year', undefined);
    setSelectedBrand(null);
    setBrandModels([]);
  }
  
  // Buscar el dueño seleccionado para obtener su nombre completo
  const selectedOwner = owners.find(o => o._id === ownerId);
  if (!selectedOwner) return;
  
  const ownerName = `${selectedOwner.nombre} ${selectedOwner.apellido}`.toUpperCase();
  
  // Fetch vehículos de este dueño
  setLoadingOwnerVehicles(true);
  try {
    const vehicles = await getVehiclesByOwnerName(ownerName);
    
    // Verificar cuántos vehículos tiene
    if (vehicles.length === 1) {
      // Autofill: llenar campos con los datos del vehículo
      const vehicle = vehicles[0];
      form.setFieldValue('licensePlate', vehicle.licensePlate);
      form.setFieldValue('brand', vehicle.brand);
      form.setFieldValue('model', vehicle.model);
      form.setFieldValue('year', vehicle.year);
      
      // Actualizar estados relacionados con marca/modelo
      setSelectedBrand(vehicle.brand);
      setBrandModels(getModelsForBrand(vehicle.brand));
      
      message.info('Campos completados automáticamente con el vehículo existente');
    } else if (vehicles.length > 1) {
      // No autofill, pero mostrar información
      message.info(`${selectedOwner.nombre} ${selectedOwner.apellido} tiene ${vehicles.length} vehículos registrados. Complete los datos manualmente.`);
    }
    // Si tiene 0 vehículos, no hacer nada (dejar campos en blanco)
  } catch (error) {
    console.error('Error fetching owner vehicles:', error);
    message.error('Error al verificar vehículos del cliente');
  } finally {
    setLoadingOwnerVehicles(false);
  }
};
```

#### 2.3 Modificar el Select de dueños
Agregar el `onChange` handler y mostrar indicador de carga si es necesario:

```tsx
<Select
  showSearch
  placeholder="Seleccionar cliente"
  size="large"
  loading={loadingOwners || loadingOwnerVehicles}  // Agregar loadingOwnerVehicles
  popupRender={ownerDropdownRender}
  filterOption={(input, option) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
  }
  options={owners.map(o => ({ 
    value: o._id, 
    label: `${o.nombre} ${o.apellido}` 
  }))}
  onChange={handleOwnerChange}  // Agregar esta línea
/>
```

### 3. Importar la nueva función en VehicleForm.tsx

Agregar `getVehiclesByOwnerName` al import de `api.ts` (línea 16):

```typescript
import api, { getOwners, createOwner, getVehiclesByOwnerName } from '../services/api';
```

## Impact

### Archivos a Modificar
1. **`src/services/api.ts`**:
   - Agregar función `getVehiclesByOwnerName`

2. **`src/pages/VehicleForm.tsx`**:
   - Agregar import de `getVehiclesByOwnerName`
   - Agregar estado `loadingOwnerVehicles`
   - Crear función `handleOwnerChange`
   - Modificar Select de dueños para agregar `onChange` handler

### Módulos Afectados
- Formulario de vehículos (creación y edición)
- Servicios de API

## Verification Plan

### Testing Manual
1. **Caso 1: Dueño con 1 vehículo**
   - Ir a formulario de nuevo vehículo
   - Seleccionar un dueño que tenga exactamente 1 vehículo
   - Verificar que los campos `brand`, `model`, `year`, `licensePlate` se llenen automáticamente
   - Verificar que el Select de modelo se actualice con los modelos de la marca

2. **Caso 2: Dueño con más de 1 vehículo**
   - Seleccionar un dueño que tenga más de 1 vehículo
   - Verificar que los campos permanezcan en blanco
   - Verificar que aparezca un mensaje informativo

3. **Caso 3: Dueño sin vehículos**
   - Seleccionar un dueño sin vehículos
   - Verificar que los campos permanezcan en blanco
   - No debería aparecer mensaje de error

4. **Caso 4: Edición de vehículo**
   - Editar un vehículo existente
   - Cambiar el dueño
   - Verificar que los campos no se sobrescriban automáticamente (o decidir comportamiento deseado)
   - **Nota**: En la implementación propuesta, se agregó una condición `if (!isEditing)` para no autofill en edición

5. **Caso 5: Manejo de errores**
   - Simular error en el fetch (desconectar backend)
   - Verificar que aparezca mensaje de error
   - Verificar que los campos no se modifiquen

### Linting
```bash
npm run lint
```

### Consideraciones de UX
1. **Loading state**: Se agregó `loadingOwnerVehicles` para mostrar indicador de carga en el Select mientras se verifican los vehículos del dueño
2. **Feedback visual**: Se usan mensajes `message.info()` y `message.error()` para informar al usuario sobre el estado
3. **No interrumpir flujo**: La lógica de autofill no bloquea el formulario, solo llena campos
4. **Edición**: Se decidió no aplicar autofill en modo edición para evitar sobrescribir datos existentes accidentalmente

## Notas Adicionales

### Posible Mejora en Backend
Si se requiere una búsqueda más precisa, se puede modificar el backend para agregar un parámetro `ownerName` específico en el endpoint `GET /vehicles`:

```javascript
// En backend/src/routes/vehicles.js, dentro de router.get('/')
if (ownerName) query.ownerName = ownerName; // Búsqueda exacta
```

Y luego usar:
```typescript
export const getVehiclesByOwnerName = async (ownerName: string) => {
  const response = await api.get(`/vehicles?ownerName=${encodeURIComponent(ownerName)}`);
  return response.data;
};
```

### Manejo de Mayúsculas
- El backend guarda `ownerName` en mayúsculas (línea 76 de vehicles.js: `ownerName`)
- Al hacer el fetch, enviamos el `ownerName` en mayúsculas para coincidir con los datos guardados
- El backend usa `$regex` con `$options: 'i'` (case insensitive), así que también funcionaría en minúsculas, pero es mejor ser consistentes
