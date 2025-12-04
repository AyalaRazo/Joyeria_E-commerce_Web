import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Return, Order } from '../types';

export const useReturns = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders(*, order_items(*, product:products(*)))
        `)
        .order('returned_at', { ascending: false });

      if (error) throw error;
      
      // Obtener información del admin por separado si existe
      const returnsWithAdmin = await Promise.all(
        (data || []).map(async (returnItem) => {
          if (returnItem.admin_id) {
            try {
              const { data: adminData } = await supabase.auth.admin.getUserById(returnItem.admin_id);
              return {
                ...returnItem,
                admin: adminData?.user ? {
                  id: adminData.user.id,
                  email: adminData.user.email,
                  name: adminData.user.user_metadata?.name || adminData.user.email?.split('@')[0] || 'Admin'
                } : null
              };
            } catch (adminError) {
              console.error('Error obteniendo admin:', adminError);
              return { ...returnItem, admin: null };
            }
          }
          return { ...returnItem, admin: null };
        })
      );
      
      setReturns(returnsWithAdmin);
    } catch (error) {
      console.error('Error obteniendo devoluciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async (orderId: number, reason?: string, adminId?: string) => {
    try {
      // Actualizar el estado de la orden a devuelto
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'devuelto' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Crear registro de devolución
      const { error: insertError } = await supabase
        .from('returns')
        .insert({
          order_id: orderId,
          admin_id: adminId,
          reason: reason || 'Devolución procesada',
          items_returned: null // Se puede expandir para incluir detalles específicos
        });

      if (insertError) throw insertError;

      // Actualizar la lista de devoluciones
      await fetchReturns();
      
      return true;
    } catch (error) {
      console.error('Error procesando devolución:', error);
      return false;
    }
  };

  const getReturnById = async (returnId: number): Promise<Return | null> => {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          order:orders(*, order_items(*, product:products(*)))
        `)
        .eq('id', returnId)
        .single();

      if (error) throw error;
      
      // Obtener información del admin si existe
      if (data.admin_id) {
        try {
          const { data: adminData } = await supabase.auth.admin.getUserById(data.admin_id);
          data.admin = adminData?.user ? {
            id: adminData.user.id,
            email: adminData.user.email,
            name: adminData.user.user_metadata?.name || adminData.user.email?.split('@')[0] || 'Admin'
          } : null;
        } catch (adminError) {
          console.error('Error obteniendo admin:', adminError);
          data.admin = null;
        }
      } else {
        data.admin = null;
      }
      
      return data;
    } catch (error) {
      console.error('Error obteniendo devolución:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  return {
    returns,
    loading,
    fetchReturns,
    processReturn,
    getReturnById
  };
};
