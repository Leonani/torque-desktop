import { InspectionSector } from '../types';

export const inspectionSectors: Omit<InspectionSector, 'items'>[] = [
  { sector: 'lubricantes' },
  { sector: 'distribucion' },
  { sector: 'frenos' },
  { sector: 'iluminacion' },
  { sector: 'interior' },
  { sector: 'trenDelantero' },
  { sector: 'trenTrasero' },
  { sector: 'varios' },
];

export const inspectionItems: Record<string, string[]> = {
  lubricantes: [
    'Revisión aceite de caja',
    'Revisión filtro de combustible',
    'Filtro de habitáculo',
    'Líquido de freno',
    'Líquido hidráulico',
  ],
  distribucion: [
    'Correa de distribución',
    'Correa poli V',
    'Bomba de agua',
    'Correa de accesorios',
  ],
  frenos: [
    'Estado de pastillas',
    'Estado de discos',
    'Recorrido freno de mano',
  ],
  iluminacion: [
    'Interior',
    'Intermitentes delanteras',
    'Intermitentes traseras',
    'Posición delantera',
    'Posición trasera',
    'Luz baja delantera',
    'Luz alta delantera',
    'Antiniebla delantera',
    'Antiniebla trasera',
    'Marcha atrás trasera',
    'Freno trasera',
    'Patente trasera',
  ],
  interior: [
    'Aire acondicionado',
    'Calefacción',
    'Escobilla limpia parabrisas',
    'Lavaparabrisas',
    'Bocina',
    'Amortiguadores',
  ],
  trenDelantero: ['Tren Delantero'],
  trenTrasero: ['Tren Trasero'],
  varios: ['Comentarios'],
};

export const sectorNames: Record<string, string> = {
  lubricantes: 'Lubricantes y Filtros',
  distribucion: 'Distribución',
  frenos: 'Frenos',
  iluminacion: 'Iluminación',
  interior: 'Interior, Confort y Seguridad',
  trenDelantero: 'Tren Delantero',
  trenTrasero: 'Tren Trasero',
  varios: 'Varios',
};

/**
 * Configuración de la tabla de iluminación.
 * Define cómo se agrupan los items en filas.
 * Cada fila izquierda puede tener 1 o 2 posiciones (delantera y/o trasera).
 * Cada fila derecha tiene 1 posición (trasera).
 * El valor numérico es el índice en el array inspectionItems.iluminacion.
 * null significa que esa posición no aplica.
 */
export interface LightingCell {
  label: string;
  itemIndex: number | null;
}

export interface LightingRow {
  leftLabel: string;
  delantera: number | null;
  trasera: number | null;
  rightLabel: string | null;
  rightTrasera: number | null;
}

export const lightingRows: LightingRow[] = [
  { leftLabel: 'Interior', delantera: 0, trasera: null, rightLabel: 'Marcha atrás', rightTrasera: 9 },
  { leftLabel: 'Intermitentes', delantera: 1, trasera: 2, rightLabel: 'Freno', rightTrasera: 10 },
  { leftLabel: 'Posición', delantera: 3, trasera: 4, rightLabel: 'Patente', rightTrasera: 11 },
  { leftLabel: 'Luz baja', delantera: 5, trasera: null, rightLabel: null, rightTrasera: null },
  { leftLabel: 'Luz alta', delantera: 6, trasera: null, rightLabel: null, rightTrasera: null },
  { leftLabel: 'Antiniebla', delantera: 7, trasera: 8, rightLabel: null, rightTrasera: null },
];

export const createEmptyInspections = (): InspectionSector[] => {
  return inspectionSectors.map(({ sector }) => ({
    sector: sector as InspectionSector['sector'],
    items: (inspectionItems[sector] || []).map((name) => ({
      name,
      status: 'ok',
      needsReplacement: false,
      notes: '',
    })),
  }));
};
