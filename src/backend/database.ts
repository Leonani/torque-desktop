import initSqlJs from 'sql.js';
import type { SqlJsStatic, Database as SqlJsDatabase, SqlValue } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { initializeSchema, seedCategories } from './schema';
import { getElectronApp } from './electron';

// ============================================================================
// Wrapper de compatibilidad: expone API similar a better-sqlite3 usando sql.js
// ============================================================================

/**
 * Clase Statement: wrapper alrededor de PreparedStatement de sql.js
 * Provee los métodos .all(), .get(), .run() como better-sqlite3
 */
class Statement {
  private db: SqlJsDatabase;
  private sql: string;

  constructor(db: SqlJsDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  /**
   * Ejecuta la consulta y retorna todas las filas como array de objetos
   */
  all(...params: unknown[]): Record<string, unknown>[] {
    if (params.length === 0) {
      // Sin parámetros: usar exec() para mejor performance
      try {
        const results = this.db.exec(this.sql);
        if (results.length === 0) return [];
        const { columns, values } = results[0];
        return values.map((row) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } catch {
        // Fallback a prepared statement si exec falla (ej. consultas con ?)
      }
    }

    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params as SqlValue[]);
      }
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  /**
   * Ejecuta la consulta y retorna la primera fila o undefined
   */
  get(...params: unknown[]): Record<string, unknown> | undefined {
    const stmt = this.db.prepare(this.sql);
    try {
      if (params.length > 0) {
        stmt.bind(params as SqlValue[]);
      }
      const hasRow = stmt.step();
      return hasRow ? (stmt.getAsObject() as Record<string, unknown>) : undefined;
    } finally {
      stmt.free();
    }
  }

  /**
   * Ejecuta una consulta INSERT/UPDATE/DELETE
   */
  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    this.db.run(this.sql, params.length > 0 ? (params as SqlValue[]) : undefined);
    return {
      changes: this.db.getRowsModified(),
      lastInsertRowid: 0,
    };
  }
}

/**
 * Clase DatabaseWrapper: wrapper alrededor de sql.js Database
 * Provee .prepare(), .transaction(), .pragma(), .exec(), .close()
 */
class DatabaseWrapper {
  private db: SqlJsDatabase;
  /** Referencia para poder persistir a disco */
  public dbPath: string = '';

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  /** Prepara una consulta SQL */
  prepare(sql: string): Statement {
    return new Statement(this.db, sql);
  }

  /** Crea una transacción */
  transaction<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: any[]) => {
      this.db.run('BEGIN');
      try {
        const result = fn(...args);
        this.db.run('COMMIT');
        return result;
      } catch (e) {
        this.db.run('ROLLBACK');
        throw e;
      }
    }) as T;
  }

  /** Establece un PRAGMA */
  pragma(key: string, value?: string | number): void {
    const val = value !== undefined ? ` = ${value}` : '';
    this.db.run(`PRAGMA ${key}${val}`);
  }

  /** Ejecuta SQL directo (para DDL múltiple) */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /** Exporta la DB a Uint8Array */
  exportBinary(): Uint8Array {
    return this.db.export();
  }

  /** Libera recursos y persiste a disco */
  close(): void {
    this.persist();
    this.db.close();
  }

  /** Persiste la base de datos en memoria a disco */
  persist(): void {
    if (!this.dbPath) return;
    const dir = path.dirname(this.dbPath);
    fs.mkdirSync(dir, { recursive: true });
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }
}

// ============================================================================
// Singleton de base de datos
// ============================================================================

let dbInstance: DatabaseWrapper | null = null;
let initPromise: Promise<void> | null = null;

function getDbPath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(process.cwd(), 'data', 'torque.db');
  }
  return path.join(getElectronApp().getPath('userData'), 'torque.db');
}

function getBackupPath(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(process.cwd(), 'data', 'torque.db.backup');
  }
  return path.join(getElectronApp().getPath('userData'), 'torque.db.backup');
}

/**
 * Inicializa la base de datos SQLite (async - requiere cargar WASM)
 * Crea el directorio, conecta, configura PRAGMAs y ejecuta el esquema
 */
export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Configurar la ruta al WASM de sql.js
    // En desarrollo: está en node_modules/sql.js/dist/
    // En producción: se copia via extraResources a resources/sql.js/
    const isDev = !getElectronApp().isPackaged;
    const sqlWasmPath = isDev
      ? path.join(process.cwd(), 'node_modules', 'sql.js', 'dist')
      : path.join(process.resourcesPath, 'sql.js');

    const SQL: SqlJsStatic = await initSqlJs({
      locateFile: (file: string) => path.join(sqlWasmPath, file),
    });
    const dbPath = getDbPath();

    // Asegurar que el directorio existe
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    // Restaurar desde backup si la DB principal falta
    if (!fs.existsSync(dbPath)) {
      const backupPath = getBackupPath();
      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, dbPath);
          console.log('[Torque DB] Base de datos restaurada desde backup:', backupPath);
        } catch (e) {
          console.error('[Torque DB] Error al restaurar desde backup:', e);
        }
      }
    }

    // Crear DB: leer archivo existente o crear uno nuevo
    let sqlJsDb: SqlJsDatabase;
    try {
      const buffer = fs.readFileSync(dbPath);
      sqlJsDb = new SQL.Database(buffer);
    } catch {
      sqlJsDb = new SQL.Database();
    }

    // Configurar PRAGMAs
    sqlJsDb.run('PRAGMA foreign_keys = ON');

    const wrapper = new DatabaseWrapper(sqlJsDb);
    wrapper.dbPath = dbPath;
    dbInstance = wrapper;

    // Inicializar esquema
    initializeSchema(wrapper);

    // Sembrar categorías por defecto
    seedCategories(wrapper);

    // Persistir a disco inmediatamente después de crear el esquema
    wrapper.persist();
  })();

  return initPromise;
}

/**
 * Obtiene la instancia de la base de datos (debe llamarse initDatabase() primero)
 */
export function getDatabase(): DatabaseWrapper {
  if (!dbInstance) {
    throw new Error(
      'Base de datos no inicializada. Debe llamar initDatabase() antes de usar getDatabase().'
    );
  }
  return dbInstance;
}

/**
 * Persiste la base de datos actual a disco
 */
export function persistDatabase(): void {
  if (dbInstance) {
    dbInstance.persist();
  }
}

/**
 * Cierra y persiste la base de datos
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
