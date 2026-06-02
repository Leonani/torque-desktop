# Plan de Migración: Torque Web → Torque Desktop (Electron + SQLite)

**Fecha:** 2026-06-01  
**Autor:** Planificador Técnico  
**Proyecto destino:** `C:\Users\Leo\Documents\Proyectos propios\Torque-desktop`

---

## 1. Resumen

Migrar la aplicación web Torque (React 18 + Express + MongoDB) a una aplicación de escritorio con Electron + SQLite, eliminando todo el sistema de autenticación/usuario. La aplicación empaquetará un servidor Express interno que sirve una API REST a un frontend React (Vite) renderizado en un `BrowserWindow` de Electron. Los datos se almacenan localmente en SQLite mediante `better-sqlite3`. Las fotos se guardan en el sistema de archivos local en lugar de en base64 en la base de datos.

---

## 2. Análisis del Código Existente

### 2.1 Backend (Express + Mongoose)

| Aspecto | Detalle |
|---------|---------|
| **Puerto dev** | 5005 |
| **Middleware de auth** | `middleware/auth.js` — verifica JWT, asigna `req.user.id` |
| **Modelos** | User, Vehicle (con embebidos visits→pagos/notasCredito/inspections/productosAsignados), Product, StockMovement, CashRegister, Owner, Appointment |
| **Routes con auth** | Todas las rutas usan `verifyToken` o `auth` middleware |
| **Dependencias a eliminar** | `mongoose`, `jsonwebtoken`, `bcryptjs`, `nodemailer` |
| **Dependencias a mantener** | `express`, `cors` |
| **Fotos** | Almacenadas como base64 en `visit.photos` (embebido en MongoDB) |

### 2.2 Frontend (React 18 + Vite + Redux Toolkit + Ant Design 6)

| Aspecto | Detalle |
|---------|---------|
| **Puerto dev** | 3005 |
| **Proxy Vite** | `/api` → `http://127.0.0.1:5005` |
| **Auth** | Login.tsx, Register.tsx, ProtectedRoute.tsx, authSlice.ts, token en localStorage, interceptor axios |
| **Redux Store** | authSlice, vehicleSlice, cashRegisterSlice, themeSlice, productApi (RTK Query) |
| **API Calls** | `services/api.ts` (axios con interceptor Bearer token), `services/productApi.ts` (RTK Query) |
| **Theme** | `themeSlice.ts` con modo dark/light y color de acento, persistido en localStorage |
| **Fotos** | `PhotoUpload.tsx` — convierte a base64 con `compressImage` antes de enviar |
| **Páginas protegidas** | Todas menos Login/Register usan `<ProtectedRoute>` |

### 2.3 Patrón de Datos Embebidos (MongoDB → SQLite)

El mayor desafío técnico es la migración de documentos embebidos de MongoDB:

```
Vehicle {
  ownerName, licensePlate, brand, model, year, color, userId
  visits: [{
    fechaIngreso, fechaSalida, total, notas,
    photos: { front, back, left, right, motor, dashboard },
    inspections: [{ sector, items: [{ name, status, needsReplacement, notes }] }],
    productosAsignados: [{ productId, nombreProducto, cantidad, precioVenta, subtotal }],
    servicios: [{ nombre, precio }],
    pagos: [{ metodo, monto, referencia, fechaPago }],
    notasCredito: [{ monto, motivo, fecha }]
  }]
}
```

Para SQLite esto debe normalizarse en tablas separadas con joins.

---

## 3. Plan Detallado de Implementación

### 3.1 Estructura de Directorios

