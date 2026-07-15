/**
 * Rotas de Configuração Bancária (SUPABASE)
 * Endpoints para gerenciar credenciais bancárias por empresa
 */

const express = require('express');
const router = express.Router();
const encryptionService = require('../services/encryption');

/**
 * GET /api/config/:empresaId/bancaria
 * Retorna configuração bancária do Supabase
 */
router.get('/:empresaId/bancaria', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const supabase = req.app.get('supabase');

        const { data: config, error } = await supabase
            .from('configuracao_bancaria')
            .select('*')
            .eq('company_id', empresaId)
            .eq('bank_id', 'asaas')
            .single();

        if (error || !config) {
            return res.json({ configurado: false, banco: null });
        }

        res.json({
            configurado: true,
            banco: 'asaas',
            ativo: config.ativo || false,
            sandbox: config.sandbox || false,
            temCredenciais: !!config.asaas_api_key,
            atualizadoEm: config.updated_at
        });
    } catch (error) {
        console.error('Erro ao buscar config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

/**
 * POST /api/config/:empresaId/bancaria/asaas
 */
router.post('/:empresaId/bancaria/asaas', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { asaasApiKey, sandbox } = req.body;
        const supabase = req.app.get('supabase');

        const configData = {
            company_id: empresaId,
            bank_id: 'asaas',
            asaas_api_key: asaasApiKey ? encryptionService.encrypt(asaasApiKey) : undefined,
            sandbox: sandbox === 'true' || sandbox === true,
            updated_at: new Date()
        };

        const { error } = await supabase
            .from('configuracao_bancaria')
            .upsert(configData, { onConflict: 'company_id,bank_id' });

        if (error) throw error;

        res.json({ success: true, message: 'Configuração salva no Supabase.' });
    } catch (error) {
        console.error('Erro ao salvar config:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

// Outros endpoints limpos de Firebase...
router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
