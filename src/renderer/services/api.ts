import axios from 'axios';

// En la versión desktop, el backend corre en localhost:3456
// VITE_API_URL es opcional para sobreescribir
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Owner/Client functions
export const getOwners = async () => {
  const response = await api.get('/owners');
  return response.data;
};

// Vehicle functions
export const getVehicles = async () => {
  const response = await api.get('/vehicles');
  return response.data;
};

export const getVehiclesByOwnerName = async (ownerName: string) => {
  const response = await api.get(`/vehicles?search=${encodeURIComponent(ownerName)}`);
  return response.data;
};

export const getOwner = async (id: string) => {
  const response = await api.get(`/owners/${id}`);
  return response.data;
};

export const createOwner = async (ownerData: {
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}) => {
  const response = await api.post('/owners', ownerData);
  return response.data;
};

export const updateOwner = async (id: string, ownerData: {
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}) => {
  const response = await api.put(`/owners/${id}`, ownerData);
  return response.data;
};

export const deleteOwner = async (id: string) => {
  const response = await api.delete(`/owners/${id}`);
  return response.data;
};

// Appointment functions
export const getAppointments = async (params?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  const response = await api.get('/appointments', { params });
  return response.data;
};

export const getAppointment = async (id: string) => {
  const response = await api.get(`/appointments/${id}`);
  return response.data;
};

export const createAppointment = async (appointmentData: {
  vehicleId?: string;
  ownerName: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  date: string;
  time: string;
  duration?: number;
  type?: string;
  notes?: string;
}) => {
  const response = await api.post('/appointments', appointmentData);
  return response.data;
};

export const updateAppointment = async (id: string, appointmentData: {
  vehicleId?: string;
  ownerName: string;
  licensePlate: string;
  brand?: string;
  model?: string;
  date: string;
  time: string;
  duration?: number;
  type?: string;
  notes?: string;
  status?: string;
}) => {
  const response = await api.put(`/appointments/${id}`, appointmentData);
  return response.data;
};

export const updateAppointmentStatus = async (id: string, status: string) => {
  const response = await api.patch(`/appointments/${id}/status`, { status });
  return response.data;
};

export const deleteAppointment = async (id: string) => {
  const response = await api.delete(`/appointments/${id}`);
  return response.data;
};

// ─── Visit functions ────────────────────────────────────────────

export const addVisitToVehicle = async (vehicleId: string, visitData: Record<string, unknown>) => {
  const response = await api.post(`/vehicles/${vehicleId}/visits`, visitData);
  return response.data;
};

export const getVisit = async (vehicleId: string, visitId: string) => {
  const response = await api.get(`/vehicles/${vehicleId}/visits/${visitId}`);
  return response.data;
};

export const updateVisit = async (vehicleId: string, visitId: string, visitData: Record<string, unknown>) => {
  const response = await api.put(`/vehicles/${vehicleId}/visits/${visitId}`, visitData);
  return response.data;
};

export const deleteVisit = async (vehicleId: string, visitId: string) => {
  const response = await api.delete(`/vehicles/${vehicleId}/visits/${visitId}`);
  return response.data;
};

// ─── Payment functions ───────────────────────────────────────────

export const registerPago = async (vehicleId: string, visitId: string, pagoData: {
  metodo: string;
  monto: number;
  referencia?: string;
}) => {
  const response = await api.post(`/vehicles/${vehicleId}/visits/${visitId}/pagos`, pagoData);
  return response.data;
};

export const deletePago = async (vehicleId: string, visitId: string, pagoId: string) => {
  const response = await api.delete(`/vehicles/${vehicleId}/visits/${visitId}/pagos/${pagoId}`);
  return response.data;
};

// ─── Credit Notes functions ──────────────────────────────────────

export const createNotaCredito = async (vehicleId: string, visitId: string, data: {
  monto: number;
  motivo: string;
}) => {
  const response = await api.post(`/vehicles/${vehicleId}/visits/${visitId}/notas-credito`, data);
  return response.data;
};

export const deleteNotaCredito = async (vehicleId: string, visitId: string, notaId: string) => {
  const response = await api.delete(`/vehicles/${vehicleId}/visits/${visitId}/notas-credito/${notaId}`);
  return response.data;
};

// ─── Debts functions ─────────────────────────────────────────────

export const getDebts = async () => {
  const response = await api.get('/vehicles/debts');
  return response.data;
};

// ─── Cash Report functions ───────────────────────────────────────

export const getCashReport = async (startDate: string, endDate: string) => {
  const response = await api.get('/cash-register/report', {
    params: { startDate, endDate }
  });
  return response.data;
};

export const getCashRegisterDetail = async (id: string) => {
  const response = await api.get(`/cash-register/${id}`);
  return response.data;
};

// ─── Product assignment functions ─────────────────────────────────

export const assignProductToVisit = async (
  vehicleId: string,
  visitId: string,
  data: { productId: string; cantidad: number; precioVenta?: number; precioCompra?: number }
) => {
  const response = await api.post(`/stock/vehicles/${vehicleId}/visits/${visitId}/assign-product`, data);
  return response.data;
};

export const removeProductFromVisit = async (
  vehicleId: string,
  visitId: string,
  productId: string
) => {
  const response = await api.delete(`/stock/vehicles/${vehicleId}/visits/${visitId}/remove-product/${productId}`);
  return response.data;
};

export const updateVisitServices = async (
  vehicleId: string,
  visitId: string,
  servicios: Array<{ nombre: string; precio: number }>
) => {
  const response = await api.put(`/vehicles/${vehicleId}/visits/${visitId}`, { servicios });
  return response.data;
};

export default api;