```
Torque-desktop/
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # Entry point: creates BrowserWindow, starts Express
│   │   └── preload.ts                 # Preload script (contextBridge)
│   │
│   ├── backend/                       # Express API server
│   │   ├── index.ts                   # Express app setup, route mounting, server start
│   │   ├── database.ts                # SQLite connection, schema initialization
│   │   ├── schema.ts                  # CREATE TABLE statements
│   │   ├── routes/
│   │   │   ├── vehicles.ts            # CRUD vehicles + visits + pagos + notas-credito
│   │   │   ├── products.ts            # CRUD products + stock entry
│   │   │   ├── stock.ts               # Stock movements + assign/remove from visit
│   │   │   ├── cashRegister.ts        # Open/close/current/history/report
│   │   │   ├── owners.ts              # CRUD owners
│   │   │   └── appointments.ts        # CRUD appointments
│   │   └── middleware/
│   │       └── photoHandler.ts        # Multer config + file system save/delete
│   │
│   └── renderer/                      # React frontend (copied from torque-app/frontend/src)
│       ├── App.tsx                    # MODIFIED: removed auth, removed ProtectedRoute
│       ├── main.tsx                   # Same
│       ├── index.css                  # Same
│       ├── vite-env.d.ts             # Same
│       ├── assets/                    # Same (copied)
│       ├── components/
│       │   ├── AppLayout.tsx          # MODIFIED: removed user menu, removed taller/logo editing
│       │   ├── AppLayout.module.css   # Same
│       │   ├── PhotoUpload.tsx        # MODIFIED: save to file system, not base64 in DB
│       │   ├── ProductDetail/         # Same
│       │   ├── ProductForm/           # Same
│       │   ├── StockList/             # Same
│       │   ├── ThemeSettings/         # Same (keep theme!)
│       │   └── ...                    # REMOVED: ProtectedRoute.tsx
│       ├── data/                      # Same (vehicleBrands.json)
│       ├── hooks/
│       │   ├── useAppDispatch.ts      # Same
│       │   └── useTheme.ts            # Same
│       ├── pages/
│       │   ├── VehicleList.tsx        # Same
│       │   ├── VehicleForm.tsx        # Same
│       │   ├── VehicleDetail.tsx      # Same
│       │   ├── Appointments.tsx       # Same
│       │   ├── StockMovementsReport.tsx # Same
│       │   ├── CashRegister.tsx       # Same
│       │   └── Debts.tsx              # Same
│       │   └── ...                    # REMOVED: Login.tsx, Register.tsx
│       ├── services/
│       │   ├── api.ts                 # MODIFIED: removed token interceptor
│       │   ├── productApi.ts          # MODIFIED: removed token from prepareHeaders
│       │   └── vehicleApi.ts          # Same (local data only)
│       ├── store/
│       │   ├── index.ts               # MODIFIED: removed auth reducer
│       │   ├── vehicleSlice.ts        # Same (but remove userId references)
│       │   ├── cashRegisterSlice.ts   # Same
│       │   └── themeSlice.ts          # Same
│       │   └── ...                    # REMOVED: authSlice.ts
│       ├── styles/                    # Same
│       ├── types/
│       │   └── index.ts               # MODIFIED: remove User, AuthState, make userId optional
│       ├── utils/
│       │   ├── dateValidation.ts      # Same
│       │   ├── helpers.ts             # Same (keep compressImage for photos)
│       │   └── colorUtils.ts          # Same
│       └── __tests__/                 # Same (will need updating)
│
├── resources/                         # App resources
│   └── icon.png                       # App icon for installer
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── electron-builder.yml
└── .gitignore
```

### 3.2 Sistema de Build (Vite + Electron + Express)

Se usará **vite-plugin-electron** para unificar el build. Este plugin permite compilar el main process (Electron + Express) y el preload junto con el renderer (React) en un solo comando Vite.

#### Configuración de `vite.config.ts`:

```typescript
// Concepto de la configuración necesaria
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',        // Main process
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['better-sqlite3', 'express']  // Native modules
            }
          }
        }
      },
      {
        entry: 'src/main/preload.ts',      // Preload
        onstart(options) {
          options.reload()                 // Reload renderer on preload change
        }
      }
    ]),
    renderer(),                            // Enable Node.js in renderer if needed
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      // ... same aliases as before
    }
  },
  server: {
    port: 3005,
    // NO proxy needed - Express will be on a different port internally
  },
  build: {
    outDir: 'dist/renderer',
  }
})
```

#### Flujo Dev:
1. `pnpm dev` → Vite inicia servidor dev en puerto 3005 (React HMR)
2. Vite compila main process y preload con `tsc` / esbuild
3. Electron se inicia, el main process arranca Express en puerto **3456**
4. Express se registra como API interna
5. BrowserWindow carga `http://localhost:3005` (dev) o `file://dist/renderer/index.html` (prod)
6. Frontend apunta a `http://localhost:3456/api/*` para llamadas API

#### Flujo Producción:
1. `pnpm build` → Vite build del renderer, main y preload
2. Salida: `dist/renderer/`, `dist/main/`, `dist/preload.js`
3. `electron-builder` empaqueta todo en instalador
4. App inicia → Electron abre Express en puerto aleatorio localhost → BrowserWindow carga archivos estáticos

### 3.3 Schema SQLite

El diseño transforma documentos embebidos de MongoDB en tablas normalizadas. Las relaciones 1:N se manejan con `vehicle_id` foreign keys.

