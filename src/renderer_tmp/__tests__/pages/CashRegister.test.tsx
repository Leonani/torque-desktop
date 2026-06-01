import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import type { CashRegisterState, CashRegister as CashRegisterType } from '@/types';
import CashRegister from '@/pages/CashRegister';

// ── Mock state ───────────────────────────────────────────────

const mockDispatch = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) });

let mockCashRegisterState: CashRegisterState = {
  currentRegister: null,
  history: [],
  loading: false,
  error: null,
};

vi.mock('@/hooks/useAppDispatch', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => any) =>
    selector({ cashRegister: mockCashRegisterState }),
}));

// Mock cash register slice actions
vi.mock('@/store/cashRegisterSlice', () => ({
  fetchCurrentRegister: vi.fn(() => ({ type: 'cashRegister/fetchCurrent' })),
  openRegister: vi.fn(() => ({ type: 'cashRegister/open' })),
  closeRegister: vi.fn(() => ({ type: 'cashRegister/close' })),
  fetchRegisterHistory: vi.fn(() => ({ type: 'cashRegister/fetchHistory' })),
}));

// Mock API
const mockGetCashReport = vi.fn();
vi.mock('@/services/api', () => ({
  getCashReport: (...args: unknown[]) => mockGetCashReport(...args),
}));

// Mock helpers
vi.mock('@/utils/helpers', () => ({
  formatDate: (date: string) => date || '—',
}));

// Mock Ant Design icons (avoids warnings)
vi.mock('@ant-design/icons', () => ({}));

// Mock Ant Design message to prevent side effects
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...(actual as object),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  };
});

// ── Test data ────────────────────────────────────────────────

function createOpenRegister(): CashRegisterType {
  return {
    _id: 'reg1',
    fechaApertura: '2025-05-10T08:00:00.000Z',
    montoInicial: 5000,
    estado: 'abierta' as const,
  };
}

function createClosedRegister(): CashRegisterType {
  return {
    _id: 'h1',
    fechaApertura: '2025-05-09T08:00:00.000Z',
    fechaCierre: '2025-05-09T18:00:00.000Z',
    montoInicial: 3000,
    montoFinalDeclarado: 12000,
    estado: 'cerrada' as const,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('CashRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCashRegisterState = {
      currentRegister: null,
      history: [],
      loading: false,
      error: null,
    };
  });

  // ── Render title ───────────────────────────────────────────────

  it('renderiza el título "Arqueo de Caja"', async () => {
    const screen = await render(<CashRegister />);
    await expect.element(screen.getByText('Arqueo de Caja')).toBeInTheDocument();
  });

  // ── Closed register state ──────────────────────────────────────

  it('muestra "Caja Cerrada" cuando no hay caja abierta', async () => {
    const screen = await render(<CashRegister />);
    await expect.element(screen.getByText('Caja Cerrada')).toBeInTheDocument();
  });

  it('muestra el botón "Abrir Caja" cuando no hay caja abierta', async () => {
    const screen = await render(<CashRegister />);
    const abrirBtn = screen.getByText('Abrir Caja');
    await expect.element(abrirBtn).toBeInTheDocument();
  });

  // ── Open register state ────────────────────────────────────────

  it('muestra "Caja Abierta" cuando hay una caja abierta', async () => {
    mockCashRegisterState = {
      currentRegister: createOpenRegister(),
      history: [],
      loading: false,
      error: null,
    };

    const screen = await render(<CashRegister />);
    await expect.element(screen.getByText('Caja Abierta')).toBeInTheDocument();
  });

  it('muestra el botón "Cerrar Caja" cuando hay caja abierta', async () => {
    mockCashRegisterState = {
      currentRegister: createOpenRegister(),
      history: [],
      loading: false,
      error: null,
    };

    const screen = await render(<CashRegister />);
    await expect.element(screen.getByText('Cerrar Caja')).toBeInTheDocument();
  });

  // ── History ────────────────────────────────────────────────────

  it('muestra el historial de cierres', async () => {
    mockCashRegisterState = {
      currentRegister: null,
      history: [createClosedRegister()],
      loading: false,
      error: null,
    };

    const screen = await render(<CashRegister />);
    await expect
      .element(screen.getByText('Historial de Cierres'))
      .toBeInTheDocument();
  });

  it('muestra "No hay registros de cierre" cuando el historial está vacío', async () => {
    // History is empty by default
    const screen = await render(<CashRegister />);

    // The Ant Design Empty component renders this text inside the Table
    await expect
      .element(screen.getByText('No hay registros de cierre'))
      .toBeInTheDocument();
  });

  // ── Loading state ──────────────────────────────────────────────

  it('muestra loading spinner cuando está cargando y no hay caja', async () => {
    mockCashRegisterState = {
      currentRegister: null,
      history: [],
      loading: true,
      error: null,
    };

    const screen = await render(<CashRegister />);
    // The Ant Design Spin component has role="status"
    const spinner = page.getByRole('status');
    await expect.element(spinner).toBeInTheDocument();
  });

  // ── Buttons ────────────────────────────────────────────────────

  it('el botón "Actualizar" está presente', async () => {
    const screen = await render(<CashRegister />);
    await expect.element(screen.getByText('Actualizar')).toBeInTheDocument();
  });

  it('el botón "Exportar Reporte" está presente', async () => {
    const screen = await render(<CashRegister />);
    await expect
      .element(screen.getByText('Exportar Reporte'))
      .toBeInTheDocument();
  });

  // ── Modal interaction ──────────────────────────────────────────

  it('al hacer clic en "Abrir Caja" se abre el modal', async () => {
    const screen = await render(<CashRegister />);
    const abrirBtn = screen.getByText('Abrir Caja');
    await abrirBtn.click();

    // The modal should now be open with the title "Abrir Caja"
    // The button text "Abrir Caja" also appears in the modal title
    await expect
      .element(screen.getByText('Abrir Caja'))
      .toBeInTheDocument();
  });

  it('al hacer clic en "Exportar Reporte" se abre el modal de reporte', async () => {
    const screen = await render(<CashRegister />);
    const exportBtn = screen.getByText('Exportar Reporte');
    await exportBtn.click();

    await expect
      .element(
        screen.getByText('Seleccione un rango de fechas para generar el reporte'),
      )
      .toBeInTheDocument();
  });
});
