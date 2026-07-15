/**
 * Rotas de Assinatura (Subscription)
 * Endpoints para criação de assinaturas recorrentes via Woovi
 * Substitui a antiga lógica do Asaas
 */

const express = require('express');
const router = express.Router();
const wooviBankService = require('../services/wooviBank');

/**
 * POST /api/subscriptions/criar-link
 * Cria uma assinatura recorrente PIX Automático na Woovi
 */
router.post('/criar-link', async (req, res) => {
    try {
        const { empresaId, cpfCnpj, nomeCliente, email, telefone, value, nextDueDate, description, cycle } = req.body;

        console.log('💳 Criando assinatura recorrente (Woovi):', { empresaId, value, cycle });

        // Validações básicas
        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId é obrigatório' });
        }
        if (!value || value <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }
        if (!cpfCnpj) {
            return res.status(400).json({ error: 'cpfCnpj do cliente é obrigatório' });
        }

        if (!process.env.WOOVI_APP_ID) {
            return res.status(500).json({
                error: 'Variável de ambiente WOOVI_APP_ID não configurada',
                code: 'WOOVI_APP_ID_MISSING'
            });
        }

        const empresaConfig = {
            id: empresaId,
            appId: process.env.WOOVI_APP_ID
        };

        // 1. Cria a Assinatura (PIX Automático Recorrente) na Woovi
        console.log('🚀 Criando PIX Automático Recorrente na Woovi...');
        const subscription = await wooviBankService.criarAssinatura(empresaConfig, {
            customer: {
                name: nomeCliente || 'Cliente Assinante',
                cpfCnpj: cpfCnpj,
                email: email,
                phone: telefone
            },
            value: parseFloat(value),
            // A Woovi calcula o cycle internamente ou você pode estender a API se precisar mapear o cycle
            description: description || 'Assinatura Qualify'
        });

        // A Woovi geralmente retorna o link de pagamento na própria charge ou na subscription
        // Como o webhook fará a atualização da baixa, o foco é salvar a assinatura
        const subscriptionId = subscription.globalID;
        
        // Normalmente a Woovi já gera a primeira cobrança (charge) acoplada na assinatura (depende de como está configurado)
        // Se ela vier com a charge acoplada, pegamos os dados dela
        let paymentLink = subscription.paymentLinkUrl || null;
        let qrCodeData = null;

        if (subscription.charge) {
            qrCodeData = {
                qrcode: subscription.charge.qrCodeImage,
                pixCopiaECola: subscription.charge.brCode
            };
            paymentLink = subscription.charge.paymentLinkUrl;
        }

        console.log('✅ Assinatura criada com sucesso!', subscriptionId);

        // 2. Salva a cobrança no Supabase (Para aparecer no painel)
        const supabase = req.app.get('supabase');
        if (supabase) {
            try {
                // Como não usamos mais Asaas, o tipo é fixo como pix_automatico
                const tipoFrontend = 'pix_automatico';
                const statusFinal = 'PENDING_AUTHORIZATION'; 
                const statusDisplayFinal = 'Aguardando Pagamento/Autorização';

                const cobrancaData = {
                    tipo: tipoFrontend,
                    billing_type: 'PIX_AUTOMATIC',
                    valor: parseFloat(value),
                    vencimento: nextDueDate || new Date().toISOString().split('T')[0],
                    status: statusFinal,
                    status_display: statusDisplayFinal,

                    // Reusamos as colunas legadas do asaas no Supabase para não quebrar a tabela, mas injetamos dados da Woovi
                    id_asaas: subscriptionId, 
                    id: subscriptionId, 
                    subscription_id: subscriptionId,

                    link_pagamento: paymentLink,
                    invoice_url: paymentLink,

                    qrcode: qrCodeData ? qrCodeData.qrcode : null,
                    pix_copia_e_cola: qrCodeData ? qrCodeData.pixCopiaECola : null,

                    company_id: empresaId,
                    pagador_nome: nomeCliente,
                    pagador_documento: cpfCnpj,
                    descricao: description || 'Assinatura Qualify'
                };

                await supabase.from('cobrancas').upsert(cobrancaData);
                console.log(`💾 Registro salvo no Supabase (${statusFinal}):`, subscriptionId);

            } catch (firestoreError) {
                console.error('⚠️ Erro ao salvar cobrança no banco de dados:', firestoreError.message);
            }
        }

        res.json({
            success: true,
            subscriptionId: subscriptionId,
            status: subscription.status || 'ACTIVE',
            value: parseFloat(value),
            nextDueDate: nextDueDate,
            paymentLink: paymentLink,
            qrcode: qrCodeData ? qrCodeData.qrcode : null,
            imagemQrcode: qrCodeData ? qrCodeData.qrcode : null,
            pixCopiaECola: qrCodeData ? qrCodeData.pixCopiaECola : null
        });

    } catch (error) {
        console.error('❌ Erro ao criar assinatura na Woovi:', error);
        res.status(500).json({
            error: error.message || 'Erro ao criar assinatura',
            code: 'SUBSCRIPTION_CREATION_ERROR'
        });
    }
});

/**
 * GET /api/subscriptions/:subscriptionId
 * Consulta status de uma assinatura
 */
router.get('/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const empresaId = req.query.empresaId;

        if (!process.env.WOOVI_APP_ID) {
            return res.status(500).json({ error: 'WOOVI_APP_ID não configurada' });
        }

        const empresaConfig = { id: empresaId, appId: process.env.WOOVI_APP_ID };
        const subscription = await wooviBankService.consultarAssinatura(empresaConfig, subscriptionId);

        res.json(subscription);

    } catch (error) {
        console.error('❌ Erro ao consultar assinatura:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/subscriptions/:subscriptionId
 * Cancela uma assinatura
 */
router.delete('/:subscriptionId', async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const empresaId = req.query.empresaId;

        if (!process.env.WOOVI_APP_ID) {
            return res.status(500).json({ error: 'WOOVI_APP_ID não configurada' });
        }

        const empresaConfig = { id: empresaId, appId: process.env.WOOVI_APP_ID };
        await wooviBankService.cancelarAssinatura(empresaConfig, subscriptionId);

        // Atualiza status no banco para cancelado
        const supabase = req.app.get('supabase');
        if (supabase) {
             await supabase.from('cobrancas')
                .update({ status: 'CANCELLED', status_display: 'Cancelado' })
                .eq('subscription_id', subscriptionId);
        }

        res.json({ success: true, message: 'Assinatura cancelada com sucesso' });

    } catch (error) {
        console.error('❌ Erro ao cancelar assinatura:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