```sql
-- =============================================
-- TABLAS PRINCIPALES
-- =============================================

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  license_plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  fecha_ingreso TEXT DEFAULT (datetime('now')),
  fecha_salida TEXT,
  total REAL DEFAULT 0,
  notas TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- FOTOS (archivos en sistema de archivos, rutas en DB)
-- =============================================

CREATE TABLE visit_photos (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK(position IN ('front','back','left','right','motor','dashboard')),
  file_path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(visit_id, position)
);

-- =============================================
-- INSPECCIONES (anidadas 2 niveles)
-- =============================================

CREATE TABLE inspection_sectors (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  sector TEXT NOT NULL CHECK(sector IN (
    'lubricantes','distribucion','frenos','iluminacion',
    'interior','trenDelantero','trenTrasero','varios'
  ))
);

CREATE TABLE inspection_items (
  id TEXT PRIMARY KEY,
  sector_id TEXT NOT NULL REFERENCES inspection_sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ok' CHECK(status IN ('ok','revision')),
  needs_replacement INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- =============================================
-- PRODUCTOS ASIGNADOS A VISITAS
-- =============================================

CREATE TABLE assigned_products (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  nombre_producto TEXT NOT NULL,
  cantidad REAL NOT NULL CHECK(cantidad > 0),
  precio_venta REAL NOT NULL CHECK(precio_venta >= 0),
  precio_compra REAL DEFAULT 0,
  subtotal REAL NOT NULL CHECK(subtotal >= 0),
  fecha_asignacion TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- SERVICIOS (array simple)
-- =============================================

CREATE TABLE visit_services (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL CHECK(precio >= 0)
);

-- =============================================
-- PAGOS
-- =============================================

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL CHECK(metodo IN ('efectivo','transferencia','tarjeta_credito','tarjeta_debito')),
  monto REAL NOT NULL CHECK(monto >= 0),
  referencia TEXT DEFAULT '',
  fecha_pago TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- NOTAS DE CRÉDITO
-- =============================================

CREATE TABLE credit_notes (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  monto REAL NOT NULL CHECK(monto > 0),
  motivo TEXT NOT NULL,
  fecha TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- PRODUCTOS / STOCK
-- =============================================

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  nombre_producto TEXT NOT NULL,
  codigo_barra TEXT,
  categoria TEXT,
  subcategoria TEXT,
  cantidad REAL NOT NULL DEFAULT 0 CHECK(cantidad >= 0),
  precio_compra REAL DEFAULT 0,
  precio_venta REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  tipo TEXT NOT NULL CHECK(tipo IN ('entrada','salida')),
  cantidad REAL NOT NULL CHECK(cantidad > 0),
  motivo TEXT NOT NULL CHECK(motivo IN ('compra','ajuste','uso_reparacion','devolucion')),
  referencia_vehiculo_id TEXT REFERENCES vehicles(id),
  precio_venta_aplicado REAL,
  precio_compra_aplicado REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- CAJA
-- =============================================

CREATE TABLE cash_registers (
  id TEXT PRIMARY KEY,
  fecha_apertura TEXT DEFAULT (datetime('now')),
  fecha_cierre TEXT,
  monto_inicial REAL DEFAULT 0,
  monto_final_declarado REAL,
  estado TEXT DEFAULT 'abierta' CHECK(estado IN ('abierta','cerrada')),
  observaciones TEXT DEFAULT '',
  resumen TEXT DEFAULT '{}',  -- JSON string
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- CLIENTES (OWNERS)
-- =============================================

CREATE TABLE owners (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- TURNOS (APPOINTMENTS)
-- =============================================

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT REFERENCES vehicles(id),
  owner_name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  type TEXT DEFAULT 'revision' CHECK(type IN ('revision','mantenimiento','reparacion','otro')),
  notes TEXT,
  status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente','confirmado','completado','cancelado')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX idx_visits_vehicle ON visits(vehicle_id);
CREATE INDEX idx_photos_visit ON visit_photos(visit_id);
CREATE INDEX idx_inspections_visit ON inspection_sectors(visit_id);
CREATE INDEX idx_assigned_products_visit ON assigned_products(visit_id);
CREATE INDEX idx_payments_visit ON payments(visit_id);
CREATE INDEX idx_credit_notes_visit ON credit_notes(visit_id);
CREATE INDEX idx_services_visit ON visit_services(visit_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_products_barcode ON products(codigo_barra);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_vehicles_plate ON vehicles(license_plate);
CREATE INDEX idx_owners_dni ON owners(dni);
```

#### Estrategia de IDs:
- Usar `uuid` (v4) para todos los IDs primarios (en lugar de autoincrement)
- Esto evita conflictos y es más seguro para migraciones futuras
- Alternativa más simple: `crypto.randomUUID()` disponible en Node 19+

### 3.4 Migración del Backend

#### 3.4.1 Archivo `database.ts` — Inicialización de SQLite

```typescript
// Concepto:
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron'; // Solo disponible en main process

const DB_PATH = path.join(app.getPath('userData'), 'torque.db');
const db = new Database(DB_PATH);

// Habilitar WAL mode para mejor concurrencia
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ejecutar schema.sql
export function initializeDatabase(): void { ... }
export default db;
```

#### 3.4.2 Transformación de Cada Ruta

**Principios generales:**
- Eliminar TODO el código de JWT (imports, middleware `verifyToken`, variables `JWT_SECRET`)
- Eliminar toda referencia a `req.userId` y `userId` en queries
- Reemplazar `mongoose` métodos con consultas SQL parametrizadas
- Las consultas que filtran por `userId` simplemente eliminan ese filtro (solo hay un usuario local)
- Cada ruta GET que devuelve un vehículo debe armar la estructura anidada (vehicle → visits → photos/inspections/products/pagos) usando joins múltiples

**Ejemplo concreto: GET /vehicles (lista)**

ANTES (Mongoose):
```javascript
router.get('/', verifyToken, async (req, res) => {
  let query = { userId: req.userId };
  if (search) query.$or = [...];
  const vehicles = await Vehicle.find(query).select({...}).sort({ updatedAt: -1 });
  // post-process...
});
```

