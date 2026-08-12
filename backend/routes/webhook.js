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

        const webhookId = payload.webhookId || payload.id || 'N/A';
        console.log(`📨 Webhook Woovi recebido: ${event} | WebhookID: ${webhookId}`, charge ? `ChargeID: ${charge.correlationID}` : '', pixAutomatic ? `SubID: ${pixAutomatic.globalID || pixAutomatic.correlationID || '?'}` : '');

        // Responde rápido para a Woovi não dar timeout
        res.status(200).send({ received: true });

        if (!event) {
            console.warn(`⚠️ Webhook recebido sem campo "event" (WebhookID: ${webhookId}). Payload:`, JSON.stringify(payload, null, 2));
            return;
        }

        const supabase = req.app.get('supabase');

        // -----------------------------------------------------------------------
        // 1. PIX AVULSO — CHARGE_COMPLETED
        // -----------------------------------------------------------------------
        if (event === 'OPENPIX:CHARGE_COMPLETED' || event === 'CHARGE_COMPLETED') {
            if (!charge || !charge.correlationID) {
                console.warn(`⚠️ CHARGE_COMPLETED sem charge.correlationID (WebhookID: ${webhookId}). Ignorado.`);
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
            if (!charge || !charge.correlationID) {
                console.warn(`⚠️ CHARGE_EXPIRED sem charge.correlationID (WebhookID: ${webhookId}).`);
                return;
            }

            const { error } = await supabase
                .from('cobrancas')
                .update({ status: 'vencida', updated_at: new Date() })
                .eq('id_asaas', charge.correlationID);

            if (!error) {
                console.log(`⏰ PIX avulso ${charge.correlationID} marcado como VENCIDO`);
            } else {
                console.warn(`⚠️ Erro ao atualizar VENCIMENTO de ${charge.correlationID}:`, error.message);
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 3. PIX AUTOMÁTICO — PARCELA PAGA (evento principal de baixa de parcela)
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_COBR_COMPLETED') {
            const subscriptionGlobalID = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            const chargeCorrelationID  = charge?.correlationID || null;
            const valorPago            = charge?.value ? (charge.value / 100) : null;
            const dataPagamento        = new Date();

            console.log(`💳 PIX_AUTOMATIC_COBR_COMPLETED — SubID: ${subscriptionGlobalID} | ChargeID: ${chargeCorrelationID}`);

            // Tentativa 1: busca pelo subscription_id
            let targetCobranca = null;
            if (subscriptionGlobalID) {
                const { data: rows } = await supabase
                    .from('cobrancas')
                    .select('id, contrato_numero, company_id')
                    .eq('subscription_id', subscriptionGlobalID)
                    .neq('status', 'paga')
                    .limit(1);
                
                if (rows && rows.length > 0) targetCobranca = rows[0];
            }

            // Tentativa 2: fallback busca pelo id_asaas
            if (!targetCobranca && chargeCorrelationID) {
                const { data: rows } = await supabase
                    .from('cobrancas')
                    .select('id, contrato_numero, company_id')
                    .eq('id_asaas', chargeCorrelationID)
                    .neq('status', 'paga')
                    .limit(1);
                
                if (rows && rows.length > 0) targetCobranca = rows[0];
            }

            if (targetCobranca) {
                const { error: errUpdate } = await supabase
                    .from('cobrancas')
                    .update({
                        status: 'paga',
                        data_pagamento: dataPagamento,
                        valor_pago: valorPago,
                        updated_at: new Date()
                    })
                    .eq('id', targetCobranca.id);

                if (!errUpdate) {
                    console.log(`✅ Parcela do PIX Automático (id: ${targetCobranca.id}) marcada como PAGA`);
                    
                    // Registro no histórico
                    if (targetCobranca.contrato_numero && targetCobranca.company_id) {
                        await supabase.from('eventos').insert({
                            contrato_id: String(targetCobranca.contrato_numero),
                            company_id: String(targetCobranca.company_id),
                            tipo: 'pagamento',
                            descricao: `Pagamento recebido via PIX Automático (ChargeID: ${chargeCorrelationID || 'N/A'})`,
                            metodo: 'PIX Automático',
                            valor: valorPago,
                            data: new Date().toISOString()
                        });
                    }
                } else {
                    console.error(`❌ Erro ao atualizar cobranca ${targetCobranca.id}:`, errUpdate.message);
                }
            } else {
                console.warn(`⚠️ Nenhuma cobrança pendente encontrada para SubID ${subscriptionGlobalID} ou ChargeID ${chargeCorrelationID}.`);
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 4. PIX AUTOMÁTICO — AUTORIZADO PELO CLIENTE NO BANCO
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_APPROVED') {
            const subscriptionGlobalID = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            if (!subscriptionGlobalID) {
                console.warn(`⚠️ PIX_AUTOMATIC_APPROVED sem subscription ID.`);
                return;
            }
            
            await supabase
                .from('cobrancas')
                .update({
                    status: 'ACTIVE',
                    status_display: 'Autorizado pelo cliente',
                    updated_at: new Date()
                })
                .eq('subscription_id', subscriptionGlobalID);
            
            console.log(`✅ PIX_AUTOMATIC_APPROVED — SubID: ${subscriptionGlobalID}.`);
            return;
        }

        // Eventos não mapeados
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
