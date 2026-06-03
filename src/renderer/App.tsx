import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { hydrateThemeFromStorage, selectThemeMode, selectAccentColor } from '@/store/themeSlice';
import { getBgGradient, getHeaderGradient } from '@/utils/colorUtils';

// Pages
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
            <Route
              path="/vehicles"
              element={
                <AppLayout>
                  <VehicleList />
                </AppLayout>
              }
            />
            <Route
              path="/vehicles/new"
              element={
                <AppLayout>
                  <VehicleForm />
                </AppLayout>
              }
            />
            <Route
              path="/vehicles/edit/:id"
              element={
                <AppLayout>
                  <VehicleForm />
                </AppLayout>
              }
            />
            <Route
              path="/vehicles/:id"
              element={
                <AppLayout>
                  <VehicleDetail />
                </AppLayout>
              }
            />

            <Route
              path="/products"
              element={
                <AppLayout>
                  <StockList />
                </AppLayout>
              }
            />
            <Route
              path="/products/new"
              element={
                <AppLayout>
                  <ProductForm />
                </AppLayout>
              }
            />
            <Route
              path="/products/edit/:id"
              element={
                <AppLayout>
                  <ProductForm />
                </AppLayout>
              }
            />
            <Route
              path="/products/:id"
              element={
                <AppLayout>
                  <ProductDetail />
                </AppLayout>
              }
            />
            <Route
              path="/stock/report"
              element={
                <AppLayout>
                  <StockMovementsReport />
                </AppLayout>
              }
            />
            <Route
              path="/appointments"
              element={
                <AppLayout>
                  <AppointmentCalendar />
                </AppLayout>
              }
            />

            <Route
              path="/cash-register"
              element={
                <AppLayout>
                  <CashRegister />
                </AppLayout>
              }
            />
            <Route
              path="/debts"
              element={
                <AppLayout>
                  <Debts />
                </AppLayout>
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
