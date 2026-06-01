import { FC } from 'react';
import { Card, Typography, Row, Col, Button, Spin, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingOutlined } from '@ant-design/icons';
import { useGetProductByIdQuery } from '@/services/productApi';
import styles from './ProductDetail.module.css';

const { Title, Text } = Typography;

/**
 * Detalle de un producto
 * @returns {JSX.Element} Componente de detalle de producto
 */
const ProductDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading, error } = useGetProductByIdQuery(id || '', {
    skip: !id,
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin indicator={<LoadingOutlined className={styles.loadingIcon} />} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Button onClick={() => navigate('/products')}>Volver</Button>
      <Card className={styles.marginTop16}>
          <Title level={4}>Producto no encontrado</Title>
          {error && (
              <Alert
                type="error"
                message="Error cargando el producto"
                className={styles.marginTop16}
                showIcon
              />
          )}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={() => navigate('/products')}>Volver</Button>
      <Card style={{ marginTop: 16 }}>
        <Title level={3}>{product.nombreProducto}</Title>
        <Row gutter={16}>
          <Col span={8}><Text strong>Código:</Text> {product.codigoBarra || '-'}</Col>
          <Col span={8}><Text strong>Categoría:</Text> {product.categoria || '-'}</Col>
          <Col span={8}><Text strong>Subcategoría:</Text> {product.subcategoria || '-'}</Col>
          <Col span={8}><Text strong>Cantidad:</Text> {product.cantidad}</Col>
          <Col span={8}><Text strong>Precio Compra:</Text> {product.precioCompra}</Col>
          <Col span={8}><Text strong>Precio Venta:</Text> {product.precioVenta}</Col>
        </Row>
      </Card>

      {/* TODO: Agregar sección de movimientos cuando se implemente el endpoint en productApi */}
    </div>
  );
};

export default ProductDetail;
