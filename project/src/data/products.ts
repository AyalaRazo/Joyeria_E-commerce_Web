import { Product, Category } from '../types';
import { supabase } from '../lib/supabase';

export const categories: Category[] = [
  {
    id: 1,
    name: 'rings',
    description: 'Anillos de compromiso, bodas y ocasiones especiales',
  },
  {
    id: 2,
    name: 'necklaces',
    description: 'Collares elegantes con diamantes y piedras preciosas',
  },
  {
    id: 3,
    name: 'bracelets',
    description: 'Pulsos de lujo en oro y plata',
  },
  {
    id: 4,
    name: 'earrings',
    description: 'Pendientes exclusivos con diseños únicos',
  }
];

// Consulta segura: obtener productos desde Supabase
export async function fetchProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        variants:product_variants(*),
        images:product_images(url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar productos:', error);
      return [];
    }
    
    // Adaptar el formato para que coincida con la interfaz Product
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      original_price: p.original_price,
      category: p.category?.name || 'Sin categoría',
      image: p.image,
      images: p.images ? p.images.map((img: any) => img.url) : [],
      description: p.description || '',
      material: p.material || '',
      in_stock: p.in_stock,
      is_new: p.is_new,
      is_featured: p.is_featured,
      category_id: p.category_id,
      stock: p.stock || 0,
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        original_price: v.original_price,
        image: v.image,
        stock: v.stock || 0,
        model: v.model,
        size: v.size,
        type: v.type,
        images: []
      }))
    }));
  } catch (error) {
    console.error('Error inesperado al consultar productos:', error);
    return [];
  }
}


export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data || [];
}