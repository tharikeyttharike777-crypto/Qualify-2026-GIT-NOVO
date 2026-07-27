/**
 * QUALIFY Banking API - Servidor Principal (SUPABASE)
 * Backend para integrações bancárias multi-tenant
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./middleware/auth');

// Inicialização do Supabase
const initSupabase = () => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase Client inicializado com sucesso (Modo Admin)');
        return supabase;
    } catch (error) {
        console.error('❌ Erro ao inicializar Supabase:', error.message);
        process.exit(1);
    }
};

const supabase = initSupabase();

// Inicialização do Express
const app = express();

// Segurança HTTP
app.use(helmet());

// Rate Limiting (Prevenção DDoS / Brute Force)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP a cada 15 min
    message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Middleware de CORS
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disponibiliza supabase globalmente para as rotas
app.set('supabase', supabase);

// Rotas
const pixRoutes = require('./routes/pix');
const boletoRoutes = require('./routes/boleto');
const configRoutes = require('./routes/config');
const webhookRoutes = require('./routes/webhook');
const subscriptionRoutes = require('./routes/subscriptions');

app.use('/api/pix', requireAuth, pixRoutes);
app.use('/api/boleto', requireAuth, boletoRoutes);
app.use('/api/config', requireAuth, configRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/subscriptions', requireAuth, subscriptionRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        services: {
            supabase: !!supabase,
            asaas: true
        }
    });
});

// Status Invoice (Compatibilidade Supabase)
app.get('/api/invoices/:invoiceId/status', requireAuth, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const empresaId = req.query.empresaId;

        if (!empresaId) return res.status(400).json({ error: 'empresaId é obrigatório' });

        const { data: cobranca, error } = await supabase
            .from('cobrancas')
            .select('*')
            .eq('id_asaas', invoiceId)
            .eq('company_id', empresaId)
            .single();

        if (error || !cobranca) return res.status(404).json({ error: 'Cobrança não encontrada' });

        res.json({
            invoiceId,
            status: cobranca.status || 'pendente',
            valor: cobranca.valor,
            dataPagamento: cobranca.updated_at
        });
    } catch (error) {
        console.error('Erro ao consultar status:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          QUALIFY Banking API - v3.0.0 (SUPABASE)           ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Servidor rodando em: http://localhost:${PORT}             ║
║  📦 Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(42)}║
║  🔐 Supabase: Conectado (Admin/Service Role)               ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
