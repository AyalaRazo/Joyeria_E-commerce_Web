import { supabase } from '../lib/supabase';

// Construye la URL pública desde el path almacenado en BD usando rewrites de Vercel
export const buildMediaUrl = (path: string): string => {
  if (!path) return path;

  if (path.startsWith('videos/')) {
    return `/videos/${path.replace(/^videos\//, '')}`;
  }

  return `/images/${path}`;
};


// Función helper para detectar si una URL es un video
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.includes('/videos/');
};

// Mapeo de categorías en inglés a español para las carpetas
const categoryFolderMap: Record<string, string> = {
  'rings': 'anillos',
  'ring': 'anillos',
  'necklaces': 'collares',
  'necklace': 'collares',
  'bracelets': 'pulseras',
  'bracelet': 'pulseras',
  'earrings': 'pendientes',
  'earring': 'pendientes',
  'pendientes': 'pendientes',
  'anillos': 'anillos',
  'collares': 'collares',
  'pulseras': 'pulseras'
};

// Función para normalizar texto: quitar acentos y caracteres especiales
const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD') // separa letras y acentos
    .replace(/[\u0300-\u036f]/g, '') // elimina los acentos
    .trim();

// Función para obtener el nombre de la carpeta según la categoría
const getCategoryFolder = (categoryName: string): string => {
  const normalized = normalizeText(categoryName);
  return categoryFolderMap[normalized] || normalized.replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
};

// Función para limpiar el nombre del producto para usar en el archivo
const cleanProductName = (productName: string): string => {
  return normalizeText(productName)
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '')
    .substring(0, 50); // Limitar longitud
};

export const uploadImageToProductsBucket = async (
  file: File,
  categoryName: string,
  productName: string,
  suffix?: string
): Promise<string> => {
  const categoryFolder = getCategoryFolder(categoryName);
  const cleanProduct = cleanProductName(productName);
  const fileExt = file.name.split('.').pop() || 'jpg';

  // Formato: {categoria}/{nombre_producto[_{suffix}]}.{ext}
  const normalizedSuffix = suffix ? `_${cleanProductName(suffix)}` : '';
  const fileName = `${cleanProduct}${normalizedSuffix}.${fileExt}`;
  const path = `${categoryFolder}/${fileName}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(path, file, { upsert: false, cacheControl: '3600' });

  if (error) {
    throw error;
  }

  // Guardamos solo el path relativo (sin dominio ni prefijos locales)
  return path;
};

export const uploadVideoToProductsBucket = async (
  file: File,
  categoryName: string,
  productName: string,
  suffix?: string
): Promise<string> => {
  const categoryFolder = getCategoryFolder(categoryName);
  const cleanProduct = cleanProductName(productName);
  const fileExt = file.name.split('.').pop() || 'mp4';

  // Formato: videos/{categoria}/{nombre_producto[_{suffix}]}.{ext}
  const normalizedSuffix = suffix ? `_${cleanProductName(suffix)}` : '';
  const fileName = `${cleanProduct}${normalizedSuffix}.${fileExt}`;
  const path = `videos/${categoryFolder}/${fileName}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(path, file, { upsert: false, cacheControl: '86400' });

  if (error) {
    throw error;
  }

  // Guardamos solo el path relativo (sin dominio ni prefijos locales)
  return path;
};



