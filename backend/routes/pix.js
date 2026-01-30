/**
 * Rotas de PIX
 * Endpoints para geração e consulta de cobranças PIX
 * Integração: Asaas API v3
 */

const express = require('express');
const router = express.Router();
const asaasBankService = require('../services/asaasBank');

/**
 * Middleware para carregar configuração bancária da empresa (Asaas)
 * Prioriza variável de ambiente ASAAS_API_KEY
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

        // Verifica se há chave de API no ambiente
        if (!process.env.ASAAS_API_KEY) {
            return res.status(500).json({
                error: 'Variável de ambiente ASAAS_API_KEY não configurada no servidor',
                code: 'ASAAS_API_KEY_MISSING'
            });
        }

        // Busca configuração opcional do Firestore (para sandbox mode)
        const db = req.app.get('db');
        let sandbox = false;

        try {
            const configRef = db.collection('empresas').doc(empresaId)
                .collection('configuracaoBancaria').doc('asaas');
            const configDoc = await configRef.get();

            if (configDoc.exists) {
                sandbox = configDoc.data().sandbox || false;
            }
        } catch (e) {
            // Config não existe, usa defaults
            console.log('Config Firestore não encontrada, usando defaults');
        }

        // Cria config para o service (a chave vem do env)
        req.bankConfig = {
            id: empresaId,
            sandbox: sandbox,
            ativo: true // Sempre ativo se ASAAS_API_KEY existe
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
        const { valor, descricao, pagador, expiracao } = req.body;

        console.log('📥 Requisição PIX (Asaas) recebida:', { valor, pagador: pagador?.nome });

        // Validações
        if (!valor || valor <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }

        if (!pagador || (!pagador.cpf && !pagador.cnpj)) {
            return res.status(400).json({ error: 'CPF ou CNPJ do pagador é obrigatório' });
        }

        if (!pagador.nome) {
            return res.status(400).json({ error: 'Nome do pagador é obrigatório' });
        }

        // 1. Busca ou cria cliente no Asaas
        const cpfCnpj = pagador.cpf || pagador.cnpj;
        const dadosCliente = {
            name: pagador.nome,
            cpfCnpj: cpfCnpj,
            email: pagador.email || null,
            phone: pagador.telefone || null,
            // Endereço
            postalCode: pagador.endereco?.cep || null,
            address: pagador.endereco?.logradouro || null,
            addressNumber: pagador.endereco?.numero || null,
            province: pagador.endereco?.bairro || null
        };

        console.log('🔍 Buscando/criando cliente no Asaas...');
        const cliente = await asaasBankService.buscarOuCriarCliente(req.bankConfig, cpfCnpj, dadosCliente);

        // 2. Cria cobrança PIX com vencimento para hoje (imediata)
        const hoje = new Date();
        const dueDate = hoje.toISOString().split('T')[0]; // YYYY-MM-DD

        console.log('💰 Criando cobrança PIX no Asaas...');
        const cobranca = await asaasBankService.criarCobranca(req.bankConfig, {
            customer: cliente.id,
            billingType: 'PIX',
            value: parseFloat(valor),
            dueDate: dueDate,
            description: descricao || 'Cobrança PIX Qualify',
            externalReference: req.body.invoiceId || null
        });

        // 3. Obtém QR Code PIX
        console.log('📱 Obtendo QR Code PIX...');
        const qrCodeData = await asaasBankService.obterQrCodePix(req.bankConfig, cobranca.id);

        // 4. Salva cobrança no Firestore
        const db = req.app.get('db');
        const empresaId = req.bankConfig.id;

        await db.collection('empresas').doc(empresaId)
            .collection('cobrancas').add({
                tipo: 'pix',
                tipoCobranca: 'imediata',
                paymentId: cobranca.id, // ID no Asaas
                txid: cobranca.id, // Compatibilidade
                invoiceId: req.body.invoiceId || cobranca.id,
                valor: parseFloat(valor),
                descricao,
                pagador,
                customerId: cliente.id,
                status: cobranca.status.toLowerCase(),
                qrcode: qrCodeData.qrcode,
                pixCopiaECola: qrCodeData.pixCopiaECola,
                banco: 'asaas',
                criadaEm: new Date(),
                vencimento: dueDate
            });

        console.log('✅ Cobrança PIX criada com sucesso:', cobranca.id);

        res.json({
            success: true,
            txid: cobranca.id,
            paymentId: cobranca.id,
            qrcode: qrCodeData.qrcode, // Base64 da imagem
            imagemQrcode: qrCodeData.qrcode,
            pixCopiaECola: qrCodeData.pixCopiaECola,
            status: cobranca.status.toLowerCase(),
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
        let { valor, descricao, pagador, vencimento, diasAposVencimento, invoiceId } = req.body;

        console.log('📥 Requisição PIX com vencimento (Asaas):', { valor, vencimento, pagador: pagador?.nome });

        // Validações
        if (!valor || valor <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }

        if (!vencimento) {
            return res.status(400).json({ error: 'Data de vencimento é obrigatória' });
        }

        if (!pagador || (!pagador.cpf && !pagador.cnpj)) {
            return res.status(400).json({ error: 'CPF ou CNPJ do pagador é obrigatório' });
        }

        // Converte data de DD/MM/YYYY para YYYY-MM-DD se necessário
        if (vencimento.includes('/')) {
            const partes = vencimento.split('/');
            if (partes.length === 3) {
                vencimento = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                console.log('📅 Data convertida para:', vencimento);
            }
        }

        // 1. Busca ou cria cliente no Asaas
        const cpfCnpj = pagador.cpf || pagador.cnpj;
        const dadosCliente = {
            name: pagador.nome,
            cpfCnpj: cpfCnpj,
            email: pagador.email || null,
            phone: pagador.telefone || null,
            postalCode: pagador.endereco?.cep || null,
            address: pagador.endereco?.logradouro || null,
            addressNumber: pagador.endereco?.numero || null,
            province: pagador.endereco?.bairro || null
        };

        console.log('🔍 Buscando/criando cliente no Asaas...');
        const cliente = await asaasBankService.buscarOuCriarCliente(req.bankConfig, cpfCnpj, dadosCliente);

        // 2. Cria cobrança PIX
        console.log('💰 Criando cobrança PIX com vencimento no Asaas...');
        const cobranca = await asaasBankService.criarCobranca(req.bankConfig, {
            customer: cliente.id,
            billingType: 'PIX',
            value: parseFloat(valor),
            dueDate: vencimento,
            description: descricao || 'Cobrança PIX Qualify',
            externalReference: invoiceId || null
        });

        // 3. Obtém QR Code PIX
        console.log('📱 Obtendo QR Code PIX...');
        const qrCodeData = await asaasBankService.obterQrCodePix(req.bankConfig, cobranca.id);

        // 4. Salva cobrança no Firestore
        const db = req.app.get('db');
        const empresaId = req.bankConfig.id;

        await db.collection('empresas').doc(empresaId)
            .collection('cobrancas').add({
                tipo: 'pix',
                tipoCobranca: 'vencimento',
                paymentId: cobranca.id,
                txid: cobranca.id,
                invoiceId: invoiceId || cobranca.id,
                valor: parseFloat(valor),
                descricao,
                pagador,
                customerId: cliente.id,
                vencimento,
                status: cobranca.status.toLowerCase(),
                qrcode: qrCodeData.qrcode,
                pixCopiaECola: qrCodeData.pixCopiaECola,
                banco: 'asaas',
                criadaEm: new Date()
            });

        console.log('✅ Cobrança PIX com vencimento criada:', cobranca.id);

        res.json({
            success: true,
            txid: cobranca.id,
            paymentId: cobranca.id,
            qrcode: qrCodeData.qrcode,
            imagemQrcode: qrCodeData.qrcode,
            pixCopiaECola: qrCodeData.pixCopiaECola,
            status: cobranca.status.toLowerCase(),
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

        console.log('🔍 Consultando cobrança no Asaas:', paymentId);
        const resultado = await asaasBankService.consultarCobranca(req.bankConfig, paymentId);

        // Mapeia status do Asaas para padrão interno
        const statusMap = {
            'PENDING': 'pendente',
            'RECEIVED': 'paga',
            'CONFIRMED': 'paga',
            'OVERDUE': 'vencida',
            'REFUNDED': 'estornada',
            'RECEIVED_IN_CASH': 'paga',
            'REFUND_REQUESTED': 'estornada',
            'CHARGEBACK_REQUESTED': 'contestada',
            'CHARGEBACK_DISPUTE': 'contestada',
            'AWAITING_CHARGEBACK_REVERSAL': 'contestada',
            'DUNNING_REQUESTED': 'negativada',
            'DUNNING_RECEIVED': 'negativada',
            'AWAITING_RISK_ANALYSIS': 'pendente'
        };

        const statusInterno = statusMap[resultado.status] || 'pendente';

        // Atualiza status no Firestore se foi pago
        if (statusInterno === 'paga') {
            const db = req.app.get('db');
            const empresaId = req.bankConfig.id;

            const cobrancaRef = db.collection('empresas').doc(empresaId)
                .collection('cobrancas').where('paymentId', '==', paymentId);

            const snapshot = await cobrancaRef.get();

            if (!snapshot.empty) {
                const docRef = snapshot.docs[0].ref;
                await docRef.update({
                    status: 'paga',
                    dataPagamento: resultado.paymentDate || new Date()
                });
            }
        }

        res.json({
            paymentId: resultado.id,
            txid: resultado.id,
            status: statusInterno,
            statusOriginal: resultado.status,
            valor: resultado.value,
            dataPagamento: resultado.paymentDate || null
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
