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

        // --- SOBRESCRITA NUCLEAR ---
        let billingTypeFinal = req.body.billingType;
        const descricaoRecebida = description || ''; // usa variável que já desestruturamos
        console.log('📦 Recebido do Front:', { billingType: req.body.billingType, desc: descricaoRecebida });

        // Se a descrição mencionar PIX, ignoramos qualquer outra variável e forçamos PIX
        if (descricaoRecebida.toUpperCase().includes('PIX')) {
            console.log('☢️ DETECTADO PIX NA DESCRIÇÃO. FORÇANDO billingType = PIX');
            billingTypeFinal = 'PIX';
        } else if (!billingTypeFinal) {
            billingTypeFinal = 'CREDIT_CARD'; // Só cai aqui se não for Pix e não tiver tipo definido
        }

        // Cria assinatura no Asaas
        const subscription = await asaasBankService.criarAssinatura(empresaConfig, {
            customer: customerIdFinal,
            billingType: billingTypeFinal,
            value: parseFloat(value),
            nextDueDate: nextDueDate,
            cycle: cycle || 'MONTHLY',
            description: description || 'Assinatura Qualify'
        });

        // --- LÓGICA DE CORREÇÃO PARA PIX AUTOMÁTICO (E CARTÃO) ---

        // 1. DELAY OBRIGATÓRIO (RACE CONDITION FIX)
        console.log('⏳ Esperando 3 segundos pro Asaas respirar...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        let paymentId = null;
        let paymentLink = null;
        let invoiceUrl = subscription.invoiceUrl || null;


        // Se o Asaas não retornou invoiceUrl ou se queremos garantir o ID da cobrança (pay_...)
        // Fazemos uma busca ativa pela primeira cobrança gerada
        let qrCodeData = null;

        try {
            console.log('🔗 Buscando cobranças da assinatura:', subscription.id);
            const payments = await asaasBankService.listarCobrancasAssinatura(empresaConfig, subscription.id);
            console.log('📦 Resultado da busca:', payments ? payments.length : 0, 'itens');

            if (payments && payments.length > 0) {
                const firstPayment = payments[0];
                paymentId = firstPayment.id; // O ID real da cobrança (pay_...)
                paymentLink = firstPayment.axisPaymentLink || firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
                invoiceUrl = firstPayment.invoiceUrl;
                console.log('✅ Cobrança identificada:', paymentId);

                // --- NOVO: BUSCA QR CODE DO PIX SE FOR PIX ---
                if (billingTypeFinal === 'PIX') {
                    // Tenta buscar QR Code da Assinatura (Feature de Autorização Recorrente?)
                    console.log('📱 Tentando obter QR Code da Assinatura (Autorização)...');
                    qrCodeData = await asaasBankService.obterQrCodeAssinatura(empresaConfig, subscription.id);

                    if (qrCodeData) {
                        console.log('✅ QR Code de Autorização da Assinatura obtido!', qrCodeData.pixCopiaECola.substring(0, 20) + '...');
                    } else {
                        // Se não conseguiu da assinatura, pega da cobrança (Fallback padrão)
                        console.log('📱 Buscando QR Code PIX para a primeira cobrança da assinatura...');
                        try {
                            qrCodeData = await asaasBankService.obterQrCodePix(empresaConfig, paymentId);
                            console.log('✅ QR Code obtido com sucesso!');
                        } catch (qrError) {
                            console.error('⚠️ Erro ao buscar QR Code PIX:', qrError.message);
                        }
                    }
                }

            } else {
                console.warn('⚠️ Nenhuma cobrança gerada ainda para a assinatura:', subscription.id);
            }
        } catch (fetchError) {
            console.error('❌ Erro ao buscar cobranças da assinatura:', fetchError.message);
        }

        console.log('✅ Assinatura criada:', subscription.id, 'Cobrança:', paymentId || '(Provisória)');

        // NOVO: Salva cobrança no Firestore para aparecer na tabela
        const db = req.app.get('db');
        if (db) {
            try {
                // Determina o tipo para o Frontend (ícone correto)
                const billingTypeReal = req.body.billingType || 'CREDIT_CARD';
                let tipoFrontend = 'cartao';

                if (billingTypeReal === 'PIX') tipoFrontend = 'pix_automatico';
                else if (billingTypeReal === 'BOLETO') tipoFrontend = 'boleto';

                // FALLBACK: Se não tiver paymentId, usa subscriptionId e marca como PROCESSING
                const idFinal = paymentId || subscription.id;
                const statusFinal = paymentId ? 'PENDING' : 'PROCESSING'; // PROCESSING avisa o user que tá carregando
                const statusDisplayFinal = paymentId ? 'Em Aberto' : 'Processando...';

                const cobrancaData = {
                    tipo: tipoFrontend, // 'pix_automatico' ou 'cartao'
                    billingType: billingTypeReal,
                    valor: parseFloat(value),
                    vencimento: nextDueDate,
                    status: statusFinal, // PENDING ou PROCESSING
                    statusDisplay: statusDisplayFinal,

                    // IDs cruciais
                    id: idFinal,
                    paymentId: paymentId,             // ID da cobrança (se houver)
                    subscriptionId: subscription.id,  // ID da assinatura
                    asaasPaymentId: paymentId || subscription.id, // Compatibilidade

                    // Dados do Pagamento
                    linkPagamento: paymentLink || invoiceUrl,
                    invoiceUrl: invoiceUrl,

                    // Dados PIX (Se houver)
                    qrcode: qrCodeData ? qrCodeData.qrcode : null,
                    imagemQrcode: qrCodeData ? qrCodeData.qrcode : null,
                    pixCopiaECola: qrCodeData ? qrCodeData.pixCopiaECola : null,

                    customerId: customerIdFinal,
                    nomeCliente: nomeCliente,
                    cpfCnpj: cpfCnpj,
                    descricao: description || 'Assinatura Qualify',
                    contratoNumero: req.body.contratoNumero || '',
                    criadoEm: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString()
                };

                const cobrancasRef = db.collection('empresas').doc(empresaId).collection('cobrancas');

                // Salva com o ID determinado (paymentId ou subscriptionId)
                await cobrancasRef.doc(idFinal).set(cobrancaData);
                console.log(`💾 Cobrança salva no Firestore (${statusFinal}):`, idFinal);

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
