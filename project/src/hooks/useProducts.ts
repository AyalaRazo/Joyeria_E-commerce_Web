  import { useState, useEffect } from 'react';
  import { supabase } from '../lib/supabase';
  import type { Product, Category, ProductVariant, ProductImage } from '../types';

  export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cargar categorías
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        setError(err instanceof Error ? err.message : 'Error cargando categorías');
      }
    };

    // Cargar productos
    const loadProducts = async (categoryId?: number) => {
      try {
        setLoading(true);
        let query = supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          `)
          .order('created_at', { ascending: false });

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error cargando productos:', err);
        setError(err instanceof Error ? err.message : 'Error cargando productos');
      } finally {
        setLoading(false);
      }
    };

    // Cargar un producto específico
    const loadProduct = async (id: number): Promise<Product | null> => {
      try {
        console.log('useProducts: Loading product with ID:', id);
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            variants:product_variants(
              *,
              images:variant_images(*)
            ),
            images:product_images(*)
          `)
          .eq('id', id)
          .single();

        console.log('useProducts: Supabase response:', { data, error });

        if (error) throw error;
        console.log('useProducts: Product loaded successfully:', data);
        return data;
      } catch (err) {
        console.error('useProducts: Error cargando producto:', err);
        setError(err instanceof Error ? err.message : 'Error cargando producto');
        return null;
      }
    };

    // Cargar productos destacados
    const loadFeaturedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          `)
          .eq('is_featured', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error cargando productos destacados:', err);
        return [];
      }
    };

    // Cargar productos nuevos
    const loadNewProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          `)
          .eq('is_new', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error cargando productos nuevos:', err);
        return [];
      }
    };

    useEffect(() => {
      loadCategories();
      loadProducts();
    }, []);

    return {
      products,
      categories,
      loading,
      error,
      loadProducts,
      loadProduct,
      loadFeaturedProducts,
      loadNewProducts,
      loadCategories
    };
  }; 