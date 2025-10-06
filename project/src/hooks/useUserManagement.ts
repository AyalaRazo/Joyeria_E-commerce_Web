import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  role: UserRole;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auth.users')
        .select(`
          id,
          email,
          created_at,
          user_metadata
        `);

      if (error) throw error;

      // Obtener roles para cada usuario
      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            created_at: user.created_at,
            role: roleData?.role || 'customer'
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role });
      
      if (error) throw error;

      // Actualizar la lista de usuarios
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, role } : user
        )
      );

      return true;
    } catch (error) {
      console.error('Error asignando rol:', error);
      return false;
    }
  };

  const removeRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;

      // Actualizar la lista de usuarios
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, role: 'customer' } : user
        )
      );

      return true;
    } catch (error) {
      console.error('Error removiendo rol:', error);
      return false;
    }
  };

  const getUserById = async (userId: string): Promise<UserWithRole | null> => {
    try {
      const { data, error } = await supabase
        .from('auth.users')
        .select(`
          id,
          email,
          created_at,
          user_metadata
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      return {
        id: data.id,
        email: data.email,
        name: data.user_metadata?.name || data.email?.split('@')[0] || 'Usuario',
        created_at: data.created_at,
        role: roleData?.role || 'customer'
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    assignRole,
    removeRole,
    getUserById
  };
};
