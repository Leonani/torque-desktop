import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { hydrateThemeFromStorage, selectThemeMode, selectAccentColor } from '@/store/themeSlice';
import { getBgGradient, getHeaderGradient } from '@/utils/colorUtils';
import { setUser } from '@/store/authSlice';
import { getCurrentUser } from '@/services/api';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import VehicleList from '@/pages/VehicleList';
import VehicleForm from '@/pages/VehicleForm';
import VehicleDetail from '@/pages/VehicleDetail';
import StockList from '@/components/StockList/StockList';
import ProductForm from '@/components/ProductForm/ProductForm';
import ProductDetail from '@/components/ProductDetail/ProductDetail';
import StockMovementsReport from '@/pages/StockMovementsReport';
import AppointmentCalendar from '@/pages/Appointments';
import CashRegister from '@/pages/CashRegister';
import Debts from '@/pages/Debts';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import navigationLoaderStyles from '@/components/NavigationLoader.module.css';

/**
 * Indicador de navegación global
 */
const NavigationLoader: React.FC = () => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div className={navigationLoaderStyles.navigationLoader} />
  );
};

/**
 * Contenido interno de la app con acceso al store y tema
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  const accentColor = useAppSelector(selectAccentColor);

  // Hidratar tema desde localStorage al montar
  useEffect(() => {
    dispatch(hydrateThemeFromStorage());
  }, [dispatch]);

  // Sincronizar atributo data-theme y variables de gradiente en <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    const isDark = mode === 'dark';
    root.style.setProperty('--theme-bg-gradient', getBgGradient(accentColor, isDark));
    root.style.setProperty('--theme-header-bg-gradient', getHeaderGradient(accentColor, isDark));
  }, [mode, accentColor]);

  // Restaurar sesión al inicio
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      store.dispatch(setUser(JSON.parse(storedUser)));
      getCurrentUser()
        .then((user) => {
          store.dispatch(setUser(user));
          localStorage.setItem('user', JSON.stringify(user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        });
    }
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: accentColor,
          borderRadius: 6,
        },
        cssVar: {},
      }}
    >
      <AntApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NavigationLoader />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VehicleList />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VehicleForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/edit/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VehicleForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <VehicleDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <StockList />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProductForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/edit/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProductForm />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProductDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock/report"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <StockMovementsReport />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AppointmentCalendar />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/cash-register"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CashRegister />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debts"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Debts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/vehicles" replace />} />
            <Route path="*" element={<Navigate to="/vehicles" replace />} />
          </Routes>
        </Router>
      </AntApp>
    </ConfigProvider>
  );
}

/**
 * Componente raíz de la aplicación
 */
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
