import { supabase } from '../lib/supabase';

export const checkTableExists = async (tableName: string) => {
  try {
    console.log(`🔍 Verificando existencia de tabla: ${tableName}`);
    
    // Intentar una consulta simple para verificar si la tabla existe
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      // Si el error es "relation does not exist", la tabla no existe
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error(`❌ Tabla ${tableName} NO EXISTE`);
        return { exists: false, error: 'Table does not exist' };
      }
      
      // Si es un error de RLS, la tabla existe pero no tenemos permisos
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        console.error(`⚠️ Tabla ${tableName} existe pero hay problemas de RLS`);
        return { exists: true, error: 'RLS policy issue' };
      }
      
      console.error(`❌ Error accediendo a ${tableName}:`, error);
      return { exists: false, error: error.message };
    }
    
    console.log(`✅ Tabla ${tableName} existe y es accesible`);
    return { exists: true, error: null };
  } catch (error) {
    console.error(`💥 Error inesperado con ${tableName}:`, error);
    return { exists: false, error: 'Unexpected error' };
  }
};

export const checkAllTables = async () => {
  const tables = [
    'categories',
    'products', 
    'product_variants',
    'product_images',
    'orders',
    'order_items',
    'cart_items',
    'carts',
    'reviews',
    'user_roles',
    'addresses',
    'interested_clients',
    'emails',
    'cart_reminders',
    'variant_images'
  ];
  
  console.log('📋 Verificando todas las tablas...');
  
  const results = [];
  
  for (const table of tables) {
    const result = await checkTableExists(table);
    results.push({ table, ...result });
    
    // Pausa pequeña entre consultas
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('📊 Resumen de verificación de tablas:');
  results.forEach(({ table, exists, error }) => {
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${table}: ${exists ? 'Existe' : error}`);
  });
  
  return results;
};

export const testBasicConnection = async () => {
  try {
    console.log('🔍 Probando conexión básica a Supabase...');
    
    // Intentar una consulta que no requiere permisos especiales
    const { data, error } = await supabase
      .rpc('version');
    
    if (error) {
      console.error('❌ Error en conexión básica:', error);
      return false;
    }
    
    console.log('✅ Conexión básica exitosa');
    return true;
  } catch (error) {
    console.error('💥 Error inesperado en conexión básica:', error);
    return false;
  }
}; 