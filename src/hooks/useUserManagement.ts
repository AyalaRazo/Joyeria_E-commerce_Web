import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';
import { useAuth } from './useAuth';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  created_at: string | null;
  role: UserRole;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, isAdmin } = useAuth();

  // 🧩 Obtener todos los usuarios administrativos
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Trae todo desde la vista combinada
      const { data, error } = await supabase
        .from('view_user_management')
        .select('*')
        .in('role', ['worker', 'admin']);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.user_id,
        email: item.profile_email,
        name:
          item.profile_name ||
          item.profile_email?.split('@')[0] ||
          `Usuario ${String(item.user_id).slice(0, 8)}`,
        created_at: item.profile_created_at,
        role: item.role as UserRole,
      }));

      setUsers(formatted);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ⚙️ Asignar o cambiar rol (solo admins)
  const assignRole = async (targetUserId: string, newRole: UserRole) => {
    if (!isAdmin()) {
      console.warn('Solo los administradores pueden asignar roles.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: targetUserId, role: newRole });

      if (error) throw error;

      setUsers(prev =>
        prev.map(u =>
          u.id === targetUserId ? { ...u, role: newRole } : u
        )
      );
      return true;
    } catch (error) {
      console.error('Error asignando rol:', error);
      return false;
    }
  };

  const addAdminByEmail = async (email: string, role: UserRole) => {
    if (!isAdmin()) {
      console.warn('Solo los administradores pueden agregar usuarios administrativos.');
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return false;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, email, name, created_at')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.user_id) {
        throw new Error('No se encontró un usuario con ese correo.');
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: profile.user_id, role }, { onConflict: 'user_id' });

      if (roleError) throw roleError;

      setUsers(prev => {
        const exists = prev.some(u => u.id === profile.user_id);
        if (exists) {
          return prev.map(u => (u.id === profile.user_id ? { ...u, role } : u));
        }
        return [
          ...prev,
          {
            id: profile.user_id,
            email: profile.email,
            name: profile.name || profile.email?.split('@')[0] || 'Usuario',
            created_at: profile.created_at,
            role,
          },
        ];
      });

      return true;
    } catch (error) {
      console.error('Error agregando usuario administrativo:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user && isAdmin()) fetchUsers();
  }, [user]);

  return {
    users,
    loading,
    fetchUsers,
    assignRole,
    addAdminByEmail,
  };
};
