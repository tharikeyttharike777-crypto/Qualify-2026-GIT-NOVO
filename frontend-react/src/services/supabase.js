import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente do Vite no futuro.
// Por enquanto, usando placeholders para evitar erros caso não haja .env ainda.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-url-supabase.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getActiveCompanyId = () => {
  return localStorage.getItem('companyId') || 
         localStorage.getItem('activeCompanyId') || 
         localStorage.getItem('empresaSelecionadaId') || 
         null;
};
