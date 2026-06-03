# Manual de Uso — Torque Desktop

**Versión:** 1.1.0  
**Sistema:** Windows (64 bits)  
**Última actualización:** Junio 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Instalación](#2-instalación)
3. [Primeros pasos](#3-primeros-pasos)
4. [Módulo: Recepción de Vehículos](#4-módulo-recepción-de-vehículos)
5. [Módulo: Turnos](#5-módulo-turnos)
6. [Módulo: Stock de Productos](#6-módulo-stock-de-productos)
7. [Módulo: Caja](#7-módulo-caja)
8. [Módulo: Deudas](#8-módulo-deudas)
9. [Personalización de la Apariencia](#9-personalización-de-la-apariencia)
10. [Actualizaciones](#10-actualizaciones)
11. [Solución de problemas](#11-solución-de-problemas)

---

## 1. Introducción

**Torque Desktop** es un sistema de gestión integral para talleres mecánicos. Permite administrar vehículos, turnos, stock de productos, caja registradora y deudas, todo en una aplicación de escritorio que funciona sin conexión a internet.

### Funcionalidades principales

| Módulo | Descripción |
|--------|-------------|
| 🚗 **Recepción de Vehículos** | Registrar vehículos, crear visitas, inspecciones, asignar productos y servicios, registrar pagos |
| 📅 **Turnos** | Gestionar citas de clientes con calendario |
| 📦 **Stock de Productos** | Control de inventario con movimientos de entrada/salida |
| 💰 **Caja** | Apertura y cierre de caja diaria con control de ingresos/egresos |
| 📋 **Deudas** | Vista rápida de visitas con saldo pendiente |

---

## 2. Instalación

### Requisitos del sistema

- **Sistema operativo:** Windows 10 u 11 (64 bits)
- **Espacio en disco:** Mínimo 500 MB
- **Memoria RAM:** Mínimo 4 GB

### Instalación desde cero

1. Descargá el instalador desde la [página de releases](https://github.com/Leonani/torque-desktop/releases) (archivo `Torque-Desktop-Setup-1.0.9.exe`)
2. Ejecutá el instalador y seguí los pasos:
   - Elegí la carpeta de instalación (o dejá la predeterminada)
   - Marcá "Crear acceso directo en el escritorio" si querés
3. Al finalizar, la aplicación se inicia automáticamente

### Actualización desde una versión anterior

Si ya tenés Torque Desktop instalado, la aplicación **detectará automáticamente** las actualizaciones disponibles y te notificará. Simplemente seguí las instrucciones en pantalla para descargar e instalar la nueva versión.

> **Nota:** Si preferís hacer una instalación limpia, desinstalá la versión anterior desde "Agregar o quitar programas" de Windows antes de instalar la nueva.

---

## 3. Primeros pasos

### Pantalla principal

Al abrir la aplicación, verás:

```
┌──────────────────────────────────────────────────────────┐
│  🏪 Torque Desktop                    🌙 ⚙️             │
├──────────────────────────────────────────────────────────┤
│  [Recepción]  [Turnos]  [Stock]  [Caja]  [Deudas]       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│               ← Contenido del módulo activo →           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

| Elemento | Descripción |
|----------|-------------|
| **Header** | Muestra el título y logo del taller (personalizables) |
| **Pestañas de navegación** | Cambian entre los 5 módulos principales |
| **🌙 / ☀️** | Cambia entre modo oscuro y claro |
| **⚙️** | Abre el panel de personalización |

---

## 4. Módulo: Recepción de Vehículos

### Lista de vehículos

Al entrar al módulo, ves una tabla con todos los vehículos registrados. Podés:

- **🔍 Buscar**: por nombre del propietario o patente
- **🔽 Filtrar**: por marca, modelo o año
- **➕ Nuevo vehículo**: botón verde para agregar
- **👁️ Ver detalle**: hace clic en un vehículo para ver sus visitas
- **✏️ Editar**: modificar datos del vehículo
- **🗑️ Eliminar**: borrar un vehículo (y todas sus visitas asociadas)

### Formulario de vehículo

Campos disponibles:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| Nombre del propietario | ✅ Sí | Nombre y apellido |
| Patente | ✅ Sí | Ej: `ABC123` o `AB123CD` |
| Marca | ✅ Sí | Seleccionar del listado |
| Modelo | ✅ Sí | Texto libre |
| Año | ✅ Sí | Número de 4 dígitos |
| Color | No | Texto libre |
| Teléfono | No | Número de contacto |
| Email | No | Correo electrónico |

### Detalle del vehículo (visitas)

Al seleccionar un vehículo, accedés al historial completo de visitas. Cada visita representa una ocasión en que el vehículo ingresó al taller.

#### Crear una visita

Dentro del detalle del vehículo, botón **"Nueva visita"** → se abre un modal con:

1. **Pestaña: Información general**
   - Fecha de ingreso (automática)
   - Notas / descripción del trabajo

2. **Pestaña: Fotos del vehículo** (opcional)
   - Capturar o subir fotos desde 6 ángulos:
     - Frente, Trasera, Lateral izquierdo, Lateral derecho, Motor, Tablero
   - Las fotos se guardan localmente

3. **Pestaña: Inspección** (opcional)
   - Revisión por sectores: Lubricantes, Distribución, Frenos, Iluminación, Interior, Tren delantero, Tren trasero, Varios
   - Cada ítem se marca como: ✅ OK / ⚠️ Revisar / 🔧 Reemplazar
   - Se pueden agregar notas por ítem

4. **Pestaña: Productos y servicios**
   - **Productos**: buscá y seleccioná productos del stock. Se descuenta automáticamente del inventario.
   - **Servicios**: agregá servicios con nombre y precio (ej: "Mano de obra", "Alineación")

5. **Pestaña: Total y pago**
   - Muestra el total calculado (productos + servicios)
   - Botón **"Agregar pago"**: registrá pagos parciales o totales
   - Métodos de pago: Efectivo, Transferencia, Tarjeta de crédito, Tarjeta de débito
   - Si hay saldo pendiente, la visita queda como "deudora"

#### Visitas existentes

Cada visita en el listado muestra:
- Fecha de ingreso
- Total
- Saldo pendiente (si corresponde)
- Indicador visual: ✅ Pagado / ⚠️ Adeuda

Podés:
- **👁️ Ver detalle** de la visita
- **✏️ Editar** productos, servicios o fotos
- **🗑️ Eliminar** la visita

---

## 5. Módulo: Turnos

### Vista de calendario

El módulo de turnos muestra un calendario mensual con las citas programadas.

### Agendar un turno

1. Hacé clic en el día deseado o en el botón **"Nuevo turno"**
2. Completá los datos:
   - Nombre del propietario
   - Patente
   - Marca y modelo
   - Fecha y hora
   - Duración estimada (en minutos, default: 60)
   - Tipo de servicio: Revisión / Mantenimiento / Reparación / Otro
   - Notas adicionales (opcional)
3. Guardar → el turno aparece en el calendario

### Estados del turno

| Estado | Descripción |
|--------|-------------|
| 🟡 Pendiente | Turno programado, aún no confirmado |
| 🟢 Confirmado | Cliente confirmó asistencia |
| ✅ Completado | El vehículo ya fue atendido |
| ❌ Cancelado | Turno cancelado |

### Acciones

- **✏️ Editar**: modificar fecha, hora o datos del turno
- **🗑️ Eliminar**: cancelar el turno
- Desde el detalle del vehículo, podés crear una visita directamente desde un turno completado

---

## 6. Módulo: Stock de Productos

### Lista de productos

Tabla con todos los productos del inventario. Mostrando:

| Columna | Descripción |
|---------|-------------|
| Producto | Nombre del producto |
| Código de barra | Código (si tiene) |
| Categoría | Clasificación del producto |
| Cantidad | Stock actual |
| Precio compra | Último precio de compra |
| Precio venta | Precio de venta al público |

Podés:
- **🔍 Buscar**: por nombre o código de barra
- **🔽 Filtrar**: por categoría, o marcar "Stock bajo" (cantidad ≤ 5)
- **➕ Nuevo producto**: agregar un producto
- **📄 Ver detalle**: historial completo del producto
- **✏️ Editar**: modificar precio, cantidad, etc.
- **🗑️ Eliminar**: quitar producto

### Formulario de producto

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| Nombre del producto | ✅ Sí | Nombre descriptivo |
| Código de barra | No | Para búsqueda rápida |
| Categoría | No | Clasificación |
| Subcategoría | No | Clasificación secundaria |
| Cantidad | ✅ Sí | Stock inicial |
| Precio de compra | No | Costo unitario |
| Precio de venta | ✅ Sí | Precio final |

### Movimientos de stock

En el detalle del producto, ves el historial completo de movimientos:

| Tipo | Descripción |
|------|-------------|
| 📥 **Entrada** | Compra de stock, devolución |
| 📤 **Salida** | Uso en reparación, ajuste |
| 🔄 **Ajuste** | Corrección manual de inventario |

### Reporte de movimientos

En la pestaña **"Reporte de movimientos"** podés:
- Ver todos los movimientos de stock en un período
- Filtrar por producto, tipo (entrada/salida) o motivo
- Exportar a Excel 📊

---

## 7. Módulo: Caja

### Estado de la caja

El módulo muestra si la caja está **abierta** o **cerrada**.

### Abrir caja

Al comenzar la jornada:
1. Ingresá el **monto inicial** (plata que hay en la caja al abrir)
2. La caja queda en estado "Abierta"

### Operaciones del día

Con la caja abierta, registrás:

| Operación | Descripción |
|-----------|-------------|
| 💵 **Ingreso** | Dinero que ingresa (ej: cobro de servicios) |
| 💸 **Egreso** | Dinero que sale (ej: compras, gastos) |
| 📊 **Resumen automático** | La app calcula totales |

### Cerrar caja

Al finalizar la jornada:
1. Ingresá el **monto final declarado** (plata real en caja)
2. La app muestra un resumen comparando:
   - Monto esperado vs. monto declarado
   - Diferencia (sobrante o faltante)
3. Confirmar → la caja se cierra y se guarda el resumen

### Historial

Podés ver todas las cajas anteriores (cerradas) con sus resúmenes.

---

## 8. Módulo: Deudas

### Vista rápida

Lista todas las visitas que tienen **saldo pendiente**. Muestra:

| Columna | Descripción |
|---------|-------------|
| Cliente | Nombre del propietario |
| Patente | Patente del vehículo |
| Fecha | Fecha de ingreso |
| Total | Monto total de la visita |
| Pagado | Monto ya abonado |
| Deuda | Saldo pendiente |
| Antigüedad | Días desde el ingreso |

### Acciones

- **👁️ Ver detalle**: ir al detalle de la visita para registrar un pago
- Los pagos registrados actualizan automáticamente el saldo pendiente

---

## 9. Personalización de la Apariencia

Hacé clic en **⚙️** (engranaje) en la esquina superior derecha para abrir el panel de personalización.

### Opciones disponibles

| Sección | Descripción |
|---------|-------------|
| 🌗 **Modo de visualización** | Alternar entre modo claro y oscuro |
| 🔵 **Colores rápidos** | Azul, Rojo o Verde (cambia el color principal) |
| 🎨 **Color personalizado** | Cualquier color usando el selector |
| ✏️ **Título del header** | Cambiá el texto "Torque Desktop" por el nombre de tu taller |
| 🖼️ **Logo** | Subí una imagen (PNG, JPG o WebP, máx 500KB) que reemplazará el ícono |
| 👁️ **Vista previa** | Mostrá cómo quedan los colores elegidos |

> Los cambios se guardan automáticamente y persisten al cerrar la app.

### Restablecer

El botón **"Restablecer"** vuelve todos los valores a sus defaults:
- Modo claro
- Color azul
- Título: "Torque Desktop"
- Logo: ninguno

---

## 10. Actualizaciones

### Actualización automática

Torque Desktop verifica automáticamente si hay actualizaciones al iniciar. Si encuentra una versión nueva:

1. Aparece un banner en la parte superior
2. Hacé clic en **"Descargar ahora"**
3. La descarga progresa en segundo plano
4. Cuando termina, hacé clic en **"Reiniciar e instalar"**
5. La app se cierra, instala la actualización y vuelve a abrirse

### Actualización manual

También podés descargar la última versión desde:
[https://github.com/Leonani/torque-desktop/releases](https://github.com/Leonani/torque-desktop/releases)

---

## 11. Solución de problemas

### La app no abre / pantalla en blanco

1. Desinstalá la versión actual desde "Agregar o quitar programas"
2. Descargá la última versión desde [GitHub Releases](https://github.com/Leonani/torque-desktop/releases)
3. Instalá de nuevo

### Error de base de datos

La base de datos se almacena en:
```
%APPDATA%/torque-desktop/data/
```

Si hay problemas con la base de datos:
1. Cerrá la aplicación
2. Respaldá la carpeta `data` 
3. Borrá el contenido de `%APPDATA%/torque-desktop/data/`
4. Reiniciá la app (se crea una base de datos nueva)

### No se ven las actualizaciones

- Verificá que tengas conexión a internet al iniciar la app
- Podés forzar la verificación desde el banner de actualizaciones
- Si el problema persiste, descargá manualmente desde [GitHub Releases](https://github.com/Leonani/torque-desktop/releases)

### Las fotos no se muestran

Las fotos se guardan en:
```
%APPDATA%/torque-desktop/photos/
```

Si migraste la app de un equipo a otro, acordate de copiar esta carpeta también.

---

## Información técnica

| Dato | Valor |
|------|-------|
| Base de datos | SQLite (local, no requiere servidor) |
| API local | `http://localhost:3456` |
| Puerto alternativo | 3457 (si el 3456 está ocupado) |
| Datos de usuario | `%APPDATA%/torque-desktop/` |
| Logs de depuración | `%APPDATA%/torque-desktop/torque-debug.log` |
| Tecnología | Electron + React + Ant Design |

---

¿Dudas o sugerencias? Abrí un issue en [GitHub](https://github.com/Leonani/torque-desktop/issues) o contactá al desarrollador.
