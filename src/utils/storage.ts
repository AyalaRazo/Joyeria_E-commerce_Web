import { supabase } from '../lib/supabase';

export const uploadImageToProductsBucket = async (
  file: File,
  categoryNameEs: string
): Promise<string> => {
  const cleanCategory = categoryNameEs
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-áéíóúñ]/gi, '');

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
  const path = `${cleanCategory}/${fileName}`;

  const { error } = await supabase.storage
    .from('products')
    .upload(path, file, { upsert: false, cacheControl: '3600' });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('products').getPublicUrl(path);
  return data.publicUrl;
};



