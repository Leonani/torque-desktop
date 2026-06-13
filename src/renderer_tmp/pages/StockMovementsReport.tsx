import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Row, Col, Select, DatePicker, Button, message } from 'antd';
import type { StockMovement } from '../types';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import * as XLSX from 'xlsx';
import styles from './StockMovementsReport.module.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const motivoLabels: Record<string, string> = {
  compra: 'Compra',
  ajuste: 'Ajuste',
  uso_reparacion: 'Uso en reparación',
  devolucion: 'Devolución',
};

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
      Producto: m.nombreProducto,
      Código: m.codigoBarra || '',
      Categoría: m.categoria || '',
      Subcategoría: m.subcategoria || '',
      Tipo: m.tipo === 'entrada' ? 'Entrada' : 'Salida',
      Cantidad: m.cantidad,
      Motivo: motivoLabels[m.motivo] || m.motivo,
      Fecha: m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    // Auto-fit column widths
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...data.map((row) => String(row[key as keyof typeof row]).length),
      ),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
    XLSX.writeFile(workbook, 'movimientos_stock.xlsx');
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Producto',
      dataIndex: 'nombreProducto',
      key: 'producto',
      ellipsis: true,
      onHeaderCell: () => ({ className: styles.headerCell }),
    },
    {
      title: 'Código',
      dataIndex: 'codigoBarra',
      key: 'codigo',
      ellipsis: true,
      onHeaderCell: () => ({ className: styles.headerCell }),
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      onHeaderCell: () => ({ className: styles.headerCell }),
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Subcategoría',
      dataIndex: 'subcategoria',
      key: 'subcategoria',
      onHeaderCell: () => ({ className: styles.headerCell }),
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 110,
      onHeaderCell: () => ({ className: styles.headerCell }),
      render: (val: string) => (val === 'entrada' ? 'Entrada' : 'Salida'),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right',
      onHeaderCell: () => ({ className: styles.headerCell }),
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      ellipsis: true,
      onHeaderCell: () => ({ className: styles.headerCell }),
      render: (val: string) => motivoLabels[val] || val,
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      onHeaderCell: () => ({ className: styles.headerCell }),
      render: (val: string) => (val ? new Date(val).toLocaleString() : ''),
    },
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
