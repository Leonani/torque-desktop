import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Dropdown } from 'antd';
import {
  SettingOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeSettings/ThemeToggle';
import { ThemeSettingsModal } from '@/components/ThemeSettings/ThemeSettingsModal';
import { UpdateBanner } from '@/components/UpdateBanner/UpdateBanner';
import styles from './AppLayout.module.css';

const { Header, Content } = Layout;

/**
 * Layout principal de la aplicación
 * Incluye header con navegación y toggle de tema
 */
const AppLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { title, logo } = useTheme();

  const [settingsModal, setSettingsModal] = useState(false);

  const activeTab = location.pathname.startsWith('/products')
    ? 'products'
    : location.pathname.startsWith('/appointments')
      ? 'appointments'
      : location.pathname.startsWith('/cash-register')
        ? 'cash-register'
        : location.pathname.startsWith('/debts')
          ? 'debts'
          : 'vehicles';

  const menuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Personalizar Apariencia',
      onClick: () => setSettingsModal(true),
    },
  ];

  return (
    <>
      <UpdateBanner />
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.brandSection}>
              {logo ? (
                <img
                  src={logo}
                  alt={title}
                  className={styles.brandLogo}
                />
              ) : (
                <ShopOutlined className={styles.brandLogoFallback} />
              )}
              <h1 className={styles.brandTitle}>
                {title}
              </h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            <ThemeToggle />
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <Button
                type="text"
                icon={<SettingOutlined className={styles.headerIcon} />}
              />
            </Dropdown>
          </div>
        </Header>

        <Content className={styles.content}>
          <div className={styles.tabsContainer}>
            <div className={styles.tabsNav}>
              <button
                className={`${styles.tab} ${activeTab === 'vehicles' ? styles.tabActive : ''}`}
                onClick={() => navigate('/vehicles')}
              >
                Recepcion de Vehiculos
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'appointments' ? styles.tabActive : ''}`}
                onClick={() => navigate('/appointments')}
              >
                Turnos
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'products' ? styles.tabActive : ''}`}
                onClick={() => navigate('/products')}
              >
                Stock de Productos
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'cash-register' ? styles.tabActive : ''}`}
                onClick={() => navigate('/cash-register')}
              >
                Caja
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'debts' ? styles.tabActive : ''}`}
                onClick={() => navigate('/debts')}
              >
                Deudas
              </button>
            </div>
          </div>
          <div className={styles.pageContent}>
            {children}
          </div>
        </Content>
      </Layout>

      {/* Theme Settings Modal */}
      <ThemeSettingsModal
        open={settingsModal}
        onClose={() => setSettingsModal(false)}
      />
    </>
  );
};

export default AppLayout;
