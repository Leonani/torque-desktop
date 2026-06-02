# Plan de Implementación: Agregar Campo "nombre" al Formulario de Productos

**Fecha**: 29 de abril de 2026  
**Estado**: Pendiente  
**Prioridad**: Alta

## Summary

El formulario de creación/edición de productos (`ProductForm.tsx`) no incluye el campo `nombreProducto` que está definido en la interfaz `Product` del archivo `types/index.ts`. Este campo es esencial ya que se usa para mostrar el nombre del producto en listados (`StockList.tsx`) y detalles (`ProductDetail.tsx`). El plan detalla los pasos para agregar este campo faltante siguiendo las convenciones del proyecto.

---

## Analysis

### Hallazgos del análisis del codebase

1. **Ubicación del formulario**: `src/pages/ProductForm.tsx`
   - Maneja tanto creación como edición de productos
   - Usa Ant Design Form con `Form.useForm()`
   - Se usa en dos contextos: página completa (`/products/new`, `/products/edit/:id`) y modal (en `StockList.tsx`)

2. **Interfaz de Producto** (`src/types/index.ts` líneas 58-69):
   ```typescript
   export interface Product {
     _id?: string;
     nombreProducto: string;  // ← Este campo falta en el formulario
     codigoBarra?: string;
     categoria?: ProductCategory | null;
     subcategoria?: string | null;
     cantidad: number;
     precioCompra: number;
     precioVenta: number;
     createdAt?: string;
     updatedAt?: string;
   }
   ```

3. **Campos actuales en el formulario** (líneas 64-108 de `ProductForm.tsx`):
   - ✅ Código de barras (`codigoBarra`) - requerido
   - ✅ Categoría (`categoria`) - requerido
   - ✅ Subcategoría (`subcategoria`)
   - ✅ Cantidad (`cantidad`) - requerido
   - ✅ Precio Compra (`precioCompra`)
   - ✅ Precio Venta (`precioVenta`)
   - ❌ **Nombre del Producto (`nombreProducto`)** - **FALTANTE**

4. **Integración con API**:
   - Usa axios directo (`api.get`, `api.post`, `api.put`) en lugar de RTK Query
   - El backend espera el campo `nombreProducto` (se usa en respuestas y se muestra en UI)

5. **Pruebas**: No hay pruebas existentes para este formulario (no se encontraron archivos `*.test.tsx`)

---

## Technical Steps

### Fase 1: Revisión del Backend y Endpoint ✅ COMPLETADO

1. **Identificar el endpoint del backend**
   - Base URL del backend: `http://127.0.0.1:5005` (según configuración de proxy en `vite.config.ts`)
   - Endpoints utilizados en `ProductForm.tsx`:
     - **POST** `/api/products` - Crear nuevo producto (línea 51 de `ProductForm.tsx`)
     - **PUT** `/api/products/:id` - Actualizar producto existente (línea 48)
     - **GET** `/api/products/:id` - Obtener producto para edición (línea 32)

2. **Verificación del modelo en el backend**
   - Archivo: `backend/src/models/Product.js`
   - **Resultado**: El campo `nombreProducto` **YA ES REQUERIDO** en el backend
     ```javascript
     nombreProducto: {
       type: String,
       required: true  // ← Línea 20 del modelo
     }
     ```
   - El backend también valida:
     - `cantidad` (requerido, mínimo 0)
     - `precioCompra` (requerido, mínimo 0)
     - `precioVenta` (requerido, mínimo 0)
     - `userId` (requerido, asignado automáticamente del token)

3. **Conclusión de la revisión del backend**
   - ✅ **Caso A confirmado**: El backend YA requiere `nombreProducto`
   - No es necesario modificar el backend
   - **Solo se requiere agregar el campo al formulario frontend** (continuar con Fase 2)
   - El backend rechazará cualquier producto creado sin `nombreProducto` con error 500

### Fase 2: Modificación del Formulario Frontend

4. **Modificar la interfaz del formulario (opcional pero recomendado)**
   - Agregar JSDoc a `ProductFormProps` si no existe documentación clara
   - Verificar que el formulario pueda recibir y mostrar el campo `nombreProducto` al editar

5. **Agregar el campo `nombreProducto` al formulario**
   - Ubicación: Después del título del formulario, antes del Row de código de barras (línea 63)
   - Usar `Form.Item` con:
     - `name="nombreProducto"`
     - `label="Nombre del Producto"`
     - Regla de validación: requerido, longitud máxima (ej. 100 caracteres)
   - Usar componente `<Input>` de Ant Design
   - Aplicar `maxLength={100}` y `showCount` para consistencia

6. **Configurar validaciones**
   - Requerido: `{ required: true, message: 'El nombre del producto es obligatorio' }`
   - Longitud máxima: `{ max: 100, message: 'El nombre no puede exceder 100 caracteres' }`

7. **Verificar carga de datos en edición**
   - El `useEffect` actual (líneas 29-37) ya carga `response.data` que incluye `nombreProducto`
   - `form.setFieldsValue(response.data)` debería funcionar automáticamente si el campo está en el formulario

