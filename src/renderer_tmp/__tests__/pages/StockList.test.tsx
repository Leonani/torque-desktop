import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StockList from '@/pages/StockList';
import { PRODUCT_CATEGORIES } from '@/types';

// Mock de react-router-dom para useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock de RTK Query hooks
vi.mock('@/services/productApi', () => ({
  useGetProductsQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useDeleteProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  productApi: {
    reducerPath: 'productApi',
    middleware: vi.fn(),
    reducer: vi.fn(),
  },
}));

// Importar los mocks después de vi.mock
import {
  useGetProductsQuery,
  useDeleteProductMutation,
} from '@/services/productApi';

// Datos mock para las pruebas
const mockProducts = [
  {
    _id: '1',
    nombreProducto: 'Filtro de Aceite Mobil 1',
    codigoBarra: '123456789',
    categoria: PRODUCT_CATEGORIES.FILTROS,
    subcategoria: 'Filtro de aceite',
    cantidad: 10,
    precioCompra: 5000,
    precioVenta: 8000,
  },
  {
    _id: '2',
    nombreProducto: 'Aceite 5W30 Castrol',
    codigoBarra: '987654321',
    categoria: PRODUCT_CATEGORIES.ACEITE,
    subcategoria: 'Sueltos',
    cantidad: 20,
    precioCompra: 8000,
    precioVenta: 12000,
  },
  {
    _id: '3',
    nombreProducto: 'Filtro de Aire K&N',
    codigoBarra: '456789123',
    categoria: PRODUCT_CATEGORIES.FILTROS,
    subcategoria: 'Filtro de aire',
    cantidad: 15,
    precioCompra: 6000,
    precioVenta: 10000,
  },
];

describe('StockList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // Configurar valor por defecto para useGetProductsQuery
    (useGetProductsQuery as any).mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    (useDeleteProductMutation as any).mockReturnValue([
      vi.fn().mockResolvedValue({ data: { success: true } }),
      { isLoading: false },
    ]);
  });

  it('debe renderizar el título de la lista de productos', () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    expect(screen.getByText('Stock de Productos')).toBeInTheDocument();
  });

  it('debe mostrar la lista de productos', () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Verificar que se muestran los productos (usar códigos únicos para evitar ambigüedad)
    expect(screen.getByText('123456789')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
    expect(screen.getByText('456789123')).toBeInTheDocument();
  });

  it('debe mostrar el estado de carga', () => {
    (useGetProductsQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Ant Design Table muestra un spinner durante la carga
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debe mostrar error cuando falla la carga', () => {
    (useGetProductsQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: { status: 500, data: 'Error del servidor' },
    });

    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    expect(screen.getByText(/Error cargando productos/i)).toBeInTheDocument();
  });

  it('debe filtrar productos por búsqueda', async () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Encontrar el input de búsqueda por placeholder
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o código');
    fireEvent.change(searchInput, { target: { value: 'Mobil' } });

    // Verificar que useGetProductsQuery fue llamado con el parámetro de búsqueda
    await waitFor(() => {
      expect(useGetProductsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Mobil' }),
        expect.anything()
      );
    });
  });

  it('debe filtrar productos por categoría', async () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Abrir el select de categoría
    const categoriaSelect = screen.getByPlaceholderText('Filtrar por categoría');
    fireEvent.mouseDown(categoriaSelect);

    // Seleccionar "Filtros"
    const filtrosOption = await screen.findByText(PRODUCT_CATEGORIES.FILTROS);
    fireEvent.click(filtrosOption);

    // Verificar que useGetProductsQuery fue llamado con el parámetro de categoría
    await waitFor(() => {
      expect(useGetProductsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: PRODUCT_CATEGORIES.FILTROS }),
        expect.anything()
      );
    });
  });

  it('debe eliminar un producto', async () => {
    const mockDeleteProduct = vi.fn().mockResolvedValue({ data: { success: true } });
    (useDeleteProductMutation as any).mockReturnValue([
      mockDeleteProduct,
      { isLoading: false },
    ]);

    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Encontrar y hacer clic en el botón de eliminar del primer producto
    const deleteButtons = screen.getAllByRole('button', { name: '' }); // Botones con icono DeleteOutlined
    // El tercer botón debería ser el de eliminar (después de EyeOutlined y EditOutlined)
    const deleteButton = deleteButtons[2];
    fireEvent.click(deleteButton);

    // Confirmar eliminación en el Popconfirm
    const confirmButton = await screen.findByText('Sí');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith('1');
    });
  });

  it('debe abrir el modal para crear nuevo producto', () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    const nuevoProductoButton = screen.getByText('Nuevo Producto');
    fireEvent.click(nuevoProductoButton);

    // Verificar que se abre el modal (el título debe cambiar)
    expect(screen.getByText('Nuevo Producto')).toBeInTheDocument();
  });

  it('debe abrir el modal para editar producto', async () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Encontrar y hacer clic en el botón de editar del primer producto
    const editButtons = screen.getAllByRole('button', { name: '' }); // Botones con icono EditOutlined
    const editButton = editButtons[1]; // El segundo botón debería ser el de editar
    fireEvent.click(editButton);

    // Verificar que se abre el modal de edición
    await waitFor(() => {
      expect(screen.getByText('Editar Producto')).toBeInTheDocument();
    });
  });

  it('debe navegar al detalle del producto al hacer clic en el botón de ver', () => {
    render(
      <BrowserRouter>
        <StockList />
      </BrowserRouter>
    );

    // Encontrar y hacer clic en el botón de ver del primer producto
    const viewButtons = screen.getAllByRole('button', { name: '' }); // Botones con icono EyeOutlined
    const viewButton = viewButtons[0]; // El primer botón debería ser el de ver
    fireEvent.click(viewButton);

    expect(mockNavigate).toHaveBeenCalledWith('/products/1');
  });
});
