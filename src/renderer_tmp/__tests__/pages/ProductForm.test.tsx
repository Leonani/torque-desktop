import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
// eslint-disable-next-line import/no-unresolved
import ProductForm from '@components/ProductForm/ProductForm';

// Mock de RTK Query hooks
 
vi.mock('@/services/productApi', () => ({
  useAddProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateProductMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGetProductByIdQuery: vi.fn((id: string, options: any) => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  productApi: {
    reducerPath: 'productApi',
    middleware: vi.fn(),
    reducer: vi.fn(),
  },
}));

// Importar los mocks después de vi.mock
import {
  useAddProductMutation,
  useUpdateProductMutation,
  useGetProductByIdQuery,
} from '@/services/productApi';

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar valores por defecto para los mocks
    const mockAddFn = vi.fn().mockResolvedValue({ data: { success: true } });
    (useAddProductMutation as any).mockReturnValue([
      mockAddFn,
      { isLoading: false },
    ]);
    
    const mockUpdateFn = vi.fn().mockResolvedValue({ data: { success: true } });
    (useUpdateProductMutation as any).mockReturnValue([
      mockUpdateFn,
      { isLoading: false },
    ]);
    
    (useGetProductByIdQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  it('debe renderizar el campo nombre del producto', () => {
    render(
      <BrowserRouter>
        <ProductForm />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Nombre del Producto/i)).toBeInTheDocument();
  });

  it('debe mostrar error si se intenta enviar sin nombre', async () => {
    render(
      <BrowserRouter>
        <ProductForm />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /Crear Producto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/El nombre del producto es obligatorio/i)).toBeInTheDocument();
    });
  });

  it('debe enviar el formulario con nombre válido', async () => {
    const mockAddProduct = vi.fn().mockResolvedValue({ data: { success: true } });
    (useAddProductMutation as any).mockReturnValue([
      mockAddProduct,
      { isLoading: false },
    ]);

    render(
      <BrowserRouter>
        <ProductForm />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText(/Nombre del Producto/i);
    fireEvent.change(nameInput, { target: { value: 'Filtro de Aceite Mobil 1' } });

    const codigoInput = screen.getByLabelText(/Código/i);
    fireEvent.change(codigoInput, { target: { value: '123456789' } });

    const cantidadInput = screen.getByLabelText(/Cantidad/i);
    fireEvent.change(cantidadInput, { target: { value: '10' } });

    // Seleccionar categoría - Ant Design Select usa role="combobox"
    const categoriaSelect = screen.getByRole('combobox', { name: /Categoría/i });
    fireEvent.mouseDown(categoriaSelect);

    // Esperar a que aparezca el dropdown y seleccionar "Filtros"
    const filtrosOption = await screen.findByText('Filtros');
    fireEvent.click(filtrosOption);

    const submitButton = screen.getByRole('button', { name: /Crear Producto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          nombreProducto: 'Filtro de Aceite Mobil 1',
          codigoBarra: '123456789',
          cantidad: 10,
          categoria: 'Filtros',
        })
      );
    });
  });

  it('debe cargar datos al editar', async () => {
    const productoMock = {
      _id: '123',
      nombreProducto: 'Producto Existente',
      codigoBarra: '987654321',
      categoria: 'Filtros',
      subcategoria: 'Filtro de aceite',
      cantidad: 5,
      precioCompra: 100,
      precioVenta: 150,
    };

    (useGetProductByIdQuery as any).mockReturnValue({
      data: productoMock,
      isLoading: false,
      error: null,
    });

    render(
      <BrowserRouter>
        <ProductForm productId="123" />
      </BrowserRouter>
    );

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Nombre del Producto/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Producto Existente');
    });
  });

  it('debe actualizar producto al enviar formulario en modo edición', async () => {
    const productoMock = {
      _id: '123',
      nombreProducto: 'Producto Existente',
      codigoBarra: '987654321',
      categoria: 'Filtros',
      cantidad: 5,
    };

    (useGetProductByIdQuery as any).mockReturnValue({
      data: productoMock,
      isLoading: false,
      error: null,
    });

    const mockUpdateProduct = vi.fn().mockResolvedValue({ data: { success: true } });
    (useUpdateProductMutation as any).mockReturnValue([
      mockUpdateProduct,
      { isLoading: false },
    ]);

    render(
      <BrowserRouter>
        <ProductForm productId="123" />
      </BrowserRouter>
    );

    // Modificar el nombre
    const nameInput = screen.getByLabelText(/Nombre del Producto/i) as HTMLInputElement;
    await waitFor(() => {
      expect(nameInput.value).toBe('Producto Existente');
    });

    fireEvent.change(nameInput, { target: { value: 'Producto Actualizado' } });

    // Enviar formulario
    const submitButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '123',
          data: expect.objectContaining({
            nombreProducto: 'Producto Actualizado',
          }),
        })
      );
    });
  });
});
