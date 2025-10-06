import { supabase } from '../lib/supabase';
import { getRoleFromEmail } from './adminConfig';

// Función para asignar rol a un usuario específico
export const assignRoleToUser = async (userId: string, email: string): Promise<boolean> => {
  try {
    const role = getRoleFromEmail(email);
    
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role });
    
    if (error) {
      console.error('Error asignando rol:', error);
      return false;
    }
    
    console.log(`✅ Rol ${role} asignado al usuario ${email}`);
    return true;
  } catch (error) {
    console.error('Error asignando rol:', error);
    return false;
  }
};

// Función para verificar si un usuario tiene rol en user_roles
export const userHasRoleInDatabase = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    return !error && !!data;
  } catch (error) {
    return false;
  }
};

// Función para obtener el rol de un usuario desde la base de datos
export const getUserRoleFromDatabase = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error) return null;
    return data?.role || null;
  } catch (error) {
    return null;
  }
};

// Función para sincronizar roles de usuarios existentes
export const syncUserRoles = async (): Promise<void> => {
  try {
    console.log('🔄 Sincronizando roles de usuarios...');
    
    // Obtener todos los usuarios autenticados
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error obteniendo usuarios:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No hay usuarios para sincronizar');
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuarios para sincronizar`);
    
    // Para cada usuario, verificar si tiene rol y asignarlo si no
    for (const user of users) {
      if (!user.email) continue;
      
      const hasRole = await userHasRoleInDatabase(user.id);
      
      if (!hasRole) {
        const role = getRoleFromEmail(user.email);
        const assigned = await assignRoleToUser(user.id, user.email);
        
        if (assigned) {
          console.log(`✅ Rol ${role} asignado a ${user.email}`);
        } else {
          console.log(`⚠️ No se pudo asignar rol a ${user.email}`);
        }
      } else {
        console.log(`✅ Usuario ${user.email} ya tiene rol asignado`);
      }
    }
    
    console.log('✅ Sincronización de roles completada');
  } catch (error) {
    console.error('Error sincronizando roles:', error);
  }
};

