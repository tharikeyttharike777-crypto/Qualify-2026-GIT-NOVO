/**
 * Rotas de Configuração Bancária (SUPABASE)
 * Endpoints para gerenciar credenciais bancárias por empresa
 * Integração: WOOVI (OpenPix)
 */

const express = require('express');
const router = express.Router();
const encryptionService = require('../services/encryption');

/**
 * GET /api/config/:empresaId/bancaria
 * Retorna configuração bancária da empresa (Woovi)
 */
router.get('/:empresaId/bancaria', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const supabase = req.app.get('supabase');

        const { data: config, error } = await supabase
            .from('configuracao_bancaria')
            .select('*')
            .eq('company_id', empresaId)
            .eq('bank_id', 'woovi')
            .single();

        if (error || !config) {
            return res.json({ configurado: false, banco: null });
        }

        res.json({
            configurado: true,
            banco: 'woovi',
            ativo: config.ativo || false,
            sandbox: config.sandbox || false,
            temCredenciais: !!config.woovi_app_id,
            atualizadoEm: config.updated_at
        });
    } catch (error) {
        console.error('Erro ao buscar config:', error);
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

/**
 * POST /api/config/:empresaId/bancaria/woovi
 * Salva configuração da Woovi para a empresa
 */
router.post('/:empresaId/bancaria/woovi', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { wooviAppId, sandbox } = req.body;
        const supabase = req.app.get('supabase');

        const configData = {
            company_id: empresaId,
            bank_id: 'woovi',
            woovi_app_id: wooviAppId ? encryptionService.encrypt(wooviAppId) : undefined,
            sandbox: sandbox === 'true' || sandbox === true,
            updated_at: new Date()
        };

        const { error } = await supabase
            .from('configuracao_bancaria')
            .upsert(configData, { onConflict: 'company_id,bank_id' });

        if (error) throw error;

        res.json({ success: true, message: 'Configuração Woovi salva com sucesso.' });
    } catch (error) {
        console.error('Erro ao salvar config:', error);
        res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
});

router.get('/health', (req, res) => res.json({ status: 'ok', integracao: 'woovi' }));

module.exports = router;
