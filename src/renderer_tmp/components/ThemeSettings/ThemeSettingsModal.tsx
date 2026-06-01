import { Modal, Button, Switch, ColorPicker, Divider, Typography } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
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
  } = useTheme();

  const handleReset = () => {
    resetTheme();
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
