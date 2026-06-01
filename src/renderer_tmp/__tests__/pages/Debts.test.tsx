import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { BrowserRouter } from 'react-router-dom';
import Debts from '@/pages/Debts';
import type { DebtEntry } from '@/types';

// ── Mock API ──────────────────────────────────────────────────

const mockGetDebts = vi.fn();
vi.mock('@/services/api', () => ({
  getDebts: (...args: unknown[]) => mockGetDebts(...args),
}));

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

// ── Mock data ─────────────────────────────────────────────────

const mockDeudas: DebtEntry[] = [
  {
    vehicleId: 'v1',
    ownerName: 'Juan Pérez',
    licensePlate: 'abc123',
    brand: 'Toyota',
    model: 'Corolla',
    totalDeuda: 15000.5,
    visitasConDeuda: 2,
    fechaIngreso: '2025-05-15T10:00:00.000Z',
    ultimoPago: '2025-05-20T14:30:00.000Z',
  },
  {
    vehicleId: 'v2',
    ownerName: 'María García',
    licensePlate: 'def456',
    brand: 'Ford',
    model: 'Focus',
    totalDeuda: 8500.0,
    visitasConDeuda: 1,
    fechaIngreso: '2025-05-10T08:00:00.000Z',
    ultimoPago: undefined,
  },
];

// ── Wrapper ──────────────────────────────────────────────────

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// ── Tests ────────────────────────────────────────────────────

describe('Debts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDebts.mockResolvedValue(mockDeudas);
  });

  // ── Render title ───────────────────────────────────────────────

  it('renderiza el título "Deudas de Clientes"', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });
    await expect
      .element(screen.getByText('Deudas de Clientes'))
      .toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────

  it('muestra "No hay deudas pendientes" cuando no hay deudas', async () => {
    mockGetDebts.mockResolvedValue([]);

    const screen = await render(<Debts />, { wrapper: Wrapper });
    await expect
      .element(screen.getByText('No hay deudas pendientes'))
      .toBeInTheDocument();
  });

  // ── Table data ─────────────────────────────────────────────────

  it('muestra datos en la tabla cuando hay deudas', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    // Wait for the data to load
    await expect
      .element(screen.getByText('Juan Pérez'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('María García'))
      .toBeInTheDocument();
  });

  it('muestra la patente formateada como Tag', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    // Patentes should appear in uppercase inside a Tag
    await expect
      .element(screen.getByText('ABC123'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('DEF456'))
      .toBeInTheDocument();
  });

  it('muestra correctamente las visitas con deuda', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    await expect
      .element(screen.getByText('2 visitas'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('1 visita'))
      .toBeInTheDocument();
  });

  // ── "Deuda Total" formatting ───────────────────────────────────

  it('verifica que la columna "Deuda Total" formatea correctamente', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    // es-AR locale: $15.000,50 and $8.500,00
    await expect
      .element(screen.getByText('$15.000,50'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('$8.500,00'))
      .toBeInTheDocument();
  });

  // ── Total general card ─────────────────────────────────────────

  it('muestra el total general de deudas cuando hay datos', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    await expect
      .element(screen.getByText('Total General de Deudas:'))
      .toBeInTheDocument();
    // 15000.5 + 8500 = 23500.5
    await expect
      .element(screen.getByText('$23.500,50'))
      .toBeInTheDocument();
  });

  // ── Buttons ────────────────────────────────────────────────────

  it('el botón "Actualizar" está presente', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });
    await expect
      .element(screen.getByText('Actualizar'))
      .toBeInTheDocument();
  });

  it('el botón "Actualizar" recarga deudas al hacer clic', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    // Wait for initial load
    await expect
      .element(screen.getByText('Juan Pérez'))
      .toBeInTheDocument();

    // Override mock for second call
    mockGetDebts.mockResolvedValue([
      {
        vehicleId: 'v3',
        ownerName: 'Carlos López',
        licensePlate: 'ghi789',
        brand: 'Chevrolet',
        model: 'Cruze',
        totalDeuda: 3000,
        visitasConDeuda: 1,
      },
    ]);

    const actualizarBtn = screen.getByText('Actualizar');
    await actualizarBtn.click();

    // New data should appear
    await expect
      .element(screen.getByText('Carlos López'))
      .toBeInTheDocument();
  });

  it('muestra el botón "Ver detalle" por cada deuda', async () => {
    await render(<Debts />, { wrapper: Wrapper });

    const verDetalleButtons = await page
      .getByRole('button', { name: /ver detalle/i })
      .all();
    expect(verDetalleButtons).toHaveLength(2);
  });

  // ── Fechas: Ingreso y Último Pago ──────────────────────────────

  it('muestra la fecha de ingreso formateada', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    await expect
      .element(screen.getByText('15/05/2025'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('10/05/2025'))
      .toBeInTheDocument();
  });

  it('muestra guión si no hay fecha de ingreso', async () => {
    mockGetDebts.mockResolvedValue([
      {
        vehicleId: 'v3',
        ownerName: 'Carlos López',
        licensePlate: 'ghi789',
        brand: 'Chevrolet',
        model: 'Cruze',
        totalDeuda: 3000,
        visitasConDeuda: 1,
      },
    ]);

    const screen = await render(<Debts />, { wrapper: Wrapper });
    await expect
      .element(screen.getByText('-'))
      .toBeInTheDocument();
  });

  it('muestra la fecha del último pago cuando existe', async () => {
    const screen = await render(<Debts />, { wrapper: Wrapper });

    await expect
      .element(screen.getByText('20/05/2025'))
      .toBeInTheDocument();
  });

  it('muestra guión si no hay último pago', async () => {
    // María García no tiene ultimoPago
    const screen = await render(<Debts />, { wrapper: Wrapper });

    // Verificar que aparece un "-" para el último pago de María
    // Debemos buscar el texto dentro de la celda correspondiente
    const allDashElements = await page.getByText('-').all();
    expect(allDashElements.length).toBeGreaterThan(0);
  });
});
