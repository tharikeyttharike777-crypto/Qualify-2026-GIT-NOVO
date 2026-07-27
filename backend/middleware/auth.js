/**
 * Middleware de Autenticação (Supabase)
 * Garante que apenas usuários logados possam chamar as APIs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Cria cliente Supabase isolado para validação de JWT (usa ANON KEY, pois só precisamos verificar o token enviado)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY // Fallback for dev
);

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Acesso Negado: Token não fornecido.' });
        }

        const token = authHeader.split(' ')[1];

        // Valida o JWT do usuário no Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Acesso Negado: Token inválido ou expirado.' });
        }

        // Adiciona os dados do usuário à requisição para serem usados nas rotas
        req.user = user;
        
        next();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).json({ error: 'Erro interno ao validar token.' });
    }
};

module.exports = { requireAuth };
