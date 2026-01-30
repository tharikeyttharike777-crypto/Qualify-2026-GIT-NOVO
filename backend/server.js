/**
 * QUALIFY Banking API - Servidor Principal
 * Backend para integrações bancárias multi-tenant
 * Suporta: Banco Inter, extensível para outros
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

// Inicialização do Firebase Admin
const initFirebaseAdmin = () => {
    try {
        let serviceAccount;

        // Tenta carregar do JSON em variável de ambiente (produção)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('📦 Carregando Firebase de variável de ambiente...');
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        }
        // Fallback para arquivo local (desenvolvimento)
        else {
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
            console.log('📁 Carregando Firebase de arquivo:', serviceAccountPath);
            serviceAccount = require(serviceAccountPath);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('✅ Firebase Admin inicializado com sucesso');
        return admin.firestore();
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
        console.log('⚠️  Configure FIREBASE_SERVICE_ACCOUNT ou serviceAccountKey.json');
        process.exit(1);
    }
};

const db = initFirebaseAdmin();

// Inicialização do Express
const app = express();

// Middleware de CORS - permite todas as origens para API pública
app.use(cors({
    origin: true, // Permite qualquer origem
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disponibiliza db globalmente para as rotas
app.set('db', db);

// Rotas
const pixRoutes = require('./routes/pix');
const boletoRoutes = require('./routes/boleto');
const configRoutes = require('./routes/config');
const webhookRoutes = require('./routes/webhook');
const subscriptionRoutes = require('./routes/subscriptions');

app.use('/api/pix', pixRoutes);
app.use('/api/boleto', boletoRoutes);
app.use('/api/config', configRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/subscriptions', subscriptionRoutes);


// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        services: {
            firebase: !!db,
            asaas: true,
            inter: false // Descontinuado - migrado para Asaas
        }
    });
});


// Rota de status de invoice (compatibilidade com pix-checkout.js existente)
app.get('/api/invoices/:invoiceId/status', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const empresaId = req.query.empresaId;

        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId é obrigatório' });
        }

        // Busca cobrança no Firestore
        const cobrancaRef = db.collection('empresas').doc(empresaId)
            .collection('cobrancas').where('invoiceId', '==', invoiceId);

        const snapshot = await cobrancaRef.get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Cobrança não encontrada' });
        }

        const cobranca = snapshot.docs[0].data();

        res.json({
            invoiceId,
            status: cobranca.status || 'pendente',
            valor: cobranca.valor,
            dataPagamento: cobranca.dataPagamento || null
        });

    } catch (error) {
        console.error('Erro ao consultar status:', error);
        res.status(500).json({ error: 'Erro interno ao consultar status' });
    }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Rota 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          QUALIFY Banking API - v1.0.0                      ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Servidor rodando em: http://localhost:${PORT}             ║
║  📦 Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(42)}║
║  🔐 Firebase: Conectado                                    ║
║  🏦 Bancos suportados: Inter (+ extensível)                ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
