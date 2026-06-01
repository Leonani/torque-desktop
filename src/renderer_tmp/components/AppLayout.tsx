import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Dropdown, Modal, Form, Input, message, Upload, Image } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  LockOutlined,
  LogoutOutlined,
  ShopOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/hooks/useAppDispatch';
import { logoutUser, setUser } from '@/store/authSlice';
import api from '@/services/api';
import { ThemeToggle } from '@/components/ThemeSettings/ThemeToggle';
import { ThemeSettingsModal } from '@/components/ThemeSettings/ThemeSettingsModal';
import styles from './AppLayout.module.css';

const { Header, Content } = Layout;

/**
 * Layout principal de la aplicación para rutas protegidas
 * Incluye header con navegación, toggle de tema y menú de usuario
 */
const AppLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const [messageApi, messageContextHolder] = message.useMessage();

  const [settingsModal, setSettingsModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [tallerModal, setTallerModal] = useState(false);
  const [form] = Form.useForm();
  const [tallerForm] = Form.useForm();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const handlePasswordChange = () => {
    messageApi.info('Funcionalidad en desarrollo');
  };

  const [logoRemoved, setLogoRemoved] = useState(false);

  const handleTallerUpdate = async (values: { nombreTaller: string; logo: string }) => {
    try {
      const payload: Record<string, unknown> = { nombreTaller: values.nombreTaller };
      if (values.logo && !logoRemoved) {
        payload.logoUrl = values.logo;
      } else if (logoRemoved) {
        payload.logoUrl = null; // Clear logo on backend
      }
      await api.put('/auth/update-taller', payload);
      if (user) {
        const updatedUser = { ...user, nombreTaller: values.nombreTaller };
        if (values.logo && !logoRemoved) {
          updatedUser.logoUrl = values.logo;
        } else if (logoRemoved) {
          delete updatedUser.logoUrl;
        }
        dispatch(setUser(updatedUser));
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      messageApi.success('Taller actualizado correctamente');
      setTallerModal(false);
      setLogoRemoved(false);
    } catch {
      messageApi.error('Error al actualizar el taller');
    }
  };

  const activeTab = location.pathname.startsWith('/products')
    ? 'products'
    : location.pathname.startsWith('/appointments')
      ? 'appointments'
      : location.pathname.startsWith('/cash-register')
        ? 'cash-register'
        : location.pathname.startsWith('/debts')
          ? 'debts'
          : 'vehicles';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `Usuario: ${user?.nombre} ${user?.apellido}`,
      disabled: true,
    },
    {
      key: 'taller',
      icon: <ShopOutlined />,
      label: 'Editar Taller',
      onClick: () => {
        tallerForm.setFieldsValue({
          nombreTaller: user?.nombreTaller,
          logo: user?.logoUrl || '',
        });
        setTallerModal(true);
      },
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: 'Cambiar Contraseña',
      onClick: () => setPasswordModal(true),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Personalizar Apariencia',
      onClick: () => setSettingsModal(true),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      {messageContextHolder}
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.brandSection}>
              {user?.logoUrl ? (
                <Image
                  src={user.logoUrl}
                  alt="Logo del taller"
                  className={styles.brandLogo}
                  preview={false}
                />
              ) : (
                <ShopOutlined className={styles.brandLogoFallback} />
              )}
              <h1 className={styles.brandTitle}>
                {user?.nombreTaller || 'Nombre del Taller'}
              </h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            <ThemeToggle />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
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

      {/* Password Change Modal */}
      <Modal
        title="Cambiar Contraseña"
        open={passwordModal}
        onCancel={() => setPasswordModal(false)}
        footer={null}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="currentPassword"
            label="Contraseña Actual"
            rules={[{ required: true, message: 'Ingrese la contraseña actual' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Nueva Contraseña"
            rules={[{ required: true, message: 'Ingrese la nueva contraseña' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirmar Nueva Contraseña"
            rules={[{ required: true, message: 'Confirme la nueva contraseña' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Cambiar Contraseña
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Taller Edit Modal */}
      <Modal
        title="Editar Taller"
        open={tallerModal}
        onCancel={() => {
          setTallerModal(false);
          setLogoRemoved(false);
        }}
        footer={null}
        centered
        style={{ top: 16 }}
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
        destroyOnHidden
      >
        <Form
          form={tallerForm}
          layout="vertical"
          onFinish={handleTallerUpdate}
        >
          <Form.Item
            name="nombreTaller"
            label="Nombre del Taller"
            rules={[{ required: true, message: 'Ingrese el nombre del taller' }]}
          >
            <Input prefix={<ShopOutlined />} placeholder="Nombre del Taller" size="large" />
          </Form.Item>

          <Form.Item name="logo" label="Logo del Taller">
            <Upload
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const dataUrl = e.target?.result as string;
                  tallerForm.setFieldsValue({ logo: dataUrl });
                  messageApi.success('Logo cargado correctamente');
                };
                reader.readAsDataURL(file);
                return false; // Prevent default upload
              }}
            >
              <Button icon={<UploadOutlined />} block>
                {user?.logoUrl ? 'Cambiar Logo' : 'Seleccionar Logo'}
              </Button>
            </Upload>
          </Form.Item>

          {user?.logoUrl && (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Image
                src={user.logoUrl}
                alt="Logo actual"
                width={80}
                height={80}
                style={{ borderRadius: 8, objectFit: 'contain' }}
              />
              <br />
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  tallerForm.setFieldsValue({ logo: '' });
                  setLogoRemoved(true);
                  messageApi.info('Logo eliminado. Guarde para confirmar.');
                }}
              >
                Quitar logo
              </Button>
            </div>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AppLayout;
