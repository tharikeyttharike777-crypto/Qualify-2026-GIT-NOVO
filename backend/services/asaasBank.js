/**
 * Serviço de integração com Asaas
 * API v3 - Autenticação simples via header access_token
 * Documentação: https://docs.asaas.com/reference
 */

const axios = require('axios');
const encryptionService = require('./encryption');

class AsaasBankService {
    constructor() {
        this.baseUrlProd = 'https://api.asaas.com/v3';
        this.baseUrlSandbox = 'https://sandbox.asaas.com/api/v3';
        this.tokenCache = new Map();
    }

    /**
     * Obtém a URL base conforme ambiente
     */
    getBaseUrl(sandbox = false) {
        return sandbox ? this.baseUrlSandbox : this.baseUrlProd;
    }

    /**
     * Descriptografa credenciais armazenadas
     */
    decryptCredential(encryptedValue) {
        if (!encryptedValue) return null;
        try {
            return encryptionService.decrypt(encryptedValue);
        } catch (error) {
            console.error('Erro ao descriptografar credencial:', error.message);
            return null;
        }
    }

    /**
     * Cria headers padrão para requisições Asaas
     */
    getHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            'access_token': apiKey,
            'User-Agent': 'Qualify/1.0'
        };
    }

    /**
     * Busca cliente por CPF/CNPJ
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} cpfCnpj - CPF ou CNPJ do cliente
     * @returns {Object|null} Cliente encontrado ou null
     */
    async buscarClientePorCpf(empresaConfig, cpfCnpj) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        // Remove formatação do CPF/CNPJ
        const cpfLimpo = cpfCnpj.replace(/\D/g, '');

        console.log(`🔍 Buscando cliente no Asaas por CPF/CNPJ: ${cpfLimpo.substring(0, 3)}***`);

        try {
            const response = await axios.get(`${baseUrl}/customers`, {
                headers: this.getHeaders(apiKey),
                params: { cpfCnpj: cpfLimpo }
            });

            const clientes = response.data.data || [];

            if (clientes.length > 0) {
                console.log(`✅ Cliente encontrado: ${clientes[0].id}`);
                return clientes[0];
            }

            console.log('📭 Nenhum cliente encontrado com este CPF/CNPJ');
            return null;

        } catch (error) {
            console.error('❌ Erro ao buscar cliente:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao buscar cliente no Asaas');
        }
    }

    /**
     * Cria novo cliente no Asaas
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {Object} dados - Dados do cliente
     * @returns {Object} Cliente criado
     */
    async criarCliente(empresaConfig, dados) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`📝 Criando cliente no Asaas: ${dados.name}`);

        // Payload mínimo obrigatório + opcionais
        const payload = {
            name: dados.name,
            cpfCnpj: dados.cpfCnpj?.replace(/\D/g, ''),
            email: dados.email || null,
            phone: dados.phone || null,
            mobilePhone: dados.mobilePhone || null,
            // Endereço (opcional mas recomendado)
            postalCode: dados.postalCode?.replace(/\D/g, '') || null,
            address: dados.address || null,
            addressNumber: dados.addressNumber || null,
            complement: dados.complement || null,
            province: dados.province || null, // Bairro
            // Notificações
            notificationDisabled: dados.notificationDisabled || false,
            externalReference: dados.externalReference || null
        };

        // Remove campos nulos
        Object.keys(payload).forEach(key => {
            if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
                delete payload[key];
            }
        });

        try {
            const response = await axios.post(`${baseUrl}/customers`, payload, {
                headers: this.getHeaders(apiKey)
            });

            console.log(`✅ Cliente criado com sucesso: ${response.data.id}`);
            return response.data;

        } catch (error) {
            console.error('❌ Erro ao criar cliente:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
        }
    }

    /**
     * Busca ou cria cliente no Asaas
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} cpfCnpj - CPF/CNPJ do cliente
     * @param {Object} dadosCliente - Dados para criar cliente se não existir
     * @returns {Object} Cliente existente ou criado
     */
    async buscarOuCriarCliente(empresaConfig, cpfCnpj, dadosCliente) {
        // Primeiro tenta buscar
        const clienteExistente = await this.buscarClientePorCpf(empresaConfig, cpfCnpj);

        if (clienteExistente) {
            return clienteExistente;
        }

        // Se não existe, cria
        return await this.criarCliente(empresaConfig, {
            ...dadosCliente,
            cpfCnpj: cpfCnpj
        });
    }

    /**
     * Cria cobrança no Asaas
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {Object} dados - Dados da cobrança
     * @returns {Object} Cobrança criada
     */
    async criarCobranca(empresaConfig, dados) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`💰 Criando cobrança no Asaas: R$ ${dados.value} - ${dados.billingType}`);

        const payload = {
            customer: dados.customer, // ID do cliente no Asaas
            billingType: dados.billingType || 'PIX', // PIX, BOLETO, CREDIT_CARD
            value: parseFloat(dados.value),
            dueDate: dados.dueDate, // YYYY-MM-DD
            description: dados.description || 'Cobrança Qualify',
            externalReference: dados.externalReference || null,
            // Opcionais para PIX
            postalService: false
        };

        // Campos opcionais para boleto
        if (dados.billingType === 'BOLETO') {
            payload.daysAfterDueDateToRegistrationCancellation = dados.diasAposVencimento || 30;
        }

        try {
            const response = await axios.post(`${baseUrl}/payments`, payload, {
                headers: this.getHeaders(apiKey)
            });

            console.log(`✅ Cobrança criada: ${response.data.id} - Status: ${response.data.status}`);
            return response.data;

        } catch (error) {
            console.error('❌ Erro ao criar cobrança:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas');
        }
    }

    /**
     * Obtém QR Code PIX de uma cobrança
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} paymentId - ID da cobrança no Asaas
     * @returns {Object} Dados do QR Code PIX
     */
    async obterQrCodePix(empresaConfig, paymentId) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`📱 Obtendo QR Code PIX para cobrança: ${paymentId}`);

        try {
            const response = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
                headers: this.getHeaders(apiKey)
            });

            console.log('✅ QR Code PIX obtido com sucesso');
            return {
                qrcode: response.data.encodedImage, // Base64
                pixCopiaECola: response.data.payload,
                expirationDate: response.data.expirationDate
            };

        } catch (error) {
            console.error('❌ Erro ao obter QR Code PIX:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao obter QR Code PIX');
        }
    }

    /**
     * Tenta obter QR Code PIX da Assinatura (para autorização recorrente, se houver)
     */
    async obterQrCodeAssinatura(empresaConfig, subscriptionId) {
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) throw new Error('API Key do Asaas não configurada');

        console.log(`📱 Tentando obter QR Code da ASSINATURA: ${subscriptionId}`);

        try {
            // Tenta endpoint de QR Code da assinatura (hipótese de fluxo de autorização)
            const response = await axios.get(`${baseUrl}/subscriptions/${subscriptionId}/pixQrCode`, {
                headers: this.getHeaders(apiKey)
            });

            console.log('✅ QR Code da ASSINATURA obtido com sucesso!');
            return {
                qrcode: response.data.encodedImage,
                pixCopiaECola: response.data.payload,
                expirationDate: response.data.expirationDate,
                isSubscriptionQr: true
            };

        } catch (error) {
            console.warn('⚠️ Endpoint de QR Code da Assinatura não disponível ou erro:', error.response?.status);
            return null;
        }
    }

    /**
     * Consulta status de uma cobrança
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} paymentId - ID da cobrança no Asaas
     * @returns {Object} Dados da cobrança
     */
    async consultarCobranca(empresaConfig, paymentId) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`🔍 Consultando cobrança: ${paymentId}`);

        try {
            const response = await axios.get(`${baseUrl}/payments/${paymentId}`, {
                headers: this.getHeaders(apiKey)
            });

            console.log(`✅ Cobrança consultada: Status ${response.data.status}`);
            return response.data;

        } catch (error) {
            console.error('❌ Erro ao consultar cobrança:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao consultar cobrança');
        }
    }

    /**
     * Obtém linha digitável do boleto
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} paymentId - ID da cobrança no Asaas
     * @returns {Object} Dados do boleto
     */
    async obterLinhaDigitavelBoleto(empresaConfig, paymentId) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`📄 Obtendo linha digitável do boleto: ${paymentId}`);

        try {
            const response = await axios.get(`${baseUrl}/payments/${paymentId}/identificationField`, {
                headers: this.getHeaders(apiKey)
            });

            console.log('✅ Linha digitável obtida com sucesso');
            return {
                identificationField: response.data.identificationField,
                nossoNumero: response.data.nossoNumero,
                barCode: response.data.barCode
            };

        } catch (error) {
            console.error('❌ Erro ao obter linha digitável:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao obter linha digitável');
        }
    }

    /**
     * Testa conexão com a API do Asaas
     * @param {Object} empresaConfig - Configuração da empresa
     * @returns {Object} Resultado do teste
     */
    async testarConexao(empresaConfig) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        console.log(`🔌 Testando conexão com Asaas (${sandbox ? 'Sandbox' : 'Produção'})...`);

        try {
            // Faz uma chamada simples para verificar autenticação
            const response = await axios.get(`${baseUrl}/customers`, {
                headers: this.getHeaders(apiKey),
                params: { limit: 1 }
            });

            console.log('✅ Conexão com Asaas estabelecida com sucesso');
            return {
                success: true,
                message: 'Conexão com Asaas estabelecida com sucesso!',
                ambiente: sandbox ? 'Sandbox' : 'Produção'
            };

        } catch (error) {
            console.error('❌ Erro ao testar conexão:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                throw new Error('API Key inválida ou expirada');
            }

            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao conectar com Asaas');
        }
    }

    /**
     * Cria uma assinatura recorrente (para cartão de crédito)
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {Object} dados - Dados da assinatura
     * @returns {Object} Assinatura criada
     */
    async criarAssinatura(empresaConfig, dados) {
        // Prioriza variável de ambiente (mais seguro)
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        try {
            console.log('💳 Criando assinatura no Asaas:', dados);

            const response = await axios.post(`${baseUrl}/subscriptions`, {
                customer: dados.customer,
                billingType: dados.billingType || 'CREDIT_CARD',
                value: dados.value,
                nextDueDate: dados.nextDueDate,
                cycle: dados.cycle || 'MONTHLY',
                description: dados.description || 'Assinatura Qualify'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': apiKey
                }
            });

            console.log('✅ Assinatura criada:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Erro ao criar assinatura:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao criar assinatura');
        }
    }

    /**
     * Lista cobranças de uma assinatura (para obter link de pagamento)
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} subscriptionId - ID da assinatura
     * @returns {Array} Lista de cobranças
     */
    async listarCobrancasAssinatura(empresaConfig, subscriptionId) {
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        try {
            const response = await axios.get(`${baseUrl}/subscriptions/${subscriptionId}/payments`, {
                headers: { 'access_token': apiKey }
            });

            return response.data.data || [];

        } catch (error) {
            console.error('❌ Erro ao listar cobranças da assinatura:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Consulta uma assinatura
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} subscriptionId - ID da assinatura
     * @returns {Object} Dados da assinatura
     */
    async consultarAssinatura(empresaConfig, subscriptionId) {
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        try {
            const response = await axios.get(`${baseUrl}/subscriptions/${subscriptionId}`, {
                headers: { 'access_token': apiKey }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Erro ao consultar assinatura:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao consultar assinatura');
        }
    }

    /**
     * Cancela uma assinatura
     * @param {Object} empresaConfig - Configuração da empresa
     * @param {string} subscriptionId - ID da assinatura
     * @returns {Object} Resultado do cancelamento
     */
    async cancelarAssinatura(empresaConfig, subscriptionId) {
        const apiKey = process.env.ASAAS_API_KEY || this.decryptCredential(empresaConfig.asaasApiKey);
        const sandbox = empresaConfig.sandbox || false;
        const baseUrl = this.getBaseUrl(sandbox);

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada');
        }

        try {
            const response = await axios.delete(`${baseUrl}/subscriptions/${subscriptionId}`, {
                headers: { 'access_token': apiKey }
            });

            console.log('✅ Assinatura cancelada:', subscriptionId);
            return response.data;

        } catch (error) {
            console.error('❌ Erro ao cancelar assinatura:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errors?.[0]?.description || 'Erro ao cancelar assinatura');
        }
    }

    /**
     * Limpa cache (mantido para compatibilidade)
     */
    limparCache(empresaId) {
        this.tokenCache.delete(empresaId);
        console.log(`🧹 Cache limpo para empresa: ${empresaId}`);
    }
}

module.exports = new AsaasBankService();

