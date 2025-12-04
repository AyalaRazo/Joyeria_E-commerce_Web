import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserAddress } from '../types';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAddresses([]);
        return;
      }
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAddresses((data || []) as UserAddress[]);
    } catch (err) {
      console.error('Error loading addresses:', err);
      setError(err instanceof Error ? err.message : 'Error cargando direcciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: Omit<UserAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const payload = { ...input, user_id: user.id, country: 'MX' } as any;
    const { data, error } = await supabase.from('user_addresses').insert(payload).select('*').single();
    if (error) throw error;
    await load();
    return data as UserAddress;
  }, [load]);

  const update = useCallback(async (id: number, input: Partial<UserAddress>) => {
    const { data, error } = await supabase
      .from('user_addresses')
      .update({ ...input, country: 'MX', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    await load();
    return data as UserAddress;
  }, [load]);

  const remove = useCallback(async (id: number) => {
    const { error } = await supabase.from('user_addresses').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const setDefault = useCallback(async (id: number) => {
    // Marcar esta como predeterminada; el trigger en DB asegurará unicidad
    await update(id, { is_default: true });
  }, [update]);

  useEffect(() => {
    load();
  }, [load]);

  return { addresses, loading, error, load, create, update, remove, setDefault };
};


