import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, RealtimeChannel } from '@supabase/supabase-js';
import type { AuthUser, UserRole } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');

  // Refs para control
  const mountedRef = useRef(true);
  const roleChannelRef = useRef<RealtimeChannel | null>(null);

  // --------------- LOAD ROLE ----------------
  const loadUserRole = useCallback(async (userId: string, forceRefresh = false): Promise<UserRole> => {
    if (!mountedRef.current) return 'customer';

    try {
      // PRIMERO intentar desde cache (a menos que forceRefresh sea true)
      const cacheKey = `user_role_${userId}`;
      
      if (!forceRefresh) {
        const cachedRole = localStorage.getItem(cacheKey);
        if (cachedRole) {
          return cachedRole as UserRole;
        }
      }

      // LUEGO intentar desde BD
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Error cargando rol:', error);
        return 'customer';
      }

      const userRole = (data?.role as UserRole) || 'customer';

      // Guardar en cache
      localStorage.setItem(cacheKey, userRole);
      
      return userRole;
    } catch (error) {
      console.warn('❌ Error cargando rol:', error);
      return 'customer';
    }
  }, []);

  // --------------- CLEAR USER CACHE ----------------
  const clearUserRoleCache = (userId: string) => {
    const cacheKey = `user_role_${userId}`;
    localStorage.removeItem(cacheKey);
  };

  // --------------- UPDATE USER ----------------
  const updateUser = useCallback(async (supabaseUser: SupabaseUser | null, forceRefresh = false) => {
    if (!supabaseUser) {
      if (mountedRef.current) setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userRole = await loadUserRole(supabaseUser.id, forceRefresh);

      if (mountedRef.current) {
        const authUser: AuthUser = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario',
          email: supabaseUser.email || '',
          created_at: supabaseUser.created_at,
          role: userRole,
        };
        setUser(authUser);
      }

    } catch (error) {
      console.error('💥 Error en updateUser:', error);
      if (mountedRef.current) {
        const fallbackUser: AuthUser = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Usuario',
          email: supabaseUser.email || '',
          created_at: supabaseUser.created_at,
          role: 'customer',
        };
        setUser(fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserRole]);

  // --------------- SETUP ROLE SUBSCRIPTION ----------------
  const setupRoleSubscription = useCallback((userId: string) => {
    // Limpiar suscripción anterior
    if (roleChannelRef.current) {
      supabase.removeChannel(roleChannelRef.current);
      roleChannelRef.current = null;
    }

    // Suscribirse a cambios en user_roles para este usuario
    const channel = supabase
      .channel(`user-role-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // UPDATE, INSERT
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          if (!mountedRef.current) return;

          const newRole = payload.new.role as UserRole;

          // Actualizar cache
          localStorage.setItem(`user_role_${userId}`, newRole);

          // Actualizar estado del usuario
          setUser(prev => {
            if (!prev || prev.id !== userId) return prev;
            return { ...prev, role: newRole };
          });
        }
      )
      .subscribe();

    roleChannelRef.current = channel;
  }, []);

  // --------------- INIT AUTH ----------------
  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          setLoading(false);
          return;
        }

        await updateUser(session?.user || null);
      } catch (error) {
        console.error('💥 Error inicializando auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mountedRef.current) return;
        await updateUser(session?.user || null);
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      
      // Limpiar suscripción de rol
      if (roleChannelRef.current) {
        supabase.removeChannel(roleChannelRef.current);
        roleChannelRef.current = null;
      }
    };
  }, [updateUser]);

  // --------------- EFFECT PARA SUSCRIPCIÓN DE ROL ----------------
  useEffect(() => {
    if (!user?.id) {
      // Limpiar suscripción si no hay usuario
      if (roleChannelRef.current) {
        supabase.removeChannel(roleChannelRef.current);
        roleChannelRef.current = null;
      }
      return;
    }

    // Configurar suscripción cuando el usuario cambia
    setupRoleSubscription(user.id);

    return () => {
      // Limpiar suscripción cuando el componente se desmonta o el usuario cambia
      if (roleChannelRef.current) {
        supabase.removeChannel(roleChannelRef.current);
        roleChannelRef.current = null;
      }
    };
  }, [user?.id, setupRoleSubscription]);

  // --------------- AUTH ACTIONS ----------------
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Limpiar cache del rol para forzar recarga
      if (data?.user?.id) {
        localStorage.removeItem(`user_role_${data.user.id}`);
      }
      
      setIsAuthOpen(false);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw error;
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
        options: { data: { name } },
      });
      if (error) throw error;
      
      // Registrar correo y nombre en user_profiles
      if (data?.user?.id) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              user_id: data.user.id,
              email: email,
              name: name,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
          
          if (profileError) {
            console.warn('⚠️ Error guardando perfil de usuario:', profileError);
          }
        } catch (profileErr) {
          console.warn('⚠️ Error al crear perfil de usuario:', profileErr);
          // No lanzar error, solo loguear
        }
      }
      
      setIsAuthOpen(false);
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const userId = user?.id;
      await supabase.auth.signOut();
      
      // Limpiar cache del rol
      if (userId) {
        localStorage.removeItem(`user_role_${userId}`);
      }
      
      setUser(null);
    } catch (error: any) {
      console.error('❌ Error en logout:', error);
      throw error;
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
    } catch (error: any) {
      console.error('❌ Error en forgot password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // --------------- ROLE MANAGEMENT ----------------
  const assignRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role });

      if (error) {
        console.error('❌ Error asignando rol:', error);
        return false;
      }

      clearUserRoleCache(userId);
      return true;
    } catch (error) {
      console.error('❌ Error asignando rol:', error);
      return false;
    }
  };

  // --------------- FORZAR ACTUALIZACIÓN DE OTRO USUARIO ----------------
  const refreshUserRole = async (userId: string): Promise<UserRole> => {
    try {
      // Limpiar cache y recargar
      clearUserRoleCache(userId);
      const newRole = await loadUserRole(userId, true);
      
      return newRole;
    } catch (error) {
      console.error('❌ Error refrescando rol de usuario:', error);
      return 'customer';
    }
  };

  // --------------- ROLE HELPERS ----------------
  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user?.role) return false;
    
    const hierarchy: Record<UserRole, number> = {
      customer: 0,
      worker: 1,
      admin: 2,
    };

    return hierarchy[user.role] >= hierarchy[requiredRole];
  }, [user]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isWorker = useCallback(() => hasRole('worker'), [hasRole]);
  const canAccessAdmin = useCallback(() => isAdmin() || isWorker(), [isAdmin, isWorker]);

  // --------------- REFRESCAR ROL ACTUAL ----------------
  const refreshRole = async (): Promise<UserRole> => {
    if (!user?.id) return 'customer';
    
    try {
      // Limpiar cache y recargar
      clearUserRoleCache(user.id);
      const newRole = await loadUserRole(user.id, true);
      
      setUser(prev => prev ? { ...prev, role: newRole } : null);
      return newRole;
    } catch (error) {
      console.error('❌ Error refrescando rol:', error);
      return user.role;
    }
  };

  return {
    // State
    user,
    isAuthOpen,
    authMode,
    loading,
    
    // Actions
    login,
    register,
    logout,
    forgotPassword,
    
    // Auth modal
    openAuth: (mode: 'login' | 'register' | 'forgot-password' = 'login') => {
      setAuthMode(mode);
      setIsAuthOpen(true);
    },
    closeAuth: () => setIsAuthOpen(false),
    
    // Role Management
    assignRole,
    refreshRole,
    refreshUserRole, // ✅ NUEVO: Para forzar actualización de otros usuarios
    clearUserRoleCache, // ✅ NUEVO: Para limpiar cache manualmente
    
    // Role Helpers
    hasRole,
    isAdmin,
    isWorker,
    canAccessAdmin,
    
    // Mode setter
    setAuthMode,
  };
};