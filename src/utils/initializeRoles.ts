import { supabase } from './lib/supabase';

// Script para inicializar roles de usuario y datos de prueba
export const initializeDatabase = async () => {
  try {
    console.log('Inicializando base de datos...');

    // Crear roles de usuario por defecto si no existen
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (rolesError) {
      console.error('Error verificando roles existentes:', rolesError);
      return;
    }

    if (!existingRoles || existingRoles.length === 0) {
      console.log('No se encontraron roles existentes. Creando roles de ejemplo...');
      
      // Aquí puedes agregar lógica para crear usuarios de prueba con roles específicos
      // Por ejemplo, si tienes usuarios específicos que quieres asignar como admin
      console.log('Para asignar roles de admin o worker, usa la función assignRole en el hook useAuth');
    }

    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
  }
};

// Función para asignar rol de admin a un usuario específico
export const assignAdminRole = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' });
    
    if (error) throw error;
    
    console.log(`Rol de admin asignado al usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('Error asignando rol de admin:', error);
    return false;
  }
};

// Función para asignar rol de worker a un usuario específico
export const assignWorkerRole = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'worker' });
    
    if (error) throw error;
    
    console.log(`Rol de worker asignado al usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('Error asignando rol de worker:', error);
    return false;
  }
};
