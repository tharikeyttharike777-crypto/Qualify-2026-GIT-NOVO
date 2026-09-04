/**
 * Rotas de PIX
 * Endpoints para geração e consulta de cobranças PIX
 * Integração Oficial: WOOVI (OpenPix)
 */

const express = require('express');
const router = express.Router();
const wooviBankService = require('../services/wooviBank');

/**
 * Middleware para carregar configuração bancária da empresa (Woovi)
 */
async function loadBankConfig(req, res, next) {
    try {
        const empresaId = req.body.empresaId || req.query.empresaId || req.params.empresaId;

        if (!empresaId) {
            return res.status(400).json({
                error: 'empresaId é obrigatório',
                code: 'MISSING_COMPANY_ID'
            });
        }

        if (!process.env.WOOVI_APP_ID) {
            return res.status(500).json({
                error: 'Variável de ambiente WOOVI_APP_ID não configurada',
                code: 'WOOVI_APP_ID_MISSING'
            });
        }

        req.bankConfig = {
            id: empresaId,
            appId: process.env.WOOVI_APP_ID
        };

        next();
    } catch (error) {
        console.error('Erro ao carregar config bancária:', error);
        res.status(500).json({
            error: 'Erro ao carregar configuração bancária',
            code: 'BANK_CONFIG_ERROR'
        });
    }
}

/**
 * POST /api/pix/cob - Criar cobrança PIX imediata
 */
router.post('/cob', loadBankConfig, async (req, res) => {
    try {
        const { valor, descricao, pagador } = req.body;

        console.log('📥 Requisição PIX (Woovi) recebida:', { valor, pagador: pagador?.nome });

        if (!valor || valor <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }
        if (!pagador || (!pagador.cpf && !pagador.cnpj)) {
            return res.status(400).json({ error: 'CPF ou CNPJ do pagador é obrigatório' });
        }
        if (!pagador.nome) {
            return res.status(400).json({ error: 'Nome do pagador é obrigatório' });
        }

        const cpfCnpj = pagador.cpf || pagador.cnpj;
        
        console.log('💰 Criando cobrança PIX na Woovi...');
        const cobranca = await wooviBankService.criarCobranca(req.bankConfig, {
            customer: {
                name: pagador.nome,
                cpfCnpj: cpfCnpj,
                email: pagador.email,
                phone: pagador.telefone
            },
            value: parseFloat(valor),
            description: descricao || 'Cobrança PIX Qualify',
            externalReference: req.body.invoiceId || null
        });

        const supabase = req.app.get('supabase');
        const empresaId = req.bankConfig.id;
        const hoje = new Date().toISOString().split('T')[0];

        const statusInterno = (cobranca.status === 'COMPLETED') ? 'paga' : 'pendente';

        const { error: insertError } = await supabase
            .from('cobrancas')
            .insert({
                tipo: 'pix',
                tipo_cobranca: 'imediata',
                woovi_id: cobranca.correlationID,        // ID da cobrança na Woovi
                invoice_id: req.body.invoiceId || cobranca.correlationID,
                valor: parseFloat(valor),
                descricao,
                pagador_nome: pagador.nome,
                pagador_documento: cpfCnpj,
                pagador_email: pagador.email,
                pagador_telefone: pagador.telefone,
                status: statusInterno,
                qrcode: cobranca.qrCodeImage,
                pix_copia_e_cola: cobranca.brCode,
                banco: 'woovi',
                company_id: empresaId,
                vencimento: hoje
            });

        if (insertError) throw insertError;

        console.log('✅ Cobrança PIX Woovi criada com sucesso:', cobranca.correlationID);

        res.json({
            success: true,
            txid: cobranca.correlationID,
            paymentId: cobranca.correlationID,
            qrcode: cobranca.qrCodeImage,
            imagemQrcode: cobranca.qrCodeImage,
            pixCopiaECola: cobranca.brCode,
            status: statusInterno,
            valor: parseFloat(valor)
        });

    } catch (error) {
        console.error('❌ Erro ao criar PIX imediato:', error);
        res.status(500).json({
            error: error.message || 'Erro ao gerar cobrança PIX',
            code: 'PIX_CREATION_ERROR'
        });
    }
});

/**
 * POST /api/pix/cobv - Criar cobrança PIX com vencimento
 */
