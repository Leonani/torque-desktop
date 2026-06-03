# Code Review Report: Header Personalizable (Título + Logo)

**Date**: 2026-06-03
**Files Reviewed**:
1. `src/renderer/store/themeSlice.ts`
2. `src/renderer/hooks/useTheme.ts`
3. `src/renderer/components/AppLayout.tsx`
4. `src/renderer/components/ThemeSettings/ThemeSettingsModal.tsx`
5. `src/renderer/components/ThemeSettings/ThemeSettings.module.css`
6. `src/renderer/components/AppLayout.module.css`
**Reviewer**: Code Review Agent

---

## Summary

Revisión completa de la feature de header personalizable que permite al usuario configurar un título y logo (en base64) desde el modal de personalización de tema, persistido en localStorage vía Redux slice.

**Veredicto: ✅ Cambios de alta calidad, consistentes con el codebase.**

---

## ✅ Todo lo correcto

### 1. `themeSlice.ts`

| Aspecto | Estado |
|---------|--------|
| `ThemeState` extendido con `title: string` y `logo: string \| null` | ✅ |
| `getDefaultTheme()` retorna `title: 'Torque Desktop'` y `logo: null` | ✅ |
| `migrateLegacyTheme()` migra `legacy.logo` correctamente (`legacy.logo \|\| null`) | ✅ |
| `setBrandTitle` reducer persiste en `localStorage` vía `saveThemeToStorage()` | ✅ |
| `setBrandLogo` reducer persiste en `localStorage` vía `saveThemeToStorage()` | ✅ |
| `resetTheme()` resetea `title` y `logo` a valores por defecto | ✅ |
| `hydrateThemeFromStorage()` hidrata `title` y `logo` desde storage | ✅ |
| `selectBrandTitle` selector exportado | ✅ |
| `selectBrandLogo` selector exportado | ✅ |
| `setBrandTitle` action exportada | ✅ |
| `setBrandLogo` action exportada | ✅ |
| Sin errores de tipo TypeScript (`PayloadAction<string>`, `PayloadAction<string \| null>`) | ✅ |
| Detección y migración de formato legacy correcta | ✅ |
| Graceful fallback si faltan `title`/`logo` en storage (`\|\|` operator) | ✅ |

### 2. `useTheme.ts`

| Aspecto | Estado |
|---------|--------|
| Importa `selectBrandTitle`, `selectBrandLogo`, `setBrandTitle`, `setBrandLogo` | ✅ |
| Expone `title` desde selector | ✅ |
| Expone `logo` desde selector | ✅ |
| `setBrandTitle: (t: string) => dispatch(setBrandTitle(t))` — tipo correcto | ✅ |
| `setBrandLogo: (logo: string \| null) => dispatch(setBrandLogo(logo))` — tipo correcto | ✅ |

### 3. `AppLayout.tsx`

| Aspecto | Estado |
|---------|--------|
| Importa `useTheme` desde `@/hooks/useTheme` | ✅ |
| Destructura `{ title, logo }` correctamente | ✅ |
| Renderizado condicional: `<img>` si hay `logo`, `ShopOutlined` si no | ✅ |
| Usa `{title}` dinámico en lugar de hardcoded "Torque Desktop" | ✅ |
| `className={styles.brandLogo}` — clase existe en CSS | ✅ |
| `className={styles.brandLogoFallback}` — clase existe en CSS | ✅ |

### 4. `ThemeSettingsModal.tsx`

| Aspecto | Estado |
|---------|--------|
| Imports correctos (`Input`, `Upload`, `message`, `UploadOutlined`, `DeleteOutlined`) | ✅ |
| `handleLogoUpload` valida tamaño máximo 500KB | ✅ |
| `handleLogoUpload` valida tipo (PNG/JPG/WebP) | ✅ |
| `handleLogoUpload` retorna `false` (patrón correcto para upload manual) | ✅ |
| `handleRemoveLogo` limpia logo vía `setBrandLogo(null)` | ✅ |
| Sección "Título del header" con Input + maxLength + showCount | ✅ |
| Sección "Logo" con preview, botón eliminar y upload | ✅ |
| Input de título controlado con `value={title}` y `onChange` | ✅ |

### 5. `ThemeSettings.module.css`

