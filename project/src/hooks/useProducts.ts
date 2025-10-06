import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Category } from '../types';

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

      if (error) {
        console.error('❌ Error categorías:', error);
        throw error;
      }
      
      setCategories(data || []);
      return data || [];
      
    } catch (err) {
      console.error('❌ Error cargando categorías:', err);
      setError('Error cargando categorías');
      return [];
    }
  };

  // Cargar productos con consulta simplificada
  const loadProducts = async (categoryId?: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // PRIMERO: Cargar productos básicos
      let productsQuery = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryId) {
        productsQuery = productsQuery.eq('category_id', categoryId);
      }

      const { data: productsData, error: productsError } = await productsQuery;
      
      if (productsError) {
        console.error('❌ Error productos básicos:', productsError);
        throw productsError;
      }


      // SEGUNDO: Si hay productos, cargar relaciones por separado
      if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id);
        
        // Cargar variantes
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('*')
          .in('product_id', productIds);

        if (variantsError) console.error('⚠️ Error variantes:', variantsError);

        // Cargar imágenes
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds);

        if (imagesError) console.error('⚠️ Error imágenes:', imagesError);

        // Combinar datos
        const productsWithRelations = productsData.map(product => ({
          ...product,
          category: categories.find(cat => cat.id === product.category_id) || null,
          variants: variantsData?.filter(v => v.product_id === product.id) || [],
          images: imagesData?.filter(img => img.product_id === product.id) || []
        }));

        setProducts(productsWithRelations);
      } else {
        setProducts([]);
      }
      
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
      setError(err instanceof Error ? err.message : 'Error cargando productos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar un producto específico
  const loadProduct = async (id: number): Promise<Product | null> => {
    try {
      
      // Cargar producto básico
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;

      if (!productData) return null;

      // Cargar relaciones por separado
      const [categoryResult, variantsResult, imagesResult] = await Promise.all([
        supabase.from('categories').select('*').eq('id', productData.category_id).single(),
        supabase.from('product_variants').select('*').eq('product_id', id),
        supabase.from('product_images').select('*').eq('product_id', id)
      ]);

      const productWithRelations: Product = {
        ...productData,
        category: categoryResult.data,
        variants: variantsResult.data || [],
        images: imagesResult.data || []
      };

      return productWithRelations;

    } catch (err) {
      console.error('❌ Error cargando producto:', err);
      return null;
    }
  };

  // Inicializar datos
  useEffect(() => {
    const initializeData = async () => {
      try {
        
        // Primero cargar categorías
        const cats = await loadCategories();
        
        // Luego cargar productos (que usará las categorías ya cargadas)
        if (cats.length > 0) {
          await loadProducts();
        } else {
          // Si no hay categorías, cargar productos sin relaciones de categoría
          await loadProducts();
        }
        
      } catch (error) {
        console.error('❌ Error inicializando datos:', error);
        setError('Error cargando productos');
      }
    };

    initializeData();
  }, []);

  return {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadProduct,
    loadCategories
  };
};