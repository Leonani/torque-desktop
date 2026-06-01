import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import vehicleReducer from './vehicleSlice';
import cashRegisterReducer from './cashRegisterSlice';
import themeReducer from './themeSlice';
import { productApi } from '@/services/productApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehicleReducer,
    cashRegister: cashRegisterReducer,
    theme: themeReducer,
    [productApi.reducerPath]: productApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