| Aspecto | Estado |
|---------|--------|
| `.logoSection` con `flex-direction: column` + `gap` | ✅ |
| `.logoPreviewWrapper` con flex row, gap, padding, border, border-radius | ✅ |
| `.logoPreview` con `height: 48px`, `width: auto`, `max-width: 160px`, `object-fit: contain` | ✅ |
| Usa mismas variables CSS (`--theme-*`) que el resto del modal | ✅ |
| Consistencia visual con el resto de secciones | ✅ |

### 6. `AppLayout.module.css`

| Aspecto | Estado |
|---------|--------|
| `.brandLogo` con `height: 40px`, `width: auto`, `max-width: 160px` | ✅ |
| `.brandLogoFallback` con `font-size: 26px` y color vía variable | ✅ |
| `.brandTitle` con `text-overflow: ellipsis` y `max-width: 280px` | ✅ |
| Versión responsive con tamaños reducidos (768px y 480px) | ✅ |

---

## ❌ Issues Encontrados

### 🔶 Issue 1 — Uso de método `message` estático (4 ocurrencias nuevas)

**Archivo**: `ThemeSettingsModal.tsx` (líneas 48, 53, 60, 68)

```typescript
message.error('El logo no debe superar los 500KB');
message.error('Solo se permiten imágenes PNG, JPG o WebP');
message.success('Logo actualizado correctamente');
message.success('Logo eliminado');
```

**Problema**: El estándar del proyecto (`AGENTS.md` + code-review skill) dicta usar hook-based APIs (`message.useMessage()`). Sin embargo, **el codebase completo tiene 78 ocurrencias** del método estático (VehicleDetail.tsx, VehicleForm.tsx, Appointments.tsx, CashRegister.tsx, etc.). Esta feature sigue la convención existente del proyecto.

**Severidad**: ⚠️ **Baja** — inconsistente con el estándar ideal pero consistente con el resto del código.

### 🔶 Issue 2 — Inline styles menores (2 ocurrencias)

**Archivo**: `ThemeSettingsModal.tsx`

| Línea | Código | Propuesta |
|-------|--------|-----------|
| 79 | `<Modal style={{ top: 16 }}>` | Mover a CSS: `.modalTop { top: 16px; }` |
| 175 | `<Button style={{ flexShrink: 0 }}>` | Mover a CSS: `.deleteBtn { flex-shrink: 0; }` |

**Severidad**: ⚠️ **Baja** — no afectan funcionalidad, ajustes cosméticos menores.

---

## 💡 Recomendaciones

| # | Recomendación | Prioridad |
|---|---------------|-----------|
| 1 | **Migración global a `useMessage()`**: Refactor futuro para migrar las 78+ instancias de `message.*` estático al hook `useMessage()`. Fuera del scope de esta feature. | Media |
| 2 | **Mover inline styles a CSS**: `top: 16` y `flex-shrink: 0` a clases en `ThemeSettings.module.css` | Baja |
| 3 | **Debounce en input de título**: Agregar debounce (~300ms) en `setBrandTitle` para evitar escritura a localStorage en cada keystroke | Baja |
| 4 | **Validar `mode` en `loadThemeFromStorage`**: Asegurar que `mode` sea `'light'` o `'dark'`, no solo que exista la propiedad | Baja |
| 5 | **Preview de header completo**: La sección "Vista previa" actual solo muestra un botón. Podría incluir header simulado con título+logo en futura iteración | Futura |

---

## Compliance Checklist

| Requisito | Estado |
|-----------|--------|
| TypeScript: Sin nuevos `any`; tipos explícitos | ✅ |
| Styles: CSS Modules para estilos locales | ✅ |
| AntD: Uso de componentes AntD (sigue patrón existente) | ✅ |
| React Hooks: Sin nuevos `useEffect` | ✅ |
| Redux: Acciones/selectores correctamente tipados y exportados | ✅ |
| Zero inline styles | ⚠️ 2 excepciones menores documentadas |
| Sin métodos AntD estáticos | ⚠️ Sigue patrón existente del codebase |

---

## Action Items

1. ✅ **Ningún cambio blocking** — los issues son de baja severidad y consistentes con el codebase actual.
2. 💡 Considerar las recomendaciones para mejoras futuras.
3. 📝 Reporte generado en `ai_docs/reports/code_review_2026_06_03_header_customizable.md`.
