import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Card, Typography, Tag, Empty, Row, Col, Button } from 'antd';
import { DollarOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { DebtEntry } from '@/types';
import { getDebts } from '@/services/api';
import { formatDate } from '@/utils/helpers';

const { Text, Title } = Typography;

const Debts: React.FC = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDebts = async () => {
    setLoading(true);
    try {
      const data = await getDebts();
      setDebts(data);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const totalGeneral = debts.reduce((sum, d) => sum + d.totalDeuda, 0);

  const columns = [
    {
      title: 'Cliente',
      dataIndex: 'ownerName',
      key: 'ownerName',
      sorter: (a: DebtEntry, b: DebtEntry) => a.ownerName.localeCompare(b.ownerName),
    },
    {
      title: 'Patente',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      render: (text: string) => <Tag color="blue">{text?.toUpperCase()}</Tag>,
    },
    {
      title: 'Vehículo',
      key: 'vehicle',
      render: (_: unknown, record: DebtEntry) => `${record.brand} ${record.model}`,
    },
    {
      title: 'Ingreso',
      dataIndex: 'fechaIngreso',
      key: 'fechaIngreso',
      render: (fecha?: string) => fecha ? formatDate(fecha) : '-',
    },
    {
      title: 'Visitas con Deuda',
      dataIndex: 'visitasConDeuda',
      key: 'visitasConDeuda',
      render: (count: number) => <Tag>{count} {count === 1 ? 'visita' : 'visitas'}</Tag>,
    },
    {
      title: 'Deuda Total',
      dataIndex: 'totalDeuda',
      key: 'totalDeuda',
      render: (monto: number) => (
        <Text strong style={{ color: '#cf1322', fontSize: '16px' }}>
          ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a: DebtEntry, b: DebtEntry) => a.totalDeuda - b.totalDeuda,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Último Pago',
      dataIndex: 'ultimoPago',
      key: 'ultimoPago',
      render: (fecha?: string) => fecha ? formatDate(fecha) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: DebtEntry) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/vehicles/${record.vehicleId}`)}
        >
          Ver detalle
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined style={{ marginRight: 8 }} />
            Deudas de Clientes
          </Title>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadDebts}>
            Actualizar
          </Button>
        </Col>
      </Row>

      {debts.length > 0 && (
        <Card style={{ marginBottom: '16px', background: 'var(--theme-bg-elevated)', borderLeft: '4px solid var(--theme-primary)' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong style={{ fontSize: '18px' }}>
                Total General de Deudas:
              </Text>
            </Col>
            <Col>
              <Text strong style={{ fontSize: '24px', color: '#cf1322' }}>
                ${totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={debts}
          rowKey="vehicleId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total: ${total} clientes con deuda`,
          }}
          locale={{
            emptyText: (
              <Empty
                description="No hay deudas pendientes"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default Debts;
