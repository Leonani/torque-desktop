/**
 * Inicializa el esquema de la base de datos SQLite
 * Crea todas las tablas e índices necesarios para Torque Desktop
 */
export function initializeSchema(db: { exec: (sql: string) => void }): void {
  db.exec(`
    -- Vehículos
    CREATE TABLE IF NOT EXISTS vehicles (
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

    CREATE INDEX IF NOT EXISTS idx_vehicles_owner_name ON vehicles(owner_name);
    CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
    CREATE INDEX IF NOT EXISTS idx_vehicles_updated_at ON vehicles(updated_at);

    -- Visitas
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      fecha_ingreso TEXT DEFAULT (datetime('now')),
      fecha_salida TEXT,
      total REAL DEFAULT 0,
      notas TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_visits_vehicle_id ON visits(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_visits_fecha_ingreso ON visits(fecha_ingreso);

    -- Fotos de visita
    CREATE TABLE IF NOT EXISTS visit_photos (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      position TEXT NOT NULL CHECK (position IN ('front','back','left','right','motor','dashboard')),
      file_path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(visit_id, position)
    );

    CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_id ON visit_photos(visit_id);

    -- Sectores de inspección
    CREATE TABLE IF NOT EXISTS inspection_sectors (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      sector TEXT NOT NULL CHECK (sector IN ('lubricantes','distribucion','frenos','iluminacion','interior','trenDelantero','trenTrasero','varios'))
    );

    CREATE INDEX IF NOT EXISTS idx_inspection_sectors_visit_id ON inspection_sectors(visit_id);

    -- Items de inspección
    CREATE TABLE IF NOT EXISTS inspection_items (
      id TEXT PRIMARY KEY,
      sector_id TEXT NOT NULL REFERENCES inspection_sectors(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'ok' CHECK (status IN ('ok','revision')),
      needs_replacement INTEGER DEFAULT 0,
      notes TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_inspection_items_sector_id ON inspection_items(sector_id);

    -- Productos asignados a visitas
    CREATE TABLE IF NOT EXISTS assigned_products (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      nombre_producto TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_venta REAL NOT NULL,
      precio_compra REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      fecha_asignacion TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_assigned_products_visit_id ON assigned_products(visit_id);
    CREATE INDEX IF NOT EXISTS idx_assigned_products_product_id ON assigned_products(product_id);

    -- Servicios de visita
    CREATE TABLE IF NOT EXISTS visit_services (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_visit_services_visit_id ON visit_services(visit_id);

    -- Pagos
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      metodo TEXT NOT NULL CHECK (metodo IN ('efectivo','transferencia','tarjeta_credito','tarjeta_debito')),
      monto REAL NOT NULL,
      referencia TEXT DEFAULT '',
      fecha_pago TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_visit_id ON payments(visit_id);
    CREATE INDEX IF NOT EXISTS idx_payments_fecha_pago ON payments(fecha_pago);

    -- Notas de crédito
    CREATE TABLE IF NOT EXISTS credit_notes (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      monto REAL NOT NULL,
      motivo TEXT NOT NULL,
      fecha TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_credit_notes_visit_id ON credit_notes(visit_id);

    -- Productos (inventario)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      nombre_producto TEXT NOT NULL,
      codigo_barra TEXT,
      categoria TEXT,
      subcategoria TEXT,
      cantidad REAL NOT NULL DEFAULT 0,
      precio_compra REAL DEFAULT 0,
      precio_venta REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_nombre ON products(nombre_producto);
    CREATE INDEX IF NOT EXISTS idx_products_codigo_barra ON products(codigo_barra);
    CREATE INDEX IF NOT EXISTS idx_products_categoria ON products(categoria);

    -- Movimientos de stock
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      tipo TEXT NOT NULL CHECK (tipo IN ('entrada','salida')),
      cantidad REAL NOT NULL,
      motivo TEXT NOT NULL CHECK (motivo IN ('compra','ajuste','uso_reparacion','devolucion')),
      referencia_vehiculo_id TEXT REFERENCES vehicles(id),
      precio_venta_aplicado REAL,
      precio_compra_aplicado REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_tipo ON stock_movements(tipo);

    -- Caja registradora
    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      fecha_apertura TEXT DEFAULT (datetime('now')),
      fecha_cierre TEXT,
      monto_inicial REAL DEFAULT 0,
      monto_final_declarado REAL,
      estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
      observaciones TEXT DEFAULT '',
      resumen TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cash_registers_estado ON cash_registers(estado);
    CREATE INDEX IF NOT EXISTS idx_cash_registers_fecha_apertura ON cash_registers(fecha_apertura);

    -- Propietarios
    CREATE TABLE IF NOT EXISTS owners (
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

    CREATE INDEX IF NOT EXISTS idx_owners_nombre ON owners(nombre);
    CREATE INDEX IF NOT EXISTS idx_owners_apellido ON owners(apellido);
    CREATE INDEX IF NOT EXISTS idx_owners_dni ON owners(dni);

    -- Turnos / Citas
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT REFERENCES vehicles(id),
      owner_name TEXT NOT NULL,
      license_plate TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      type TEXT DEFAULT 'revision' CHECK (type IN ('revision','mantenimiento','reparacion','otro')),
      notes TEXT,
      status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmado','completado','cancelado')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_id ON appointments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

    -- Configuración del taller (key-value para persistir datos del taller)
    CREATE TABLE IF NOT EXISTS workshop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Categorías de productos
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

    -- Subcategorías de productos
    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(category_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
  `);
}

/**
 * Inserta las categorías y subcategorías por defecto si no existen
 * Se ejecuta después de la creación del esquema
 */
export function seedCategories(db: { exec: (sql: string) => void }): void {
  // Usar INSERT OR IGNORE para evitar duplicados en reinicios
  db.exec(`
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat_filtros', 'Filtros');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat_repuestos', 'Repuestos');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat_car_detail', 'Car Detail');
    INSERT OR IGNORE INTO categories (id, name) VALUES ('cat_aceite', 'Aceite');

    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_filtro_aire', 'cat_filtros', 'Filtro de aire');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_filtro_aceite', 'cat_filtros', 'Filtro de aceite');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_filtro_hab', 'cat_filtros', 'Filtro habitáculo');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_filtro_comb', 'cat_filtros', 'Filtro combustible');

    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_embrague', 'cat_repuestos', 'Embrague');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_distribuciones', 'cat_repuestos', 'Distribuciones');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_bujias', 'cat_repuestos', 'Bujías');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_cable_bujias', 'cat_repuestos', 'Cable de bujías');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_tren_del', 'cat_repuestos', 'Tren delantero');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_tren_tras', 'cat_repuestos', 'Tren trasero');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_lamparas', 'cat_repuestos', 'Lámparas');

    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_limpieza', 'cat_car_detail', 'Limpieza');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_finalizador', 'cat_car_detail', 'Finalizador');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_accesorios', 'cat_car_detail', 'Accesorios');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_perfumes', 'cat_car_detail', 'Perfumes');

    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_sueltos', 'cat_aceite', 'Sueltos');
    INSERT OR IGNORE INTO subcategories (id, category_id, name) VALUES ('sub_envasados', 'cat_aceite', 'Envasados');
  `);
}
