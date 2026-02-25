import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Category, MetalType } from '../types';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metalTypes, setMetalTypes] = useState<MetalType[]>([]);
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

  // Cargar metal types (oro, plata, etc.) para filtros
  const loadMetalTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('metal_types')
        .select('*')
        .order('name');
      if (error) throw error;
      setMetalTypes((data || []) as MetalType[]);
      return data || [];
    } catch (err) {
      console.error('❌ Error cargando metal_types:', err);
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
        
        // Cargar variantes con sus imágenes
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select(`
            *,
            variant_images:variant_images(*)
          `)
          .in('product_id', productIds);

        if (variantsError) console.error('⚠️ Error variantes:', variantsError);

        // Cargar imágenes
        const { data: imagesData, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .in('product_id', productIds);

        if (imagesError) console.error('⚠️ Error imágenes:', imagesError);

        // Combinar datos
        let productsWithRelations = productsData.map(product => {
          const productVariants = variantsData?.filter(v => v.product_id === product.id) || [];
          // Normalizar variantes con variant_images
          const normalizedVariants = productVariants.map((variant: any) => ({
            ...variant,
            variant_images: variant.variant_images || [],
            images: variant.variant_images || []
          }));
          
          return {
            ...product,
            category: categories.find(cat => cat.id === product.category_id) || null,
            variants: normalizedVariants,
            images: imagesData?.filter(img => img.product_id === product.id) || []
          };
        });

        // Filtrar productos activos y con variantes activas
        productsWithRelations = productsWithRelations.filter(product => {
          if (product.is_active === false) return false;
          // Si tiene variantes, al menos una debe estar activa
          if (product.variants && product.variants.length > 0) {
            return product.variants.some((v: any) => v.is_active !== false);
          }
          return true;
        });

        // Ordenar productos: ofertas primero, luego destacados, luego nuevos
        productsWithRelations.sort((a, b) => {
          const getPriority = (p: Product) => {
            // Verificar si tiene oferta en variante default
            const defaultVariant = p.variants?.find((v: any) => v.is_default === true);
            const hasOffer = defaultVariant 
              ? (defaultVariant.original_price && defaultVariant.original_price > defaultVariant.price)
              : (p.original_price && p.original_price > p.price);
            
            if (hasOffer) return 1;
            if (p.is_featured) return 2;
            if (p.is_new) return 3;
            return 4;
          };
          return getPriority(a) - getPriority(b);
        });

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
        const cats = await loadCategories();
        await loadMetalTypes();
        if (cats.length > 0) {
          await loadProducts();
        } else {
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
    metalTypes,
    loading,
    error,
    loadProducts,
    loadProduct,
    loadCategories,
    loadMetalTypes
  };
};