router.post('/cobv', loadBankConfig, async (req, res) => {
    try {
        let { valor, descricao, pagador, vencimento, invoiceId } = req.body;

        console.log('📥 Requisição PIX com vencimento (Woovi):', { valor, vencimento, pagador: pagador?.nome });

        if (!valor || valor <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }
        if (!vencimento) {
            return res.status(400).json({ error: 'Data de vencimento é obrigatória' });
        }
        if (!pagador || (!pagador.cpf && !pagador.cnpj)) {
            return res.status(400).json({ error: 'CPF ou CNPJ do pagador é obrigatório' });
        }

        // Converte data de DD/MM/YYYY para YYYY-MM-DD
        if (vencimento.includes('/')) {
            const partes = vencimento.split('/');
            if (partes.length === 3) {
                vencimento = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
        }

        const cpfCnpj = pagador.cpf || pagador.cnpj;
        
        console.log('💰 Criando cobrança PIX na Woovi...');
        const cobranca = await wooviBankService.criarCobranca(req.bankConfig, {
            customer: {
                name: pagador.nome,
                cpfCnpj: cpfCnpj,
                email: pagador.email,
                phone: pagador.telefone
            },
            value: parseFloat(valor),
            dueDate: vencimento,
            description: descricao || 'Cobrança PIX Qualify',
            externalReference: invoiceId || null
        });

        const supabase = req.app.get('supabase');
        const empresaId = req.bankConfig.id;
        
        const statusInterno = (cobranca.status === 'COMPLETED') ? 'paga' : 'pendente';

        const { error: insertErrorV } = await supabase
            .from('cobrancas')
            .insert({
                tipo: 'pix',
                tipo_cobranca: 'vencimento',
                woovi_id: cobranca.correlationID,        // ID da cobrança na Woovi
                invoice_id: invoiceId || cobranca.correlationID,
                valor: parseFloat(valor),
                descricao,
                pagador_nome: pagador.nome,
                pagador_documento: cpfCnpj,
                pagador_email: pagador.email,
                pagador_telefone: pagador.telefone,
                vencimento,
                status: statusInterno,
                qrcode: cobranca.qrCodeImage,
                pix_copia_e_cola: cobranca.brCode,
                banco: 'woovi',
                company_id: empresaId
            });

        if (insertErrorV) throw insertErrorV;

        console.log('✅ Cobrança PIX com vencimento Woovi criada:', cobranca.correlationID);

        res.json({
            success: true,
            txid: cobranca.correlationID,
            paymentId: cobranca.correlationID,
            qrcode: cobranca.qrCodeImage,
            imagemQrcode: cobranca.qrCodeImage,
            pixCopiaECola: cobranca.brCode,
            status: statusInterno,
            valor: parseFloat(valor),
            vencimento
        });

    } catch (error) {
        console.error('❌ Erro ao criar PIX com vencimento:', error);
        res.status(500).json({
            error: error.message || 'Erro ao gerar cobrança PIX',
            code: 'PIX_CREATION_ERROR'
        });
    }
});

/**
 * GET /api/pix/:paymentId - Consultar status de cobrança PIX
 */
router.get('/:paymentId', loadBankConfig, async (req, res) => {
    try {
        const { paymentId } = req.params;

        console.log('🔍 Consultando cobrança na Woovi:', paymentId);
        const resultado = await wooviBankService.consultarCobranca(req.bankConfig, paymentId);

        const statusMap = {
            'ACTIVE': 'pendente',
            'COMPLETED': 'paga',
            'EXPIRED': 'vencida',
            'CANCELED': 'estornada'
        };

        const statusInterno = statusMap[resultado.status] || 'pendente';

        // Atualiza status no Supabase se foi pago
        if (statusInterno === 'paga') {
            const supabase = req.app.get('supabase');
            const empresaId = req.bankConfig.id;

            // Busca por woovi_id OU subscription_id (compatibilidade com registros existentes)
            await supabase
                .from('cobrancas')
                .update({
                    status: 'paga',
                    data_pagamento: resultado.createdAt || new Date()
                })
                .eq('woovi_id', paymentId)
                .eq('company_id', empresaId);

            // Fallback para registros mais antigos que usavam id_asaas
            await supabase
                .from('cobrancas')
                .update({
                    status: 'paga',
                    data_pagamento: resultado.createdAt || new Date()
                })
                .eq('id_asaas', paymentId)
                .eq('company_id', empresaId);
        }

        const valorEmReais = (resultado.value / 100).toFixed(2);

        res.json({
            paymentId: resultado.correlationID || paymentId,
            txid: resultado.correlationID || paymentId,
            status: statusInterno,
            statusOriginal: resultado.status,
            valor: valorEmReais,
            dataPagamento: (statusInterno === 'paga') ? (resultado.createdAt || new Date()) : null
        });

    } catch (error) {
        console.error('❌ Erro ao consultar PIX:', error);
        res.status(500).json({
            error: error.message || 'Erro ao consultar cobrança',
            code: 'PIX_QUERY_ERROR'
        });
    }
});

module.exports = router;
