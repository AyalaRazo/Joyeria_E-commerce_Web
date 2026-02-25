import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Order, OrderItem, UserAddress } from '../types';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar órdenes del usuario
  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*),
            variant:product_variants(*)
          ),
          shipping_address:user_addresses(*),
          transaction:transactions(amount, subtotal, shipping, taxes, currency)
        `)
        .eq('user_id', user.id)
        .neq('status', 'reserved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // transactions es un array por la relación 1:N; tomar la primera para cada orden
      const ordersWithTx = (data || []).filter(order => order.status !== 'reserved').map((o: any) => ({
        ...o,
        transaction: Array.isArray(o.transaction) ? o.transaction[0] ?? null : o.transaction ?? null
      }));
      setOrders(ordersWithTx);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError(err instanceof Error ? err.message : 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  };

  // Crear una nueva orden
  const createOrder = async (orderData: {
    total: number;
    items: Array<{
      product_id: number;
      variant_id?: number;
      quantity: number;
      price: number;
    }>;
    shipping_address_id?: number | null;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Debes iniciar sesión para crear una orden');
      }

      // Crear la orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: orderData.total,
          status: 'reserved',
          shipping_address_id: orderData.shipping_address_id || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear los items de la orden
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Recargar órdenes
      await loadOrders();

      return order;
    } catch (err) {
      console.error('Error creando orden:', err);
      setError(err instanceof Error ? err.message : 'Error creando orden');
      throw err;
    }
  };

  // Obtener una orden específica
  const getOrder = async (orderId: number): Promise<Order | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(*),
            variant:product_variants(*)
          ),
          shipping_address:user_addresses(*),
          transaction:transactions(amount, subtotal, shipping, taxes, currency)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      const o = data as any;
      return {
        ...o,
        transaction: Array.isArray(o?.transaction) ? o.transaction[0] ?? null : o?.transaction ?? null
      };
    } catch (err) {
      console.error('Error obteniendo orden:', err);
      setError(err instanceof Error ? err.message : 'Error obteniendo orden');
      return null;
    }
  };

  // Actualizar estado de una orden
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      await loadOrders();
    } catch (err) {
      console.error('Error actualizando orden:', err);
      setError(err instanceof Error ? err.message : 'Error actualizando orden');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    loadOrders,
    createOrder,
    getOrder,
    updateOrderStatus
  };
}; 