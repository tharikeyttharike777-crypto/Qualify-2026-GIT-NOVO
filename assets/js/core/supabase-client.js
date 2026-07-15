/**
 * SUPABASE CLIENT INITIALIZATION
 * Substitui o firebase-config.js
 */

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

if (typeof supabase === 'undefined') {
    console.error('❌ Supabase SDK não carregado. Verifique o script no HTML.');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expor globalmente para manter compatibilidade com a estrutura legada
window.supabase = supabaseClient;

console.log('⚡ Supabase Client inicializado.');
