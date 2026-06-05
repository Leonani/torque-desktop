import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
  selectThemeMode,
  selectAccentColor,
  selectPresetName,
  selectBrandTitle,
  selectBrandLogo,
  selectTallerDireccion,
  selectTallerTelefono,
  selectTallerEmail,
  selectTallerCiudad,
  setThemeMode,
  setAccentColor,
  setPresetColor,
  resetTheme,
  setBrandTitle,
  setBrandLogo,
  setTallerDireccion,
  setTallerTelefono,
  setTallerEmail,
  setTallerCiudad,
  setTallerSettings,
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
  const title = useAppSelector(selectBrandTitle);
  const logo = useAppSelector(selectBrandLogo);
  const direccion = useAppSelector(selectTallerDireccion);
  const telefono = useAppSelector(selectTallerTelefono);
  const email = useAppSelector(selectTallerEmail);
  const ciudad = useAppSelector(selectTallerCiudad);

  return {
    mode,
    accentColor,
    presetName,
    title,
    logo,
    direccion,
    telefono,
    email,
    ciudad,
    isDark: mode === 'dark',
    toggleTheme: () => dispatch(setThemeMode(mode === 'dark' ? 'light' : 'dark')),
    setTheme: (newMode: 'light' | 'dark') => dispatch(setThemeMode(newMode)),
    setAccentColor: (color: string) => dispatch(setAccentColor(color)),
    setPresetColor: (preset: string | null) => dispatch(setPresetColor(preset)),
    resetTheme: () => dispatch(resetTheme()),
    setBrandTitle: (t: string) => dispatch(setBrandTitle(t)),
    setBrandLogo: (logo: string | null) => dispatch(setBrandLogo(logo)),
    setTallerDireccion: (d: string) => dispatch(setTallerDireccion(d)),
    setTallerTelefono: (t: string) => dispatch(setTallerTelefono(t)),
    setTallerEmail: (e: string) => dispatch(setTallerEmail(e)),
    setTallerCiudad: (c: string) => dispatch(setTallerCiudad(c)),
    setTallerSettings: (s: { direccion: string; telefono: string; email: string; ciudad: string }) =>
      dispatch(setTallerSettings(s)),
  };
}
