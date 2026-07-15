/**
 * Rotas de Webhook (SUPABASE)
 * Recebe notificações de pagamento dos bancos (Woovi)
 */

const express = require('express');
const router = express.Router();

// =======================================================================
// POST /api/webhook/woovi
// Webhook da Woovi (OpenPix) para notificações de cobrança PIX
// =======================================================================
router.post('/woovi', async (req, res) => {
    try {
        const payload = req.body;
        const event = payload.event;
        const charge = payload.charge;

        console.log(`📨 Webhook Woovi recebido: ${event}`, charge ? `ID: ${charge.correlationID}` : '');

        // Responde rápido para a Woovi não dar timeout
        res.status(200).send({ received: true });

        if (!event || !charge || !charge.correlationID) {
            return;
        }

        const supabase = req.app.get('supabase');
        // O id_asaas está armazenando o correlationID da Woovi por retrocompatibilidade no banco
        const correlationID = charge.correlationID;

        let novoStatus = null;
        let dataPagamento = null;

        // Verifica os eventos da Woovi
        if (event === 'OPENPIX:CHARGE_COMPLETED' || event === 'CHARGE_COMPLETED') {
            novoStatus = 'paga';
            dataPagamento = new Date();
        } else if (event === 'OPENPIX:CHARGE_EXPIRED' || event === 'CHARGE_EXPIRED') {
            novoStatus = 'vencida';
        }

        if (novoStatus) {
            const { error: updateError } = await supabase
                .from('cobrancas')
                .update({
                    status: novoStatus,
                    data_pagamento: dataPagamento,
                    valor_pago: charge.value ? (charge.value / 100) : null,
                    updated_at: new Date()
                })
                .eq('id_asaas', correlationID);

            if (!updateError) {
                console.log(`✅ Cobrança ${correlationID} atualizada para: ${novoStatus}`);
            } else {
                console.warn(`⚠️ Erro ao atualizar cobrança ${correlationID}:`, updateError.message);
            }
        }

    } catch (error) {
        console.error('❌ Erro ao processar webhook Woovi:', error);
    }
});

// Endpoint de health check para webhooks
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: { woovi: 'ativo' }
    });
});

module.exports = router;
