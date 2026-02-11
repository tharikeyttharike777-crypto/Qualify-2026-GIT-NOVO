/**
 * Rotas de Webhook
 * Recebe notificações de pagamento dos bancos
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/webhook/inter/pix
 * Webhook do Banco Inter para notificações PIX
 */
router.post('/inter/pix', async (req, res) => {
    try {
        console.log('📨 Webhook PIX recebido:', JSON.stringify(req.body, null, 2));

        const { pix } = req.body;

        if (!pix || !Array.isArray(pix)) {
            return res.status(200).send('OK'); // Inter espera 200 mesmo sem dados
        }

        const db = req.app.get('db');

        for (const pagamento of pix) {
            const { txid, valor, horario, pagador } = pagamento;

            if (!txid) continue;

            console.log(`💰 Pagamento PIX recebido: ${txid} - R$ ${valor}`);

            // Busca cobrança em todas as empresas (webhook não envia empresaId)
            // Isso é uma limitação - idealmente, usaríamos um identificador no txid
            const empresasSnapshot = await db.collection('empresas').get();

            for (const empresaDoc of empresasSnapshot.docs) {
                const cobrancaSnapshot = await db.collection('empresas')
                    .doc(empresaDoc.id)
                    .collection('cobrancas')
                    .where('txid', '==', txid)
                    .get();

                if (!cobrancaSnapshot.empty) {
                    const cobrancaRef = cobrancaSnapshot.docs[0].ref;

                    await cobrancaRef.update({
                        status: 'paga',
                        dataPagamento: new Date(horario),
                        valorPago: parseFloat(valor),
                        pagadorInfo: pagador || null,
                        webhookRecebido: new Date()
                    });

                    console.log(`✅ Cobrança ${txid} marcada como PAGA (empresa: ${empresaDoc.id})`);
                    break;
                }
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Erro ao processar webhook PIX:', error);
        res.status(200).send('OK'); // Retorna 200 para evitar retentativas
    }
});

/**
 * POST /api/webhook/inter/boleto
 * Webhook do Banco Inter para notificações de Boleto
 */
router.post('/inter/boleto', async (req, res) => {
    try {
        console.log('📨 Webhook Boleto recebido:', JSON.stringify(req.body, null, 2));

        // TODO: Implementar processamento de webhook de boleto
        // Estrutura similar ao PIX

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Erro ao processar webhook Boleto:', error);
        res.status(200).send('OK');
    }
});

/**
 * POST /api/webhook/asaas
 * Webhook do Asaas para notificações de cobrança (PIX, Boleto, Cartão)
 */
router.post('/asaas', async (req, res) => {
    try {
        // O Asaas envia um JSON com o evento
        // { "event": "PAYMENT_RECEIVED", "payment": { "id": "pay_...", ... } }
        const { event, payment } = req.body;

        console.log(`📨 Webhook Asaas recebido: ${event}`, payment ? `ID: ${payment.id}` : '');
        // console.log('Payload completo:', JSON.stringify(req.body, null, 2));

        if (!event || !payment || !payment.id) {
            return res.status(200).send({ received: true });
        }

        const db = req.app.get('db');
        const paymentId = payment.id;

        // Mapeia eventos Asaas para status do sistema
        let novoStatus = null;
        let dataPagamento = null;

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            novoStatus = 'paga';
            dataPagamento = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
        } else if (event === 'PAYMENT_OVERDUE') {
            novoStatus = 'vencida';
        }

        if (novoStatus) {
            // Busca a cobrança em TODAS as empresas pelo paymentId (campo 'paymentId' ou 'idReal')
            // O Firestore não permite query em subcoleções sem Collection Group Index ou iterando empresas.
            // Como temos 'empresas' -> 'cobrancas', vamos varrer empresas (menos eficiente) OU usar Collection Group se configurado.
            // Para garantir sem index complexo, vamos iterar (supondo poucas empresas por enquanto) ou usar query collectionGroup se possível.

            // Tenta query via Collection Group 'cobrancas' (Requer índice, mas é o jeito certo)
            // Se der erro de índice, o console avisará e teremos que criar no Firebase Console.
            // Alternativa segura sem index: varrer empresas (lento em escala, ok para MVP).

            console.log(`🔍 Buscando cobrança ${paymentId} para atualizar status para: ${novoStatus}`);

            const empresasSnapshot = await db.collection('empresas').get();
            let cobrancaEncontrada = false;

            for (const empresaDoc of empresasSnapshot.docs) {
                // Tenta buscar pelo paymentId (criado pelo backend) ou id (legado)
                const cobrancasRef = empresaDoc.ref.collection('cobrancas');

                // Busca por paymentId
                let q = cobrancasRef.where('paymentId', '==', paymentId).limit(1);
                let snapshot = await q.get();

                if (snapshot.empty) {
                    // Tenta pelo idReal (algumas versões do código usavam isso)
                    q = cobrancasRef.where('idReal', '==', paymentId).limit(1);
                    snapshot = await q.get();
                }

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    await doc.ref.update({
                        status: novoStatus,
                        dataPagamento: dataPagamento,
                        valorPago: payment.value,
                        webhookRecebido: new Date(),
                        ultimaAtualizacaoAsaas: new Date()
                    });
                    console.log(`✅ Cobrança atualizada! DOC: ${doc.id} (Empresa: ${empresaDoc.id}) -> ${novoStatus}`);
                    cobrancaEncontrada = true;
                    break; // Achou, para de procurar
                }
            }

            if (!cobrancaEncontrada) {
                console.warn(`⚠️ Cobrança ${paymentId} não encontrada no banco de dados.`);
            }
        }

        return res.status(200).send({ received: true });

    } catch (error) {
        console.error('❌ Erro ao processar webhook Asaas:', error);
        return res.status(500).send({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/webhook/health
 * Verificação de saúde para webhooks
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: {
            'inter/pix': 'ativo',
            'inter/boleto': 'ativo'
        }
    });
});

module.exports = router;
