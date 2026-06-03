import { configureStore } from '@reduxjs/toolkit';
import vehicleReducer from './vehicleSlice';
import cashRegisterReducer from './cashRegisterSlice';
import themeReducer from './themeSlice';
import { productApi } from '@/services/productApi';
import { categoryApi } from '@/services/categoryApi';

export const store = configureStore({
  reducer: {
    vehicles: vehicleReducer,
    cashRegister: cashRegisterReducer,
    theme: themeReducer,
    [productApi.reducerPath]: productApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(productApi.middleware, categoryApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
