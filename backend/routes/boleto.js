/**
 * Rotas de Boleto
 * Endpoints para geração e consulta de boletos
 * Integração: Asaas API v3
 */

const express = require('express');
const router = express.Router();
const asaasBankService = require('../services/asaasBank');

/**
 * Middleware para carregar configuração bancária (Asaas)
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
                error: 'Variável de ambiente ASAAS_API_KEY não configurada',
                code: 'ASAAS_API_KEY_MISSING'
            });
        }

        // Busca configuração do Firestore (sandbox mode)
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
            console.log('Config Firestore não encontrada, usando defaults');
        }

        req.bankConfig = {
            id: empresaId,
            sandbox: sandbox,
            ativo: true
        };

        next();

    } catch (error) {
        console.error('Erro ao carregar config bancária:', error);
        res.status(500).json({ error: 'Erro ao carregar configuração bancária' });
    }
}

/**
 * POST /api/boleto - Criar boleto via Asaas
 */
router.post('/', loadBankConfig, async (req, res) => {
    try {
        const { valor, descricao, pagador, vencimento, contratoNumero } = req.body;

        console.log('📄 Requisição Boleto (Asaas) recebida:', { valor, vencimento, pagador: pagador?.nome });

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

        // Formata data de vencimento
        let dueDate = vencimento;
        if (vencimento.includes('/')) {
            const partes = vencimento.split('/');
            if (partes.length === 3) {
                dueDate = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
        }

        // 2. Cria cobrança do tipo BOLETO
        console.log('💵 Criando boleto no Asaas...');
        const cobranca = await asaasBankService.criarCobranca(req.bankConfig, {
            customer: cliente.id,
            billingType: 'BOLETO',
            value: parseFloat(valor),
            dueDate: dueDate,
            description: descricao || 'Cobrança Qualify',
            externalReference: contratoNumero || null
        });

        // Log detalhado da resposta do Asaas
        console.log('📦 Resposta COMPLETA do Asaas:', JSON.stringify(cobranca, null, 2));

        // Constrói invoiceUrl se não vier (padrão Asaas)
        let invoiceUrl = cobranca.invoiceUrl;
        let bankSlipUrl = cobranca.bankSlipUrl;

        // Fallback: constrói URL de invoice baseado no ID
        if (!invoiceUrl && cobranca.id) {
            const sandbox = req.bankConfig.sandbox || false;
            const baseUrl = sandbox ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';
            invoiceUrl = `${baseUrl}/i/${cobranca.id}`;
            console.log('🔗 InvoiceUrl construído:', invoiceUrl);
        }

        // 3. Salva cobrança no Firestore (COM FORÇA BRUTA NOS CAMPOS)
        const db = req.app.get('db');
        const empresaId = req.bankConfig.id;

        const firestorePayload = {
            tipo: 'boleto',
            billingType: 'BOLETO',
            paymentId: cobranca.id, // ID DO ASAAS (Fundamental)
            asaasId: cobranca.id,   // Redundância
            invoiceId: cobranca.id, // Redundância
            valor: parseFloat(valor),
            descricao,
            pagador,
            customerId: cliente.id,
            status: cobranca.status || 'PENDING',
            bankSlipUrl: bankSlipUrl || cobranca.bankSlipUrl || null,
            invoiceUrl: invoiceUrl || cobranca.invoiceUrl || null,
            vencimento: dueDate,
            contratoNumero: contratoNumero || '',
            banco: 'asaas',
            criadoEm: new Date().toISOString()
        };

        console.log('💾 Salvando no Firestore (Payload):', JSON.stringify(firestorePayload, null, 2));

        await db.collection('empresas').doc(empresaId)
            .collection('cobrancas').add(firestorePayload);


        console.log('✅ Boleto criado com sucesso:', cobranca.id);
        console.log('🔗 bankSlipUrl:', bankSlipUrl);
        console.log('🔗 invoiceUrl:', invoiceUrl);

        res.json({
            success: true,
            id: cobranca.id,
            bankSlipUrl: bankSlipUrl || null,
            invoiceUrl: invoiceUrl,
            status: cobranca.status,
            value: parseFloat(valor),
            dueDate: dueDate
        });

    } catch (error) {
        console.error('❌ Erro ao criar boleto:', error);
        res.status(500).json({
            error: error.message || 'Erro ao gerar boleto',
            code: 'BOLETO_CREATION_ERROR'
        });
    }
});

/**
 * GET /api/boleto/:id - Consultar boleto
 */
router.get('/:id', loadBankConfig, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.get('db');
        const empresaId = req.bankConfig.id;

        const snapshot = await db.collection('empresas').doc(empresaId)
            .collection('cobrancas')
            .where('paymentId', '==', id)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Boleto não encontrado' });
        }

        const boleto = snapshot.docs[0].data();
        boleto.id = snapshot.docs[0].id;

        res.json(boleto);

    } catch (error) {
        console.error('Erro ao consultar boleto:', error);
        res.status(500).json({ error: 'Erro ao consultar boleto' });
    }
});

module.exports = router;
