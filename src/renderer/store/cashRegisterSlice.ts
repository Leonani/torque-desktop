import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { CashRegisterState } from '../types';
import api from '../services/api';

const initialState: CashRegisterState = {
  currentRegister: null,
  history: [],
  loading: false,
  error: null,
};

export const fetchCurrentRegister = createAsyncThunk(
  'cashRegister/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-register/current');
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const openRegister = createAsyncThunk(
  'cashRegister/open',
  async (data: { montoInicial: number; observaciones?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-register/open', data);
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const closeRegister = createAsyncThunk(
  'cashRegister/close',
  async (data: { montoFinalDeclarado: number; observaciones?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cash-register/close', data);
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchRegisterHistory = createAsyncThunk(
  'cashRegister/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cash-register/history');
      return response.data;
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const cashRegisterSlice = createSlice({
  name: 'cashRegister',
  initialState,
  reducers: {
    clearCashRegisterError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentRegister.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentRegister.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRegister = action.payload;
      })
      .addCase(fetchCurrentRegister.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(openRegister.fulfilled, (state, action) => {
        state.currentRegister = action.payload;
      })
      .addCase(closeRegister.fulfilled, (state) => {
        state.currentRegister = null;
      })
      .addCase(fetchRegisterHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  },
});

export const { clearCashRegisterError } = cashRegisterSlice.actions;
export default cashRegisterSlice.reducer;
