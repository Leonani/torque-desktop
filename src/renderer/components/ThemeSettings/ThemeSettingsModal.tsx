import { Modal, Button, Switch, ColorPicker, Divider, Typography, Input, Upload, message } from 'antd';
import { SunOutlined, MoonOutlined, UploadOutlined, DeleteOutlined, EnvironmentOutlined, PhoneOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { useUpdateWorkshopMutation } from '@/services/workshopApi';
import styles from './ThemeSettings.module.css';

const { Text } = Typography;

const PRESETS = [
  { name: 'Azul', color: '#1677ff', emoji: '🔵' },
  { name: 'Rojo', color: '#f5222d', emoji: '🔴' },
  { name: 'Verde', color: '#52c41a', emoji: '🟢' },
] as const;

/**
 * Props para el modal de personalización de tema
 */
interface ThemeSettingsModalProps {
  /** Controla si el modal está visible */
  open: boolean;
  /** Callback al cerrar el modal */
  onClose: () => void;
}

/**
 * Modal completo de personalización de apariencia
 * Permite cambiar modo claro/oscuro, colores predefinidos y color personalizado
 */
export function ThemeSettingsModal({ open, onClose }: ThemeSettingsModalProps) {
  const {
    isDark,
    accentColor,
    toggleTheme,
    setAccentColor,
    setPresetColor,
    resetTheme,
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

  const handleReset = () => {
    resetTheme();
  };

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
      title="Personalizar Apariencia"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      style={{ top: 16 }}
      styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 24 } }}
      destroyOnHidden
    >
      {/* Modo de visualización */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Modo de visualización</span>
        <div className={styles.modeToggle}>
          <div className={styles.modeLabel}>
            {isDark ? <MoonOutlined /> : <SunOutlined />}
            <span>{isDark ? 'Oscuro' : 'Claro'}</span>
          </div>
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Colores rápidos */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Colores rápidos</span>
        <div className={styles.presetsGrid}>
          {PRESETS.map((preset) => (
            <div
              key={preset.name}
              className={`${styles.presetCard} ${
                accentColor === preset.color ? styles.presetCardActive : ''
              }`}
              onClick={() => setPresetColor(preset.name.toLowerCase())}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setPresetColor(preset.name.toLowerCase());
                }
              }}
            >
              <div
                className={styles.presetColor}
                style={{ '--preset-swatch-color': preset.color } as React.CSSProperties}
              />
              <span className={styles.presetName}>{preset.name}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Color personalizado */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Color personalizado</span>
        <ColorPicker
          value={accentColor}
          onChange={(color) => setAccentColor(color.toHexString())}
          format="hex"
          showText
          size="large"
          disabledAlpha
        />
      </div>

      <Divider className={styles.divider} />

      {/* Título personalizado */}
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

      <Divider className={styles.divider} />

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

      <Divider className={styles.divider} />

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

      <Divider className={styles.divider} />

      {/* Vista previa */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Vista previa</span>
        <div className={styles.previewCard}>
          <Button type="primary" className={styles.previewButton}>
            Botón Primario
          </Button>
          <Text className={styles.previewText}>
            Texto de ejemplo con el color de tema actual
          </Text>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footerActions}>
        <Button onClick={handleReset}>Restablecer</Button>
        <Button type="primary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
