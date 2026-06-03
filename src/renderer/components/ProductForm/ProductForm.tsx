import { FC, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  InputNumber,
  Select,
  message,
  Divider,
  Modal,
  Space,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAddProductMutation, useUpdateProductMutation, useGetProductByIdQuery } from '@/services/productApi';
import {
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useAddSubcategoryMutation,
} from '@/services/categoryApi';
import styles from './ProductForm.module.css';

const { Text } = Typography;

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

  // RTK Query: Categorías dinámicas
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
  const [addCategory] = useAddCategoryMutation();
  const [addSubcategory] = useAddSubcategoryMutation();

  // Estado para modales de agregar categoría/subcategoría
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newSubcategoryModalOpen, setNewSubcategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingSubcategory, setAddingSubcategory] = useState(false);

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

  // Obtener subcategorías de la categoría seleccionada
  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory);
  const subcategoryOptions = selectedCategoryData?.subcategories.map(sub => ({
    value: sub.name,
    label: sub.name,
  })) || [];

  const handleCategoryChange = (value: string | null) => {
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
      if (!isModal) {
        navigate('/products');
      }
      onDone?.();
    } catch {
      messageApi.error('Error guardando producto');
    }
  };

  // ── Handlers para agregar categoría ────────────────────────────────────────
  const handleOpenNewCategory = () => {
    setNewCategoryName('');
    setNewCategoryModalOpen(true);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      messageApi.warning('Ingrese un nombre para la categoría');
      return;
    }
    setAddingCategory(true);
    try {
      await addCategory({ name }).unwrap();
      messageApi.success(`Categoría "${name}" creada`);
      setNewCategoryModalOpen(false);
      setNewCategoryName('');
      form.setFieldValue('categoria', name);
      form.setFieldValue('subcategoria', null);
    } catch (err: any) {
      messageApi.error(err?.data?.message || 'Error al crear categoría');
    } finally {
      setAddingCategory(false);
    }
  };

  // ── Handlers para agregar subcategoría ─────────────────────────────────────
  const handleOpenNewSubcategory = () => {
    setNewSubcategoryName('');
    setNewSubcategoryModalOpen(true);
  };

  const handleAddSubcategory = async () => {
    const name = newSubcategoryName.trim();
    if (!name) {
      messageApi.warning('Ingrese un nombre para la subcategoría');
      return;
    }
    if (!selectedCategoryData) {
      messageApi.warning('Seleccione primero una categoría');
      return;
    }
    setAddingSubcategory(true);
    try {
      await addSubcategory({ categoryId: selectedCategoryData._id, name }).unwrap();
      messageApi.success(`Subcategoría "${name}" creada`);
      setNewSubcategoryModalOpen(false);
      setNewSubcategoryName('');
      form.setFieldValue('subcategoria', name);
    } catch (err: any) {
      messageApi.error(err?.data?.message || 'Error al crear subcategoría');
    } finally {
      setAddingSubcategory(false);
    }
  };

  // ── Dropdown render personalizado para categoría ───────────────────────────
  const categoryDropdownRender = (menu: React.ReactNode) => (
    <div>
      {menu}
      <Divider style={{ margin: '4px 0' }} />
      <Button
        type="text"
        icon={<PlusOutlined />}
        onClick={handleOpenNewCategory}
        className={styles.dropdownAddBtn}
      >
        Agregar nueva categoría
      </Button>
    </div>
  );

  // ── Dropdown render personalizado para subcategoría ────────────────────────
  const subcategoryDropdownRender = (menu: React.ReactNode) => (
    <div>
      {menu}
      {selectedCategory && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleOpenNewSubcategory}
            className={styles.dropdownAddBtn}
          >
            Agregar nueva subcategoría
          </Button>
        </>
      )}
    </div>
  );

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
                loading={categoriesLoading}
                onChange={handleCategoryChange}
                dropdownRender={categoryDropdownRender}
                options={categories.map(cat => ({ value: cat.name, label: cat.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="subcategoria" label="Subcategoría">
              <Select
                placeholder="Seleccionar subcategoría"
                allowClear
                disabled={!selectedCategory}
                dropdownRender={subcategoryDropdownRender}
                options={subcategoryOptions}
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

      {/* Modal: Agregar nueva categoría */}
      <Modal
        title="Nueva categoría"
        open={newCategoryModalOpen}
        onCancel={() => setNewCategoryModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setNewCategoryModalOpen(false)}>
            Cancelar
          </Button>,
          <Button key="add" type="primary" loading={addingCategory} onClick={handleAddCategory}>
            Agregar
          </Button>,
        ]}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Nombre de la nueva categoría:</Text>
          <Input
            placeholder="Ej: Lubricantes, Herramientas..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleAddCategory}
            autoFocus
          />
        </Space>
      </Modal>

      {/* Modal: Agregar nueva subcategoría */}
      <Modal
        title="Nueva subcategoría"
        open={newSubcategoryModalOpen}
        onCancel={() => setNewSubcategoryModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setNewSubcategoryModalOpen(false)}>
            Cancelar
          </Button>,
          <Button key="add" type="primary" loading={addingSubcategory} onClick={handleAddSubcategory}>
            Agregar
          </Button>,
        ]}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            Nueva subcategoría para <strong>{selectedCategory}</strong>:
          </Text>
          <Input
            placeholder="Ej: Aceite 20W50, Pastillas de freno..."
            value={newSubcategoryName}
            onChange={(e) => setNewSubcategoryName(e.target.value)}
            onPressEnter={handleAddSubcategory}
            autoFocus
          />
        </Space>
      </Modal>
    </Card>
  );
};

export default ProductForm;
