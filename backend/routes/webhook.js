/**
 * Rotas de Webhook (SUPABASE)
 * Recebe notificações de pagamento dos bancos (Woovi)
 *
 * EVENTOS TRATADOS:
 *  - OPENPIX:CHARGE_COMPLETED / CHARGE_COMPLETED  → PIX avulso OU parcela de assinatura paga
 *  - OPENPIX:CHARGE_EXPIRED  / CHARGE_EXPIRED     → PIX avulso expirado
 *  - PIX_AUTOMATIC_COBR_COMPLETED                 → Parcela do PIX Automático paga
 *  - PIX_AUTOMATIC_APPROVED                       → PIX Automático autorizado pelo cliente no banco
 */

const express = require('express');
const router = express.Router();

// =======================================================================
// HELPER: Busca cobrança pendente por múltiplos campos (6 tentativas)
// Cobre TODOS os cenários: PIX avulso, assinatura recorrente, registros novos e antigos
// =======================================================================
async function buscarCobrancaPendente(supabase, { subscriptionId, correlationId }) {
    let row = null;

    const naoMarcadas = '("paga","pago","paid")';

    // Tentativa 1: subscription_id = subscriptionId (assinaturas recorrentes - caminho principal)
    if (!row && subscriptionId) {
        const { data } = await supabase
            .from('cobrancas')
            .select('id, contrato_numero, company_id, tipo, valor')
            .eq('subscription_id', subscriptionId)
            .not('status', 'in', naoMarcadas)
            .limit(1);
        if (data && data.length > 0) {
            row = data[0];
            console.log(`🔍 [T1] Cobrança encontrada via subscription_id: ${subscriptionId}`);
        }
    }



    // Tentativa 3: id_asaas = subscriptionId (registros gerados antes da limpeza do schema)
    if (!row && subscriptionId) {
        const { data } = await supabase
            .from('cobrancas')
            .select('id, contrato_numero, company_id, tipo, valor')
            .eq('id_asaas', subscriptionId)
            .not('status', 'in', naoMarcadas)
            .limit(1);
        if (data && data.length > 0) {
            row = data[0];
            console.log(`🔍 [T3] Cobrança encontrada via id_asaas (subscriptionId): ${subscriptionId}`);
        }
    }

    // Tentativa 4: id = subscriptionId (quando o ID Woovi foi salvo diretamente como PK)
    if (!row && subscriptionId) {
        const { data } = await supabase
            .from('cobrancas')
            .select('id, contrato_numero, company_id, tipo, valor')
            .eq('id', subscriptionId)
            .not('status', 'in', naoMarcadas)
            .limit(1);
        if (data && data.length > 0) {
            row = data[0];
            console.log(`🔍 [T4] Cobrança encontrada via id (subscriptionId): ${subscriptionId}`);
        }
    }

    // Tentativa 5: id_asaas = correlationId (PIX avulso - correlationID da charge)
    if (!row && correlationId) {
        const { data } = await supabase
            .from('cobrancas')
            .select('id, contrato_numero, company_id, tipo, valor')
            .eq('id_asaas', correlationId)
            .not('status', 'in', naoMarcadas)
            .limit(1);
        if (data && data.length > 0) {
            row = data[0];
            console.log(`🔍 [T5] Cobrança encontrada via id_asaas (correlationId): ${correlationId}`);
        }
    }



    if (!row) {
        console.warn(`⚠️ Cobrança NÃO encontrada após 6 tentativas. subscriptionId=${subscriptionId} | correlationId=${correlationId}`);
    }

    return row;
}

// =======================================================================
// HELPER: Marca cobrança como PAGA e registra evento no histórico
// =======================================================================
async function marcarComoPaga(supabase, targetCobranca, { valorPago, metodo, chargeCorrelationId }) {
    const dataPagamento = new Date();

    const { error: errUpdate } = await supabase
        .from('cobrancas')
        .update({
            status: 'paga',
            data_pagamento: dataPagamento.toISOString(),
            valor_pago: valorPago,
            updated_at: dataPagamento.toISOString()
        })
        .eq('id', targetCobranca.id);

    if (errUpdate) {
        console.error(`❌ Erro ao atualizar cobrança ${targetCobranca.id}:`, errUpdate.message);
        return false;
    }

    console.log(`✅ Cobrança (id: ${targetCobranca.id}) marcada como PAGA via ${metodo}`);

    // Registra no histórico de eventos (aparece na aba de pagamentos do contrato)
    if (targetCobranca.contrato_numero && targetCobranca.company_id) {
        const { error: errEvento } = await supabase.from('eventos').insert({
            contrato_id: String(targetCobranca.contrato_numero),
            company_id: String(targetCobranca.company_id),
            tipo: 'pagamento',
            descricao: `Pagamento recebido via ${metodo}${chargeCorrelationId ? ` (ID: ${chargeCorrelationId})` : ''}`,
            metodo: metodo,
            valor: valorPago,
            data: dataPagamento.toISOString()
        });
        if (errEvento) {
            console.error(`⚠️ Erro ao registrar evento de pagamento:`, errEvento.message);
        } else {
            console.log(`📋 Evento de pagamento registrado para contrato ${targetCobranca.contrato_numero}`);
        }
    }

    return true;
}

