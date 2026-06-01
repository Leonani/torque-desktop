import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { VehicleState, Vehicle, Visit, VehicleListItem } from '../types';
import api from '../services/api';

const initialState: VehicleState = {
  vehicles: [],
  selectedVehicle: null,
  selectedVisit: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    brand: '',
    model: '',
    year: undefined,
  },
};

export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchAll',
  async (params: { search?: string; brand?: string; model?: string; year?: number }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.brand) queryParams.append('brand', params.brand);
      if (params.model) queryParams.append('model', params.model);
      if (params.year) queryParams.append('year', params.year.toString());

      const response = await api.get(`/vehicles?${queryParams.toString()}`);
      return response.data as VehicleListItem[];
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/create',
  async (vehicleData: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await api.post('/vehicles', vehicleData);
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/update',
  async ({ id, data }: { id: string; data: Partial<Vehicle> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/vehicles/${id}`, data);
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/vehicles/${id}`);
      return id;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/vehicles/${id}`);
      return response.data as Vehicle;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// ─── Visit Thunks ───────────────────────────────────────────────

export const addVisit = createAsyncThunk(
  'vehicles/addVisit',
  async ({ vehicleId, visitData }: { vehicleId: string; visitData: Record<string, unknown> }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/vehicles/${vehicleId}/visits`, visitData);
      return response.data as Vehicle;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateVisit = createAsyncThunk(
  'vehicles/updateVisit',
  async ({ vehicleId, visitId, visitData }: { vehicleId: string; visitId: string; visitData: Partial<Visit> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/vehicles/${vehicleId}/visits/${visitId}`, visitData);
      return response.data as Vehicle;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteVisit = createAsyncThunk(
  'vehicles/deleteVisit',
  async ({ vehicleId, visitId }: { vehicleId: string; visitId: string }, { rejectWithValue }) => {
    try {
      await api.delete(`/vehicles/${vehicleId}/visits/${visitId}`);
      return { vehicleId, visitId };
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<VehicleState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearSelectedVehicle: (state) => {
      state.selectedVehicle = null;
      state.selectedVisit = null;
    },
    setSelectedVisit: (state, action: PayloadAction<Visit | null>) => {
      state.selectedVisit = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.loading = false;
        // El backend devuelve el Vehicle completo con visits
        const vehicle = action.payload as Vehicle;
        // Agregar a la lista como VehicleListItem
        const lastVisit = vehicle.visits?.[vehicle.visits.length - 1];
        const listItem: VehicleListItem = {
          _id: vehicle._id!,
          ownerName: vehicle.ownerName,
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color || '',
          visitCount: vehicle.visits?.length || 1,
          lastVisitDate: lastVisit?.fechaIngreso || vehicle.createdAt,
          lastVisit: lastVisit || null,
          userId: vehicle.userId,
          createdAt: vehicle.createdAt,
          updatedAt: vehicle.updatedAt,
        };
        // Si el vehículo ya existe en la lista, actualizarlo (visita nueva)
        // Si no existe, agregarlo al inicio (vehículo nuevo)
        const existingIndex = state.vehicles.findIndex(v => v._id === listItem._id);
        if (existingIndex !== -1) {
          state.vehicles[existingIndex].visitCount = listItem.visitCount;
          state.vehicles[existingIndex].lastVisitDate = listItem.lastVisitDate;
          state.vehicles[existingIndex].lastVisit = listItem.lastVisit;
        } else {
          state.vehicles.unshift(listItem);
        }
        state.selectedVehicle = vehicle;
      })
      .addCase(createVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const updated = action.payload as Vehicle;
        // Actualizar en la lista
        const index = state.vehicles.findIndex((v) => v._id === updated._id);
        if (index !== -1) {
          state.vehicles[index] = {
            ...state.vehicles[index],
            ownerName: updated.ownerName,
            licensePlate: updated.licensePlate,
            brand: updated.brand,
            model: updated.model,
            year: updated.year,
            color: updated.color || '',
          };
        }
        if (state.selectedVehicle?._id === updated._id) {
          state.selectedVehicle = updated;
        }
      })
      // Delete
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter((v) => v._id !== action.payload);
      })
      // Fetch by ID
      .addCase(fetchVehicleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedVehicle = action.payload;
        // Seleccionar la última visita por defecto
        const visits = action.payload.visits;
        if (visits && visits.length > 0) {
          state.selectedVisit = visits[visits.length - 1];
        }
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add Visit
      .addCase(addVisit.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.selectedVehicle?._id === updated._id) {
          state.selectedVehicle = updated;
          const visits = updated.visits;
          if (visits && visits.length > 0) {
            state.selectedVisit = visits[visits.length - 1];
          }
        }
      })
      // Update Visit
      .addCase(updateVisit.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.selectedVehicle?._id === updated._id) {
          state.selectedVehicle = updated;
        }
      })
      // Delete Visit
      .addCase(deleteVisit.fulfilled, (state, action) => {
        const { vehicleId, visitId } = action.payload;
        if (state.selectedVehicle?._id === vehicleId) {
          state.selectedVehicle.visits = state.selectedVehicle.visits.filter(
            (v) => v._id !== visitId
          );
          if (state.selectedVisit?._id === visitId) {
            const visits = state.selectedVehicle.visits;
            state.selectedVisit = visits.length > 0 ? visits[visits.length - 1] : null;
          }
        }
      });
  },
});

export const { setFilters, clearFilters, clearSelectedVehicle, setSelectedVisit, clearError } = vehicleSlice.actions;
export default vehicleSlice.reducer;
