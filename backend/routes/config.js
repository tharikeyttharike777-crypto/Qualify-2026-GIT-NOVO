/**
 * Rotas de Configuração Bancária
 * Endpoints para gerenciar credenciais bancárias por empresa
 * Suporta: Asaas (principal)
 */

const express = require('express');
const router = express.Router();
const encryptionService = require('../services/encryption');
const asaasBankService = require('../services/asaasBank');

/**
 * GET /api/config/:empresaId/bancaria
 * Retorna configuração bancária (sem dados sensíveis)
 */
router.get('/:empresaId/bancaria', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const db = req.app.get('db');

        // Tenta buscar config do Asaas primeiro
        const configRef = db.collection('empresas').doc(empresaId)
            .collection('configuracaoBancaria').doc('asaas');

        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            return res.json({
                configurado: false,
                banco: null
            });
        }

        const config = configDoc.data();

        // Diagnóstico detalhado (sem expor dados sensíveis)
        const diagnostico = {
            apiKeyLength: config.asaasApiKey?.length || 0,
            ultimoTesteStatus: config.ultimoTesteStatus || null,
            ultimoTesteErro: config.ultimoTesteErro || null
        };

        // Retorna dados públicos apenas
        res.json({
            configurado: true,
            banco: 'asaas',
            ativo: config.ativo || false,
            sandbox: config.sandbox || false,
            temCredenciais: !!config.asaasApiKey,
            ultimoTeste: config.ultimoTeste || null,
            atualizadoEm: config.atualizadoEm || null,
            diagnostico: diagnostico
        });

    } catch (error) {
        console.error('Erro ao buscar config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

/**
 * POST /api/config/:empresaId/bancaria/asaas
 * Salva ou atualiza configuração do Asaas
 */
router.post('/:empresaId/bancaria/asaas', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { asaasApiKey, sandbox } = req.body;
        const db = req.app.get('db');

        // Busca configuração existente
        const configRef = db.collection('empresas').doc(empresaId)
            .collection('configuracaoBancaria').doc('asaas');
        const existingDoc = await configRef.get();
        const existingConfig = existingDoc.exists ? existingDoc.data() : {};

        // Validações - só exige se não tem credenciais salvas
        const temCredenciaisSalvas = !!existingConfig.asaasApiKey;

        if (!asaasApiKey && !temCredenciaisSalvas) {
            return res.status(400).json({
                error: 'Chave de API Asaas é obrigatória'
            });
        }

        // Prepara dados para salvar (mantém existentes se não enviados)
        const configData = {
            banco: 'asaas',
            asaasApiKey: asaasApiKey ? encryptionService.encrypt(asaasApiKey) : existingConfig.asaasApiKey,
            sandbox: sandbox === 'true' || sandbox === true,
            ativo: false, // Será ativado após teste
            atualizadoEm: new Date()
        };

        // Salva no Firestore
        await configRef.set(configData, { merge: true });

        // Limpa cache
        asaasBankService.limparCache(empresaId);

        res.json({
            success: true,
            message: 'Configuração salva. Execute o teste de conexão para ativar.'
        });

    } catch (error) {
        console.error('Erro ao salvar config:', error);
        res.status(500).json({ error: error.message || 'Erro ao salvar configuração' });
    }
});

/**
 * POST /api/config/:empresaId/bancaria/testar
 * Testa conexão com o Asaas (usa variável de ambiente)
 */
router.post('/:empresaId/bancaria/testar', async (req, res) => {
    try {
        const { empresaId } = req.params;

        // Verifica se há chave de API configurada (env ou Firestore)
        if (!process.env.ASAAS_API_KEY) {
            return res.status(400).json({
                error: 'Variável de ambiente ASAAS_API_KEY não configurada',
                success: false
            });
        }

        // Busca config da empresa (para verificar sandbox mode)
        const db = req.app.get('db');
        let sandbox = false;

        try {
            const configRef = db.collection('empresas').doc(empresaId)
                .collection('configuracaoBancaria').doc('asaas');
            const configDoc = await configRef.get();

            if (configDoc.exists) {
                sandbox = configDoc.data().sandbox || false;
            }
        } catch (e) {
            console.log('Config não encontrada no Firestore, usando defaults');
        }

        // Cria config mínima para teste (a chave vem do env)
        const configParaTeste = {
            id: empresaId,
            sandbox: sandbox
        };

        // Testa conexão com Asaas
        const resultado = await asaasBankService.testarConexao(configParaTeste);

        res.json({
            success: true,
            message: resultado.message,
            ambiente: resultado.ambiente,
            ativo: true
        });

    } catch (error) {
        console.error('Erro no teste de conexão:', error);

        res.status(400).json({
            success: false,
            error: error.message || 'Falha na conexão com Asaas',
            details: 'Verifique a variável ASAAS_API_KEY no servidor'
        });
    }
});


/**
 * GET /api/config/:empresaId/bancaria/debug
 * Endpoint de diagnóstico para verificar estado das credenciais
 */
router.get('/:empresaId/bancaria/debug', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const db = req.app.get('db');

        const configRef = db.collection('empresas').doc(empresaId)
            .collection('configuracaoBancaria').doc('asaas');

        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            return res.json({ error: 'Configuração não encontrada' });
        }

        const config = configDoc.data();

        // Testa descriptografia
        const encryptionActive = encryptionService.isConfigured();
        let apiKeyDecrypted = null;
        let decryptError = null;

        try {
            apiKeyDecrypted = encryptionService.decrypt(config.asaasApiKey);
        } catch (e) {
            decryptError = e.message;
        }

        res.json({
            encryptionKeyConfigured: encryptionActive,
            asaasApiKey: {
                storedLength: config.asaasApiKey?.length || 0,
                decryptedLength: apiKeyDecrypted?.length || 0,
                decryptedPreview: apiKeyDecrypted ? apiKeyDecrypted.substring(0, 10) + '...' : null
            },
            sandbox: config.sandbox,
            ativo: config.ativo,
            decryptError: decryptError
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/config/:empresaId/bancaria/asaas
 * Remove configuração bancária
 */
router.delete('/:empresaId/bancaria/asaas', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const db = req.app.get('db');

        await db.collection('empresas').doc(empresaId)
            .collection('configuracaoBancaria').doc('asaas')
            .delete();

        // Limpa cache
        asaasBankService.limparCache(empresaId);

        res.json({
            success: true,
            message: 'Configuração removida com sucesso'
        });

    } catch (error) {
        console.error('Erro ao remover config:', error);
        res.status(500).json({ error: 'Erro ao remover configuração' });
    }
});

/**
 * GET /api/config/:empresaId/bancos-disponiveis
 * Lista bancos disponíveis para integração
 */
router.get('/:empresaId/bancos-disponiveis', (req, res) => {
    res.json({
        bancos: [
            {
                id: 'asaas',
                nome: 'Asaas',
                logo: '/assets/images/bancos/asaas.png',
                funcionalidades: ['pix', 'boleto', 'cartao'],
                status: 'disponivel',
                requerCertificado: false
            },
            {
                id: 'inter',
                nome: 'Banco Inter',
                logo: '/assets/images/bancos/inter.png',
                funcionalidades: ['pix', 'boleto'],
                status: 'descontinuado',
                requerCertificado: true
            },
            {
                id: 'pagarme',
                nome: 'Pagar.me',
                logo: '/assets/images/bancos/pagarme.png',
                funcionalidades: ['pix', 'boleto', 'cartao'],
                status: 'em_breve',
                requerCertificado: false
            }
        ]
    });
});

module.exports = router;