DESPUÉS (SQLite):
```typescript
router.get('/', async (req, res) => {
  let sql = `SELECT v.*, 
    (SELECT COUNT(*) FROM visits WHERE vehicle_id = v.id) as visit_count,
    (SELECT fecha_ingreso FROM visits WHERE vehicle_id = v.id ORDER BY fecha_ingreso DESC LIMIT 1) as last_visit_date
    FROM vehicles v WHERE 1=1`;
  
  const params: any[] = [];
  if (search) {
    sql += ` AND (v.owner_name LIKE ? OR v.license_plate LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ` ORDER BY v.updated_at DESC`;
  
  const vehicles = db.prepare(sql).all(...params);
  res.json(vehicles);
});
```

**Ejemplo concreto: GET /vehicles/:id (detalle con visits anidadas)**

Este es el caso más complejo. Se requieren múltiples queries o un approach de "armado en capas":

```typescript
router.get('/:id', async (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json(...);
  
  const visits = db.prepare('SELECT * FROM visits WHERE vehicle_id = ? ORDER BY fecha_ingreso DESC').all(req.params.id);
  
  for (const visit of visits) {
    visit.photos = db.prepare('SELECT position, file_path FROM visit_photos WHERE visit_id = ?').all(visit.id);
    visit.inspections = getInspections(visit.id);
    visit.productosAsignados = db.prepare('SELECT * FROM assigned_products WHERE visit_id = ?').all(visit.id);
    visit.servicios = db.prepare('SELECT * FROM visit_services WHERE visit_id = ?').all(visit.id);
    visit.pagos = db.prepare('SELECT * FROM payments WHERE visit_id = ? ORDER BY fecha_pago').all(visit.id);
    visit.notasCredito = db.prepare('SELECT * FROM credit_notes WHERE visit_id = ? ORDER BY fecha').all(visit.id);
  }
  
  vehicle.visits = visits;
  res.json(vehicle);
});
```

Para optimizar, se puede usar `db.transaction()` para agrupar las lecturas.

#### 3.4.3 Manejo del Middleware de Caja Abierta (`requireCashOpen`)

Eliminar la dependencia de `req.userId`:
```typescript
// ANTES:
const openRegister = await CashRegister.findOne({ userId: req.userId, estado: 'abierta' });
// DESPUÉS:
const openRegister = db.prepare('SELECT * FROM cash_registers WHERE estado = ? LIMIT 1').get('abierta');
```

#### 3.4.4 Ruta de Deudas (/vehicles/debts)

Requiere consultas agregadas con JOINs entre `vehicles`, `visits`, `payments` y `credit_notes`. La lógica de cálculo (total - (pagado - devuelto)) se mantiene igual pero implementada en JavaScript después de obtener los datos.

#### 3.4.5 Reporte de Caja (/cash-register/report)

Similar a deudas: necesita agregar `payments` y `credit_notes` por rango de fechas, más `stock_movements` para compras. La lógica de negocio se mantiene idéntica.

#### 3.4.6 Archivos a ELIMINAR del backend:
- `src/middleware/auth.js` — completo
- `src/routes/auth.js` — completo
- `src/models/User.js` — completo
- `src/config/db.js` — reemplazado por `database.ts`
- `package.json` → eliminar dependencias: `mongoose`, `jsonwebtoken`, `bcryptjs`, `nodemailer`

### 3.5 Adaptación del Frontend

#### 3.5.1 Archivos a ELIMINAR:
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/store/authSlice.ts`

#### 3.5.2 Archivos a MODIFICAR:

**`src/App.tsx` (cambios mayores):**
- Eliminar import de `Login`, `Register`, `ProtectedRoute`
- Eliminar import de `authSlice` (`setUser`)
- Eliminar `useEffect` que restaura sesión desde localStorage
- Eliminar rutas `/login` y `/register`
- Eliminar `<ProtectedRoute>` de todas las rutas
- El layout principal debe cargar directamente sin verificar auth
- Mantener el `BrowserRouter` y `ConfigProvider` (con theme)
- Ruta `/` debe redirigir a `/vehicles` directamente

**`src/components/AppLayout.tsx` (cambios mayores):**
- Eliminar imports de `authSlice`, `logoutUser`, `setUser`
- Eliminar toda la lógica de usuario: menú desplegable con datos de usuario, modal de taller, modal de contraseña, botón de logout
- Simplificar el header: mantener el logo del taller (hardcodeado o con un nombre fijo "Torque Desktop"), toggle de tema, y enlace a settings de apariencia
- Los tabs de navegación se mantienen igual
- Mantener el `ThemeToggle` y `ThemeSettingsModal`

**`src/services/api.ts`:**
- Eliminar el interceptor de axios que agrega `Authorization: Bearer`
- Eliminar funciones de auth: `login`, `register`, `getCurrentUser`
- Cambiar `API_URL` para que apunte a `http://localhost:3456/api` (el puerto de Express interno)
- Mantener todas las demás funciones (vehicles, visits, pagos, owners, appointments, etc.)

**`src/services/productApi.ts`:**
- Eliminar `prepareHeaders` que agrega el token Bearer
- Cambiar `baseUrl` a `http://localhost:3456/api`

**`src/store/index.ts`:**
- Eliminar `authReducer` de la configuración del store
- Eliminar `authSlice` import

**`src/types/index.ts`:**
- Eliminar interfaz `User` (puede mantenerse solo la definición local del taller si es necesario)
- Eliminar interfaz `AuthState`
- Hacer `userId` opcional en `Vehicle`, `Product`, `CashRegister`, etc. (ya no se usa)
- Mantener `ThemeSettings` y configuraciones visuales

