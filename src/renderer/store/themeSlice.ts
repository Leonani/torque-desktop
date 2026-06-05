import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@store/index';

const THEME_STORAGE_KEY = 'torque_app_theme';

/**
 * Modos de tema soportados
 */
type ThemeMode = 'light' | 'dark';

/**
 * Estado del tema en Redux
 */
interface ThemeState {
  mode: ThemeMode;
  accentColor: string;
  presetName: string | null;
  title: string;
  logo: string | null;
  // Datos del taller para la orden de trabajo
  direccion: string;
  telefono: string;
  email: string;
  ciudad: string;
}

/**
 * Formato legacy del tema (puede existir en localStorage)
 */
interface LegacyTheme {
  isDark?: boolean;
  primaryColorHex?: string;
  primaryColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  headerColor?: string;
  logo?: string;
}

const ACCENT_COLORS = {
  azul: '#1677ff',
  rojo: '#f5222d',
  verde: '#52c41a',
} as const;

/**
 * Migra el formato legacy de tema al nuevo formato
 */
function migrateLegacyTheme(legacy: LegacyTheme): ThemeState {
  return {
    mode: legacy.isDark ? 'dark' : 'light',
    accentColor: legacy.primaryColorHex || legacy.primaryColor || ACCENT_COLORS.azul,
    presetName: null,
    title: 'Torque Desktop',
    logo: legacy.logo || null,
    direccion: '',
    telefono: '',
    email: '',
    ciudad: '',
  };
}

/**
 * Lee el tema del localStorage, intentando migrar el formato legacy si es necesario
 */
function loadThemeFromStorage(): ThemeState {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved) {
      return getDefaultTheme();
    }

    const parsed = JSON.parse(saved);

    // Detectar formato legacy (tiene isDark o primaryColor)
    if ('isDark' in parsed || 'primaryColor' in parsed || 'primaryColorHex' in parsed) {
      const migrated = migrateLegacyTheme(parsed as LegacyTheme);
      saveThemeToStorage(migrated);
      return migrated;
    }

    // Formato nuevo
    if (parsed && typeof parsed === 'object' && 'mode' in parsed && 'accentColor' in parsed) {
      return {
        mode: parsed.mode || 'light',
        accentColor: parsed.accentColor || ACCENT_COLORS.azul,
        presetName: parsed.presetName || null,
        title: parsed.title || 'Torque Desktop',
        logo: parsed.logo || null,
        direccion: parsed.direccion || '',
        telefono: parsed.telefono || '',
        email: parsed.email || '',
        ciudad: parsed.ciudad || '',
      };
    }

    return getDefaultTheme();
  } catch {
    return getDefaultTheme();
  }
}

function getDefaultTheme(): ThemeState {
  return {
    mode: 'light',
    accentColor: ACCENT_COLORS.azul,
    presetName: 'azul',
    title: 'Torque Desktop',
    logo: null,
    direccion: '',
    telefono: '',
    email: '',
    ciudad: '',
  };
}

function saveThemeToStorage(theme: ThemeState): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
}

const initialState: ThemeState = loadThemeFromStorage();

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /** Establece el modo de tema (light/dark) */
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece un color de acento personalizado (hex) */
    setAccentColor(state, action: PayloadAction<string>) {
      state.accentColor = action.payload;
      state.presetName = null;
      saveThemeToStorage(state);
    },

    /** Establece un color predefinido por nombre */
    setPresetColor(state, action: PayloadAction<string | null>) {
      const presetName = action.payload;
      if (presetName && presetName in ACCENT_COLORS) {
        state.accentColor = ACCENT_COLORS[presetName as keyof typeof ACCENT_COLORS];
        state.presetName = presetName;
      } else {
        state.accentColor = ACCENT_COLORS.azul;
        state.presetName = 'azul';
      }
      saveThemeToStorage(state);
    },

    /** Restablece el tema a los valores por defecto */
    resetTheme(state) {
      state.mode = 'light';
      state.accentColor = ACCENT_COLORS.azul;
      state.presetName = 'azul';
      state.title = 'Torque Desktop';
      state.logo = null;
      state.direccion = '';
      state.telefono = '';
      state.email = '';
      state.ciudad = '';
      saveThemeToStorage(state);
    },

    /** Hidrata el tema desde localStorage (llamar al inicio de la app) */
    hydrateThemeFromStorage(state) {
      const stored = loadThemeFromStorage();
      state.mode = stored.mode;
      state.accentColor = stored.accentColor;
      state.presetName = stored.presetName;
      state.title = stored.title;
      state.logo = stored.logo;
    },

    /** Establece el título personalizado del header */
    setBrandTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece el logo en base64 (null para quitarlo) */
    setBrandLogo(state, action: PayloadAction<string | null>) {
      state.logo = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece la dirección del taller */
    setTallerDireccion(state, action: PayloadAction<string>) {
      state.direccion = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece el teléfono del taller */
    setTallerTelefono(state, action: PayloadAction<string>) {
      state.telefono = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece el email del taller */
    setTallerEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece la ciudad del taller */
    setTallerCiudad(state, action: PayloadAction<string>) {
      state.ciudad = action.payload;
      saveThemeToStorage(state);
    },

    /** Establece todos los datos del taller de una vez */
    setTallerSettings(state, action: PayloadAction<{
      direccion: string;
      telefono: string;
      email: string;
      ciudad: string;
    }>) {
      state.direccion = action.payload.direccion;
      state.telefono = action.payload.telefono;
      state.email = action.payload.email;
      state.ciudad = action.payload.ciudad;
      saveThemeToStorage(state);
    },
  },
});

// Actions
export const {
  setThemeMode,
  setAccentColor,
  setPresetColor,
  resetTheme,
  hydrateThemeFromStorage,
  setBrandTitle,
  setBrandLogo,
  setTallerDireccion,
  setTallerTelefono,
  setTallerEmail,
  setTallerCiudad,
  setTallerSettings,
} = themeSlice.actions;

// Selectors
export const selectThemeMode = (state: RootState): ThemeMode => state.theme.mode;
export const selectAccentColor = (state: RootState): string => state.theme.accentColor;
export const selectPresetName = (state: RootState): string | null => state.theme.presetName;
export const selectBrandTitle = (state: RootState): string => state.theme.title;
export const selectBrandLogo = (state: RootState): string | null => state.theme.logo;
export const selectTallerDireccion = (state: RootState): string => state.theme.direccion;
export const selectTallerTelefono = (state: RootState): string => state.theme.telefono;
export const selectTallerEmail = (state: RootState): string => state.theme.email;
export const selectTallerCiudad = (state: RootState): string => state.theme.ciudad;
export const selectThemeConfig = (state: RootState): ThemeState => state.theme;

export default themeSlice.reducer;