8. **Verificar envío del formulario**
   - La función `handleSubmit` (líneas 44-59) ya envía todos los valores del formulario
   - `form.validateFields()` capturará los valores incluyendo `nombreProducto`
   - No requiere cambios adicionales en la lógica de envío

9. **Aplicar convenciones del proyecto**
   - Usar alias de ruta `@/` para imports (ya está implementado)
   - Mantener orden de imports según `AGENTS.md`
   - No usar CSS Modules para este formulario (usar estilos inline o del sistema de diseño Ant Design)

10. **Crear pruebas con Vitest Browser Mode**
    - Crear archivo: `src/__tests__/ProductForm.test.tsx`
    - Probar: renderizado del campo, validación requerida, envío con datos válidos
    - Seguir patrón de Vitest Browser Mode (usar `vitest-browser-react`)

---

## Impact

### Archivos que serán modificados

| Archivo | Cambio |
|---------|--------|
| `src/pages/ProductForm.tsx` | Agregar `Form.Item` para `nombreProducto` con validaciones |
| `src/__tests__/ProductForm.test.tsx` | **NUEVO** - Pruebas del formulario |

### Archivos que podrían verse afectados (sin modificación necesaria)

| Archivo | Razón |
|---------|--------|
| `src/types/index.ts` | La interfaz ya tiene `nombreProducto`, no requiere cambios |
| `src/pages/StockList.tsx` | Ya muestra `nombreProducto` en la tabla, no requiere cambios |
| `src/pages/ProductDetail.tsx` | Ya muestra `nombreProducto` en el detalle, no requiere cambios |
| `src/App.tsx` | No requiere cambios, ya importa `ProductForm` correctamente |

---

## Verification Plan

1. **Linting**:
   ```bash
   npm run lint
   npm run lint -- --fix  # Si hay errores automáticos
   ```

2. **Pruebas (Vitest Browser Mode)**:
   ```bash
   npx vitest run src/__tests__/ProductForm.test.tsx
   ```

3. **Pruebas manuales**:
   - Navegar a `/products/new` y verificar que el campo "Nombre del Producto" aparece y es requerido
   - Intentar enviar el formulario sin nombre → debe mostrar error de validación
   - Crear un producto con nombre → verificar que aparece en la lista (`/products`)
   - Editar un producto → verificar que el nombre se carga correctamente
   - Ver detalle del producto → verificar que el nombre se muestra en `ProductDetail`

4. **Verificación visual**:
   - El campo debe aparecer en la parte superior del formulario (antes del código de barras)
   - Debe tener un ancho completo en móvil (xs={24}) y la mitad en desktop (md={12})

---

## Código Sugerido para ProductForm.tsx

El campo debe insertarse después de la línea 63 (`<Form form={form} layout="vertical">`) y antes del Row existente (línea 64):

```tsx
<Form form={form} layout="vertical">
  {/* Nuevo campo: Nombre del Producto */}
  <Row gutter={16}>
    <Col xs={24} md={12}>
      <Form.Item 
        name="nombreProducto" 
        label="Nombre del Producto" 
        rules={[
          { required: true, message: 'El nombre del producto es obligatorio' },
          { max: 100, message: 'El nombre no puede exceder 100 caracteres' }
        ]}
      >
        <Input 
          placeholder="Ingrese el nombre del producto"
          maxLength={100}
          showCount
        />
      </Form.Item>
    </Col>
  </Row>

  <Row gutter={16}>
    {/* Resto del formulario existente... */}
```

---

## Ejemplo de Prueba (Vitest Browser Mode)

Crear archivo: `src/__tests__/ProductForm.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from 'vitest-browser-react';
import ProductForm from '../pages/ProductForm';
import api from '../services/api';

// Mock del servicio API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el campo nombre del producto', () => {
    render(<ProductForm />);
    
    expect(screen.getByLabelText(/Nombre del Producto/i)).toBeInTheDocument();
  });

  it('debe mostrar error si se intenta enviar sin nombre', async () => {
    render(<ProductForm />);
    
    const submitButton = screen.getByRole('button', { name: /Crear Producto/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/El nombre del producto es obligatorio/i)).toBeInTheDocument();
  });

  it('debe enviar el formulario con nombre válido', async () => {
    (api.post as vi.Mock).mockResolvedValueOnce({ data: { success: true } });
    
    render(<ProductForm />);
    
    const nameInput = screen.getByLabelText(/Nombre del Producto/i);
    await user.type(nameInput, 'Filtro de Aceite Mobil 1');
    
    const submitButton = screen.getByRole('button', { name: /Crear Producto/i });
    await user.click(submitButton);
    
    expect(api.post).toHaveBeenCalledWith('/products', expect.objectContaining({
      nombreProducto: 'Filtro de Aceite Mobil 1'
    }));
  });
});
```

---

## Notas Adicionales

- El campo `nombreProducto` es crítico porque es usado como identificador principal en listados y búsquedas
- La búsqueda en `StockList.tsx` (línea 164: "Buscar por nombre o código") sugiere que el backend soporta búsqueda por nombre
- Se recomienda agregar `showCount` al `<Input>` para mejor experiencia de usuario con el límite de 100 caracteres
- El formulario usa axios directo en lugar de RTK Query, lo cual es consistente con el resto del proyecto para operaciones de productos
