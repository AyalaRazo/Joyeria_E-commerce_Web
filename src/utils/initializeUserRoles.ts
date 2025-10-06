import { supabase } from '../lib/supabase';

// Función para inicializar roles de usuarios existentes
export const initializeUserRoles = async () => {
  try {
    console.log('🔄 Inicializando roles de usuarios...');
    
    // Obtener todos los usuarios de auth.users que no tengan rol en user_roles
    const { data: usersWithoutRoles, error } = await supabase
      .rpc('get_users_without_roles');
    
    if (error) {
      console.log('⚠️ No se pudo obtener usuarios sin roles:', error.message);
      return;
    }
    
    if (!usersWithoutRoles || usersWithoutRoles.length === 0) {
      console.log('✅ Todos los usuarios ya tienen roles asignados');
      return;
    }
    
    console.log(`📊 Encontrados ${usersWithoutRoles.length} usuarios sin rol`);
    
    // Asignar rol customer por defecto a usuarios sin rol
    const roleAssignments = usersWithoutRoles.map((user: any) => ({
      user_id: user.id,
      role: 'customer'
    }));
    
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert(roleAssignments);
    
    if (insertError) {
      console.error('❌ Error asignando roles:', insertError);
    } else {
      console.log(`✅ Roles asignados a ${roleAssignments.length} usuarios`);
    }
    
  } catch (error) {
    console.error('❌ Error inicializando roles:', error);
  }
};

// Función alternativa más simple para asignar rol a un usuario específico
export const assignDefaultRole = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'customer' });
    
    if (error) {
      console.error('Error asignando rol por defecto:', error);
      return false;
    }
    
    console.log('✅ Rol customer asignado al usuario:', userId);
    return true;
  } catch (error) {
    console.error('Error asignando rol por defecto:', error);
    return false;
  }
};

// Función para verificar si un usuario tiene rol
export const userHasRole = async (userId: string): Promise<boolean> => {
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

