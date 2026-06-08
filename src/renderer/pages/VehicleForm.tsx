import React, { useEffect, useState, useRef } from 'react';
import { Form, Input, Button, Card, Typography, Steps, message, Row, Col, InputNumber, Select, Divider, Modal, Alert } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@hooks/useAppDispatch';
import {
  createVehicle,
  updateVehicle,
  fetchVehicleById,
  clearSelectedVehicle,
  addVisit,
  updateVisit,
} from '@store/vehicleSlice';
import type { Vehicle, Visit, InspectionSector, Product, ProductoAsignado, Owner, ServicioEntry } from '@/types';
import PhotoUpload from '@components/PhotoUpload';
import InspectionSectorCard from '@components/InspectionSectorCard';
import { createEmptyInspections } from '@utils/inspectionData';
import api, { getOwners, createOwner, getVehiclesByOwnerName, updateVisitServices } from '@services/api';
import { getVehicleBrands, getVehicleYears, getModelsForBrand, DEFAULT_BRANDS, type VehicleBrand } from '@services/vehicleApi';

const { Title, Text } = Typography;

interface VehicleFormProps {
  isModal?: boolean;
  onDone?: () => void;
  vehicleId?: string | null;
  initialStep?: number;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ isModal = false, onDone, vehicleId, initialStep = 0 }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const resolvedId = vehicleId || id;
  const dispatch = useAppDispatch();
  const { selectedVehicle, loading } = useAppSelector((state) => state.vehicles);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [inspections, setInspections] = useState<InspectionSector[]>(createEmptyInspections());
  const [photos, setPhotos] = useState<Visit['photos']>({
    front: '',
    back: '',
    left: '',
    right: '',
    motor: '',
    dashboard: '',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<ProductoAsignado[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customPriceCompra, setCustomPriceCompra] = useState<number>(0);
  // Servicios / Mano de obra
  const [servicioNombre, setServicioNombre] = useState<string>('');
  const [servicioPrecio, setServicioPrecio] = useState<number>(0);
  const [assignedServicios, setAssignedServicios] = useState<ServicioEntry[]>([]);
  const [brands, setBrands] = useState<VehicleBrand[]>(DEFAULT_BRANDS);
  const [years, setYears] = useState<number[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandModels, setBrandModels] = useState<string[]>([]);
  const [loadingModels] = useState(false);
  
  // Modal states for adding new brand/model
  const [newBrandModalOpen, setNewBrandModalOpen] = useState(false);
  const [newModelModalOpen, setNewModelModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);
  
  // Owner states
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [newOwnerModalOpen, setNewOwnerModalOpen] = useState(false);
  const [newOwnerData, setNewOwnerData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: ''
  });
  const [isSavingOwner, setIsSavingOwner] = useState(false);
const [loadingOwnerVehicles, setLoadingOwnerVehicles] = useState(false);
  const [ownerVehicles, setOwnerVehicles] = useState<Vehicle[]>([]);
  const [isNewPlate, setIsNewPlate] = useState(false);
  
  const formDataRef = useRef<Record<string, unknown>>({});
  const visitIdRef = useRef<string | undefined>(undefined);

  const [cashOpen, setCashOpen] = useState<boolean | null>(null);

  const isEditing = !!resolvedId;

  // Function to add a new brand
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
    
    setIsAddingNewBrand(true);
    const newBrand: VehicleBrand = { name: newBrandName.trim(), models: [] };
    const updatedBrands = [...brands, newBrand].sort((a, b) => a.name.localeCompare(b.name));
    setBrands(updatedBrands);
    setSelectedBrand(newBrandName.trim());
    setBrandModels([]);
    form.setFieldValue('brand', newBrandName.trim());
    form.setFieldValue('model', null);
    setNewBrandName('');
    setNewBrandModalOpen(false);
    setIsAddingNewBrand(false);
    message.success(`Marca "${newBrandName.trim()}" agregada`);
  };

  // Function to add a new model to current brand
  const handleAddNewModel = () => {
    if (!newModelName.trim()) {
      message.error('Ingrese el nombre del modelo');
      return;
    }
    
    if (!selectedBrand) {
      message.error('Seleccione una marca primero');
      return;
    }
    
    const currentModels = brandModels;
    const exists = currentModels.some(m => m.toUpperCase() === newModelName.trim().toUpperCase());
    if (exists) {
      message.error('Este modelo ya existe para esta marca');
      return;
    }
    
    const updatedModels = [...currentModels, newModelName.trim()].sort((a, b) => a.localeCompare(b));
    setBrandModels(updatedModels);
    
    // Also update in brands array
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

  // Function to handle new owner save
  const handleSaveNewOwner = async () => {
    if (!newOwnerData.nombre.trim()) {
      message.error('Ingrese el nombre');
      return;
    }
    if (!newOwnerData.apellido.trim()) {
      message.error('Ingrese el apellido');
      return;
    }
    
    setIsSavingOwner(true);
    try {
      const createdOwner = await createOwner({
        nombre: newOwnerData.nombre.trim(),
        apellido: newOwnerData.apellido.trim(),
        dni: newOwnerData.dni.trim() || undefined,
        telefono: newOwnerData.telefono.trim() || undefined,
      });
      
      setOwners(prev => [...prev, createdOwner].sort((a, b) => 
        `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`)
      ));
      form.setFieldValue('ownerName', createdOwner._id);
      setNewOwnerData({ nombre: '', apellido: '', dni: '', telefono: '' });
      setNewOwnerModalOpen(false);
      message.success('Cliente agregado exitosamente');
    } catch (error) {
      console.error('Error creating owner:', error);
      message.error('Error al crear el cliente');
    } finally {
      setIsSavingOwner(false);
    }
  };

  // Custom dropdown render for owner
  const ownerDropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Button 
        type="text" 
        icon={<PlusOutlined />} 
        onClick={() => setNewOwnerModalOpen(true)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Agregar nuevo cliente
      </Button>
    </>
  );

  /**
   * Maneja el cambio de dueño: obtiene sus vehículos y llena el Select de patente
   * @param {string} ownerId - ID del dueño seleccionado
   */
  const handleOwnerChange = async (ownerId: string) => {
    // Limpiar campos siempre al cambiar de dueño (excepto en edición)
    form.setFieldValue('licensePlate', '');
    form.setFieldValue('brand', '');
    form.setFieldValue('model', '');
    form.setFieldValue('year', undefined);
    form.setFieldValue('color', '');
    setSelectedBrand(null);
    setBrandModels([]);
    setOwnerVehicles([]);
    setIsNewPlate(true);
    
    // Buscar el dueño seleccionado para obtener su nombre completo
    const selectedOwner = owners.find(o => o._id === ownerId);
    if (!selectedOwner) return;
    
    const ownerName = `${selectedOwner.nombre} ${selectedOwner.apellido}`.toUpperCase();
    
    // Fetch vehículos de este dueño
    setLoadingOwnerVehicles(true);
    try {
      const vehicles = await getVehiclesByOwnerName(ownerName);
      
      if (vehicles.length > 0) {
        setOwnerVehicles(vehicles);
        setIsNewPlate(false); // Mostrar Select con opciones
      } else {
        setIsNewPlate(true); // No hay vehículos, mostrar Input libre
      }
    } catch (error) {
      console.error('Error fetching owner vehicles:', error);
      message.error('Error al verificar vehículos del cliente');
      setIsNewPlate(true);
    } finally {
      setLoadingOwnerVehicles(false);
    }
  };

  /**
   * Maneja la selección de un vehículo existente en el Select de patente
   * @param {string} value - Patente seleccionada o '__new__' para nueva patente
   */
  const handleVehicleSelect = (value: string) => {
    if (value === '__new__') {
      // Usuario quiere ingresar una patente nueva
      setIsNewPlate(true);
      form.setFieldValue('licensePlate', '');
      form.setFieldValue('brand', '');
      form.setFieldValue('model', '');
      form.setFieldValue('year', undefined);
      form.setFieldValue('color', '');
      setSelectedBrand(null);
      setBrandModels([]);
      return;
    }
    
    // Buscar el vehículo seleccionado y autocompletar
    const vehicle = ownerVehicles.find(v => v.licensePlate === value);
    if (vehicle) {
      form.setFieldValue('licensePlate', vehicle.licensePlate);
      form.setFieldValue('brand', vehicle.brand);
      form.setFieldValue('model', vehicle.model);
      form.setFieldValue('year', vehicle.year);
      form.setFieldValue('color', vehicle.color || '');
      
      // Actualizar estados de marca/modelo
      setSelectedBrand(vehicle.brand);
      setBrandModels(getModelsForBrand(vehicle.brand));
    }
  };

  // Parsear ownerVehicles a opciones del Select de patente
  const licensePlateOptions = ownerVehicles.map(v => ({
    value: v.licensePlate,
    label: `${v.licensePlate} - ${v.brand} ${v.model} ${v.year}${v.color ? ` (${v.color})` : ''}`
  }));

  // Custom dropdown render for license plate: options + "Nueva patente" button
  const licensePlateDropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Button
        type="text"
        icon={<PlusOutlined />}
        onClick={() => handleVehicleSelect('__new__')}
        style={{ width: '100%', textAlign: 'left' }}
      >
        Agregar nueva patente
      </Button>
    </>
  );

  // Custom dropdown render to add "Agregar nueva marca" option
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

  // Custom dropdown render to add "Agregar nuevo modelo" option
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

  // Fetch brands and years on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingBrands(true);
      try {
        const [brandsData, yearsData, ownersData] = await Promise.all([
          getVehicleBrands(),
          getVehicleYears(),
          getOwners(),
        ]);
        if (brandsData.length > 0) {
          setBrands(brandsData);
        }
        setYears(yearsData);
        setOwners(ownersData);
      } catch (error) {
        console.error('Error loading vehicle data:', error);
      } finally {
        setLoadingBrands(false);
        setLoadingOwners(false);
      }
    };
    fetchData();
  }, []);

  // Verificar estado de la caja registradora
  useEffect(() => {
    const checkCashRegister = async () => {
      try {
        const res = await fetch('/api/cash-register/current');
        const data = await res.json();
        setCashOpen(data && data.estado === 'abierta');
      } catch {
        setCashOpen(false);
      }
    };
    checkCashRegister();
  }, []);

  useEffect(() => {
    if (isEditing && resolvedId) {
      dispatch(fetchVehicleById(resolvedId));
    }
    return () => {
      dispatch(clearSelectedVehicle());
    };
  }, [dispatch, resolvedId, isEditing]);

  useEffect(() => {
    if (selectedVehicle && isEditing) {
      // Only set form fields if they differ from current form values
      // (avoids overwriting dirty fields after updateVehicle.fulfilled)
      const currentValues = form.getFieldsValue();
      const vehicleData = {
        ownerName: selectedVehicle.ownerName,
        licensePlate: selectedVehicle.licensePlate,
        brand: selectedVehicle.brand,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        color: selectedVehicle.color || '',
      };

      // Check if form values differ from vehicle data
      const hasChanges = Object.entries(vehicleData).some(
        ([key, value]) => String(currentValues[key] ?? '') !== String(value ?? '')
      );

      if (hasChanges) {
        form.setFieldsValue(vehicleData);
      }

      setSelectedBrand(selectedVehicle.brand);
      // Get models for the editing vehicle's brand from local data
      setBrandModels(getModelsForBrand(selectedVehicle.brand));
      formDataRef.current = { ...selectedVehicle };
      setCurrentStep(2);
    }
  }, [selectedVehicle, form, isEditing]);

  // Obtener la última visita para inicializar fotos/inspecciones/productos
  const lastVisit = selectedVehicle?.visits?.[selectedVehicle.visits.length - 1];

  useEffect(() => {
    if (lastVisit?.photos) {
      setPhotos(lastVisit.photos);
    }
  }, [lastVisit?.photos]);

  // Guardar visitId en ref para tenerlo disponible siempre en handleSubmit
  useEffect(() => {
    if (lastVisit?._id) {
      visitIdRef.current = lastVisit._id;
    }
  }, [lastVisit?._id]);

  useEffect(() => {
    if (lastVisit?.inspections) {
      if (lastVisit.inspections.length > 0) {
        // Merge existing inspections with full sector definitions
        // so new sectors (varios) and new items (Tren Delantero/Trasero) appear
        const fullInspections = createEmptyInspections();
        const merged = fullInspections.map((fullSector) => {
          const existing = lastVisit.inspections.find(
            (s) => s.sector === fullSector.sector,
          );
          if (!existing) return fullSector; // Sector nuevo (ej: varios)

          // Merge items: conservar datos existentes, agregar items nuevos
          const mergedItems = fullSector.items.map((fullItem) => {
            const existingItem = existing.items.find(
              (i) => i.name === fullItem.name,
            );
            if (existingItem) {
              return {
                ...fullItem,
                status:
                  existingItem.status ||
                  (existingItem.needsReplacement ? 'revision' : 'ok'),
                notes: existingItem.notes || '',
                needsReplacement: existingItem.needsReplacement ?? false,
              };
            }
            return fullItem; // Item nuevo (ej: Tren Delantero)
          });

          return { ...fullSector, items: mergedItems };
        });
        setInspections(merged);
      } else {
        setInspections(createEmptyInspections());
      }
    }
  }, [lastVisit?.inspections]);

  useEffect(() => {
    if (lastVisit?.productosAsignados) {
      setAssignedProducts(lastVisit.productosAsignados);
    }
  }, [lastVisit?.productosAsignados]);

  useEffect(() => {
    if (lastVisit?.servicios) {
      setAssignedServicios(lastVisit.servicios);
    }
  }, [lastVisit?.servicios]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch {
        console.error('Error cargando productos');
      }
    };
    loadProducts();
  }, []);

  const handleInspectionChange = (sectorIndex: number, itemIndex: number, status: 'ok' | 'revision') => {
    setInspections((prev) =>
      prev.map((sector, sIndex) =>
        sIndex !== sectorIndex
          ? sector
          : {
              ...sector,
              items: sector.items.map((item, iIndex) =>
                iIndex !== itemIndex ? item : { ...item, status }
              )
            }
      )
    );
  };

  const handleNoteChange = (sectorIndex: number, itemIndex: number, notes: string) => {
    setInspections((prev) =>
      prev.map((sector, sIndex) =>
        sIndex !== sectorIndex
          ? sector
          : {
              ...sector,
              items: sector.items.map((item, iIndex) =>
                iIndex !== itemIndex ? item : { ...item, notes }
              )
            }
      )
    );
  };

  const nextStep = async () => {
    try {
      let fieldsToValidate: string[] = [];
      
      if (currentStep === 0) {
        fieldsToValidate = ['ownerName', 'licensePlate', 'brand', 'model', 'year'];
      }
      
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      
      const values = form.getFieldsValue();
      formDataRef.current = { ...formDataRef.current, ...values };
      
      setCurrentStep(currentStep + 1);
    } catch {
      console.error('Validation failed');
    }
  };

  const prevStep = () => {
    const values = form.getFieldsValue();
    formDataRef.current = { ...formDataRef.current, ...values };
    setCurrentStep(currentStep - 1);
  };

  /**
   * Maneja el envío del formulario para crear o actualizar un vehículo
   */
  const handleSubmit = async () => {
    try {
      // Obtener valores actuales del formulario
      const values = form.getFieldsValue();
      
      // Sincronizar con formDataRef como respaldo (crítico para datos de pasos anteriores)
      const allValues = { ...formDataRef.current, ...values };
      
      // Validar que ownerName esté presente y sea un string válido
      const rawOwnerName = allValues.ownerName;
      if (!rawOwnerName || typeof rawOwnerName !== 'string') {
        message.error('Debe seleccionar un cliente antes de continuar');
        setCurrentStep(0); // Volver al primer paso (selección de cliente)
        return;
      }
      
      // Construir el nombre completo del dueño (resolver ID a "Nombre Apellido" si es necesario)
      let ownerName = rawOwnerName;
      const selectedOwner = owners.find(o => o._id === ownerName);
      if (selectedOwner) {
        // Si es un ID de dueño, obtener el nombre completo
        ownerName = `${selectedOwner.nombre} ${selectedOwner.apellido}`;
      }
      
      // Validar que el nombre no esté vacío
      if (ownerName.trim() === '') {
        message.error('Error al procesar el cliente seleccionado. Intente nuevamente.');
        return;
      }
      
      if (isEditing && resolvedId) {
        // Editar: actualizar datos maestros
        const masterData: Record<string, unknown> = {
          ownerName: ownerName.trim(),
          licensePlate: (allValues.licensePlate || '').toUpperCase(),
          brand: (allValues.brand || '').toUpperCase(),
          model: (allValues.model || '').toUpperCase(),
          year: allValues.year,
          color: allValues.color || '',
        };
        await dispatch(updateVehicle({ id: resolvedId, data: masterData })).unwrap();

        // Resolver visitId: usar existente o crear una nueva visita
        let visitId = visitIdRef.current;

        // ── Si el vehículo no tiene visitas, crear una ──
        if (!visitId) {
          try {
            const now = new Date().toISOString();
            const vehicleWithNewVisit = await dispatch(addVisit({
              vehicleId: resolvedId,
              visitData: {
                fechaIngreso: now,
              },
            })).unwrap();
            const newVisits = vehicleWithNewVisit.visits;
            if (newVisits && newVisits.length > 0) {
              visitId = newVisits[newVisits.length - 1]._id!;
              visitIdRef.current = visitId;
            } else {
              throw new Error('No se pudo crear la visita');
            }
          } catch (err) {
            console.error('Error al crear visita:', err);
            message.error('Error al crear la visita. Los datos adicionales no se guardarán.');
            // Al menos los datos maestros se guardaron
          }
        }

        if (visitId) {
          // Guardar fotos (solo las que fueron modificadas, detectadas por data: URI)
          const photoPositions = ['front', 'back', 'left', 'right', 'motor', 'dashboard'] as const;
          for (const position of photoPositions) {
            const photoData = photos[position];
            if (photoData && photoData.startsWith('data:')) {
              try {
                await api.post(`/vehicles/${resolvedId}/visits/${visitId}/photos`, { position, data: photoData });
              } catch (err) {
                console.error(`Error al guardar foto ${position}:`, err);
              }
            }
          }

          // Guardar inspecciones
          if (inspections.length > 0) {
            try {
              const inspectionsPayload = inspections.map(sector => ({
                sector: sector.sector,
                items: sector.items.map(item => ({
                  name: item.name,
                  status: item.status,
                  needsReplacement: item.needsReplacement ?? false,
                  notes: item.notes || '',
                })),
              }));
              await api.post(`/vehicles/${resolvedId}/visits/${visitId}/inspection`, { inspections: inspectionsPayload });
            } catch (err) {
              console.error('Error al guardar inspecciones:', err);
              message.warning('Inspecciones no pudieron ser guardadas');
            }
          }

          // Guardar servicios/mano de obra usando el thunk de Redux para mantener el estado sincronizado
          if (assignedServicios.length > 0) {
            try {
              await dispatch(updateVisit({
                vehicleId: resolvedId,
                visitId,
                visitData: { servicios: assignedServicios },
              })).unwrap();
            } catch (err) {
              console.error('Error al guardar servicios:', err);
              message.warning('Servicios no pudieron ser guardados');
            }
          }

          // Guardar productos asignados (solo si hay productos pendientes)
          // Products are saved individually via handleAssignProduct during editing,
          // so we don't bulk-save them here to avoid duplicates.
          // handleRemoveProduct now also calls the backend DELETE endpoint.
        }

        message.success('Vehículo actualizado exitosamente');
      } else {
        // Nuevo: enviar datos maestros + primera visita
        const requestData: Record<string, unknown> = {
          ownerName: ownerName.trim(),
          licensePlate: (allValues.licensePlate || '').toUpperCase(),
          brand: (allValues.brand || '').toUpperCase(),
          model: (allValues.model || '').toUpperCase(),
          year: allValues.year,
          color: allValues.color || '',
          photos,
          inspections,
          productosAsignados: assignedProducts,
          servicios: assignedServicios,
        };
        await dispatch(createVehicle(requestData)).unwrap();
        message.success('Vehículo registrado exitosamente');
      }
      
      // Limpiar datos del formulario y redirigir
      formDataRef.current = {};
      navigate('/vehicles');
      onDone?.();
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Error al guardar el vehículo';
      message.error(errorMsg);
      console.error(err);
    }
  };

  const handleAssignProduct = async () => {
    if (!selectedProductId || selectedProductQty <= 0) return;

    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;

    const precioVentaFinal = customPrice > 0 ? customPrice : product.precioVenta;
    const precioCompraFinal = customPriceCompra > 0 ? customPriceCompra : (product.precioCompra || 0);
    const subtotal = selectedProductQty * precioVentaFinal;

    try {
      if (!selectedVehicle?._id && !id) {
        // Nuevo vehículo: solo agregar a la lista local
        setAssignedProducts(prev => ([
          ...prev,
          {
            productId: selectedProductId,
            nombreProducto: product.nombreProducto,
            cantidad: selectedProductQty,
            precioVenta: precioVentaFinal,
            precioCompra: precioCompraFinal,
            subtotal
          }
        ]));
      } else {
        // Vehículo existente: enviar al backend
        const vehicleIdValue = resolvedId || selectedVehicle?._id;
        const targetVisitId = visitIdRef.current;
        if (!targetVisitId) {
          message.warning('Primero debe guardar el vehículo para crear una visita');
          return;
        }
        await api.post(`/stock/vehicles/${vehicleIdValue}/visits/${targetVisitId}/assign-product`, {
          productId: selectedProductId,
          cantidad: selectedProductQty,
          precioVenta: precioVentaFinal !== product.precioVenta ? precioVentaFinal : undefined,
          precioCompra: precioCompraFinal !== (product.precioCompra || 0) ? precioCompraFinal : undefined,
        });

        setAssignedProducts(prev => ([
          ...prev,
          {
            productId: selectedProductId,
            nombreProducto: product.nombreProducto,
            cantidad: selectedProductQty,
            precioVenta: precioVentaFinal,
            precioCompra: precioCompraFinal,
            subtotal
          }
        ]));
        message.success('Producto asignado');
      }

      setSelectedProductId('');
      setSelectedProductQty(1);
      setCustomPrice(0);
      setCustomPriceCompra(0);
    } catch {
      message.error('Error asignando producto');
    }
  };

  /**
   * Agrega un servicio/mano de obra a la lista local
   */
  const handleAddServicio = () => {
    if (!servicioNombre.trim()) {
      message.warning('Ingrese un nombre para el servicio');
      return;
    }
    if (servicioPrecio <= 0) {
      message.warning('El precio debe ser mayor a 0');
      return;
    }
    setAssignedServicios(prev => [
      ...prev,
      { nombre: servicioNombre.trim(), precio: servicioPrecio },
    ]);
    setServicioNombre('');
    setServicioPrecio(0);
  };

  /**
   * Elimina un servicio de la lista local por índice
   */
  const handleRemoveServicio = (index: number) => {
    setAssignedServicios(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Elimina un producto asignado de la lista local por índice
   */
  const handleRemoveProduct = async (index: number) => {
    const productToRemove = assignedProducts[index];
    
    // Remove from local state immediately
    setAssignedProducts(prev => prev.filter((_, i) => i !== index));

    // If editing and we have a vehicle+visit, remove from backend too
    if (resolvedId && visitIdRef.current && productToRemove?.productId) {
      try {
        await api.delete(
          `/stock/vehicles/${resolvedId}/visits/${visitIdRef.current}/remove-product/${productToRemove.productId}`
        );
      } catch (err) {
        console.error('Error al remover producto del backend:', err);
        message.error('Error al remover producto');
        // Roll back local state on failure
        setAssignedProducts(prev => [...prev.slice(0, index), productToRemove, ...prev.slice(index)]);
      }
    }
  };

  const steps = [
    { title: 'Datos', key: 'datos' },
    { title: 'Fotos', key: 'fotos' },
    { title: 'Inspección', key: 'inspeccion' },
  ];

  return (
    <div style={{ padding: isModal ? 0 : '24px', maxWidth: 1200, margin: '0 auto' }}>
      {!isModal && (
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')} style={{ marginBottom: '16px' }}>
          Volver
        </Button>
      )}

      {!isModal && <Title level={3}>{isEditing ? 'Editar Vehículo' : 'Nuevo Ingreso'}</Title>}

      <Steps 
        current={currentStep} 
        style={{ marginBottom: '24px' }}
        items={steps.map(s => ({ title: s.title }))}
      />

      <Card loading={loading && isEditing}>
        <Form form={form} layout="vertical" autoComplete="off">
          {/* Step 1: Vehicle Data */}
          {currentStep === 0 && (
            <>
              <Title level={4}>Datos del Vehículo</Title>
              
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="ownerName"
                    label="Cliente"
                    rules={[{ required: true, message: 'Seleccione el cliente' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar cliente"
                      size="large"
                      loading={loadingOwners || loadingOwnerVehicles}
                      popupRender={ownerDropdownRender}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={owners.map(o => ({ 
                        value: o._id, 
                        label: `${o.nombre} ${o.apellido}` 
                      }))}
                      onChange={handleOwnerChange}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="licensePlate"
                    label="Patente"
                    rules={[{ required: true, message: 'Ingrese la patente' }]}
                  >
                    {!isNewPlate && ownerVehicles.length > 0 ? (
                      <Select
                        showSearch
                        placeholder="Seleccionar patente"
                        size="large"
                        loading={loadingOwnerVehicles}
                        popupRender={licensePlateDropdownRender}
                        onChange={handleVehicleSelect}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={licensePlateOptions}
                      />
                    ) : (
                      <Input
                        placeholder="ABC123"
                        size="large"
                        style={{ textTransform: 'uppercase' }}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          form.setFieldValue('licensePlate', val);
                        }}
                      />
                    )}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="brand"
                    label="Marca"
                    rules={[{ required: true, message: 'Seleccione la marca' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar marca"
                      size="large"
                      loading={loadingBrands}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={brands.map(b => ({ value: b.name, label: b.name }))}
                      popupRender={brandDropdownRender}
                      onChange={(value) => {
                        setSelectedBrand(value);
                        form.setFieldValue('model', null);
                        // Get models for the selected brand from local data
                        setBrandModels(getModelsForBrand(value));
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="model"
                    label="Modelo"
                    rules={[{ required: true, message: 'Seleccione el modelo' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar modelo"
                      size="large"
                      disabled={!selectedBrand}
                      loading={loadingModels}
                      popupRender={modelDropdownRender}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={brandModels.map(m => ({ value: m, label: m }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="year"
                    label="Año"
                    rules={[{ required: true, message: 'Seleccione el año' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar año"
                      size="large"
                      filterOption={(input, option) =>
                        (option?.label ?? '').includes(input)
                      }
                      options={years.map(y => ({ value: y, label: y.toString() }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="color"
                    label="Color"
                  >
                    <Input placeholder="Ej: Rojo, Azul, Negro" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Step 2: Photos */}
          {currentStep === 1 && (
            <>
              <Title level={4}>Fotos del Vehículo</Title>
              <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
            </>
          )}

          {/* Step 3: Inspection */}
          {currentStep === 2 && (
            <>
              <Title level={4}>Inspección del Vehículo</Title>
              <Row gutter={[16, 16]}>
                {inspections.map((sector, sectorIndex) => (
                  <Col xs={24} md={12} lg={sector.sector === 'iluminacion' ? 16 : 8} key={sector.sector}>
                    <InspectionSectorCard
                      sector={sector}
                      onItemChange={(itemIndex, status) =>
                        handleInspectionChange(sectorIndex, itemIndex, status)
                      }
                      onNoteChange={(itemIndex, notes) =>
                        handleNoteChange(sectorIndex, itemIndex, notes)
                      }
                    />
                  </Col>
                ))}
              </Row>

              <Divider />

              <Title level={4}>Productos Asignados</Title>
              <Row gutter={[8, 8]} align="middle" style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Producto</div>
                  <Select
                    placeholder="Seleccionar producto"
                    value={selectedProductId || undefined}
                    onChange={(value) => {
                      setSelectedProductId(value);
                      const product = products.find(p => p._id === value);
                      if (product) {
                        setCustomPrice(product.precioVenta);
                        setCustomPriceCompra(product.precioCompra || 0);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {products.map((product) => (
                      <Select.Option key={product._id} value={product._id}>
                        {product.nombreProducto} (Stock: {product.cantidad})
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={12} md={3}>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Cantidad</div>
                  <InputNumber
                    min={1}
                    value={selectedProductQty}
                    onChange={(value) => setSelectedProductQty(Number(value) || 1)}
                    style={{ width: '100%' }}
                    placeholder="Cant"
                  />
                </Col>
                <Col xs={12} md={4}>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Precio Venta</div>
                  <InputNumber
                    min={0}
                    value={customPrice}
                    onChange={(val) => setCustomPrice(Number(val) || 0)}
                    style={{ width: '100%' }}
                    prefix="$"
                    placeholder="P. Venta"
                    precision={2}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginBottom: 2 }}>Precio Costo</div>
                  <InputNumber
                    min={0}
                    value={customPriceCompra}
                    onChange={(val) => setCustomPriceCompra(Number(val) || 0)}
                    style={{ width: '100%' }}
                    prefix="$"
                    placeholder="P. Costo"
                    precision={2}
                  />
                </Col>
                <Col xs={12} md={5}>
                  <div style={{ fontSize: 12, marginBottom: 2 }}>&nbsp;</div>
                  <Button type="primary" onClick={handleAssignProduct} block>
                    Agregar
                  </Button>
                </Col>
              </Row>

              {/* Mano de Obra / Servicios */}
              <Title level={4}>Mano de Obra / Servicios</Title>
              <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                  <Input
                    placeholder="Nombre del servicio"
                    value={servicioNombre}
                    onChange={(e) => setServicioNombre(e.target.value)}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <InputNumber
                    min={0}
                    value={servicioPrecio}
                    onChange={(val) => setServicioPrecio(Number(val) || 0)}
                    style={{ width: '100%' }}
                    prefix="$"
                    placeholder="Precio"
                    precision={2}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddServicio}
                  >
                    Agregar Servicio
                  </Button>
                </Col>
              </Row>

              {/* Alerta de caja cerrada */}
              {cashOpen === false && (
                <Alert
                  message="La caja está cerrada"
                  description="Debe abrir la caja para poder registrar pagos o notas de crédito"
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Grid unificado de Productos / Servicios */}
              {(assignedProducts.length > 0 || assignedServicios.length > 0) ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 60px 100px 100px 40px',
                      gap: '4px 8px',
                      alignItems: 'center',
                      background: 'var(--theme-bg-container)',
                      border: '1px solid var(--theme-border)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    {/* Header */}
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>Nombre</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>Cant</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>P.Venta</Text>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Subtotal</Text>
                    <div />

                    {/* Separator */}
                    <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border-secondary)' }} />

                    {/* Productos */}
                    {assignedProducts.map((item, index) => (
                      <React.Fragment key={`prod-${index}`}>
                        <Text style={{ fontSize: 14 }}>{item.nombreProducto}</Text>
                        <Text style={{ fontSize: 14, textAlign: 'center' }}>{item.cantidad}</Text>
                        <Text style={{ fontSize: 14, textAlign: 'right' }}>${item.precioVenta}</Text>
                        <Text strong style={{ fontSize: 14, textAlign: 'right' }}>${item.subtotal}</Text>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          style={{ padding: 0 }}
                          onClick={() => handleRemoveProduct(index)}
                        />
                      </React.Fragment>
                    ))}

                    {/* Servicios */}
                    {assignedServicios.map((item, index) => (
                      <React.Fragment key={`serv-${index}`}>
                        <Text style={{ fontSize: 14 }}>{item.nombre}</Text>
                        <Text style={{ fontSize: 14, textAlign: 'center' }}>-</Text>
                        <Text style={{ fontSize: 14, textAlign: 'right' }}>${item.precio}</Text>
                        <Text style={{ fontSize: 14, textAlign: 'right' }}>${item.precio}</Text>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          style={{ padding: 0 }}
                          onClick={() => handleRemoveServicio(index)}
                        />
                      </React.Fragment>
                    ))}

                    {/* Separator + Total */}
                    <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--theme-border)' }} />
                    <div />
                    <div />
                    <Text strong style={{ textAlign: 'right' }}>Total:</Text>
                    <Text strong style={{ textAlign: 'right', color: 'var(--theme-primary)' }}>
                      ${(
                        assignedProducts.reduce((sum, p) => sum + (p.subtotal || 0), 0) +
                        assignedServicios.reduce((sum, s) => sum + (s.precio || 0), 0)
                      ).toLocaleString('es-AR')}
                    </Text>
                    <div />
                  </div>
                </div>
              ) : (
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  No hay productos ni servicios asignados
                </Text>
              )}
            </>
          )}

          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              justifyContent: 'space-between',
              position: isModal ? 'sticky' : 'static',
              bottom: isModal ? 0 : undefined,
              background: isModal ? 'var(--theme-bg-elevated)' : undefined,
              padding: isModal ? '12px 24px' : '0 4px',
              zIndex: isModal ? 1 : undefined,
            }}
          >
            {currentStep > 0 ? (
              <Button size="large" onClick={prevStep}>
                Anterior
              </Button>
            ) : (
              <div />
            )}

            {currentStep < steps.length - 1 ? (
              <Button type="primary" size="large" onClick={nextStep}>
                Siguiente
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                onClick={handleSubmit}
                loading={loading}
              >
                {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
              </Button>
            )}
          </div>
        </Form>
      </Card>

      {/* Modal for adding new brand */}
      <Modal
        title="Agregar Nueva Marca"
        open={newBrandModalOpen}
        onOk={handleAddNewBrand}
        onCancel={() => {
          setNewBrandModalOpen(false);
          setNewBrandName('');
        }}
        okText="Agregar"
        okButtonProps={{ loading: isAddingNewBrand }}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        <Input
          placeholder="Nombre de la nueva marca"
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
          onPressEnter={handleAddNewBrand}
          size="large"
        />
      </Modal>

      {/* Modal for adding new model */}
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
        destroyOnHidden
      >
        <Input
          placeholder="Nombre del nuevo modelo"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          onPressEnter={handleAddNewModel}
          size="large"
        />
      </Modal>

      {/* Modal for adding new owner */}
      <Modal
        title="Agregar Nuevo Cliente"
        open={newOwnerModalOpen}
        onOk={handleSaveNewOwner}
        onCancel={() => {
          setNewOwnerModalOpen(false);
          setNewOwnerData({ nombre: '', apellido: '', dni: '', telefono: '' });
        }}
        okText="Guardar"
        okButtonProps={{ loading: isSavingOwner }}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
        width={500}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Nombre" required>
                <Input
                  placeholder="Nombre"
                  value={newOwnerData.nombre}
                  onChange={(e) => setNewOwnerData({ ...newOwnerData, nombre: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Apellido" required>
                <Input
                  placeholder="Apellido"
                  value={newOwnerData.apellido}
                  onChange={(e) => setNewOwnerData({ ...newOwnerData, apellido: e.target.value })}
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
                  value={newOwnerData.dni}
                  onChange={(e) => setNewOwnerData({ ...newOwnerData, dni: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Teléfono">
                <Input
                  placeholder="Teléfono"
                  value={newOwnerData.telefono}
                  onChange={(e) => setNewOwnerData({ ...newOwnerData, telefono: e.target.value })}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default VehicleForm;
