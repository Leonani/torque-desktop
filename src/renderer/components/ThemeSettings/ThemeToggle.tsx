import { Button, Tooltip } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './ThemeToggle.module.css';

/**
 * Botón para alternar entre modo claro y oscuro en el header
 */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'}>
      <Button
        type="text"
        icon={
          isDark ? (
            <SunOutlined className={`${styles.toggleIcon} ${styles.lightIcon}`} />
          ) : (
            <MoonOutlined className={`${styles.toggleIcon} ${styles.darkIcon}`} />
          )
        }
        onClick={toggleTheme}
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      />
    </Tooltip>
  );
}
