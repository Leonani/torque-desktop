import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Obtiene el directorio base para almacenar fotos
 */
function getPhotosDir(): string {
  let photosDir: string;
  if (process.env.VITE_DEV_SERVER_URL) {
    photosDir = path.join(process.cwd(), 'data', 'photos');
  } else {
    photosDir = path.join(app.getPath('userData'), 'photos');
  }
  return photosDir;
}

/**
 * Guarda una foto en el sistema de archivos
 * @param base64Data - Datos de la imagen en base64 (con o sin header data:image)
 * @param vehicleId - ID del vehículo
 * @param visitId - ID de la visita
 * @param position - Posición de la foto (front, back, left, right, motor, dashboard)
 * @returns Ruta relativa del archivo guardado
 */
export function savePhoto(base64Data: string, vehicleId: string, visitId: string, position: string): string {
  const photosDir = getPhotosDir();
  const vehicleDir = path.join(photosDir, vehicleId);

  // Asegurar que el directorio del vehículo existe
  fs.mkdirSync(vehicleDir, { recursive: true });

  // Extraer los datos base64 (eliminar el header data:image/...;base64,)
  let base64Content = base64Data;
  const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (matches) {
    base64Content = matches[2];
  }

  const fileName = `${visitId}_${position}.jpg`;
  const filePath = path.join(vehicleDir, fileName);

  fs.writeFileSync(filePath, base64Content, 'base64');

  // Devolver la ruta relativa para almacenar en la BD
  return path.join(vehicleId, fileName);
}

/**
 * Elimina una foto del sistema de archivos
 * @param filePath - Ruta relativa del archivo a eliminar
 */
export function deletePhoto(filePath: string): void {
  const photosDir = getPhotosDir();
  const fullPath = path.join(photosDir, filePath);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error al eliminar la foto:', error);
  }
}

/**
 * Obtiene la URL pública para acceder a una foto
 * @param filePath - Ruta relativa del archivo
 * @returns URL relativa para servir la foto
 */
export function getPhotoUrl(filePath: string): string {
  // Las fotos se sirven estáticamente desde /photos
  return `/photos/${filePath.replace(/\\/g, '/')}`;
}
