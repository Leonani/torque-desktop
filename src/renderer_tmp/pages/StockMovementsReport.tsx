import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Row, Col, Select, DatePicker, Button, message } from 'antd';
import type { StockMovement } from '../types';
import type { Dayjs } from 'dayjs';
import api from '../services/api';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const StockMovementsReport: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const handleDateChange = (dates: unknown) => {
    setDateRange(dates as [Dayjs, Dayjs] | null);
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (dateRange?.length === 2) {
        params.from = dateRange[0].toISOString();
        params.to = dateRange[1].toISOString();
      }

      const response = await api.get('/stock/movements', { params });
      setMovements(response.data);
    } catch {
      message.error('Error cargando movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [type, dateRange]);

  const exportToExcel = () => {
    const data = movements.map((m) => ({
      producto: m.productId?.nombreProducto || '',
      codigoBarra: m.productId?.codigoBarra || '',
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      fecha: m.createdAt ? new Date(m.createdAt).toLocaleString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    XLSX.writeFile(workbook, 'movimientos_stock.xlsx');
  };

  const columns = [
    { title: 'Producto', dataIndex: ['productId', 'nombreProducto'], key: 'producto' },
    { title: 'Código', dataIndex: ['productId', 'codigoBarra'], key: 'codigo' },
    { title: 'Categoría', dataIndex: ['productId', 'categoria'], key: 'categoria' },
    { title: 'Subcategoría', dataIndex: ['productId', 'subcategoria'], key: 'subcategoria' },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo' },
    { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad' },
    { title: 'Motivo', dataIndex: 'motivo', key: 'motivo' },
    { title: 'Fecha', dataIndex: 'createdAt', key: 'createdAt' }
  ];

  return (
    <Card>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text strong style={{ fontSize: 18 }}>Reporte de Movimientos</Text>
        </Col>
        <Col>
          <Button type="primary" onClick={exportToExcel}>
            Exportar a Excel
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Select
            placeholder="Tipo"
            allowClear
            value={type}
            onChange={setType}
            style={{ width: '100%' }}
          >
            <Select.Option value="entrada">Entrada</Select.Option>
            <Select.Option value="salida">Salida</Select.Option>
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <RangePicker onChange={handleDateChange} style={{ width: '100%' }} />
        </Col>
      </Row>

      <Table columns={columns} dataSource={movements} rowKey="_id" loading={loading} />
    </Card>
  );
};

export default StockMovementsReport;