**`src/store/vehicleSlice.ts`:**
- Eliminar `userId` de los mapeos de `VehicleListItem` (ya no es relevante)
- La lógica de negocio se mantiene igual

#### 3.5.3 Archivos que NO cambian:
- `pages/VehicleList.tsx`, `VehicleForm.tsx`, `VehicleDetail.tsx`
- `pages/Appointments.tsx`, `CashRegister.tsx`, `Debts.tsx`, `StockMovementsReport.tsx`
- `components/StockList/`, `ProductForm/`, `ProductDetail/`
- `components/ThemeSettings/`
- `hooks/useAppDispatch.ts`, `useTheme.ts`
- `utils/` (helpers, dateValidation, colorUtils)
- `data/vehicleBrands.json`
- `styles/`

#### 3.5.4 Configuración del Store Post-Migración:

```typescript
// store/index.ts (nuevo)
import { configureStore } from '@reduxjs/toolkit';
import vehicleReducer from './vehicleSlice';
import cashRegisterReducer from './cashRegisterSlice';
import themeReducer from './themeSlice';
import { productApi } from '@/services/productApi';

export const store = configureStore({
  reducer: {
    vehicles: vehicleReducer,
    cashRegister: cashRegisterReducer,
    theme: themeReducer,
    [productApi.reducerPath]: productApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productApi.middleware),
});
```

### 3.6 Electron Setup

#### 3.6.1 Main Process (`src/main/index.ts`)

```typescript
// Concepto:
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { startServer } from '../backend/index';

let mainWindow: BrowserWindow | null = null;
let expressPort: number = 3456; // Puerto fijo para desarrollo, variable en prod

async function createWindow() {
  // 1. Iniciar servidor Express
  expressPort = await startServer(expressPort);
  
  // 2. Crear ventana
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  });

  // 3. Cargar contenido
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}
```

#### 3.6.2 Preload (`src/main/preload.ts`)

```typescript
// Mínimo necesario - exponer versión de la app y método para obtener ruta de fotos
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPhotoPath: (filename: string) => ipcRenderer.invoke('get-photo-path', filename),
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url'),
});
```

#### 3.6.3 Comunicación Express ↔ Electron

Estrategia: Express corre dentro del mismo proceso de Node (main process de Electron), escuchando en `localhost:3456`. El frontend React hace fetch a `http://localhost:3456/api/*`.

- **Dev**: Vite sirve React en `localhost:3005`, React hace fetch a `localhost:3456/api`
- **Prod**: Electron carga archivos estáticos, React hace fetch a `localhost:3456/api`

No se necesita IPC complejo ya que Express y React se comunican vía HTTP local. El preload solo expone utilidades menores.

### 3.7 Manejo de Fotos

Estrategia: **Archivos en sistema de archivos + rutas en SQLite**

#### Flujo Actual (web):
1. Usuario selecciona foto → `compressImage()` → base64
2. Base64 se envía en JSON al backend → se almacena en MongoDB (campo `visit.photos`)

#### Flujo Nuevo (desktop):
1. Usuario selecciona foto → `compressImage()` → base64 (se mantiene en frontend)
2. Frontend envía base64 al backend via API (mismo endpoint)
3. Backend recibe base64, **convierte a archivo y lo guarda en disco**
4. Ruta del archivo se almacena en SQLite (`visit_photos.file_path`)
5. Backend devuelve la ruta (o una URL servida por Express estático)
6. Express sirve las imágenes estáticamente desde `app.getPath('userData')/photos/`

#### Directorio de fotos:
```
{app.getPath('userData')}/photos/
  └── {vehicleId}/
      ├── {visitId}_front.jpg
      ├── {visitId}_back.jpg
      ├── {visitId}_left.jpg
      └── ...
```

#### Middleware de fotos (`src/backend/middleware/photoHandler.ts`):

```typescript
// Concepto:
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const PHOTOS_DIR = path.join(app.getPath('userData'), 'photos');

export function savePhoto(base64Data: string, vehicleId: string, visitId: string, position: string): string {
  const dir = path.join(PHOTOS_DIR, vehicleId);
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `${visitId}_${position}.jpg`;
  const filePath = path.join(dir, filename);
  
  // Remover header data:image/jpeg;base64,...
  const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(filePath, data, 'base64');
  
  return filePath; // Ruta relativa o absoluta
}

export function deletePhoto(filePath: string): void {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function getPhotoUrl(filePath: string): string {
  // Servir archivos estáticos con Express
  return `/photos/${path.relative(PHOTOS_DIR, filePath).replace(/\\/g, '/')}`;
}
```

Express debe configurar `app.use('/photos', express.static(PHOTOS_DIR))` para servir las fotos.

#### Modificación del Frontend (`PhotoUpload.tsx`):

Mantener la conversión a base64 (`compressImage`) igual pero:
- El backend ahora devuelve URLs en lugar de almacenar base64 en DB
- Las fotos se muestran con `<img src={photoUrl} />` apuntando a Express
- Al eliminar una foto, se llama al endpoint que borra el archivo y actualiza SQLite

### 3.8 Electron Builder Configuration (`electron-builder.yml`)

