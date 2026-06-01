import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import VehicleDetail from '@/pages/VehicleDetail';
import type {
  Vehicle,
  Visit,
  PagoEntry,
  NotaCreditoEntry,
  VehicleState,
} from '@/types';

// ── Mock react-router-dom ─────────────────────────────────────

const mockNavigate = vi.fn();
const mockParams = { id: 'vehicle-123' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

// ── Mock Redux hooks ──────────────────────────────────────────

let mockVehicleState: VehicleState = {
  selectedVehicle: null,
  selectedVisit: null,
  loading: true,
  error: null,
  vehicles: [],
  filters: { search: '', brand: '', model: '', year: undefined },
};

vi.mock('@/hooks/useAppDispatch', () => ({
  useAppDispatch: () => vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) }),
  useAppSelector: (selector: (state: any) => any) =>
    selector({
      vehicles: mockVehicleState,
      auth: { user: { nombreTaller: 'Taller Test' }, loading: false, error: null },
    }),
}));

// ── Mock API functions ────────────────────────────────────────

const mockRegisterPago = vi.fn();
const mockDeletePago = vi.fn();
const mockCreateNotaCredito = vi.fn();
const mockDeleteNotaCredito = vi.fn();

vi.mock('@/services/api', () => ({
  registerPago: (...args: unknown[]) => mockRegisterPago(...args),
  deletePago: (...args: unknown[]) => mockDeletePago(...args),
  createNotaCredito: (...args: unknown[]) => mockCreateNotaCredito(...args),
  deleteNotaCredito: (...args: unknown[]) => mockDeleteNotaCredito(...args),
}));

// ── Mock InspectionSectorCard ─────────────────────────────────

vi.mock('@/components/InspectionSectorCard', () => ({
  default: ({ sector }: { sector: { sector: string } }) => (
    <div data-testid="inspection-sector">{sector.sector}</div>
  ),
}));

// ── Mock helpers ──────────────────────────────────────────────

vi.mock('@/utils/helpers', () => ({
  formatDate: (date: string) => {
    if (!date) return '—';
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  },
}));

vi.mock('@ant-design/icons', () => ({}));

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...(actual as object),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  };
});

// ── Mock data factories ───────────────────────────────────────

function createMockPago(overrides?: Partial<PagoEntry>): PagoEntry {
  return {
    _id: 'pago-1',
    metodo: 'efectivo',
    monto: 5000,
    fechaPago: '2025-05-10T12:00:00.000Z',
    ...overrides,
  };
}

function createMockNotaCredito(
  overrides?: Partial<NotaCreditoEntry>,
): NotaCreditoEntry {
  return {
    _id: 'nota-1',
    monto: 1000,
    motivo: 'Devolución por falla',
    fecha: '2025-05-10T14:00:00.000Z',
    ...overrides,
  };
}

function createMockVisit(overrides?: Partial<Visit>): Visit {
  return {
    _id: 'visit-1',
    fechaIngreso: '2025-05-10T08:00:00.000Z',
    photos: {
      front: '',
      back: '',
      left: '',
      right: '',
      motor: '',
      dashboard: '',
    },
    inspections: [
      {
        sector: 'frenos',
        items: [
          { name: 'Pastillas', status: 'ok' },
          { name: 'Discos', status: 'revision' },
        ],
      },
    ],
    productosAsignados: [
      {
        productId: 'prod-1',
        nombreProducto: 'Pastillas de freno',
        cantidad: 2,
        precioVenta: 3500,
        subtotal: 7000,
      },
    ],
    total: 12000,
    pagos: [createMockPago()],
    notasCredito: [createMockNotaCredito()],
    ...overrides,
  };
}

