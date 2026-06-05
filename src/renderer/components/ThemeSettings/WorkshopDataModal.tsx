import { Modal, Button, Input, Upload, message } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { useUpdateWorkshopMutation } from '@/services/workshopApi';
import styles from './ThemeSettings.module.css';

/**
 * Props para el modal de datos del taller
 */
interface WorkshopDataModalProps {
  /** Controla si el modal está visible */
  open: boolean;
  /** Callback al cerrar el modal */
  onClose: () => void;
}

/**
 * Modal de Datos del Taller
 * Permite configurar el título del header, logo y datos del taller
 * (dirección, teléfono, email, ciudad)
 */
export function WorkshopDataModal({ open, onClose }: WorkshopDataModalProps) {
  const {
    title,
    logo,
    setBrandTitle,
    setBrandLogo,
    direccion,
    telefono,
    email,
    ciudad,
    setTallerDireccion,
    setTallerTelefono,
    setTallerEmail,
    setTallerCiudad,
  } = useTheme();

  const [updateWorkshop] = useUpdateWorkshopMutation();

  const handleLogoUpload = (file: File): boolean => {
    if (file.size > 500 * 1024) {
      message.error('El logo no debe superar los 500KB');
      return false;
    }
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Solo se permiten imágenes PNG, JPG o WebP');
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBrandLogo(dataUrl);
      message.success('Logo actualizado correctamente');
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleRemoveLogo = () => {
    setBrandLogo(null);
    message.success('Logo eliminado');
  };

  return (
    <Modal
      title="Datos del Taller"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      style={{ top: 16 }}
      styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      destroyOnHidden
    >
      {/* Título del header */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Título del header</span>
        <Input
          value={title}
          onChange={(e) => setBrandTitle(e.target.value)}
          placeholder="Torque Desktop"
          maxLength={60}
          showCount
          size="large"
        />
      </div>

      {/* Logo personalizado */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Logo</span>
        <div className={styles.logoSection}>
          {logo && (
            <div className={styles.logoPreviewWrapper}>
              <img src={logo} alt="Logo preview" className={styles.logoPreview} />
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                onClick={handleRemoveLogo}
                style={{ flexShrink: 0 }}
              >
                Eliminar logo
              </Button>
            </div>
          )}
          <Upload
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={handleLogoUpload}
            disabled={!!logo}
          >
            <Button icon={<UploadOutlined />} disabled={!!logo}>
              {logo ? 'Logo cargado' : 'Subir logo'}
            </Button>
          </Upload>
        </div>
      </div>

      {/* Datos del Taller */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Datos del Taller</span>
        <div className={styles.tallerFields}>
          <Input
            value={direccion}
            onChange={(e) => {
              setTallerDireccion(e.target.value);
              updateWorkshop({ direccion: e.target.value });
            }}
            placeholder="Dirección del taller"
            prefix={<EnvironmentOutlined />}
            size="large"
            maxLength={100}
          />
          <Input
            value={telefono}
            onChange={(e) => {
              setTallerTelefono(e.target.value);
              updateWorkshop({ telefono: e.target.value });
            }}
            placeholder="Teléfono"
            prefix={<PhoneOutlined />}
            size="large"
            maxLength={30}
          />
          <Input
            value={email}
            onChange={(e) => {
              setTallerEmail(e.target.value);
              updateWorkshop({ email: e.target.value });
            }}
            placeholder="Email"
            prefix={<MailOutlined />}
            size="large"
            maxLength={60}
          />
          <Input
            value={ciudad}
            onChange={(e) => {
              setTallerCiudad(e.target.value);
              updateWorkshop({ ciudad: e.target.value });
            }}
            placeholder="Ciudad"
            prefix={<BankOutlined />}
            size="large"
            maxLength={50}
          />
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footerActions}>
        <div />
        <Button type="primary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