```yaml
appId: com.torque.desktop
productName: Torque Desktop
copyright: Copyright © 2024

directories:
  buildResources: resources
  output: release

files:
  - dist/**/*
  - package.json
  - "!node_modules/**/*"
  
# Incluir módulos nativos de better-sqlite3
asar: true
asarUnpack:
  - "**/*.node"
  - "node_modules/better-sqlite3/**"

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: resources/icon.ico

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  license: LICENSE
  createDesktopShortcut: true
  shortcutName: Torque Desktop

extraResources:
  - from: resources/
    to: resources/
    filter:
      - "**/*"

# Rebuild better-sqlite3 para Electron
nodeGypRebuild: false
npmRebuild: true
buildDependenciesFromSource: true
```

**Nota importante**: `better-sqlite3` es un módulo nativo que necesita ser recompilado para la versión de Node.js que usa Electron. Se debe usar `electron-rebuild` o la integración de `electron-builder`.

### 3.9 Dependencias Completas

#### `package.json` (dependencias principales):

```jsonc
{
  "name": "torque-desktop",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite",
    "electron:build": "vite build && electron-builder",
    "electron:build:win": "vite build && electron-builder --win",
    "postinstall": "electron-builder install-app-deps",
    "lint": "eslint ."
  },
  "dependencies": {
    // --- Frontend (React) ---
    "@ant-design/icons": "^6.1.0",
    "@reduxjs/toolkit": "^2.11.2",
    "antd": "^6.3.0",
    "axios": "^1.13.5",
    "dayjs": "^1.11.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-redux": "^9.2.0",
    "react-router-dom": "^6.30.3",
    "xlsx": "^0.18.5",
    
    // --- Backend (Express) ---
    "better-sqlite3": "^11.x",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "uuid": "^10.x"
  },
  "devDependencies": {
    // --- Build ---
    "electron": "^32.x",
    "electron-builder": "^25.x",
    "vite": "^5.4.0",
    "vite-plugin-electron": "^0.28.x",
    "vite-plugin-electron-renderer": "^0.14.x",
    "@vitejs/plugin-react": "^4.3.4",
    
    // --- TypeScript ---
    "typescript": "~5.9.3",
    "@types/node": "^24.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "@types/better-sqlite3": "^7.x",
    "@types/cors": "^2.x",
    "@types/uuid": "^10.x",
    "@types/multer": "^1.x",
    
    // --- Linting / Testing ---
    "eslint": "^9.x",
    "vitest": "^2.x",
    "vitest-browser-react": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x"
  }
}
```

**Dependencias ELIMINADAS respecto al backend original:**
- `mongoose` → reemplazado por `better-sqlite3`
- `jsonwebtoken` → ya no necesario (sin auth)
- `bcryptjs` → ya no necesario (sin auth)
- `nodemailer` → ya no necesario (sin registro de usuario)
- `dotenv` → reemplazado por configuración de Electron
- `nodemon` → ya no necesario en dev (Vite maneja HMR)

### 3.10 Orden de Implementación (20 pasos)

#### Fase 1: Proyecto Base (días 1-2)

| Paso | Acción | Archivos involucrados |
|------|--------|----------------------|
| **1** | Crear directorio `Torque-desktop/` e inicializar `package.json` con `pnpm init` | `package.json` |
| **2** | Instalar dependencias base: Electron, Vite, TypeScript, React, Ant Design, Redux Toolkit | `package.json`, `pnpm-lock.yaml` |
| **3** | Configurar `vite.config.ts` con `vite-plugin-electron` y aliases de ruta | `vite.config.ts` |
| **4** | Configurar `tsconfig.json` (base, node, web) con paths | `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json` |
| **5** | Crear estructura de directorios vacía | `src/main/`, `src/backend/`, `src/renderer/` |

#### Fase 2: Backend SQLite (días 3-5)

| Paso | Acción | Archivos involucrados |
|------|--------|----------------------|
| **6** | Implementar `database.ts`: inicializar SQLite con WAL mode y foreign keys | `src/backend/database.ts` |
| **7** | Implementar `schema.ts` con todas las CREATE TABLE y CREATE INDEX | `src/backend/schema.ts` |
| **8** | Migrar ruta `vehicles.ts` (CRUD + visits + pagos + notas-credito + debts) | `src/backend/routes/vehicles.ts` |
| **9** | Migrar ruta `products.ts` (CRUD + stock entry) | `src/backend/routes/products.ts` |
| **10** | Migrar ruta `stock.ts` (movements + assign/remove product from visit) | `src/backend/routes/stock.ts` |
| **11** | Migrar ruta `cashRegister.ts` (open/close/current/history/report) | `src/backend/routes/cashRegister.ts` |
| **12** | Migrar rutas `owners.ts` y `appointments.ts` | `src/backend/routes/owners.ts`, `appointments.ts` |
| **13** | Implementar `backend/index.ts`: montar Express, CORS, rutas, middleware de fotos, static serving | `src/backend/index.ts` |
| **14** | Implementar `photoHandler.ts`: guardar/eliminar/servir fotos en sistema de archivos | `src/backend/middleware/photoHandler.ts` |

#### Fase 3: Frontend Adaptado (días 6-7)

