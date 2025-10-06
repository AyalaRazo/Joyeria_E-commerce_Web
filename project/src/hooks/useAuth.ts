import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthUser, UserRole } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');

  const updateUser = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }
  
    // Obtener el rol del usuario desde user_roles
    let userRole: UserRole = 'customer'; // Valor por defecto
    
    try {      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout obteniendo rol')), 3000);
      });
      
      const { data: roleData, error } = await Promise.race([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .single(),
        timeoutPromise
      ]) as any;
      
      if (error) {
        // Fallback: mantener el valor por defecto 'customer'
        console.warn('Error obteniendo rol, usando valor por defecto:', error);
      } else if (roleData && roleData.role) {
        userRole = roleData.role as UserRole;
      } else {
        // No hay rol en la base de datos, usar valor por defecto
        console.warn('No se encontró rol en BD, usando valor por defecto');
        
        // Intentar insertar el rol por defecto en la base de datos para futuras consultas
        try {
          await supabase
            .from('user_roles')
            .insert({ user_id: supabaseUser.id, role: userRole });
        } catch (insertError) {
          console.warn('Error insertando rol por defecto:', insertError);
        }
      }
    } catch (error) {
      // Fallback: mantener el valor por defecto 'customer'
      console.warn('Error general obteniendo rol, usando valor por defecto:', error);
    }
  
    setUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario',
      email: supabaseUser.email || '',
      created_at: supabaseUser.created_at,
      role: userRole
    });
    setLoading(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
      const { data: { session } } = await supabase.auth.getSession();
        await updateUser(session?.user || null);
      } catch (error) {
        console.error('❌ Error inicializando autenticación:', error);
        setLoading(false);
      }
    };

    // Timeout de seguridad para garantizar que el loading termine
    const safetyTimeout = setTimeout(() => {
    setLoading(false);
    }, 5000); // 5 segundos máximo

    initializeAuth().finally(() => {
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await updateUser(session?.user || null);
      } catch (error) {
        console.error('❌ Error en cambio de estado de autenticación:', error);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setIsAuthOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
      
      // Asignar rol por defecto al usuario recién registrado
      if (data.user) {
        try {
          await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: 'customer' });
        } catch (roleError) {
        // No es crítico, el usuario puede usar la app sin rol específico
        }
      }
      
      setIsAuthOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot-password' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthOpen(false);
  };

  // Funciones para gestión de roles
  const assignRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error asignando rol:', error);
      return false;
    }
  };

  const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data?.role || 'customer';
    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return 'customer';
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy = { customer: 0, worker: 1, admin: 2 };
    const userLevel = roleHierarchy[user.role || 'customer'];
    const requiredLevel = roleHierarchy[requiredRole];
    
    return userLevel >= requiredLevel;
  };

  const isAdmin = () => hasRole('admin');
  const isWorker = () => hasRole('worker');
  const canAccessAdmin = () => isAdmin() || isWorker();

  return {
    user,
    isAuthOpen,
    authMode,
    loading,
    login,
    register,
    forgotPassword,
    logout,
    openAuth: openAuthModal,
    closeAuth: closeAuthModal,
    setAuthMode,
    assignRole,
    getUserRole,
    hasRole,
    isAdmin,
    isWorker,
    canAccessAdmin
  };
};