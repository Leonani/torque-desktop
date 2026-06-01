import React, { useEffect, useState } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Row,
  Col,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Empty,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { Appointment, Vehicle, Owner } from '../types';
import { getAppointments, createAppointment, updateAppointment, updateAppointmentStatus, deleteAppointment, getVehicles, getOwners, createOwner } from '../services/api';
import { getVehicleBrands, getVehicleYears, getModelsForBrand, DEFAULT_BRANDS, type VehicleBrand } from '../services/vehicleApi';

const { Text, Title } = Typography;
const { TextArea } = Input;

const AppointmentCalendar: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedOwner, setSelectedOwner] = useState<string | undefined>(undefined);
  const [brands, setBrands] = useState<VehicleBrand[]>(DEFAULT_BRANDS);
  const [years, setYears] = useState<number[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandModels, setBrandModels] = useState<string[]>([]);
  const [form] = Form.useForm();
  
  // Modal nuevo cliente
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', apellido: '', dni: '', telefono: '' });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Modal nueva marca
  const [newBrandModalOpen, setNewBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  // Modal nuevo modelo
  const [newModelModalOpen, setNewModelModalOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');

  // Cargar marcas y años
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const [brandsData, yearsData] = await Promise.all([
          getVehicleBrands(),
          getVehicleYears(),
        ]);
        setBrands(brandsData);
        setYears(yearsData);
      } catch (error) {
        console.error('Error loading brands:', error);
      }
    };
    loadBrands();
  }, []);

  // Filtrar vehículos según el cliente seleccionado
  const filteredVehicles = selectedOwner 
    ? vehicles.filter(v => {
        const owner = owners.find(o => `${o.nombre} ${o.apellido}` === selectedOwner);
        return owner && v.ownerName === `${owner.nombre} ${owner.apellido}`;
      })
    : vehicles;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsData, vehiclesData, ownersData] = await Promise.all([
        getAppointments(),
        getVehicles(),
        getOwners(),
      ]);
      setAppointments(appointmentsData);
      setVehicles(vehiclesData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDate = (date: Dayjs): Appointment[] => {
    return appointments.filter(apt => {
      const aptDate = dayjs(apt.date);
      return aptDate.isSame(date, 'day');
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pendiente': return 'orange';
      case 'confirmado': return 'blue';
      case 'completado': return 'green';
      case 'cancelado': return 'red';
      default: return 'default';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'revision': return 'gold';
      case 'mantenimiento': return 'cyan';
      case 'reparacion': return 'purple';
      case 'otro': return 'default';
      default: return 'default';
    }
  };

  const dateCellRender = (date: Dayjs) => {
    const dayAppointments = getAppointmentsForDate(date);
    if (dayAppointments.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayAppointments.slice(0, 3).map(apt => (
          <li key={apt._id} style={{ marginBottom: 2 }}>
            <Badge 
              color={getStatusColor(apt.status)} 
              text={
                <Text style={{ fontSize: 10 }} ellipsis>
                  {apt.time} - {apt.licensePlate}
                </Text>
              }
            />
          </li>
        ))}
        {dayAppointments.length > 3 && (
          <li>
            <Text type="secondary" style={{ fontSize: 10 }}>
              +{dayAppointments.length - 3} más
            </Text>
          </li>
        )}
      </ul>
    );
  };

  const handleOpenModal = (appointment?: Appointment, date?: Dayjs) => {
    if (appointment) {
      setEditingAppointment(appointment);
      // Buscar el cliente del turno
      const ownerOfAppointment = owners.find(o => `${o.nombre} ${o.apellido}` === appointment.ownerName);
      setSelectedOwner(ownerOfAppointment ? `${ownerOfAppointment.nombre} ${ownerOfAppointment.apellido}` : undefined);
      
      form.setFieldsValue({
        ...appointment,
        date: dayjs(appointment.date),
        time: dayjs(`${appointment.date} ${appointment.time}`, 'YYYY-MM-DD HH:mm'),
      });
    } else {
      setEditingAppointment(null);
      setSelectedOwner(undefined);
      form.resetFields();
      if (date) {
        form.setFieldValue('date', date);
        form.setFieldValue('time', dayjs().add(1, 'hour').startOf('hour'));
      }
    }
    setModalOpen(true);
  };

  const handleVehicleSelect = (vehicleId: string | undefined) => {
    if (vehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find(v => v._id === vehicleId);
      if (selectedVehicle) {
        form.setFieldsValue({
          ownerName: selectedVehicle.ownerName,
          licensePlate: selectedVehicle.licensePlate,
          brand: selectedVehicle.brand,
          model: selectedVehicle.model,
        });
        // También actualizar el selectedOwner
        setSelectedOwner(selectedVehicle.ownerName);
      }
    }
  };

  const handleOwnerChange = (value: string | undefined) => {
    setSelectedOwner(value);
    // Limpiar vehículo seleccionado cuando cambia el cliente
    form.setFieldValue('vehicleId', undefined);
    
    if (value && owners.length > 0) {
      const selectedOwnerData = owners.find(o => `${o.nombre} ${o.apellido}` === value);
      if (selectedOwnerData && vehicles.length > 0) {
        const ownerVehicle = vehicles.find(v => v.ownerName === `${selectedOwnerData.nombre} ${selectedOwnerData.apellido}`);
        if (ownerVehicle) {
          form.setFieldsValue({
            vehicleId: ownerVehicle._id,
            licensePlate: ownerVehicle.licensePlate,
            brand: ownerVehicle.brand,
            model: ownerVehicle.model,
          });
        }
      }
    }
  };

  const handleBrandChange = (value: string | null) => {
    setSelectedBrand(value);
    form.setFieldValue('model', null);
    if (value) {
      setBrandModels(getModelsForBrand(value));
    } else {
      setBrandModels([]);
    }
  };

  // Función para agregar nueva marca
  const handleAddNewBrand = () => {
    if (!newBrandName.trim()) {
      message.error('Ingrese el nombre de la marca');
      return;
    }
    const exists = brands.some(b => b.name.toUpperCase() === newBrandName.trim().toUpperCase());
    if (exists) {
      message.error('Esta marca ya existe');
      return;
    }
    setIsAddingBrand(true);
    const newBrand: VehicleBrand = { name: newBrandName.trim(), models: [] };
    const updatedBrands = [...brands, newBrand].sort((a, b) => a.name.localeCompare(b.name));
    setBrands(updatedBrands);
    setSelectedBrand(newBrandName.trim());
    setBrandModels([]);
    form.setFieldValue('brand', newBrandName.trim());
    form.setFieldValue('model', null);
    setNewBrandName('');
    setNewBrandModalOpen(false);
    setIsAddingBrand(false);
    message.success(`Marca "${newBrandName.trim()}" agregada`);
  };

  // Función para agregar nuevo modelo
  const handleAddNewModel = () => {
    if (!newModelName.trim()) {
      message.error('Ingrese el nombre del modelo');
      return;
    }
    if (!selectedBrand) {
      message.error('Seleccione una marca primero');
      return;
    }
    const exists = brandModels.some(m => m.toUpperCase() === newModelName.trim().toUpperCase());
    if (exists) {
      message.error('Este modelo ya existe para esta marca');
      return;
    }
    const updatedModels = [...brandModels, newModelName.trim()].sort((a, b) => a.localeCompare(b));
    setBrandModels(updatedModels);
    const updatedBrands = brands.map(b => 
      b.name.toUpperCase() === selectedBrand.toUpperCase()
        ? { ...b, models: updatedModels }
        : b
    );
    setBrands(updatedBrands);
    form.setFieldValue('model', newModelName.trim());
    setNewModelName('');
    setNewModelModalOpen(false);
    message.success(`Modelo "${newModelName.trim()}" agregado a ${selectedBrand}`);
  };

  // Custom dropdown para marca
  const brandDropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Button 
        type="text" 
        icon={<PlusOutlined />} 
        onClick={() => setNewBrandModalOpen(true)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Agregar nueva marca
      </Button>
    </>
  );

  // Custom dropdown para modelo
  const modelDropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Button 
        type="text" 
        icon={<PlusOutlined />} 
        onClick={() => setNewModelModalOpen(true)}
        disabled={!selectedBrand}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Agregar nuevo modelo
      </Button>
    </>
  );

  // Función para crear nuevo cliente
  const handleSaveNewClient = async () => {
    if (!newClientData.nombre.trim()) {
      message.error('Ingrese el nombre');
      return;
    }
    if (!newClientData.apellido.trim()) {
      message.error('Ingrese el apellido');
      return;
    }
    
    setIsSavingClient(true);
    try {
      const createdClient = await createOwner({
        nombre: newClientData.nombre.trim(),
        apellido: newClientData.apellido.trim(),
        dni: newClientData.dni.trim() || undefined,
        telefono: newClientData.telefono.trim() || undefined,
      });
      
      setOwners(prev => [...prev, createdClient].sort((a, b) => 
        `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
      ));
      
      const fullName = `${createdClient.nombre} ${createdClient.apellido}`;
      form.setFieldValue('ownerName', fullName);
      setSelectedOwner(fullName);
      setNewClientData({ nombre: '', apellido: '', dni: '', telefono: '' });
      setNewClientModalOpen(false);
      message.success('Cliente agregado exitosamente');
    } catch (error) {
      console.error('Error creating client:', error);
      message.error('Error al crear el cliente');
    } finally {
      setIsSavingClient(false);
    }
  };

  // Custom dropdown render para cliente
  const clientDropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Button 
        type="text" 
        icon={<PlusOutlined />} 
        onClick={() => setNewClientModalOpen(true)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Agregar nuevo cliente
      </Button>
    </>
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // Si seleccionó un vehículo, obtener datos para auto-completar
      let ownerName = values.ownerName || '';
      let licensePlate = values.licensePlate?.toUpperCase() || '';
      let brand = values.brand?.toUpperCase() || '';
      let model = values.model?.toUpperCase() || '';
      
      if (values.vehicleId && vehicles.length > 0) {
        const selectedVehicle = vehicles.find(v => v._id === values.vehicleId);
        if (selectedVehicle) {
          ownerName = ownerName || selectedVehicle.ownerName;
          licensePlate = licensePlate || selectedVehicle.licensePlate;
          brand = brand || selectedVehicle.brand;
          model = model || selectedVehicle.model;
        }
      }

      const appointmentData = {
        vehicleId: values.vehicleId,
        ownerName,
        licensePlate,
        brand,
        model,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        type: values.type,
        notes: values.notes,
        status: editingAppointment?.status || 'pendiente',
      };

      if (editingAppointment?._id) {
        await updateAppointment(editingAppointment._id, appointmentData);
        message.success('Turno actualizado');
      } else {
        await createAppointment(appointmentData);
        message.success('Turno creado');
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving appointment:', error);
      message.error('Error al guardar el turno');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      message.success('Estado actualizado');
      loadData();
    } catch (error) {
      message.error('Error al actualizar estado');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment(id);
      message.success('Turno eliminado');
      loadData();
    } catch (error) {
      message.error('Error al eliminar turno');
    }
  };

  const selectedDateAppointments = getAppointmentsForDate(selectedDate);

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Text strong style={{ fontSize: 18, color: 'white' }}>Calendario de Turnos</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => handleOpenModal(undefined, selectedDate)}
          >
            Nuevo Turno
          </Button>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card loading={loading} style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}>
            <Calendar
              style={{ padding: '16px', borderRadius: '12px' }}
              onSelect={(date) => setSelectedDate(date)}
              cellRender={(date, info) => {
                if (info.type === 'date') return dateCellRender(date);
                return info.originNode;
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={`Turnos del ${selectedDate.format('DD/MM/YYYY')}`}
            // extra={<Button size="small" onClick={() => handleOpenModal(undefined, selectedDate)} icon={<PlusOutlined />}>Agregar</Button>}
          >
            {selectedDateAppointments.length === 0 ? (
              <Empty description="No hay turnos para este día" />
            ) : (
              <Space orientation="vertical" style={{ width: '100%' }} size="small">
                {selectedDateAppointments.map(apt => (
                  <Card key={apt._id} size="small" style={{ background: '#fafafa' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Tag color={getStatusColor(apt.status)}>{apt.status?.toUpperCase()}</Tag>
                        <Text strong>{apt.licensePlate}</Text>
                        <br />
                        <Text type="secondary">{apt.time}</Text>
                        <br />
                        <Text>{apt.ownerName}</Text>
                      </Col>
                      <Col>
                        <Space orientation="vertical" size="small">
                          {apt.status === 'pendiente' && (
                            <Button 
                              size="small" 
                              icon={<CheckOutlined />} 
                              onClick={() => handleStatusChange(apt._id!, 'confirmado')}
                              title="Confirmar"
                            />
                          )}
                          {apt.status === 'confirmado' && (
                            <Button 
                              size="small" 
                              type="primary"
                              icon={<CheckOutlined />} 
                              onClick={() => handleStatusChange(apt._id!, 'completado')}
                              title="Completar"
                            />
                          )}
                          <Button 
                            size="small" 
                            icon={<EditOutlined />} 
                            onClick={() => handleOpenModal(apt)}
                            title="Editar"
                          />
                          <Popconfirm
                            title="¿Eliminar turno?"
                            onConfirm={() => handleDelete(apt._id!)}
                            okText="Eliminar"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} title="Eliminar" />
                          </Popconfirm>
                        </Space>
                      </Col>
                    </Row>
                    <Row style={{ marginTop: 8 }}>
                      <Col>
                        <Tag color={getTypeColor(apt.type)}>{apt.type}</Tag>
                        {apt.notes && <Text type="secondary" style={{ fontSize: 12 }}>{apt.notes}</Text>}
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={<div style={{ fontSize: '20px', textAlign: 'center', marginBottom: '16px' }}>{editingAppointment ? 'Editar Turno' : 'Nuevo Turno'}</div>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
<Form form={form} layout="vertical">
          {/* Cliente y Tipo de turno - dos columnas */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ownerName"
                label="Cliente"
              >
                <Select 
                  placeholder="Seleccionar cliente"
                  showSearch
                  allowClear
                  popupRender={clientDropdownRender}
                  onChange={handleOwnerChange}
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {owners.map(o => (
                    <Select.Option key={o._id} value={`${o.nombre} ${o.apellido}`}>
                      {o.nombre} {o.apellido}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de turno"
                rules={[{ required: true, message: 'Seleccione el tipo' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  <Select.Option value="revision">Revisión</Select.Option>
                  <Select.Option value="mantenimiento">Mantenimiento</Select.Option>
                  <Select.Option value="reparacion">Reparación</Select.Option>
                  <Select.Option value="otro">Otro</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Fecha y Hora */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Fecha"
                rules={[{ required: true, message: 'Seleccione la fecha' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="time"
                label="Hora"
                rules={[{ required: true, message: 'Seleccione la hora' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Vehículo (solo si hay cliente seleccionado) */}
          {selectedOwner && filteredVehicles.length > 0 && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="vehicleId"
                  label="Vehículo del cliente"
                >
                  <Select 
                    placeholder="Seleccionar vehículo del cliente" 
                    allowClear
                    showSearch
                    onChange={handleVehicleSelect}
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {filteredVehicles.map(v => (
                      <Select.Option key={v._id} value={v._id} label={`${v.licensePlate} - ${v.brand} ${v.model}`}>
                        {v.licensePlate} - {v.brand} {v.model}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Patente, Marca, Modelo */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="licensePlate"
                label="Patente"
                rules={[{ required: true, message: 'Ingrese la patente' }]}
              >
                <Input placeholder="ABC123" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="brand"
                label="Marca"
              >
                <Select
                  showSearch
                  placeholder="Seleccionar marca"
                  allowClear
                  popupRender={brandDropdownRender}
                  onChange={handleBrandChange}
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={brands.map(b => ({ value: b.name, label: b.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="model" label="Modelo">
                <Select
                  showSearch
                  placeholder="Seleccionar modelo"
                  allowClear
                  disabled={!selectedBrand}
                  popupRender={modelDropdownRender}
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={brandModels.map(m => ({ value: m, label: m }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Observaciones */}
          <Form.Item name="notes" label="Observaciones">
            <TextArea rows={3} placeholder="Notas adicionales" />
          </Form.Item>
          <Row justify="end">
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="primary" onClick={handleSave}>
                {editingAppointment ? 'Actualizar' : 'Crear Turno'}
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>

      {/* Modal para agregar nuevo cliente */}
      <Modal
        title="Agregar Nuevo Cliente"
        open={newClientModalOpen}
        onOk={handleSaveNewClient}
        onCancel={() => {
          setNewClientModalOpen(false);
          setNewClientData({ nombre: '', apellido: '', dni: '', telefono: '' });
        }}
        okText="Guardar"
        okButtonProps={{ loading: isSavingClient }}
        width={500}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Nombre" required>
                <Input
                  placeholder="Nombre"
                  value={newClientData.nombre}
                  onChange={(e) => setNewClientData({ ...newClientData, nombre: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Apellido" required>
                <Input
                  placeholder="Apellido"
                  value={newClientData.apellido}
                  onChange={(e) => setNewClientData({ ...newClientData, apellido: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="DNI">
                <Input
                  placeholder="DNI"
                  value={newClientData.dni}
                  onChange={(e) => setNewClientData({ ...newClientData, dni: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Teléfono">
                <Input
                  placeholder="Teléfono"
                  value={newClientData.telefono}
                  onChange={(e) => setNewClientData({ ...newClientData, telefono: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal para nueva marca */}
      <Modal
        title="Agregar Nueva Marca"
        open={newBrandModalOpen}
        onOk={handleAddNewBrand}
        onCancel={() => {
          setNewBrandModalOpen(false);
          setNewBrandName('');
        }}
        okText="Agregar"
        okButtonProps={{ loading: isAddingBrand }}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <Input
          placeholder="Nombre de la nueva marca"
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
          onPressEnter={handleAddNewBrand}
          size="large"
        />
      </Modal>

      {/* Modal para nuevo modelo */}
      <Modal
        title={`Agregar Nuevo Modelo a ${selectedBrand || ''}`}
        open={newModelModalOpen}
        onOk={handleAddNewModel}
        onCancel={() => {
          setNewModelModalOpen(false);
          setNewModelName('');
        }}
        okText="Agregar"
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <Input
          placeholder="Nombre del nuevo modelo"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          onPressEnter={handleAddNewModel}
          size="large"
        />
      </Modal>
    </div>
  );
};

export default AppointmentCalendar;