| Paso | Acción | Archivos involucrados |
|------|--------|----------------------|
| **15** | Copiar `src/` de frontend original a `src/renderer/`, eliminar Login/Register/ProtectedRoute/authSlice | Múltiples archivos (ver sección 3.5.1) |
| **16** | Modificar `App.tsx`: eliminar rutas de auth y ProtectedRoute, ajustar layout | `src/renderer/App.tsx` |
| **17** | Modificar `AppLayout.tsx`: eliminar menú de usuario, modal de taller, modal de password | `src/renderer/components/AppLayout.tsx` |
| **18** | Modificar `api.ts` y `productApi.ts`: eliminar token interceptor, cambiar URL base | `src/renderer/services/api.ts`, `productApi.ts` |
| **19** | Modificar `store/index.ts`: eliminar authReducer | `src/renderer/store/index.ts` |
| **20** | Modificar `types/index.ts`: eliminar User/AuthState, opcional userId | `src/renderer/types/index.ts` |

#### Fase 4: Electron + Integración (días 8-9)

| Paso | Acción | Archivos involucrados |
|------|--------|----------------------|
| **21** | Implementar `main/index.ts`: crear BrowserWindow, iniciar Express, manejar lifecycle | `src/main/index.ts` |
| **22** | Implementar `main/preload.ts`: exponer API base URL y utilidades vía contextBridge | `src/main/preload.ts` |
| **23** | Configurar `electron-builder.yml` con NSIS, native module rebuild, icono | `electron-builder.yml` |
| **24** | Probar flujo dev: `pnpm dev` → Vite + Electron + Express funcionando juntos | — |
| **25** | Probar build prod: `pnpm electron:build` → instalador funcional | — |

#### Fase 5: Testing y Polishing (días 10-11)

| Paso | Acción |
|------|--------|
| **26** | Verificar que todas las rutas API funcionan correctamente con SQLite |
| **27** | Verificar que las fotos se guardan/leen correctamente del sistema de archivos |
| **28** | Verificar que no hay referencias a `mongoose`, `jwt`, `bcryptjs` en el código |
| **29** | Verificar que el tema (dark/light) persiste entre reinicios de la app |
| **30** | Probar instalador en máquina limpia (sin Node.js, npm, etc.) |

---

## 4. Impacto Detallado (Archivos Afectados)

### 4.1 Archivos CREADOS (nuevos en Torque-desktop)

| Archivo | Propósito |
|---------|-----------|
| `src/main/index.ts` | Main process de Electron + inicio de Express |
| `src/main/preload.ts` | Preload script con contextBridge |
| `src/backend/index.ts` | Configuración de Express, CORS, rutas |
| `src/backend/database.ts` | Conexión SQLite + inicialización |
| `src/backend/schema.ts` | Definiciones CREATE TABLE |
| `src/backend/middleware/photoHandler.ts` | Gestión de fotos en sistema de archivos |
| `src/backend/routes/vehicles.ts` | **Reescrito** sin auth, con SQLite |
| `src/backend/routes/products.ts` | **Reescrito** sin auth, con SQLite |
| `src/backend/routes/stock.ts` | **Reescrito** sin auth, con SQLite |
| `src/backend/routes/cashRegister.ts` | **Reescrito** sin auth, con SQLite |
| `src/backend/routes/owners.ts` | **Reescrito** sin auth, con SQLite |
| `src/backend/routes/appointments.ts` | **Reescrito** sin auth, con SQLite |
| `electron-builder.yml` | Configuración de empaquetado |
| `resources/icon.png` / `icon.ico` | Icono de la aplicación |

### 4.2 Archivos COPIADOS del frontend original (sin cambios)

| Archivo | Ruta origen (torque-app/frontend) |
|---------|-----------------------------------|
| `pages/VehicleList.tsx` | `src/pages/VehicleList.tsx` |
| `pages/VehicleForm.tsx` | `src/pages/VehicleForm.tsx` |
| `pages/VehicleDetail.tsx` | `src/pages/VehicleDetail.tsx` |
| `pages/Appointments.tsx` | `src/pages/Appointments.tsx` |
| `pages/CashRegister.tsx` | `src/pages/CashRegister.tsx` |
| `pages/Debts.tsx` | `src/pages/Debts.tsx` |
| `pages/StockMovementsReport.tsx` | `src/pages/StockMovementsReport.tsx` |
| `components/StockList/*` | `src/components/StockList/*` |
| `components/ProductForm/*` | `src/components/ProductForm/*` |
| `components/ProductDetail/*` | `src/components/ProductDetail/*` |
| `components/ThemeSettings/*` | `src/components/ThemeSettings/*` |
| `components/InspectionSectorCard.tsx` | `src/components/InspectionSectorCard.tsx` |
| `components/NavigationLoader.tsx` | `src/components/NavigationLoader.tsx` |
| `hooks/useAppDispatch.ts` | `src/hooks/useAppDispatch.ts` |
| `hooks/useTheme.ts` | `src/hooks/useTheme.ts` |
| `utils/*` | `src/utils/*` |
| `data/*` | `src/data/*` |
| `styles/*` | `src/styles/*` |
| `__tests__/*` | `src/__tests__/*` |
| `assets/*` | `src/assets/*` |

