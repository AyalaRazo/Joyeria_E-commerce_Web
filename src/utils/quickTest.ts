import { supabase } from '../lib/supabase';

export const quickConnectionTest = async () => {
  console.log('🚀 Iniciando test rápido de conexión...');
  
  try {
    // Test 1: Verificar configuración básica
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('📋 URL:', url ? 'Configurada' : 'NO configurada');
    console.log('📋 Key:', key ? 'Configurada' : 'NO configurada');
    
    if (!url || !key) {
      console.error('❌ Variables de entorno no configuradas');
      return false;
    }
    
    // Test 2: Probar consulta simple con timeout manual
    console.log('🔍 Probando consulta a categorías...');
    
    // Crear timeout manual
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout después de 5 segundos')), 5000);
    });
    
    const queryPromise = supabase.from('categories').select('*').limit(1);
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if (result && typeof result === 'object' && 'error' in result && result.error) {
      console.error('❌ Error en consulta:', result.error);
      return false;
    }
    
    console.log('✅ Consulta exitosa');
    return true;
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      console.error('⏱️ TIMEOUT: La consulta se colgó - problema de RLS/permisos');
      console.error('🔧 SOLUCIÓN: Ejecuta el script disable_rls_temporarily.sql');
    } else {
      console.error('💥 Error inesperado:', error);
    }
    return false;
  }
};

export const testWithoutRLS = async () => {
  console.log('🔍 Instrucciones para test sin RLS:');
  console.log('1. Ve a SQL Editor en Supabase');
  console.log('2. Ejecuta: ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;');
  console.log('3. Prueba esta función nuevamente');
  console.log('4. Si funciona, el problema es RLS');
  console.log('5. Ejecuta: ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;');
  console.log('6. Luego arregla las políticas RLS');
};

export const diagnoseRLSIssue = async () => {
  console.log('🔍 Diagnóstico de problema RLS:');
  
  console.log('📋 Pasos para solucionarlo:');
  console.log('1. Ejecuta en SQL Editor:');
  console.log('   ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('2. Prueba la aplicación - debería funcionar');
  console.log('');
  console.log('3. Vuelve a habilitar RLS:');
  console.log('   ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('4. Crea políticas correctas:');
  console.log('   CREATE POLICY "allow_select" ON categories FOR SELECT TO anon USING (true);');
  console.log('   CREATE POLICY "allow_select" ON products FOR SELECT TO anon USING (true);');
}; 