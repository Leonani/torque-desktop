# Plan de Remediación - Code Review Final

**Fecha**: 2026-05-11  
**Archivos revisados**: 11 (3 backend, 8 frontend)

---

## Resumen de Hallazgos

Se encontraron **17 issues** clasificados por severidad:
- **Críticos**: 6
- **Medios**: 5
- **Bajos/Sugerencias**: 6

---

## Issues Críticos (Prioridad Alta)

### C-1: Uso masivo de inline styles en JSX
**Archivos**: CashRegister.tsx, VehicleDetail.tsx, AppLayout.tsx (186 ocurrencias totales)
**Violación**: AGENTS.md sección "Styling Rules (Strict)" → "No inline styles in JSX"
**Impacto**: Mantenibilidad, consistencia visual, violación directa de estándares del repo
**Acción**: Migrar todos los `style={{}}` a clases CSS Modules en sus respectivos `*.module.css`

### C-2: Uso de `destroyOnClose` (deprecado)
**Archivos**: CashRegister.tsx (líneas 436, 479, 521, 684), VehicleDetail.tsx (líneas 686, 736)
**Violación**: AGENTS.md "Deprecaciones de Ant Design v6" → `destroyOnClose` → `destroyOnHidden`
**Acción**: Reemplazar `destroyOnClose` por `destroyOnHidden` en todos los Modal

### C-3: Uso de métodos estáticos `message.*()` en vez de hook API
**Archivos**: CashRegister.tsx, VehicleDetail.tsx, AppLayout.tsx (58 ocurrencias)
**Violación**: code-review skill recomienda hook-based APIs (`useMessage`)
**Acción**: Implementar `message.useMessage()` en cada componente y reemplazar llamadas estáticas

### C-4: Proyección MongoDB inválida (`$size` en `.select()`)
**Archivo**: vehicles.js, línea 57
**Problema**: `visitCount: { $size: '$visits' }` no es un operador de proyección válido en `find()`
**Impacto**: Código muerto/confuso; `visitCount` se calcula correctamente en `.map()` pero la proyección es ignorada por MongoDB
**Acción**: Eliminar `visitCount: { $size: '$visits' }` del `.select()`

### C-5: `window.confirm()` en vez de Ant Design Modal.confirm
**Archivo**: VehicleDetail.tsx, línea 57
**Violación**: Inconsistencia con el resto de la UI que usa Ant Design
**Acción**: Reemplazar `window.confirm()` con `Modal.confirm()` de Ant Design

### C-6: Handlers de loading/error incompletos en cashRegisterSlice
**Archivo**: cashRegisterSlice.ts
**Problema**: Los thunks `openRegister`, `closeRegister`, `fetchRegisterHistory` solo tienen handler `.fulfilled` sin `.pending`/`.rejected`. Aunque funcionalmente no causa bugs visibles, es inconsistente con el patrón.
**Acción**: Agregar manejo de estado pending/rejected para todos los thunks

---

## Issues Medios (Prioridad Media)

### M-1: Validación de patente (licensePlate) no implementada
**Archivo**: Vehicle.js (modelo)
**Problema**: No hay validación de formato de patente Argentina (ej: regex)
**Impacto**: Bajos, datos inconsistentes
**Acción**: Agregar validación de formato en el schema de Mongoose

### M-2: JWT_SECRET hardcodeado como fallback
**Archivos**: vehicles.js, cashRegister.js
**Problema**: `'taller-torque-secret-key-2024'` como fallback expuesto en el código
**Impacto**: Seguridad en producción si no se configura variable de entorno
**Acción**: Asegurar que JWT_SECRET esté siempre en variables de entorno; eliminar fallback o documentar

### M-3: Botón "Ver detalle" sin implementación real
**Archivo**: CashRegister.tsx, línea 193-196
**Problema**: El handler solo muestra `message.info('Detalle del registro')` sin navegar a ningún detalle
**Impacto**: UX incompleta
**Acción**: Implementar la funcionalidad o mostrar detalle del registro cerrado

### M-4: Sin redirect en fallo de autenticación
**Archivo**: App.tsx, líneas 107-110
**Problema**: El `.catch()` remueve token/user de localStorage pero no redirige a `/login`
**Impacto**: Estado inconsistente (usuario ve dashboard sin estar autenticado)
**Acción**: Redirigir a `/login` en el catch

### M-5: Performance - Reporte y cierre iteran todos los vehículos en JS
**Archivo**: cashRegister.js (close, report endpoints)
**Problema**: Se traen TODOS los vehículos del usuario para filtrar por fecha en JS. Con muchos datos, será lento.
**Impacto**: Rendimiento degradado con datos grandes
**Acción**: Usar aggregation pipeline de MongoDB para filtrar y sumarizar

---

## Issues Bajos / Sugerencias

### S-1: JSDoc `@typedef` redundante con `interface`
**Archivo**: types/index.ts (User, Owner, Appointment)
**Problema**: Definiciones duplicadas
**Acción**: Eliminar los bloques `@typedef` que son redundantes con las `interface`

### S-2: Patrón mixto de llamadas API (directas vs thunks)
**Archivo**: api.ts / cashRegisterSlice.ts / VehicleDetail.tsx
**Problema**: Algunas operaciones usan thunks de Redux, otras llaman `api.ts` directamente
**Acción**: Unificar el patrón (idealmente usar thunks para operaciones que modifican estado global)

### S-3: `handlePrint` vulnerable a popup blockers
**Archivo**: VehicleDetail.tsx, línea 146
**Problema**: `window.open('', '_blank')` puede ser bloqueado
**Acción**: Usar un enfoque más robusto (iframe oculto o crear elemento temporal)

### S-4: Clases CSS no utilizadas en CashRegister.module.css
**Archivo**: CashRegister.module.css
**Problema**: `.tagSuccess`, `.tagWarning`, `.tagError`, `.totalRow`, `.differencePositive`, `.differenceNegative` no se usan en el componente
**Acción**: Limpiar clases no utilizadas

### S-5: Carácter literal `✕` en vez de icono de Ant Design
**Archivo**: AppLayout.tsx, línea 303
**Problema**: Usa `✕` hardcodeado en vez de un componente icon
**Acción**: Usar `<CloseOutlined />` de `@ant-design/icons`

### S-6: `NavigationLoader` setTimeout con magic number
**Archivo**: App.tsx, línea 65
**Problema**: 300ms hardcodeado sin constante nombrada
**Acción**: Extraer a constante con nombre descriptivo

---

## Orden de Aplicación Sugerido

| Orden | Issue | Esfuerzo | Impacto |
|-------|-------|----------|---------|
| 1 | C-2 (`destroyOnClose`) | Bajo (6 cambios) | Alto |
| 2 | C-5 (`window.confirm`) | Bajo (1 cambio) | Alto |
| 3 | C-4 (proyección inválida) | Bajo (1 línea) | Medio |
| 4 | C-6 (loading handlers) | Bajo (agregar casos) | Medio |
| 5 | M-4 (redirect auth fail) | Bajo (1 cambio) | Alto |
| 6 | C-3 (message hook API) | Medio (~58 cambios) | Alto |
| 7 | C-1 (inline styles) | Alto (~186 cambios) | Alto |
| 8 | M-2 (JWT fallback) | Bajo | Alto |
| 9 | Resto | Variable | Variable |

---

**¿Desea que aplique estos cambios ahora?**
