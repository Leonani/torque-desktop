import React, { useEffect, useState } from 'react';
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
  Tag,
  Empty,
  Typography,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import {
  fetchVehicles,
  deleteVehicle,
  setFilters,
  clearFilters,
} from '../store/vehicleSlice';
import type { VehicleListItem } from '../types';
import { formatDate } from '../utils/helpers';
import VehicleForm from './VehicleForm';

const { Text } = Typography;
const { Option } = Select;

const VehicleList: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { vehicles, loading, filters } = useAppSelector((state) => state.vehicles);

  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const loadFilterOptions = () => {
    const uniqueBrands = [...new Set(vehicles.map((v) => v.brand))];
    const uniqueModels = [...new Set(vehicles.map((v) => v.model))];

    setBrands(uniqueBrands);
    setModels(uniqueModels);
  };

  useEffect(() => {
    dispatch(fetchVehicles(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    loadFilterOptions();
  }, [vehicles]);

  const handleDelete = async (id: string) => {
    await dispatch(deleteVehicle(id));
  };

  const columns = [
    {
      title: 'Patente',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      render: (text: string) => <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>{text?.toUpperCase()}</Tag>,
      sorter: (a: VehicleListItem, b: VehicleListItem) => (a.licensePlate || '').localeCompare(b.licensePlate || ''),
    },
    {
      title: 'Cliente',
      dataIndex: 'ownerName',
      key: 'ownerName',
      sorter: (a: VehicleListItem, b: VehicleListItem) => (a.ownerName || '').localeCompare(b.ownerName || ''),
    },
    {
      title: 'Marca',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Modelo',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Año',
      dataIndex: 'year',
      key: 'year',
      sorter: (a: VehicleListItem, b: VehicleListItem) => a.year - b.year,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (text: string) => text || '-',
    },
    {
      title: 'Visitas',
      dataIndex: 'visitCount',
      key: 'visitCount',
      render: (count: number) => <Tag>{count} {count === 1 ? 'vez' : 'veces'}</Tag>,
    },
    {
      title: 'Último Ingreso',
      dataIndex: 'lastVisitDate',
      key: 'lastVisitDate',
      render: (date: string) => formatDate(date),
      sorter: (a: VehicleListItem, b: VehicleListItem) => {
        if (!a.lastVisitDate) return 1;
        if (!b.lastVisitDate) return -1;
        return new Date(a.lastVisitDate).getTime() - new Date(b.lastVisitDate).getTime();
      },
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: VehicleListItem) => (
        <Space>
          <Button
            type="text"
            icon={<PrinterOutlined />}
            onClick={() => handlePrintVehicle(record)}
            title="Imprimir"
          />
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/vehicles/${record._id}`)}
            title="Ver detalles"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => {
              setEditId(record._id || null);
              setModalOpen(true);
            }}
            title="Editar"
          />
          <Popconfirm
            title="¿Eliminar vehículo?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => record._id && handleDelete(record._id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Eliminar" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handlePrintVehicle = (record: VehicleListItem) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Trabajo - ${record.licensePlate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #333; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .label { font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Orden de Trabajo</h1>
        <div class="info-grid">
          <div><span class="label">Patente:</span> ${record.licensePlate.toUpperCase()}</div>
          <div><span class="label">Marca/Modelo:</span> ${record.brand} ${record.model}</div>
          <div><span class="label">Año:</span> ${record.year}</div>
          <div><span class="label">Color:</span> ${record.color || '-'}</div>
          <div><span class="label">Dueño:</span> ${record.ownerName}</div>
          <div><span class="label">Visitas:</span> ${record.visitCount}</div>
          <div><span class="label">Último Ingreso:</span> ${formatDate(record.lastVisitDate || record.createdAt || '')}</div>
        </div>
        <div class="footer">Ver detalle completo en el sistema</div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const vehicleListContent = (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Text strong style={{ fontSize: '24px', color: '#fafafa' }}>Vehículos Ingresados</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => {
              setEditId(null);
              setModalOpen(true);
            }}
          >
            Nuevo Ingreso
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Buscar por dueño o patente..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => dispatch(setFilters({ search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="Filtrar por marca"
              value={filters.brand || undefined}
              onChange={(value) => dispatch(setFilters({ brand: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              {brands.map((brand) => (
                <Option key={brand} value={brand}>
                  {brand}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="Filtrar por modelo"
              value={filters.model || undefined}
              onChange={(value) => dispatch(setFilters({ model: value }))}
              allowClear
              style={{ width: '100%' }}
            >
              {models.map((model) => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Button onClick={() => dispatch(clearFilters())} block>
              Limpiar filtros
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={vehicles}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} vehículos`,
        }}
        locale={{
          emptyText: (
            <Empty
              description="No hay vehículos ingresados"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={1200}
        destroyOnHidden
        title={editId ? 'Editar Vehículo' : 'Nuevo Ingreso'}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <VehicleForm isModal vehicleId={editId} initialStep={editId ? 2 : 0} onDone={() => setModalOpen(false)} />
      </Modal>
    </>
  );

  return vehicleListContent;
};

export default VehicleList;
