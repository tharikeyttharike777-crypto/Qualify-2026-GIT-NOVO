/**
 * Rotas de Webhook (SUPABASE)
 * Recebe notificações de pagamento dos bancos (Woovi)
 *
 * EVENTOS TRATADOS:
 *  - OPENPIX:CHARGE_COMPLETED / CHARGE_COMPLETED        → PIX avulso pago
 *  - OPENPIX:CHARGE_EXPIRED  / CHARGE_EXPIRED           → PIX avulso expirado
 *  - PIX_AUTOMATIC_COBR_COMPLETED                       → Parcela do PIX Automático paga ✅
 *  - PIX_AUTOMATIC_APPROVED                             → PIX Automático autorizado pelo cliente no banco
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
        // Para PIX Automático, a Woovi envia o objeto "pixAutomatic" ou "subscription"
        const pixAutomatic = payload.pixAutomatic || payload.subscription || null;

        console.log(`📨 Webhook Woovi recebido: ${event}`, charge ? `ChargeID: ${charge.correlationID}` : '', pixAutomatic ? `SubID: ${pixAutomatic.globalID || pixAutomatic.correlationID || '?'}` : '');

        // Responde rápido para a Woovi não dar timeout
        res.status(200).send({ received: true });

        if (!event) {
            console.warn('⚠️ Webhook recebido sem campo "event". Ignorado.');
            return;
        }

        const supabase = req.app.get('supabase');

        // -----------------------------------------------------------------------
        // 1. PIX AVULSO — CHARGE_COMPLETED
        // -----------------------------------------------------------------------
        if (event === 'OPENPIX:CHARGE_COMPLETED' || event === 'CHARGE_COMPLETED') {
            if (!charge || !charge.correlationID) {
                console.warn('⚠️ CHARGE_COMPLETED sem charge.correlationID. Ignorado.');
                return;
            }

            const { error } = await supabase
                .from('cobrancas')
                .update({
                    status: 'paga',
                    data_pagamento: new Date(),
                    valor_pago: charge.value ? (charge.value / 100) : null,
                    updated_at: new Date()
                })
                .eq('id_asaas', charge.correlationID);

            if (!error) {
                console.log(`✅ PIX avulso ${charge.correlationID} marcado como PAGO`);
            } else {
                console.warn(`⚠️ Erro ao atualizar PIX avulso ${charge.correlationID}:`, error.message);
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 2. PIX AVULSO — CHARGE_EXPIRED
        // -----------------------------------------------------------------------
        if (event === 'OPENPIX:CHARGE_EXPIRED' || event === 'CHARGE_EXPIRED') {
            if (!charge || !charge.correlationID) return;

            await supabase
                .from('cobrancas')
                .update({ status: 'vencida', updated_at: new Date() })
                .eq('id_asaas', charge.correlationID);

            console.log(`⏰ PIX avulso ${charge.correlationID} marcado como VENCIDO`);
            return;
        }

        // -----------------------------------------------------------------------
        // 3. PIX AUTOMÁTICO — PARCELA PAGA (evento principal de baixa de parcela)
        //    Evento: PIX_AUTOMATIC_COBR_COMPLETED
        //
        //    A Woovi envia o "charge" da parcela e o "pixAutomatic" (assinatura).
        //    A cobrança no banco foi salva com id_asaas = subscription.globalID.
        //    Precisamos buscar tanto por subscription_id quanto por id_asaas.
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_COBR_COMPLETED') {
            const subscriptionGlobalID = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            const chargeCorrelationID  = charge?.correlationID || null;
            const valorPago            = charge?.value ? (charge.value / 100) : null;
            const dataPagamento        = new Date();

            console.log(`💳 PIX_AUTOMATIC_COBR_COMPLETED — SubID: ${subscriptionGlobalID} | ChargeID: ${chargeCorrelationID}`);

            // Tentativa 1: busca pelo subscription_id (forma padrão para PIX Automático)
            if (subscriptionGlobalID) {
                const { data: rows, error: errBusca } = await supabase
                    .from('cobrancas')
                    .select('id, status')
                    .eq('subscription_id', subscriptionGlobalID)
                    .neq('status', 'paga') // não sobrescreve se já estava paga
                    .limit(1);

                if (!errBusca && rows && rows.length > 0) {
                    const { error: errUpdate } = await supabase
                        .from('cobrancas')
                        .update({
                            status: 'paga',
                            data_pagamento: dataPagamento,
                            valor_pago: valorPago,
                            updated_at: new Date()
                        })
                        .eq('subscription_id', subscriptionGlobalID);

                    if (!errUpdate) {
                        console.log(`✅ Parcela do PIX Automático (sub: ${subscriptionGlobalID}) marcada como PAGA via subscription_id`);
                        return;
                    } else {
                        console.warn(`⚠️ Erro ao atualizar via subscription_id:`, errUpdate.message);
                    }
                }
            }

            // Tentativa 2: busca pelo id_asaas com o correlationID da charge (fallback)
            if (chargeCorrelationID) {
                const { error: errUpdate2 } = await supabase
                    .from('cobrancas')
                    .update({
                        status: 'paga',
                        data_pagamento: dataPagamento,
                        valor_pago: valorPago,
                        updated_at: new Date()
                    })
                    .eq('id_asaas', chargeCorrelationID);

                if (!errUpdate2) {
                    console.log(`✅ Parcela do PIX Automático (charge: ${chargeCorrelationID}) marcada como PAGA via id_asaas`);
                } else {
                    console.warn(`⚠️ Nenhum registro encontrado para SubID ${subscriptionGlobalID} ou ChargeID ${chargeCorrelationID}. Payload completo:`, JSON.stringify(payload, null, 2));
                }
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 4. PIX AUTOMÁTICO — AUTORIZADO PELO CLIENTE NO BANCO
        //    Evento: PIX_AUTOMATIC_APPROVED
        //    Atualiza status para 'ativo' ou 'autorizado' (não é pagamento ainda)
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_APPROVED') {
            const subscriptionGlobalID = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            console.log(`✅ PIX_AUTOMATIC_APPROVED — SubID: ${subscriptionGlobalID}. Cliente autorizou no banco.`);

            if (subscriptionGlobalID) {
                await supabase
                    .from('cobrancas')
                    .update({
                        status: 'ACTIVE',
                        status_display: 'Autorizado pelo cliente',
                        updated_at: new Date()
                    })
                    .eq('subscription_id', subscriptionGlobalID);
            }
            return;
        }

        // Eventos não mapeados — apenas loga para futura análise
        console.log(`ℹ️ Evento não mapeado recebido: ${event}. Payload:`, JSON.stringify(payload, null, 2));

    } catch (error) {
        console.error('❌ Erro ao processar webhook Woovi:', error);
    }
});

// Endpoint de health check para webhooks
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: { woovi: 'ativo' },
        eventos_suportados: [
            'OPENPIX:CHARGE_COMPLETED',
            'CHARGE_COMPLETED',
            'OPENPIX:CHARGE_EXPIRED',
            'CHARGE_EXPIRED',
            'PIX_AUTOMATIC_COBR_COMPLETED',
            'PIX_AUTOMATIC_APPROVED'
        ]
    });
});

module.exports = router;
