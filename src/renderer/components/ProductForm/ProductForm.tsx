import { FC, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, Row, Col, InputNumber, Select, message } from 'antd';
import { PRODUCT_CATEGORIES, PRODUCT_SUBCATEGORIES, ProductCategory } from '@/types';
import { useAddProductMutation, useUpdateProductMutation, useGetProductByIdQuery } from '@/services/productApi';
import styles from './ProductForm.module.css';

/**
 * Props para el formulario de creación/edición de productos
 * @interface ProductFormProps
 */
interface ProductFormProps {
  isModal?: boolean;
  onDone?: () => void;
  productId?: string | null;
}

/**
 * Formulario para crear o editar productos
 * @param {ProductFormProps} props - Props del componente
 * @returns {JSX.Element} Componente de formulario de producto
 */
const ProductForm: FC<ProductFormProps> = ({ isModal = false, onDone, productId }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const resolvedId = productId || id;
  const location = useLocation();
  const isEditing = !!resolvedId;

  // Hook de message de Ant Design 6
  const [messageApi, contextHolder] = message.useMessage();

  // Observar el valor de categoria del formulario (React 19 pattern)
  const selectedCategory = Form.useWatch('categoria', form) || null;

  // RTK Query: Cargar producto por ID para edición
  const { data: productData } = useGetProductByIdQuery(resolvedId || '', {
    skip: !isEditing,
  });

  // RTK Query: Mutations para crear y actualizar
  const [addProduct] = useAddProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  useEffect(() => {
    const state = location.state as { codigoBarra?: string } | null;
    if (state?.codigoBarra) {
      form.setFieldsValue({ codigoBarra: state.codigoBarra });
    }
  }, [location.state, form]);

  useEffect(() => {
    if (productData) {
      form.setFieldsValue(productData);
      // selectedCategory se deriva automáticamente via Form.useWatch
    }
  }, [productData, form]);

  const handleCategoryChange = (value: ProductCategory | null) => {
    form.setFieldValue('categoria', value);
    form.setFieldValue('subcategoria', null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEditing && resolvedId) {
        await updateProduct({ id: resolvedId, data: values }).unwrap();
        messageApi.success('Producto actualizado');
      } else {
        await addProduct(values).unwrap();
        messageApi.success('Producto creado');
      }
      navigate('/products');
      onDone?.();
    } catch {
      messageApi.error('Error guardando producto');
    }
  };

  return (
    <Card className={isModal ? styles.card : undefined}>
      {contextHolder}
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item 
              name="nombreProducto" 
              label="Nombre del Producto" 
              rules={[
                { required: true, message: 'El nombre del producto es obligatorio' },
                { max: 100, message: 'El nombre no puede exceder 100 caracteres' }
              ]}
            >
              <Input 
                placeholder="Ingrese el nombre del producto"
                maxLength={100}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="codigoBarra" label="Código" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="categoria" label="Categoría" rules={[{ required: true }]}>
              <Select
                placeholder="Seleccionar categoría"
                allowClear
                onChange={handleCategoryChange}
                options={Object.values(PRODUCT_CATEGORIES).map(cat => ({ value: cat, label: cat }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="subcategoria" label="Subcategoría">
              <Select
                placeholder="Seleccionar subcategoría"
                allowClear
                disabled={!selectedCategory}
                options={(selectedCategory ? PRODUCT_SUBCATEGORIES[selectedCategory] || [] : []).map(sub => ({ value: sub, label: sub }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }]}> 
              <InputNumber min={0} className={styles.fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="precioCompra" label="Precio Compra"> 
              <InputNumber min={0} className={styles.fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="precioVenta" label="Precio Venta"> 
              <InputNumber min={0} className={styles.fullWidth} />
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end">
          <Form.Item>
            <Button type="primary" onClick={handleSubmit}>
              {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </Form.Item>
        </Row>
      </Form>
    </Card>
  );
};

export default ProductForm;
