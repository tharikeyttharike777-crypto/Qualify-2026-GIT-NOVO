/**
 * Rotas de Assinatura (Subscription)
 * Endpoints para criação de assinaturas recorrentes via Asaas
 * Pagamento via Link (Credit Card)
 */

const express = require('express');
const router = express.Router();
const asaasBankService = require('../services/asaasBank');

/**
 * POST /api/subscriptions/criar-link
 * Cria uma assinatura recorrente e retorna o link de pagamento
 */
router.post('/criar-link', async (req, res) => {
    try {
        const { empresaId, customerId, cpfCnpj, nomeCliente, value, nextDueDate, description, cycle } = req.body;

        console.log('💳 Criando assinatura recorrente:', { empresaId, customerId, value, cycle });

        // Validações
        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId é obrigatório' });
        }

        if (!value || value <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }

        if (!nextDueDate) {
            return res.status(400).json({ error: 'Data de vencimento é obrigatória' });
        }

        // Verifica se há chave de API no ambiente
        if (!process.env.ASAAS_API_KEY) {
            return res.status(500).json({
                error: 'Variável de ambiente ASAAS_API_KEY não configurada',
                code: 'ASAAS_API_KEY_MISSING'
            });
        }

        // Config mínima para o service
        const empresaConfig = {
            id: empresaId,
            sandbox: false
        };

        // Se não tem customerId, precisa buscar/criar cliente
        let customerIdFinal = customerId;
        if (!customerIdFinal && cpfCnpj) {
            console.log('🔍 Buscando/criando cliente para assinatura...');
            const cliente = await asaasBankService.buscarOuCriarCliente(empresaConfig, cpfCnpj, {
                name: nomeCliente || 'Cliente',
                cpfCnpj: cpfCnpj
            });
            customerIdFinal = cliente.id;
        }

        if (!customerIdFinal) {
            return res.status(400).json({ error: 'customerId ou cpfCnpj é obrigatório' });
        }

        // Cria assinatura no Asaas
        const subscription = await asaasBankService.criarAssinatura(empresaConfig, {
            customer: customerIdFinal,
            billingType: 'CREDIT_CARD',
            value: parseFloat(value),
            nextDueDate: nextDueDate,
            cycle: cycle || 'MONTHLY',
            description: description || 'Assinatura Qualify'
        });

        // Tenta obter o link de pagamento da primeira cobrança
        let paymentLink = null;
        let invoiceUrl = subscription.invoiceUrl || null;

        if (!invoiceUrl && subscription.id) {
            // Busca a primeira cobrança da assinatura
            console.log('🔗 Buscando link de pagamento da primeira cobrança...');
            const payments = await asaasBankService.listarCobrancasAssinatura(empresaConfig, subscription.id);

            if (payments && payments.length > 0) {
                invoiceUrl = payments[0].invoiceUrl;
                paymentLink = payments[0].invoiceUrl;
            }
        }

        console.log('✅ Assinatura criada:', subscription.id);

        // NOVO: Salva cobrança no Firestore para aparecer na tabela
        const db = req.app.get('db');
        if (db) {
            try {
                const cobrancaData = {
                    tipo: 'cartao',
                    billingType: 'CREDIT_CARD',
                    valor: parseFloat(value),
                    vencimento: nextDueDate,
                    status: 'PENDING',
                    statusDisplay: 'Em Aberto',
                    subscriptionId: subscription.id,
                    asaasPaymentId: subscription.id,
                    linkPagamento: paymentLink || invoiceUrl,
                    invoiceUrl: invoiceUrl,
                    customerId: customerIdFinal,
                    nomeCliente: nomeCliente,
                    cpfCnpj: cpfCnpj,
                    descricao: description || 'Assinatura Qualify',
                    contratoNumero: req.body.contratoNumero || '',
                    criadoEm: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString()
                };

                const cobrancasRef = db.collection('empresas').doc(empresaId).collection('cobrancas');
                const docRef = await cobrancasRef.add(cobrancaData);
                console.log('💾 Cobrança salva no Firestore:', docRef.id);
            } catch (firestoreError) {
                console.error('⚠️ Erro ao salvar cobrança no Firestore (não crítico):', firestoreError.message);
            }
        }

        res.json({
            success: true,
            subscriptionId: subscription.id,
            status: subscription.status,
            value: subscription.value,
            nextDueDate: subscription.nextDueDate,
            cycle: subscription.cycle,
            invoiceUrl: invoiceUrl,
            paymentLink: paymentLink || invoiceUrl,
            customerId: customerIdFinal
        });

    } catch (error) {
        console.error('❌ Erro ao criar assinatura:', error);
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

        if (!process.env.ASAAS_API_KEY) {
            return res.status(500).json({ error: 'ASAAS_API_KEY não configurada' });
        }

        const empresaConfig = { id: empresaId, sandbox: false };
        const subscription = await asaasBankService.consultarAssinatura(empresaConfig, subscriptionId);

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

        if (!process.env.ASAAS_API_KEY) {
            return res.status(500).json({ error: 'ASAAS_API_KEY não configurada' });
        }

        const empresaConfig = { id: empresaId, sandbox: false };
        await asaasBankService.cancelarAssinatura(empresaConfig, subscriptionId);

        res.json({ success: true, message: 'Assinatura cancelada' });

    } catch (error) {
        console.error('❌ Erro ao cancelar assinatura:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
