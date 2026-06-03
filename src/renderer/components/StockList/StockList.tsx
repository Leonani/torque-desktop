import { FC, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  Row,
  Col,
  Select,
  Popconfirm,
  Typography,
  Modal,
  Alert
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery, useDeleteProductMutation } from '@/services/productApi';
import { useGetCategoriesQuery } from '@/services/categoryApi';
import type { Product } from '@/types';
import ProductForm from '@components/ProductForm/ProductForm';
import styles from './StockList.module.css';

const { Text } = Typography;

/**
 * Lista de productos en stock con filtros y acciones CRUD
 * @returns {JSX.Element} Componente de lista de stock
 */
const StockList: FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: products = [], isLoading, error } = useGetProductsQuery({
    search,
    categoria: categoryFilter || undefined,
  });
  const [deleteProduct] = useDeleteProductMutation();

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await deleteProduct(id).unwrap();
      // El caché se invalida automáticamente - no necesita loadProducts()
    } catch {
      // El error se maneja por el componente de alerta
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombreProducto',
      key: 'nombreProducto'
    },
    {
      title: 'Código',
      dataIndex: 'codigoBarra',
      key: 'codigoBarra'
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria'
    },
    {
      title: 'Subcategoría',
      dataIndex: 'subcategoria',
      key: 'subcategoria'
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad'
    },
    {
      title: 'Precio Compra',
      dataIndex: 'precioCompra',
      key: 'precioCompra'
    },
    {
      title: 'Precio Venta',
      dataIndex: 'precioVenta',
      key: 'precioVenta'
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/products/${record._id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditId(record._id || null);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title="¿Eliminar producto?"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" className={styles.header}>
        <Col>
          <Text strong className={styles.title}>Stock de Productos</Text>
        </Col>
        <Col>
          <Space>
            <Button onClick={() => navigate('/stock/report')}>
              Reporte Movimientos
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditId(null);
                setModalOpen(true);
              }}
            >
              Nuevo Producto
            </Button>
          </Space>
        </Col>
      </Row>

      <Card className={styles.marginBottom24}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Buscar por nombre o código"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              placeholder="Filtrar por categoría"
              allowClear
              className={styles.fullWidth}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map(cat => ({ value: cat.name, label: cat.name }))}
            />
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert
          type="error"
          message="Error cargando productos"
          className={styles.marginBottom16}
          showIcon
        />
      )}

      <Table
        columns={columns}
        dataSource={products}
        rowKey="_id"
        loading={isLoading}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
        destroyOnHidden
        title={editId ? 'Editar Producto' : 'Nuevo Producto'}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <ProductForm isModal productId={editId} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default StockList;
