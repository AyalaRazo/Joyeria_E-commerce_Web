import { supabase } from '../lib/supabase';

export const checkPermissions = async () => {
  console.log('🔍 Verificando permisos específicos...');
  
  const tests = [
    {
      name: 'Lectura pública de categorías',
      test: () => supabase.from('categories').select('*').limit(1)
    },
    {
      name: 'Lectura pública de productos',
      test: () => supabase.from('products').select('*').limit(1)
    },
    {
      name: 'Lectura de reseñas públicas',
      test: () => supabase.from('reviews').select('*').limit(1)
    },
    {
      name: 'Verificar sesión de usuario',
      test: () => supabase.auth.getSession()
    },
    {
      name: 'Verificar usuario actual',
      test: () => supabase.auth.getUser()
    }
  ];

  const results = [];

  for (const { name, test } of tests) {
    try {
      console.log(`🔍 Probando: ${name}`);
      const result = await test();
      
      if (result.error) {
        console.error(`❌ Error en ${name}:`, result.error);
        results.push({ name, success: false, error: result.error.message });
      } else {
        console.log(`✅ ${name} exitoso`);
        results.push({ name, success: true, data: result.data });
      }
    } catch (error) {
      console.error(`💥 Error inesperado en ${name}:`, error);
      results.push({ name, success: false, error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }

  console.log('📊 Resumen de permisos:');
  results.forEach(({ name, success, error }) => {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${name}: ${success ? 'Permitido' : error}`);
  });

  return results;
};

export const testRLSPolicies = async () => {
  console.log('🔍 Verificando políticas RLS específicas...');
  
  // Test 1: Verificar si podemos leer categorías (debería ser público)
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error leyendo categorías:', error);
      if (error.message.includes('RLS')) {
        console.error('🔍 Problema de RLS detectado');
        return { rlsIssue: true, error: error.message };
      }
    } else {
      console.log('✅ Lectura de categorías exitosa');
    }
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }

  // Test 2: Verificar si podemos leer productos (debería ser público)
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error leyendo productos:', error);
      if (error.message.includes('RLS')) {
        console.error('🔍 Problema de RLS detectado');
        return { rlsIssue: true, error: error.message };
      }
    } else {
      console.log('✅ Lectura de productos exitosa');
    }
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }

  return { rlsIssue: false };
};

export const checkAuthStatus = async () => {
  console.log('🔍 Verificando estado de autenticación...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error obteniendo sesión:', error);
      return { authenticated: false, error: error.message };
    }
    
    if (session) {
      console.log('✅ Usuario autenticado:', session.user.email);
      return { authenticated: true, user: session.user };
    } else {
      console.log('ℹ️ Usuario no autenticado');
      return { authenticated: false };
    }
  } catch (error) {
    console.error('💥 Error inesperado en auth:', error);
    return { authenticated: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}; 