# Plan de Implementación: Actualización de Lista de Productos

**Fecha**: 2026-04-29  
**Problema**: La lista de productos no se actualiza después de crear un nuevo producto  
**Prioridad**: Alta

---

## Summary

El problema es que `StockList.tsx` no se actualiza después de crear/editar un producto porque el componente no detecta la navegación de regreso a `/products`. La solución implementa RTK Query para productos, siguiendo el patrón establecido en el proyecto y las convenciones de `AGENTS.md`.

---

## Análisis del Problema

### Hallazgos del Codebase

1. **Flujo actual de creación** (`ProductForm.tsx` línea 63):
   ```typescript
   navigate('/products');
   ```
   - Navega correctamente después de crear/actualizar
   - No hay mecanismo de notificación al listado

2. **Problema en `StockList.tsx`**:
   ```typescript
   useEffect(() => {
     loadProducts();
   }, [search, categoryFilter]); // ❌ Solo se ejecuta si cambian los filtros
   ```
   - El componente carga datos solo al montarse o cuando cambian `search`/`categoryFilter`
   - Al navegar desde `/products/new` → `/products`, React Router **no remonta** el componente si ya estaba montado
   - No hay detección de cambios en la ruta

3. **Patrón del proyecto** (AGENTS.md):
   > "Siempre usar hooks de RTK Query para peticiones API, evitar axios directo si hay un slice definido"
   
   - El proyecto ya tiene `vehicleSlice.ts` con `createAsyncThunk`
   - Se recomienda RTK Query para consistencia

4. **Por qué no se remonta**:
   - En `App.tsx`, las rutas `/products`, `/products/new`, `/products/edit/:id` renderizan componentes diferentes
   - Al navegar de `/products/new` a `/products`, React Router hace unmount de `ProductForm` y mount de `StockList`
   - **PERO**: Si `StockList` ya estaba montado (navegación con back button o desde otro tab), no se remonta
   - El `useEffect` depende solo de `[search, categoryFilter]`, que no cambian en la navegación

---

## Solución Propuesta: Implementar RTK Query para Productos

Esta opción sigue las convenciones de `AGENTS.md` y provee:
- ✅ Cache automático
- ✅ Invalidación de caché automática
- ✅ Menos código manual
- ✅ Patrón consistente con el proyecto
- ✅ Manejo de estados de carga/error integrado

---

## Pasos Técnicos

### Paso 1: Crear API slice con RTK Query

