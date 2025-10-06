// Configuración y validación de Supabase
export const validateSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const errors: string[] = [];
  
  if (!url) {
    errors.push('VITE_SUPABASE_URL no está configurada');
  } else if (!url.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL debe ser una URL HTTPS válida');
  }
  
  if (!key) {
    errors.push('VITE_SUPABASE_ANON_KEY no está configurada');
  } else if (!key.startsWith('eyJ')) {
    errors.push('VITE_SUPABASE_ANON_KEY debe ser una clave JWT válida');
  }
  
  if (errors.length > 0) {
    console.error('Errores de configuración de Supabase:');
    errors.forEach(error => console.error('-', error));
    return false;
  }
  
  console.log('✅ Configuración de Supabase válida');
  return true;
};

export const getSupabaseConfig = () => {
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY,
    functionsUrl: import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  };
}; 