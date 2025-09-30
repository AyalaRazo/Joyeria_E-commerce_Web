// Verificación de variables de entorno
export const checkEnvironmentVariables = () => {
  const requiredVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    return false;
  }

  console.log('✅ Variables de entorno configuradas correctamente');
  return true;
};

export const logEnvironmentInfo = () => {
  console.log('🔧 Información de configuración:');
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL ? 'Configurada' : 'No configurada');
  console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada');
}; 