**Archivo**: `src/services/productApi.ts`

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Product } from '@/types';

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], { search?: string; categoria?: string }>({
      query: (params) => ({
        url: '/products',
        params,
      }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    addProduct: builder.mutation<Product, Partial<Product>>({
      query: (product) => ({
        url: '/products',
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
```

### Paso 2: Configurar store para incluir productApi

**Archivo**: `src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import vehicleReducer from './vehicleSlice';
import { productApi } from '@/services/productApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehicleReducer,
    [productApi.reducerPath]: productApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Paso 3: Refactorizar `StockList.tsx`

**Archivo**: `src/pages/StockList.tsx`

Cambios principales:

1. **Eliminar imports de axios y useState/useEffect para datos**:
   ```typescript
   // Eliminar:
   // import api from '../services/api';
   // const [products, setProducts] = useState<Product[]>([]);
   // const [loading, setLoading] = useState(false);
   // const loadProducts = async () => { ... };
   // useEffect(() => { loadProducts(); }, [search, categoryFilter]);
   ```

2. **Importar hooks de RTK Query**:
   ```typescript
   import { useGetProductsQuery, useDeleteProductMutation } from '@/services/productApi';
   ```

3. **Usar hooks en el componente**:
   ```typescript
   const { data: products = [], isLoading } = useGetProductsQuery({
     search,
     categoria: categoryFilter,
   });
   
   const [deleteProduct] = useDeleteProductMutation();
   ```

4. **Simplificar handleDelete**:
   ```typescript
   const handleDelete = async (id?: string) => {
     if (!id) return;
     try {
       await deleteProduct(id).unwrap();
       message.success('Producto eliminado');
       // RTK Query invalida caché automáticamente - no necesita loadProducts()
     } catch {
       message.error('Error eliminando producto');
     }
   };
   ```

5. **Actualizar Table**:
   ```typescript
   <Table
     columns={columns}
     dataSource={products}
     rowKey="_id"
     loading={isLoading}
   />
   ```

### Paso 4: Refactorizar `ProductForm.tsx`

**Archivo**: `src/pages/ProductForm.tsx`

Cambios principales:

1. **Eliminar import de api**:
   ```typescript
   // Eliminar: import api from '@/services/api';
   ```

2. **Importar mutations de RTK Query**:
   ```typescript
   import { useAddProductMutation, useUpdateProductMutation } from '@/services/productApi';
   ```

3. **Usar mutations en el componente**:
   ```typescript
   const [addProduct] = useAddProductMutation();
   const [updateProduct] = useUpdateProductMutation();
   ```

4. **Actualizar handleSubmit**:
   ```typescript
   const handleSubmit = async () => {
     try {
       const values = await form.validateFields();
       if (isEditing) {
         await updateProduct({ id: resolvedId!, data: values }).unwrap();
         message.success('Producto actualizado');
       } else {
         await addProduct(values).unwrap();
         message.success('Producto creado');
       }
       navigate('/products');
       onDone?.();
     } catch {
       message.error('Error guardando producto');
     }
   };
   ```

5. **Actualizar carga de datos para edición** (opcional, usar RTK Query):
   ```typescript
   // Opcional: usar useGetProductByIdQuery en lugar de axios
   // Por ahora mantener axios para carga inicial en edición si se prefiere
   ```

### Paso 5: Actualizar `ProductDetail.tsx` (opcional)

**Archivo**: `src/pages/ProductDetail.tsx`

Usar `useGetProductByIdQuery()` en lugar de axios para consistencia.

---

## Impacto

### Archivos a modificar:

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/services/productApi.ts` | **Nuevo** | Slice RTK Query para productos |
| `src/store/index.ts` | Modificar | Agregar productApi al store |
| `src/pages/StockList.tsx` | Modificar | Usar hooks de RTK Query |
| `src/pages/ProductForm.tsx` | Modificar | Usar mutations de RTK Query |
| `src/pages/ProductDetail.tsx` | Modificar (opcional) | Usar hook de RTK Query |

### Archivos afectados:
- `src/App.tsx` - Sin cambios (ya usa las rutas correctas)
- `src/services/api.ts` - Se puede mantener para auth, pero las funciones de productos ya no se usarán

---

## Plan de Verificación

### 1. Pruebas manuales
- ✅ Crear producto → Verificar que la lista se actualiza automáticamente
- ✅ Editar producto → Verificar que la lista refleja los cambios
- ✅ Eliminar producto → Verificar que desaparece de la lista
- ✅ Usar filtros de búsqueda y categoría → Verificar que siguen funcionando
- ✅ Navegar a `/products/new`, crear producto, volver a lista → Verificar actualización

### 2. Pruebas automatizadas (Vitest Browser Mode)
- Crear prueba para `StockList.tsx` que verifique carga inicial
- Crear prueba para `ProductForm.tsx` que verifique creación y navegación
- Mockear RTK Query hooks en pruebas unitarias

### 3. Linting
```bash
npm run lint
```

### 4. Build
```bash
npm run build
```

---

## Comparación de Opciones

| Criterio | Opción A (key prop) | Opción B (Event emitter) | Opción C (useLocation) | **Opción D (RTK Query)** ✅ |
|----------|---------------------|-------------------------|------------------------|----------------------------|
| Sigue patrones AGENTS.md | ❌ | ⚠️ | ⚠️ | ✅ |
| Cache automático | ❌ | ❌ | ❌ | ✅ |
| Invalidación automática | ❌ | Manual | Manual | ✅ |
| Menos código | ❌ | ❌ | ❌ | ✅ |
| Escalable | ❌ | ⚠️ | ⚠️ | ✅ |
| Manejo de estados integrado | ❌ | ❌ | ❌ | ✅ |

---

## Notas Adicionales

1. **Migración gradual**: Se puede mantener `api.ts` para auth y otras funciones mientras se migra a RTK Query
2. **Tipos**: RTK Query infiere tipos automáticamente desde las definiciones de endpoints
3. **Performance**: RTK Query evita peticiones duplicadas con su sistema de caché
4. **Developer Experience**: Los hooks de RTK Query proveen `isLoading`, `isError`, `refetch` automáticamente

---

## Conclusión

Implementar RTK Query para productos es la solución más robusta y alineada con las convenciones del proyecto. Resuelve el problema de actualización de lista y mejora la arquitectura general del módulo de productos.
