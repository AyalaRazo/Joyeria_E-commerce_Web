import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const finalUrl = supabaseUrl
const finalKey = supabaseAnonKey

export const supabase = createClient(finalUrl, finalKey);

console.log('Supabase client created successfully'); 