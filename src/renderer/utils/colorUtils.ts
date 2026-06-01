/**
 * Utilidades de contraste y luminancia WCAG 2.1
 */

/** Calcula la luminancia relativa de un color hex */
export function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

/** Determina si el texto debe ser blanco o negro según el fondo */
export function getContrastText(bgHex: string): '#ffffff' | '#000000' {
  return getRelativeLuminance(bgHex) > 0.5 ? '#000000' : '#ffffff';
}

/** Calcula el ratio de contraste entre dos colores */
export function getContrastRatio(foreground: string, background: string): number {
  const fg = getRelativeLuminance(foreground);
  const bg = getRelativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Verifica WCAG AA para texto normal (≥ 4.5:1) */
export function meetsWcagAA(textColor: string, bgColor: string): boolean {
  return getContrastRatio(textColor, bgColor) >= 4.5;
}

/** Asegura que un color hex tenga suficiente contraste sobre un fondo */
export function ensureReadable(color: string, bgColor: string): string {
  const textOnColor = getContrastText(color);
  const ratio = getContrastRatio(textOnColor, bgColor);
  return ratio >= 4.5 ? textOnColor : (getRelativeLuminance(bgColor) > 0.5 ? '#000000' : '#ffffff');
}

/**
 * Convierte un color hex a RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

/**
 * Mezcla un color hex con blanco (para modo claro) o negro (para modo oscuro)
 * @param hex - Color hex (#1677ff)
 * @param amount - 0 = color puro, 1 = blanco/negro puro
 * @param dark - true para mezclar con negro, false para mezclar con blanco
 */
export function tintColor(hex: string, amount: number, dark = false): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = dark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  const r = Math.round(rgb.r + (target.r - rgb.r) * amount);
  const g = Math.round(rgb.g + (target.g - rgb.g) * amount);
  const b = Math.round(rgb.b + (target.b - rgb.b) * amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Genera el valor CSS del gradiente de fondo
 * El color acento se muestra al 100% en el primer 10% y luego degrada al fondo
 * Dirección: 155° (el color desde arriba, degrada hacia abajo con inclinación)
 */
export function getBgGradient(accentColor: string, isDark: boolean): string {
  const bg = isDark ? '#141414' : '#f5f5f5';
  return `linear-gradient(155deg, ${accentColor} 0%, ${accentColor} 10%, ${bg} 100%)`;
}

/**
 * Genera el gradiente para el header
 * Usa una versión más oscura/sobria del color acento para que el texto sea legible
 * El color se intensifica en el extremo superior y degrada suavemente
 */
export function getHeaderGradient(accentColor: string, isDark: boolean): string {
  const headerBg = isDark ? '#1a1a1a' : '#ffffff';
  // Versión más oscura del acento para el header (30% de mezcla con negro)
  const darkAccent = tintColor(accentColor, 0.3, true);
  // Versión tenue del acento (80% de mezcla con blanco/negro)
  const softAccent = tintColor(accentColor, 0.8, isDark);
  return `linear-gradient(155deg, ${darkAccent} 0%, ${softAccent} 40%, ${headerBg} 100%)`;
}