// =======================================================================
// POST /api/webhook/woovi
// Webhook da Woovi (OpenPix) para notificações de cobrança PIX
// =======================================================================
router.post('/woovi', async (req, res) => {
    try {
        const payload = req.body;
        const event = payload.event;
        const charge = payload.charge;
        const pixAutomatic = payload.pixAutomatic || payload.subscription || null;

        const webhookId = payload.webhookId || payload.id || 'N/A';
        console.log(
            `📨 Webhook Woovi recebido: ${event} | WebhookID: ${webhookId}`,
            charge ? `| ChargeID: ${charge.correlationID}` : '',
            pixAutomatic ? `| SubID: ${pixAutomatic.globalID || pixAutomatic.correlationID || '?'}` : ''
        );

        // Responde imediatamente para a Woovi não dar timeout (máximo ~5s)
        res.status(200).send({ received: true });

        if (!event) {
            console.warn(`⚠️ Webhook sem campo "event". Payload:`, JSON.stringify(payload));
            return;
        }

        const supabase = req.app.get('supabase');

        // -----------------------------------------------------------------------
        // 1. PAGAMENTO CONFIRMADO
        //    Cobre tanto PIX avulso quanto parcelas de assinatura recorrente
        //    Eventos: OPENPIX:CHARGE_COMPLETED, CHARGE_COMPLETED
        // -----------------------------------------------------------------------
        if (event === 'OPENPIX:CHARGE_COMPLETED' || event === 'CHARGE_COMPLETED') {
            if (!charge || !charge.correlationID) {
                console.warn(`⚠️ CHARGE_COMPLETED sem correlationID. Ignorado.`);
                return;
            }

            const chargeCorrelationId = charge.correlationID;
            const subscriptionId = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            const valorPago = charge.value ? (charge.value / 100) : null;

            console.log(`💳 CHARGE_COMPLETED | ChargeID: ${chargeCorrelationId} | SubID: ${subscriptionId} | Valor: R$ ${valorPago}`);

            const targetCobranca = await buscarCobrancaPendente(supabase, {
                subscriptionId,
                correlationId: chargeCorrelationId
            });

            if (targetCobranca) {
                await marcarComoPaga(supabase, targetCobranca, {
                    valorPago,
                    metodo: subscriptionId ? 'PIX Automático (Assinatura)' : 'PIX',
                    chargeCorrelationId
                });
            } else {
                console.warn(`⚠️ Nenhuma cobrança pendente para ChargeID: ${chargeCorrelationId} ou SubID: ${subscriptionId}`);
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 2. PIX AVULSO EXPIRADO
        // -----------------------------------------------------------------------
        if (event === 'OPENPIX:CHARGE_EXPIRED' || event === 'CHARGE_EXPIRED') {
            if (!charge || !charge.correlationID) {
                console.warn(`⚠️ CHARGE_EXPIRED sem correlationID.`);
                return;
            }

            const correId = charge.correlationID;
            // Tenta atualizar por todos os campos possíveis
            await supabase.from('cobrancas').update({ status: 'vencida', updated_at: new Date().toISOString() }).eq('id_asaas', correId);
            await supabase.from('cobrancas').update({ status: 'vencida', updated_at: new Date().toISOString() }).eq('subscription_id', correId);
            await supabase.from('cobrancas').update({ status: 'vencida', updated_at: new Date().toISOString() }).eq('id', correId);

            console.log(`⏰ Cobrança ${correId} marcada como VENCIDA`);
            return;
        }

        // -----------------------------------------------------------------------
        // 3. PIX AUTOMÁTICO — PARCELA PAGA (evento específico de assinatura recorrente)
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_COBR_COMPLETED') {
            const subscriptionId = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            const chargeCorrelationId = charge?.correlationID || null;
            const valorPago = charge?.value ? (charge.value / 100) : null;

            console.log(`💳 PIX_AUTOMATIC_COBR_COMPLETED | SubID: ${subscriptionId} | ChargeID: ${chargeCorrelationId}`);

            const targetCobranca = await buscarCobrancaPendente(supabase, {
                subscriptionId,
                correlationId: chargeCorrelationId
            });

            if (targetCobranca) {
                await marcarComoPaga(supabase, targetCobranca, {
                    valorPago,
                    metodo: 'PIX Automático',
                    chargeCorrelationId
                });
            } else {
                console.warn(`⚠️ Nenhuma cobrança pendente para SubID: ${subscriptionId} | ChargeID: ${chargeCorrelationId}`);
            }
            return;
        }

        // -----------------------------------------------------------------------
        // 4. PIX AUTOMÁTICO — AUTORIZADO PELO CLIENTE NO BANCO
        // -----------------------------------------------------------------------
        if (event === 'PIX_AUTOMATIC_APPROVED') {
            const subscriptionId = pixAutomatic?.globalID || pixAutomatic?.correlationID || null;
            if (!subscriptionId) {
                console.warn(`⚠️ PIX_AUTOMATIC_APPROVED sem subscription ID.`);
                return;
            }

            const updatePayload = {
                status: 'ACTIVE',
                status_display: 'Autorizado pelo cliente',
                updated_at: new Date().toISOString()
            };

            await supabase.from('cobrancas').update(updatePayload).eq('subscription_id', subscriptionId);
            await supabase.from('cobrancas').update(updatePayload).eq('id_asaas', subscriptionId);
            await supabase.from('cobrancas').update(updatePayload).eq('id', subscriptionId);

            console.log(`✅ PIX_AUTOMATIC_APPROVED — SubID: ${subscriptionId} → ACTIVE`);
            return;
        }

        // Eventos não mapeados — logar para diagnóstico
        console.log(`ℹ️ Evento não mapeado: "${event}". Payload:`, JSON.stringify(payload, null, 2));

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
