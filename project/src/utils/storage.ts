import { supabase } from '../lib/supabase';

const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// Construye la URL pública desde el path almacenado en BD usando rewrites de Vercel
export const buildMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '/default-product-image.png';
  
  // Si ya es una URL completa (con http:// o https://), retornar tal cual
  if (path.startsWith('http')) return path;
  
  // Si es localhost, usar Supabase directo
  if (isLocalhost) {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/products/${path}`;
  }

  // Si el path ya incluye "videos/", asegurar que use la ruta correcta
  if (path.startsWith('videos/')) {
    return `/videos/${path.replace(/^videos\//, '')}`;
  }

  // Si el path es muy largo (URL completa pero sin http), extraer la parte relevante
  if (path.includes('supabase.co/storage/v1/object/public/products/')) {
    // Extraer todo después de 'products/'
    const match = path.match(/products\/(.+)$/);
    if (match) {
      const relativePath = match[1];
      
      // Verificar si es video
      const isVideo = isVideoUrl(relativePath);
      
      if (isVideo) {
        return `/videos/${relativePath}`;
      } else {
        return `/images/${relativePath}`;
      }
    }
  }

  // Para paths normales (anillos/nombre.jpg)
  // Verificar si es video por extensión
  const isVideo = isVideoUrl(path);
  
  if (isVideo) {
    // Si no empieza con videos/, agregarlo
    if (!path.startsWith('videos/')) {
      return `/videos/${path}`;
    }
    return `/videos/${path.replace(/^videos\//, '')}`;
  }
  
  // Para imágenes normales
  return `/images/${path}`;
};

// Función helper para detectar si una URL es un video
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Primero verificar si la URL contiene '/videos/' en el path
  if (url.includes('/videos/')) return true;
  
  // Verificar extensiones de video
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v', '.mkv'];
  const urlLower = url.toLowerCase();
  
  return videoExtensions.some(ext => urlLower.endsWith(ext));
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

/**
 * Obtiene la primera imagen de una variante usando la función SQL get_variant_images
 * Maneja todos los casos de herencia: propias, de otra variante, del modelo, o del producto
 */
export const getVariantFirstImage = async (
  variantId: number | null | undefined,
  productImage: string | null | undefined,
  useProductImages?: boolean
): Promise<string | null> => {
  // Si no hay variant_id, usar imagen del producto
  if (!variantId) {
    return productImage || null;
  }
  
  // Si use_product_images es true, usar imagen del producto
  if (useProductImages) {
    return productImage || null;
  }
  
  try {
    const { data, error } = await supabase.rpc('get_variant_images', {
      p_variant_id: variantId
    });
    
    if (error) {
      console.error('Error fetching variant image:', error);
      return productImage || null;
    }
    
    // Obtener la primera imagen ordenada
    const images = (data || [])
      .sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
    
    if (images.length > 0 && images[0].url) {
      return images[0].url;
    }
    
    // Fallback a imagen del producto
    return productImage || null;
  } catch (error) {
    console.error('Error in getVariantFirstImage:', error);
    return productImage || null;
  }
};