import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  console.log('🧪 Iniciando pruebas de Supabase...');
  
  // Test 1: Verificar que el cliente se creó correctamente
  console.log('📋 Cliente Supabase:', supabase ? 'Creado' : 'No creado');
  
  // Test 2: Probar una consulta simple
  try {
    console.log('🔍 Probando consulta simple...');
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    console.log('📊 Resultado consulta simple:', { data, error });
    
    if (error) {
      console.error('❌ Error en consulta simple:', error);
      return false;
    }
    
    console.log('✅ Consulta simple exitosa');
    return true;
  } catch (error) {
    console.error('💥 Error inesperado en consulta simple:', error);
    return false;
  }
};

export const testTableExists = async (tableName: string) => {
  try {
    console.log(`🔍 Verificando si existe la tabla: ${tableName}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    console.log(`📊 Resultado para ${tableName}:`, { data: data?.length || 0, error });
    
    if (error) {
      console.error(`❌ Error accediendo a ${tableName}:`, error);
      console.error(`🔍 Detalles del error:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log(`✅ Tabla ${tableName} accesible`);
    return true;
  } catch (error) {
    console.error(`💥 Error inesperado con ${tableName}:`, error);
    return false;
  }
};

export const testAllTables = async () => {
  const tables = ['categories', 'products', 'user_roles', 'reviews'];
  
  console.log('📋 Probando todas las tablas...');
  
  for (const table of tables) {
    const exists = await testTableExists(table);
    console.log(`${exists ? '✅' : '❌'} ${table}`);
  }
}; 