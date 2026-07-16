/**
 * SUPABASE CLIENT INITIALIZATION
 * Substitui o firebase-config.js
 */

const SUPABASE_URL = 'https://vqcaovpvdmbjviyzudbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY2FvdnB2ZG1ianZpeXp1ZGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzgxNDIsImV4cCI6MjA5OTcxNDE0Mn0.ZMqQ3hdkGwWE023PhlODAKOfzbpr4LCDh0ewb_av0aU';

if (typeof supabase === 'undefined') {
    console.error('❌ Supabase SDK não carregado. Verifique o script no HTML.');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expor globalmente para manter compatibilidade com a estrutura legada
window.supabase = supabaseClient;

console.log('⚡ Supabase Client inicializado.');