### 4.3 Archivos MODIFICADOS

| Archivo (destino) | Cambios |
|-------------------|---------|
| `src/renderer/App.tsx` | Eliminar Login/Register/ProtectedRoute; eliminar lógica de restauración de sesión |
| `src/renderer/main.tsx` | Sin cambios (solo cambiar ruta de import si App se mueve) |
| `src/renderer/components/AppLayout.tsx` | Eliminar menú de usuario, modal taller, modal password, botón logout |
| `src/renderer/components/PhotoUpload.tsx` | Adaptar para trabajar con URLs de fotos servidas por Express |
| `src/renderer/services/api.ts` | Eliminar funciones auth; eliminar interceptor token; cambiar API_URL |
| `src/renderer/services/productApi.ts` | Eliminar prepareHeaders token; cambiar baseUrl |
| `src/renderer/store/index.ts` | Eliminar authReducer del store |
| `src/renderer/store/vehicleSlice.ts` | Eliminar referencias a userId en mapeos |
| `src/renderer/types/index.ts` | Eliminar User, AuthState; userId opcional |

### 4.4 Archivos ELIMINADOS

| Archivo | Razón |
|---------|-------|
| `src/renderer/pages/Login.tsx` | Sin autenticación |
| `src/renderer/pages/Register.tsx` | Sin autenticación |
| `src/renderer/components/ProtectedRoute.tsx` | Sin autenticación |
| `src/renderer/store/authSlice.ts` | Sin autenticación |
| `src/backend/middleware/auth.js` | Sin JWT |
| `src/backend/routes/auth.js` | Sin autenticación |
| `src/config/db.js` | Reemplazado por database.ts |
| `src/models/User.js` | Sin modelo de usuario |

---

## 5. Plan de Verificación

### 5.1 Pruebas de Integración Backend (SQLite)

1. **CRUD Vehículos**: Crear vehículo con visita inicial → verificar que se insertan registros en `vehicles`, `visits`, y tablas relacionadas
2. **Asignar producto a visita**: Verificar que descuenta stock y crea `stock_movements`
3. **Pagos**: Registrar pago → verificar `payments` y recálculo de deuda
4. **Caja**: Abrir → registrar pagos → cerrar → verificar resumen
5. **Transaccionalidad**: Verificar que operaciones multi-tabla usan `db.transaction()` (rollback en error)
6. **Fotos**: Subir foto → verificar archivo en disco → verificar registro en `visit_photos`

### 5.2 Pruebas Frontend

1. **Navegación**: Sin auth, todas las rutas deben ser accesibles directamente
2. **Tema**: Dark/light mode persiste al cerrar y reabrir la app
3. **API Connection**: Frontend se conecta correctamente a Express en `localhost:3456`
4. **Fotos**: Visualización correcta de imágenes servidas por Express estático

### 5.3 Pruebas Electron

1. **Inicio**: App inicia sin errores, ventana se muestra correctamente
2. **Express**: API responde en puerto local, visible desde el frontend
3. **Instalador**: Se instala correctamente en máquina limpia (sin Node.js)
4. **Persistencia**: Datos sobreviven al reinicio de la app
5. **Cierre**: App se cierra limpiamente (Express detiene, DB cierra conexión)

### 5.4 Linting y TypeScript

- Ejecutar `pnpm lint` — sin errores
- Ejecutar `tsc --noEmit` — sin errores de tipos
- Verificar que no hay imports de `mongoose`, `jsonwebtoken`, `bcryptjs`, `nodemailer`
- Verificar que no hay referencias a `localStorage.getItem('token')`

---

## 6. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `better-sqlite3` no compila para Electron | Alto | Usar `electron-rebuild` o `@electron/rebuild` en postinstall; verificar compatibilidad de versiones |
| Rendimiento de joins múltiples en vehicles/:id | Medio | Implementar caché simple o usar transacciones para batch reads |
| Migración de datos desde MongoDB a SQLite | Medio | Crear script de migración one-time que lea MongoDB y escriba en SQLite |
| Paths de fotos rotos al mover la app | Bajo | Usar paths relativos al `userData` directory |
| Window management (minimizar a bandeja, etc.) | Bajo | Implementar solo si es necesario en fase 2 |
| Conflictos de puerto (3456 ocupado) | Bajo | Implementar detección de puerto libre con fallback |

---

## 7. Notas Adicionales

- **Migración de datos**: El plan no incluye migración automática de MongoDB a SQLite. Si se necesita migrar datos existentes, se debe crear un script separado que lea de MongoDB y escriba en SQLite, ejecutable desde la app o como herramienta CLI.
- **Multi-usuario**: La app está diseñada para un solo usuario local. Si en el futuro se necesita multi-usuario, se requeriría re-implementar auth y sincronización.
- **Backups**: Se recomienda implementar una función de exportación/backup de la base de datos SQLite (simple copia del archivo `.db`).
- **Actualizaciones**: electron-builder soporta autoUpdater. Se puede implementar en una fase posterior.
- **Icono**: Se necesita un icono `.ico` (Windows) y `.png` (para resources). Se puede generar con herramientas online o usar el logo existente.
