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

        // --- LÓGICA DE DECISÃO: PIX MANUAL vs AUTOMÁTICO (2026) ---
        let billingTypeFinal = req.body.billingType;
        const descricaoRecebida = (description || '').toUpperCase();
        console.log('🔍 Analisando tipo para:', descricaoRecebida);

        // 1. Se a descrição diz "AUTOMÁTICO" ou "AUTOMATICO", é o novo produto do BC
        if (descricaoRecebida.includes('AUTOMATICO') || descricaoRecebida.includes('AUTOMÁTICO')) {
            console.log('✨ DETECTADO PIX AUTOMÁTICO (Débito em Conta) - Enviando flag específica');
            // Tenta a tag específica que diferencia o produto na API v3/v4
            billingTypeFinal = 'PIX_AUTOMATIC';
        }
        // 2. Se for apenas PIX (Recorrência simples/manual)
        else if (descricaoRecebida.includes('PIX') || billingTypeFinal === 'PIX') {
            console.log('⚠️ DETECTADO PIX RECORRENTE (Pagamento Manual Mensal)');
            billingTypeFinal = 'PIX';
        }
        // 3. Fallback para Cartão
        else if (!billingTypeFinal) {
            billingTypeFinal = 'CREDIT_CARD';
        }

        console.log('🚀 Payload Final BillingType:', billingTypeFinal);

        let asaasResponse = null;
        let qrCodeData = null;
        let paymentId = null;
        let paymentLink = null;
        let invoiceUrl = null;
        let subscriptionId = null;

        if (billingTypeFinal === 'PIX_AUTOMATIC') {
            // --- JORNADA 3: AUTORIZAÇÃO DE PIX AUTOMÁTICO ---
            console.log('✨ Iniciando Fluxo de Autorização (Jornada 3)');
            asaasResponse = await asaasBankService.criarAutorizacaoPixAutomatico(empresaConfig, {
                customer: customerIdFinal,
                value: parseFloat(value),
                cycle: cycle || 'MONTHLY',
                description: description || 'Autorização de PIX Automático'
            });

            subscriptionId = asaasResponse.id;
            paymentId = asaasResponse.id;

            if (asaasResponse.immediateQrCode) {
                qrCodeData = {
                    qrcode: asaasResponse.immediateQrCode.encodedImage,
                    pixCopiaECola: asaasResponse.immediateQrCode.payload,
                    expirationDate: asaasResponse.immediateQrCode.expirationDate
                };
            }
            console.log('✅ Autorização criada com sucesso!');

        } else {
            // --- FLUXO ORIGINAL: ASSINATURA PADRÃO (PIX MANUAL OU CARTÃO) ---
            asaasResponse = await asaasBankService.criarAssinatura(empresaConfig, {
                customer: customerIdFinal,
                billingType: billingTypeFinal,
                value: parseFloat(value),
                nextDueDate: nextDueDate,
                cycle: cycle || 'MONTHLY',
                description: description || 'Assinatura Qualify'
            });

            subscriptionId = asaasResponse.id;
            invoiceUrl = asaasResponse.invoiceUrl || null;

            console.log('⏳ Esperando 3 segundos pro Asaas gerar a primeira cobrança...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                console.log('🔗 Buscando cobranças da assinatura:', subscriptionId);
                const payments = await asaasBankService.listarCobrancasAssinatura(empresaConfig, subscriptionId);

                if (payments && payments.length > 0) {
                    const firstPayment = payments[0];
                    paymentId = firstPayment.id;
                    paymentLink = firstPayment.axisPaymentLink || firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
                    invoiceUrl = firstPayment.invoiceUrl;

                    if (billingTypeFinal === 'PIX') {
                        qrCodeData = await asaasBankService.obterQrCodeAssinatura(empresaConfig, subscriptionId);
                        if (!qrCodeData) {
                            qrCodeData = await asaasBankService.obterQrCodePix(empresaConfig, paymentId);
                        }
                    }
                } else {
                    console.warn('⚠️ Nenhuma cobrança gerada ainda para a assinatura:', subscriptionId);
                }
            } catch (listError) {
                console.warn('⚠️ Erro ao listar cobranças:', listError.message);
            }
        }

        console.log('✅ Operação concluída:', subscriptionId, 'Cobrança:', paymentId || '(Provisória)');

        // NOVO: Salva cobrança no Firestore para aparecer na tabela
        const db = req.app.get('db');
        if (db) {
            try {
                let tipoFrontend = 'cartao';
                if (billingTypeFinal === 'PIX_AUTOMATIC' || billingTypeFinal === 'PIX') {
                    tipoFrontend = 'pix_automatico';
                } else if (billingTypeFinal === 'BOLETO') {
                    tipoFrontend = 'boleto';
                }

                const idFinal = paymentId || subscriptionId;
                const statusFinal = billingTypeFinal === 'PIX_AUTOMATIC' ? 'PENDING_AUTHORIZATION' : (paymentId ? 'PENDING' : 'PROCESSING');
                const statusDisplayFinal = billingTypeFinal === 'PIX_AUTOMATIC' ? 'Aguardando Autorização' : (paymentId ? 'Em Aberto' : 'Processando...');

                const cobrancaData = {
                    tipo: tipoFrontend,
                    billingType: billingTypeFinal,
                    valor: parseFloat(value),
                    vencimento: nextDueDate,
                    status: statusFinal,
                    statusDisplay: statusDisplayFinal,

                    id: idFinal,
                    paymentId: paymentId,
                    subscriptionId: subscriptionId,
                    asaasPaymentId: paymentId || subscriptionId,

                    linkPagamento: paymentLink || invoiceUrl,
                    invoiceUrl: invoiceUrl,

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

                await db.collection('empresas').doc(empresaId).collection('cobrancas').doc(idFinal).set(cobrancaData);
                console.log(`💾 Registro salvo no Firestore (${statusFinal}):`, idFinal);

            } catch (firestoreError) {
                console.error('⚠️ Erro ao salvar cobrança no Firestore:', firestoreError.message);
            }
        }

        res.json({
            success: true,
            subscriptionId: subscriptionId,
            status: asaasResponse.status,
            value: parseFloat(value),
            nextDueDate: nextDueDate,
            invoiceUrl: invoiceUrl,
            paymentLink: paymentLink || invoiceUrl,
            customerId: customerIdFinal,
            qrcode: qrCodeData ? qrCodeData.qrcode : null,
            imagemQrcode: qrCodeData ? qrCodeData.qrcode : null,
            pixCopiaECola: qrCodeData ? qrCodeData.pixCopiaECola : null
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
