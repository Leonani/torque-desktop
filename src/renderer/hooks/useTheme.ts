import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  selectThemeMode,
  selectAccentColor,
  selectPresetName,
  setThemeMode,
  setAccentColor,
  setPresetColor,
  resetTheme,
} from '@/store/themeSlice';

/**
 * Hook personalizado para acceder y modificar el tema de la aplicación
 * Reemplaza el antiguo ThemeContext
 */
export function useTheme() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(selectThemeMode);
  const accentColor = useAppSelector(selectAccentColor);
  const presetName = useAppSelector(selectPresetName);

  return {
    mode,
    accentColor,
    presetName,
    isDark: mode === 'dark',
    toggleTheme: () => dispatch(setThemeMode(mode === 'dark' ? 'light' : 'dark')),
    setTheme: (newMode: 'light' | 'dark') => dispatch(setThemeMode(newMode)),
    setAccentColor: (color: string) => dispatch(setAccentColor(color)),
    setPresetColor: (preset: string | null) => dispatch(setPresetColor(preset)),
    resetTheme: () => dispatch(resetTheme()),
  };
}
