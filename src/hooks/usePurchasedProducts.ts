import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Order, OrderItem } from '../types';

export const usePurchasedProducts = () => {
  const [purchasedProducts, setPurchasedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPurchasedProducts = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Obtener órdenes del usuario
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          order_items (
            id,
            product_id,
            variant_id,
            quantity,
            price,
            product (
              id,
              name,
              price,
              image,
              description,
              material,
              category_id,
              category (
                id,
                name
              )
            ),
            variant (
              id,
              name,
              price,
              image
            )
          )
        `)
        .eq('user_id', userId)
        .in('status', ['entregado', 'enviado', 'procesando']);

      if (ordersError) throw ordersError;

      // Extraer productos únicos de las órdenes
      const productsMap = new Map<number, Product>();
      
      orders?.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
          if (item.product && !productsMap.has(item.product.id)) {
            productsMap.set(item.product.id, item.product);
          }
        });
      });

      const uniqueProducts = Array.from(productsMap.values());
      setPurchasedProducts(uniqueProducts);

    } catch (err) {
      console.error('Error loading purchased products:', err);
      setError(err instanceof Error ? err.message : 'Error cargando productos comprados');
    } finally {
      setLoading(false);
    }
  };

  const getProductPurchaseHistory = async (userId: string, productId: number) => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            price
          )
        `)
        .eq('user_id', userId)
        .eq('order_items.product_id', productId);

      if (error) throw error;

      return orders || [];
    } catch (err) {
      console.error('Error getting product purchase history:', err);
      return [];
    }
  };

  return {
    purchasedProducts,
    loading,
    error,
    loadPurchasedProducts,
    getProductPurchaseHistory
  };
}; 