function createMockVehicle(overrides?: Partial<Vehicle>): Vehicle {
  return {
    _id: 'vehicle-123',
    ownerName: 'Juan Pérez',
    licensePlate: 'abc123',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Rojo',
    visits: [createMockVisit()],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('VehicleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVehicleState = {
      selectedVehicle: createMockVehicle(),
      selectedVisit: createMockVisit(),
      loading: false,
      error: null,
      vehicles: [],
      filters: { search: '', brand: '', model: '', year: undefined },
    };
  });

  // ── Basic Rendering ────────────────────────────────────────────

  it('renderiza la marca y modelo del vehículo', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Toyota Corolla')).toBeInTheDocument();
  });

  it('renderiza el nombre del dueño', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('renderiza la patente del vehículo', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('ABC123')).toBeInTheDocument();
  });

  // ── Navigation Buttons ─────────────────────────────────────────

  it('muestra el botón "Volver"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('muestra el botón "Editar"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('muestra el botón "Imprimir"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Imprimir')).toBeInTheDocument();
  });

  it('navega a /vehicles al hacer clic en Volver', async () => {
    const screen = await render(<VehicleDetail />);
    const volverBtn = screen.getByText('Volver');
    await volverBtn.click();
    expect(mockNavigate).toHaveBeenCalledWith('/vehicles');
  });

  // ── Visit section ──────────────────────────────────────────────

  it('muestra el historial de visitas', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Historial de Visitas'))
      .toBeInTheDocument();
  });

  it('muestra el resumen de inspección en el header de la visita', async () => {
    const screen = await render(<VehicleDetail />);
    // The collapsed header shows "2 ítems (1 R)"
    await expect
      .element(screen.getByText(/2 ítems/))
      .toBeInTheDocument();
  });

  // ── Products section ───────────────────────────────────────────

  it('muestra la sección "Productos Asignados"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Productos Asignados'))
      .toBeInTheDocument();
  });

  it('muestra los productos asignados', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Pastillas de freno'))
      .toBeInTheDocument();
  });

  // ── Payments section ───────────────────────────────────────────

  it('muestra la sección de Pagos', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Pagos')).toBeInTheDocument();
  });

  it('muestra el botón "Registrar Pago"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Registrar Pago'))
      .toBeInTheDocument();
  });

  it('muestra los pagos existentes', async () => {
    const screen = await render(<VehicleDetail />);
    // The pago tag "Efectivo" should be visible
    await expect.element(screen.getByText('Efectivo')).toBeInTheDocument();
  });

  it('abre el modal de pago al hacer clic en "Registrar Pago"', async () => {
    const screen = await render(<VehicleDetail />);

    const registrarBtn = screen.getByText('Registrar Pago');
    await registrarBtn.click();

    // Modal should have the "Método de Pago" label
    await expect
      .element(screen.getByText('Método de Pago'))
      .toBeInTheDocument();
    await expect.element(screen.getByText('Monto')).toBeInTheDocument();
  });

  it('el modal de pago tiene el botón "Guardar Pago"', async () => {
    const screen = await render(<VehicleDetail />);

    const registrarBtn = screen.getByText('Registrar Pago');
    await registrarBtn.click();

    await expect
      .element(screen.getByText('Guardar Pago'))
      .toBeInTheDocument();
  });

  // ── Credit Notes section ───────────────────────────────────────

  it('muestra la sección "Notas de Crédito"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Notas de Crédito (Devoluciones)'))
      .toBeInTheDocument();
  });

  it('muestra el botón "Nota de Crédito"', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Nota de Crédito'))
      .toBeInTheDocument();
  });

  it('muestra las notas de crédito existentes', async () => {
    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Devolución por falla'))
      .toBeInTheDocument();
  });

  it('abre el modal de nota de crédito al hacer clic en "Nota de Crédito"', async () => {
    const screen = await render(<VehicleDetail />);

    const notaBtn = screen.getByText('Nota de Crédito');
    await notaBtn.click();

    // Modal should open with title "Crear Nota de Crédito"
    await expect
      .element(screen.getByText('Crear Nota de Crédito'))
      .toBeInTheDocument();
  });

  it('el modal de nota de crédito tiene el botón "Guardar Nota"', async () => {
    const screen = await render(<VehicleDetail />);

    const notaBtn = screen.getByText('Nota de Crédito');
    await notaBtn.click();

    await expect
      .element(screen.getByText('Guardar Nota'))
      .toBeInTheDocument();
  });

  it('el modal de nota de crédito muestra el campo Motivo', async () => {
    const screen = await render(<VehicleDetail />);

    const notaBtn = screen.getByText('Nota de Crédito');
    await notaBtn.click();

    await expect
      .element(screen.getByText('Motivo *'))
      .toBeInTheDocument();
  });

  // ── Summary section ────────────────────────────────────────────

  it('muestra el resumen con Total, Pagado, Devuelto y Saldo', async () => {
    const screen = await render(<VehicleDetail />);
    await expect.element(screen.getByText('Total:')).toBeInTheDocument();
    await expect.element(screen.getByText('Pagado:')).toBeInTheDocument();
    await expect.element(screen.getByText('Devuelto:')).toBeInTheDocument();
    await expect.element(screen.getByText('Saldo:')).toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────

  it('muestra "Vehículo no encontrado" cuando no hay vehículo y no está cargando', async () => {
    mockVehicleState = {
      selectedVehicle: null,
      selectedVisit: null,
      loading: false,
      error: null,
      vehicles: [],
      filters: { search: '', brand: '', model: '', year: undefined },
    };

    const screen = await render(<VehicleDetail />);
    await expect
      .element(screen.getByText('Vehículo no encontrado'))
      .toBeInTheDocument();
  });

  // ── Loading state ──────────────────────────────────────────────

  it('muestra spinner de carga cuando selectedVehicle es null y loading es true', async () => {
    mockVehicleState = {
      selectedVehicle: null,
      selectedVisit: null,
      loading: true,
      error: null,
      vehicles: [],
      filters: { search: '', brand: '', model: '', year: undefined },
    };

    await render(<VehicleDetail />);
    // The Card's loading state renders a Spin with role="status"
    const spinner = page.getByRole('status');
    await expect.element(spinner).toBeInTheDocument();
  });

  // ── Visit without visits ───────────────────────────────────────

  it('muestra "no tiene visitas registradas" cuando el vehículo no tiene visitas', async () => {
    mockVehicleState = {
      selectedVehicle: createMockVehicle({ visits: [] }),
      selectedVisit: null,
      loading: false,
      error: null,
      vehicles: [],
      filters: { search: '', brand: '', model: '', year: undefined },
    };

    const screen = await render(<VehicleDetail />);
    await expect
      .element(
        screen.getByText('Este vehículo no tiene visitas registradas'),
      )
      .toBeInTheDocument();
  });
});
