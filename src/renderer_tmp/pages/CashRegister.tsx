import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Card, Typography, Row, Col, Button, Space, Tag, Divider, Table, Modal,
  Form, InputNumber, Input, DatePicker, Statistic, message, Empty, Spin,
} from 'antd';
import {
  DollarOutlined, WalletOutlined, HistoryOutlined,
  FileTextOutlined, ReloadOutlined,
  LockOutlined, UnlockOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import {
  fetchCurrentRegister,
  openRegister,
  closeRegister,
  fetchRegisterHistory,
} from '../store/cashRegisterSlice';
import { getCashReport, getCashRegisterDetail } from '../services/api';
import { formatDate, formatDateTime } from '../utils/helpers';
import type { CashRegister, CashRegisterResumen, CashReport, Transaccion } from '../types';
import type { Dayjs } from 'dayjs';
import styles from './CashRegister.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

/**
 * Página de arqueo de caja
 * Muestra el estado actual de la caja, historial y reportes
 */
const CashRegister: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentRegister, history, loading } = useAppSelector(
    (state) => state.cashRegister,
  );

  // Modal states
  const [abrirModal, setAbrirModal] = useState(false);
  const [cerrarModal, setCerrarModal] = useState(false);
  const [reporteModal, setReporteModal] = useState(false);

  // Unified detail/summary data (used both after closing and when viewing history detail)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<{
    register: CashRegister;
    resumen: CashRegisterResumen;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Report data
  const [reportData, setReportData] = useState<CashReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Forms
  const [abrirForm] = Form.useForm();
  const [cerrarForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchCurrentRegister());
    dispatch(fetchRegisterHistory());
  }, [dispatch]);

  // ── Handlers ─────────────────────────────────────────────

  const handleOpenRegister = async () => {
    try {
      const values = await abrirForm.validateFields();
      await dispatch(
        openRegister({
          montoInicial: values.montoInicial,
          observaciones: values.observaciones || undefined,
        }),
      ).unwrap();
      message.success('Caja abierta correctamente');
      setAbrirModal(false);
      abrirForm.resetFields();
    } catch (err) {
      const error = err as { message?: string };
      if (error.message) {
        message.error(error.message);
      }
    }
  };

  const handleCloseRegister = async () => {
    try {
      const values = await cerrarForm.validateFields();
      const result = await dispatch(
        closeRegister({
          montoFinalDeclarado: values.montoFinalDeclarado,
          observaciones: values.observaciones || undefined,
        }),
      ).unwrap();
      setDetailData(result);
      setCerrarModal(false);
      cerrarForm.resetFields();
      // Refresh history after closing
      dispatch(fetchRegisterHistory());
      // Show unified detail modal
      setDetailModalOpen(true);
    } catch (err) {
      const error = err as { message?: string };
      if (error.message) {
        message.error(error.message);
      }
    }
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await getCashRegisterDetail(id);
      if (!data.resumen) {
        message.warning('Este arqueo no tiene resumen disponible');
        return;
      }
      setDetailData({ register: data, resumen: data.resumen });
      setDetailModalOpen(true);
    } catch {
      message.error('Error al obtener el detalle del arqueo');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateReport = async (
    dates: [Dayjs, Dayjs] | null,
  ) => {
    if (!dates || dates.length < 2) {
      message.warning('Seleccione un rango de fechas');
      return;
    }
    setReportLoading(true);
    try {
      const startDate = dates[0].toISOString();
      const endDate = dates[1].toISOString();
      const data = await getCashReport(startDate, endDate);
      setReportData(data);
    } catch {
      message.error('Error al generar el reporte');
    } finally {
      setReportLoading(false);
    }
  };

  /**
   * Exporta el reporte de caja a un archivo Excel (.xlsx)
   */
  const exportToExcel = () => {
    if (!reportData) return;

    const startStr = reportData.periodo.inicio.substring(0, 10);
    const endStr = reportData.periodo.fin.substring(0, 10);

    // Encabezado del reporte
    const excelData = [
      { Fecha: 'REPORTE DE CAJA', Descripcion: '', Importe: '' },
      { Fecha: `Período: ${formatDate(reportData.periodo.inicio)} — ${formatDate(reportData.periodo.fin)}`, Descripcion: '', Importe: '' },
      { Fecha: '', Descripcion: '', Importe: '' },
      { Fecha: 'Fecha', Descripcion: 'Descripción', Importe: 'Importe' },
    ];

    // Transacciones
    reportData.transacciones.forEach(function(t) {
      excelData.push({
        Fecha: formatDate(t.fecha),
        Descripcion: t.descripcion,
        Importe: t.importe.toString(),
      });
    });

    // Totales
    const totalIngresos = reportData.transacciones
      .filter(t => t.importe > 0)
      .reduce((sum, t) => sum + t.importe, 0);
    const totalEgresos = reportData.transacciones
      .filter(t => t.importe < 0)
      .reduce((sum, t) => sum + t.importe, 0);
    const saldoNeto = totalIngresos + totalEgresos;

    excelData.push(
      { Fecha: '', Descripcion: '', Importe: '' },
      { Fecha: '', Descripcion: 'Total Ingresos', Importe: totalIngresos.toString() },
      { Fecha: '', Descripcion: 'Total Egresos', Importe: totalEgresos.toString() },
      { Fecha: '', Descripcion: 'Saldo Neto', Importe: saldoNeto.toString() },
    );

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Caja');
    XLSX.writeFile(workbook, `reporte_caja_${startStr}_${endStr}.xlsx`);
  };

  // ── Computed values ───────────────────────────────────────

  const getElapsedTime = (fechaApertura: string): string => {
    const start = new Date(fechaApertura);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // ── History columns ───────────────────────────────────────

  const historyColumns = [
    {
      title: 'Fecha Apertura',
      dataIndex: 'fechaApertura',
      key: 'fechaApertura',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Fecha Cierre',
      dataIndex: 'fechaCierre',
      key: 'fechaCierre',
      render: (date: string | undefined) =>
        date ? formatDate(date) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Monto Inicial',
      dataIndex: 'montoInicial',
      key: 'montoInicial',
      render: (monto: number) =>
        `$${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    },
    {
      title: 'Monto Final',
      dataIndex: 'montoFinalDeclarado',
      key: 'montoFinalDeclarado',
      render: (monto: number | undefined) =>
        monto !== undefined ? (
          `$${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => (
        <Tag color={estado === 'abierta' ? 'processing' : 'default'}>
          {estado === 'abierta' ? 'Abierta' : 'Cerrada'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: CashRegister) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          disabled={record.estado !== 'cerrada'}
          onClick={() => {
            if (record._id) {
              handleViewDetail(record._id);
            }
          }}
        >
          {record.estado === 'cerrada' ? 'Ver detalle' : '—'}
        </Button>
      ),
    },
  ];

  // ── Desglose table helpers ────────────────────────────────

  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta_credito: 'Tarjeta Crédito',
    tarjeta_debito: 'Tarjeta Débito',
  };

  const metodoColor: Record<string, string> = {
    efectivo: 'green',
    transferencia: 'blue',
    tarjeta_credito: 'purple',
    tarjeta_debito: 'orange',
  };

  /**
   * Columnas de la tabla de movimientos del reporte de caja
   */
  const transactionColumns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (fecha: string) => formatDate(fecha),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
    },
    {
      title: 'Importe',
      dataIndex: 'importe',
      key: 'importe',
      width: 150,
      align: 'right' as const,
      render: (importe: number) => {
        const formatted = `$${Math.abs(importe).toLocaleString('es-AR', {
          minimumFractionDigits: 2,
        })}`;
        return (
          <Text strong style={{ color: importe >= 0 ? '#52c41a' : '#cf1322' }}>
            {importe >= 0 ? '+' : '-'}{formatted}
          </Text>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <Row justify="space-between" align="middle" className={styles.header}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <WalletOutlined style={{ marginRight: 8 }} />
            Arqueo de Caja
          </Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                dispatch(fetchCurrentRegister());
                dispatch(fetchRegisterHistory());
              }}
            >
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => {
                setReportData(null);
                setReporteModal(true);
              }}
            >
              Exportar Reporte
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Loading state */}
      {loading && currentRegister === null ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <br />
          <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
            Cargando estado de caja...
          </Text>
        </div>
      ) : (
        <>
          {/* Status Card */}
          <Card className={styles.statusCard}>
            {currentRegister === null ? (
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <LockOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                    <div>
                      <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                        Caja Cerrada
                      </Title>
                      <Text type="secondary">
                        No hay una caja abierta actualmente
                      </Text>
                    </div>
                  </Space>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    icon={<UnlockOutlined />}
                    onClick={() => {
                      abrirForm.resetFields();
                      setAbrirModal(true);
                    }}
                  >
                    Abrir Caja
                  </Button>
                </Col>
              </Row>
            ) : (
              <Row justify="space-between" align="middle">
                <Col xs={24} md={16}>
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Space>
                      <UnlockOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                        Caja Abierta
                      </Title>
                      <Tag color="processing">Activa</Tag>
                    </Space>
                    <Space wrap>
                      <Text>
                        <Text strong>Desde: </Text>
                        {currentRegister.fechaApertura
                          ? formatDate(currentRegister.fechaApertura)
                          : '-'}
                      </Text>
                      <Text>
                        <Text strong>Tiempo: </Text>
                        {currentRegister.fechaApertura
                          ? getElapsedTime(currentRegister.fechaApertura)
                          : '-'}
                      </Text>
                      <Text>
                        <Text strong>Monto Inicial: </Text>
                        <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                          ${(currentRegister.montoInicial ?? 0).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                      </Text>
                      {currentRegister.observaciones && (
                        <Text>
                          <Text strong>Obs: </Text>
                          {currentRegister.observaciones}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} md={8} style={{ textAlign: 'right', marginTop: 8 }}>
                  <Button
                    danger
                    size="large"
                    icon={<LockOutlined />}
                    onClick={() => {
                      cerrarForm.resetFields();
                      setCerrarModal(true);
                    }}
                  >
                    Cerrar Caja
                  </Button>
                </Col>
              </Row>
            )}
          </Card>

          {/* Summary stats when open */}
          {currentRegister && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Monto Inicial"
                    value={currentRegister.montoInicial ?? 0}
                    precision={2}
                    prefix="$"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Estado"
                    value="Abierta"
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<UnlockOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="Tiempo Transcurrido"
                    value={
                      currentRegister.fechaApertura
                        ? getElapsedTime(currentRegister.fechaApertura)
                        : '-'
                    }
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ── History Section ─────────────────────────────── */}
      <div className={styles.historySection}>
        <Title level={4}>
          <HistoryOutlined style={{ marginRight: 8 }} />
          Historial de Cierres
        </Title>
        <Card>
          <Table
            columns={historyColumns}
            dataSource={history}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Total: ${total} registros`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description="No hay registros de cierre"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════ */}

      {/* ── Modal: Abrir Caja ──────────────────────────── */}
      <Modal
        title="Abrir Caja"
        open={abrirModal}
        onCancel={() => setAbrirModal(false)}
        onOk={handleOpenRegister}
        okText="Abrir Caja"
        okButtonProps={{ icon: <UnlockOutlined /> }}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        <Form
          form={abrirForm}
          layout="vertical"
          initialValues={{ montoInicial: 0 }}
        >
          <Form.Item
            name="montoInicial"
            label="Monto Inicial"
            rules={[
              { required: true, message: 'Ingrese el monto inicial' },
              {
                type: 'number',
                min: 0,
                message: 'El monto no puede ser negativo',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              placeholder="0.00"
              size="large"
              autoFocus
              precision={2}
              min={0}
            />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones (opcional)">
            <TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Cerrar Caja ─────────────────────────── */}
      <Modal
        title="Cerrar Caja"
        open={cerrarModal}
        onCancel={() => setCerrarModal(false)}
        onOk={handleCloseRegister}
        okText="Cerrar Caja"
        okButtonProps={{ danger: true, icon: <LockOutlined /> }}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        <Form form={cerrarForm} layout="vertical">
          <Form.Item
            name="montoFinalDeclarado"
            label="Monto Final Declarado"
            rules={[
              { required: true, message: 'Ingrese el monto final' },
              {
                type: 'number',
                min: 0,
                message: 'El monto no puede ser negativo',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              placeholder="0.00"
              size="large"
              autoFocus
              precision={2}
              min={0}
            />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones (opcional)">
            <TextArea rows={3} placeholder="Notas sobre el cierre..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal: Detalle de Arqueo (unificado: post-cierre + historial) ── */}
      <Modal
        title="Detalle del Arqueo"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Cerrar
          </Button>,
        ]}
        width={700}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <br />
            <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
              Cargando detalle...
            </Text>
          </div>
        ) : detailData ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Fecha de Apertura: </Text>
                <Text>
                  {detailData.register.fechaApertura
                    ? formatDateTime(detailData.register.fechaApertura)
                    : '-'}
                </Text>
              </Col>
              <Col span={12}>
                <Text strong>Fecha de Cierre: </Text>
                <Text>
                  {detailData.register.fechaCierre
                    ? formatDateTime(detailData.register.fechaCierre)
                    : '-'}
                </Text>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Totales</Title>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Monto Inicial"
                  value={detailData.resumen.montoInicial}
                  precision={2}
                  prefix="$"
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Ventas"
                  value={detailData.resumen.totalVentas}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Ingresos"
                  value={detailData.resumen.totalIngresos}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Devoluciones"
                  value={detailData.resumen.totalDevoluciones}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Desglose de Pagos</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(detailData.resumen.desglosePagos).map(
                ([metodo, monto]) => (
                  <Col xs={12} sm={6} key={metodo}>
                    <Tag color={metodoColor[metodo] || 'default'}>
                      {metodoLabel[metodo] || metodo}
                    </Tag>
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                      ${(monto ?? 0).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </Col>
                ),
              )}
            </Row>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card className={styles.activoCard} size="small">
                  <Statistic
                    title="Saldo Neto Computado"
                    value={detailData.resumen.montoFinalComputado}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Declarado"
                    value={detailData.resumen.montoFinalDeclarado}
                    precision={2}
                    prefix="$"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card
                  className={
                    detailData.resumen.diferencia >= 0
                      ? styles.activoCard
                      : styles.pasivoCard
                  }
                  size="small"
                >
                  <Statistic
                    title="Diferencia"
                    value={Math.abs(detailData.resumen.diferencia)}
                    precision={2}
                    prefix={
                      detailData.resumen.diferencia >= 0 ? '+' : '-$'
                    }
                    valueStyle={{
                      color:
                        detailData.resumen.diferencia >= 0
                          ? '#52c41a'
                          : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type="secondary">No hay datos disponibles</Text>
          </div>
        )}
      </Modal>

      {/* ── Modal: Reporte / Exportar ──────────────────── */}
      <Modal
        title="Exportar Reporte de Caja"
        open={reporteModal}
        onCancel={() => {
          setReporteModal(false);
          setReportData(null);
        }}
        footer={
          reportData
            ? [
                <Button
                  key="export"
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={exportToExcel}
                >
                  Exportar a Excel
                </Button>,
                <Button
                  key="close"
                  onClick={() => {
                    setReporteModal(false);
                    setReportData(null);
                  }}
                >
                  Cerrar
                </Button>,
              ]
            : null
        }
        width={800}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        {!reportData ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Text>Seleccione un rango de fechas para generar el reporte</Text>
              <RangePicker
                onChange={(dates) => handleGenerateReport(dates as [Dayjs, Dayjs] | null)}
                style={{ width: '100%' }}
                size="large"
              />
              {reportLoading && (
                <div>
                  <Spin />
                  <br />
                  <Text type="secondary">Generando reporte...</Text>
                </div>
              )}
            </Space>
          </div>
        ) : (
          <div>
            <Row justify="space-between" style={{ marginBottom: 16 }}>
              <Col>
                <Text strong>Período:</Text>
                <Text>
                  {' '}
                  {formatDate(reportData.periodo.inicio)} —{' '}
                  {formatDate(reportData.periodo.fin)}
                </Text>
              </Col>
              <Col>
                <Text strong>Visitas:</Text>
                <Text> {reportData.cantidadVisitas}</Text>
              </Col>
            </Row>

            <Divider />

            {/* Activos Card */}
            <Card
              className={styles.activoCard}
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <span>Activos (Ingresos)</span>
                </Space>
              }
              size="small"
            >
              <Statistic
                title="Total Ingresos"
                value={reportData.activos.totalIngresos}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#52c41a', fontSize: 28 }}
              />
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text type="secondary">Efectivo:</Text>
                  <div style={{ fontWeight: 600 }}>
                    ${(reportData.activos.efectivo ?? 0).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Transferencia:</Text>
                  <div style={{ fontWeight: 600 }}>
                    ${(reportData.activos.transferencia ?? 0).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Tarjeta Crédito:</Text>
                  <div style={{ fontWeight: 600 }}>
                    ${(reportData.activos.tarjeta_credito ?? 0).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Tarjeta Débito:</Text>
                  <div style={{ fontWeight: 600 }}>
                    ${(reportData.activos.tarjeta_debito ?? 0).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Pasivos Card */}
            <Card
              className={styles.pasivoCard}
              style={{ marginBottom: 16 }}
              title={
                <Space>
                  <span style={{ color: '#cf1322' }}>Pasivos (Egresos)</span>
                </Space>
              }
              size="small"
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total Devoluciones"
                    value={reportData.pasivos.totalDevoluciones}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Notas de Crédito"
                    value={reportData.pasivos.cantidadNotas}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total Compras Stock"
                    value={reportData.pasivos.totalComprasStock}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Compras Realizadas"
                    value={reportData.pasivos.cantidadComprasStock}
                  />
                </Col>
              </Row>
            </Card>

            {/* Saldo Neto Card */}
            <Card
              className={styles.netoCard}
              title={
                <Space>
                  <span style={{ color: '#1890ff' }}>Saldo Neto</span>
                </Space>
              }
              size="small"
            >
              <Statistic
                title="Resultado Final"
                value={reportData.saldoNeto}
                precision={2}
                prefix="$"
                valueStyle={{
                  color: reportData.saldoNeto >= 0 ? '#52c41a' : '#cf1322',
                  fontSize: 28,
                }}
              />
            </Card>

            <Divider />

            <Title level={5} style={{ marginTop: 16 }}>
              Detalle de Movimientos
            </Title>

            <Table
              columns={transactionColumns}
              dataSource={reportData.transacciones}
              pagination={false}
              rowKey={(record: Transaccion, index?: number) => `${record.fecha}-${index}`}
              size="small"
              className={styles.reportTable}
              showHeader
              summary={() => {
                const total = reportData.transacciones.reduce((sum, t) => sum + t.importe, 0);
                const totalIngresos = reportData.transacciones
                  .filter(t => t.importe > 0)
                  .reduce((sum, t) => sum + t.importe, 0);
                const totalEgresos = reportData.transacciones
                  .filter(t => t.importe < 0)
                  .reduce((sum, t) => sum + t.importe, 0);
                return (
                  <>
                    <Table.Summary.Row className={styles.tableTotalRow}>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Total Ingresos</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong style={{ color: '#52c41a' }}>
                          +${totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row className={styles.tableTotalRow}>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Total Egresos</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong style={{ color: '#cf1322' }}>
                          -${Math.abs(totalEgresos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row className={styles.tableNetoRow}>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Saldo Neto</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong style={{ color: total >= 0 ? '#52c41a' : '#cf1322', fontSize: 16 }}>
                          {total >= 0 ? '+' : '-'}${Math.abs(total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                );
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="No hay movimientos en el período"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashRegister;
