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
          order:orders(*, order_items(*, product:products(*))),
          admin:auth.users(*)
        `)
        .order('returned_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error obteniendo devoluciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async (orderId: number, reason?: string, adminId?: string) => {
    try {
      // Llamar a la función de PostgreSQL para procesar la devolución
      const { error: functionError } = await supabase.rpc('process_return', {
        order_id_param: orderId
      });

      if (functionError) throw functionError;

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
          order:orders(*, order_items(*, product:products(*))),
          admin:auth.users(*)
        `)
        .eq('id', returnId)
        .single();

      if (error) throw error;
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
