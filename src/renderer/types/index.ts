export interface PagoEntry {
  _id?: string;
  metodo: 'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito';
  monto: number;
  referencia?: string;
  fechaPago?: string;
}

export interface NotaCreditoEntry {
  _id?: string;
  monto: number;
  motivo: string;
  fecha?: string;
}

export interface ServicioEntry {
  _id?: string;
  nombre: string;
  precio: number;
}

export interface Visit {
  _id?: string;
  fechaIngreso: string;
  fechaSalida?: string;
  photos: {
    front: string;
    back: string;
    left: string;
    right: string;
    motor: string;
    dashboard: string;
  };
  inspections: InspectionSector[];
  productosAsignados: ProductoAsignado[];
  servicios?: ServicioEntry[];
  total: number;
  pagos: PagoEntry[];
  notasCredito?: NotaCreditoEntry[];
  notas?: string;
}

export interface Vehicle {
  _id?: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  visits: Visit[];
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleListItem {
  _id: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  visitCount: number;
  lastVisitDate?: string;
  lastVisit?: Visit | null;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const PRODUCT_CATEGORIES = {
  FILTROS: 'Filtros',
  REPUESTOS: 'Repuestos',
  CAR_DETAIL: 'Car Detail',
  ACEITE: 'Aceite'
} as const;

export const PRODUCT_SUBCATEGORIES: Record<string, string[]> = {
  [PRODUCT_CATEGORIES.FILTROS]: ['Filtro de aire', 'Filtro de aceite', 'Filtro habitáculo', 'Filtro combustible'],
  [PRODUCT_CATEGORIES.REPUESTOS]: ['Embrague', 'Distribuciones', 'Bujías', 'Cable de bujías', 'Tren delantero', 'Tren trasero', 'Lámparas'],
  [PRODUCT_CATEGORIES.CAR_DETAIL]: ['Limpieza', 'Finalizador', 'Accesorios', 'Perfumes'],
  [PRODUCT_CATEGORIES.ACEITE]: ['Sueltos', 'Envasados']
};

export type ProductCategory = typeof PRODUCT_CATEGORIES[keyof typeof PRODUCT_CATEGORIES];

export interface Product {
  _id?: string;
  nombreProducto: string;
  codigoBarra?: string;
  categoria?: ProductCategory | null;
  subcategoria?: string | null;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  _id?: string;
  productId: Product;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: 'compra' | 'ajuste' | 'uso_reparacion' | 'devolucion';
  referenciaVehiculoId?: string;
  precioVentaAplicado?: number;
  createdAt?: string;
}

export interface ProductoAsignado {
  productId: string;
  nombreProducto: string;
  cantidad: number;
  precioVenta: number;
  precioCompra?: number;
  subtotal: number;
  fechaAsignacion?: string;
}

export interface InspectionSector {
  sector: 'lubricantes' | 'distribucion' | 'frenos' | 'iluminacion' | 'interior' | 'trenDelantero' | 'trenTrasero' | 'varios';
  items: InspectionItem[];
}

export interface InspectionItem {
  name: string;
  status?: 'ok' | 'revision';
  needsReplacement?: boolean;
  notes?: string;
}

export interface CashRegister {
  _id?: string;
  userId?: string;
  fechaApertura: string;
  fechaCierre?: string;
  montoInicial: number;
  montoFinalDeclarado?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
  resumen?: CashRegisterResumen;
  createdAt?: string;
  updatedAt?: string;
}

export interface DebtEntry {
  vehicleId: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  totalDeuda: number;
  visitasConDeuda: number;
  /** Fecha de ingreso de la visita más reciente con deuda */
  fechaIngreso?: string;
  /** Fecha del último pago realizado (del más reciente entre todos los pagos) */
  ultimoPago?: string;
}

export interface CashRegisterResumen {
  montoInicial: number;
  totalVentas: number;
  totalIngresos: number;
  totalDevoluciones: number;
  saldoNeto: number;
  desglosePagos: {
    efectivo: number;
    transferencia: number;
    tarjeta_credito: number;
    tarjeta_debito: number;
  };
  montoFinalComputado: number;
  montoFinalDeclarado: number;
  diferencia: number;
}

/**
 * Una transacción individual dentro del reporte de caja
 * Puede ser un pago (ingreso), nota de crédito (egreso) o compra de stock (egreso)
 */
export interface Transaccion {
  /** Fecha de la transacción */
  fecha: string;
  /** Descripción de la transacción */
  descripcion: string;
  /** Importe: positivo para ingresos, negativo para egresos */
  importe: number;
}

export interface CashReport {
  periodo: { inicio: string; fin: string };
  activos: {
    totalIngresos: number;
    efectivo: number;
    transferencia: number;
    tarjeta_credito: number;
    tarjeta_debito: number;
  };
  pasivos: {
    totalDevoluciones: number;
    cantidadNotas: number;
    totalComprasStock: number;
    cantidadComprasStock: number;
  };
  saldoNeto: number;
  cantidadVisitas: number;
  /** Lista de transacciones individuales del período */
  transacciones: Transaccion[];
}

export interface CashRegisterState {
  currentRegister: CashRegister | null;
  history: CashRegister[];
  loading: boolean;
  error: string | null;
}

export interface VehicleState {
  vehicles: VehicleListItem[];
  selectedVehicle: Vehicle | null;
  selectedVisit: Visit | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    brand: string;
    model: string;
    year: number | undefined;
  };
}

/**
 * @typedef {Object} Owner
 * @property {string} _id
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} nombreCompleto
 * @property {string} dni
 * @property {string} telefono
 * @property {string} email
 * @property {string} direccion
 */

export interface Owner {
  _id: string;
  nombre: string;
  apellido: string;
  nombreCompleto?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @typedef {Object} Appointment
 * @property {string} _id
 * @property {string} vehicleId
 * @property {string} ownerName
 * @property {string} licensePlate
 * @property {string} brand
 * @property {string} model
 * @property {string} date
 * @property {string} time
 * @property {number} duration
 * @property {string} type
 * @property {string} notes
 * @property {string} status
 */

export interface Appointment {
  _id?: string;
  vehicleId?: string | { _id: string };
  ownerName: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  date: string;
  time: string;
  duration?: number;
  type?: 'revision' | 'mantenimiento' | 'reparacion' | 'otro';
  notes?: string;
  status?: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
