/**
 * Tipos de datos para el backend de Torque Desktop
 * Estos tipos reflejan la estructura que el frontend espera recibir
 */

export interface Vehicle {
  _id: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  visits: Visit[];
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
  totalDebt?: number;
  fechaIngreso?: string;
  ultimoPago?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Visit {
  _id?: string;
  fechaIngreso: string;
  fechaSalida?: string;
  total: number;
  notas?: string;
  photos: {
    front?: string;
    back?: string;
    left?: string;
    right?: string;
    motor?: string;
    dashboard?: string;
  };
  inspections: InspectionSector[];
  productosAsignados: AssignedProduct[];
  servicios?: VisitService[];
  pagos: Payment[];
  notasCredito?: CreditNote[];
  createdAt?: string;
}

export interface Photo {
  _id?: string;
  visitId: string;
  position: 'front' | 'back' | 'left' | 'right' | 'motor' | 'dashboard';
  filePath: string;
  createdAt?: string;
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

export interface AssignedProduct {
  productId: string;
  nombreProducto: string;
  cantidad: number;
  precioVenta: number;
  precioCompra?: number;
  subtotal: number;
  fechaAsignacion?: string;
}

export interface VisitService {
  nombre: string;
  precio: number;
}

export interface Payment {
  _id?: string;
  metodo: 'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito';
  monto: number;
  referencia?: string;
  fechaPago?: string;
}

export interface CreditNote {
  _id?: string;
  monto: number;
  motivo: string;
  fecha?: string;
}

export interface Product {
  _id?: string;
  nombreProducto: string;
  codigoBarra?: string;
  categoria?: string | null;
  subcategoria?: string | null;
  cantidad: number;
  precioCompra: number;
  precioVenta: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  _id?: string;
  productId: string;
  nombreProducto: string;
  codigoBarra?: string;
  categoria?: string | null;
  subcategoria?: string | null;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: 'compra' | 'ajuste' | 'uso_reparacion' | 'devolucion';
  referenciaVehiculoId?: string;
  precioVentaAplicado?: number;
  precioCompraAplicado?: number;
  createdAt?: string;
}

export interface CashRegister {
  _id?: string;
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

export interface DebtEntry {
  vehicleId: string;
  ownerName: string;
  licensePlate: string;
  brand: string;
  model: string;
  totalDeuda: number;
  visitasConDeuda: number;
  fechaIngreso?: string;
  ultimoPago?: string;
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
  transacciones: Array<{
    fecha: string;
    descripcion: string;
    importe: number;
  }>;
}

export interface Owner {
  _id?: string;
  nombre: string;
  apellido: string;
  nombreCompleto?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  _id?: string;
  vehicleId?: string;
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
  createdAt?: string;
  updatedAt?: string;
}
