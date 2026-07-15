const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const WOOVI_API_URL = 'https://api.woovi.com';

/**
 * Cria uma nova cobrança PIX avulsa na Woovi
 */
async function criarCobranca(config, dados) {
    const appId = config.appId || process.env.WOOVI_APP_ID;
    
    if (!appId) {
        throw new Error('WOOVI_APP_ID não configurado. Adicione a chave gerada no arquivo .env');
    }

    const correlationID = dados.externalReference || uuidv4();
    const valorEmCentavos = Math.round(parseFloat(dados.value) * 100);

    const payload = {
        correlationID: correlationID,
        value: valorEmCentavos,
        comment: dados.description || 'Cobrança PIX',
    };

    if (dados.customer) {
        payload.customer = {
            name: dados.customer.name,
            taxID: dados.customer.cpfCnpj.replace(/\D/g, ''),
        };
        
        if (dados.customer.email) payload.customer.email = dados.customer.email;
        if (dados.customer.phone) payload.customer.phone = dados.customer.phone.replace(/\D/g, '');
    }
    
    if (dados.dueDate) {
         payload.expiresIn = 86400; // Tempo até expirar
    }

    try {
        const response = await axios.post(`${WOOVI_API_URL}/api/v1/charge`, payload, {
            headers: {
                'Authorization': appId,
                'Content-Type': 'application/json'
            }
        });

        return response.data.charge;
    } catch (error) {
        console.error('Erro na API Woovi (criarCobranca):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Erro ao criar cobrança PIX na Woovi');
    }
}

/**
 * Consulta uma cobrança avulsa na Woovi
 */
async function consultarCobranca(config, id) {
    const appId = config.appId || process.env.WOOVI_APP_ID;
    
    if (!appId) {
        throw new Error('WOOVI_APP_ID não configurado');
    }

    try {
        const response = await axios.get(`${WOOVI_API_URL}/api/v1/charge/${id}`, {
            headers: {
                'Authorization': appId
            }
        });

        return response.data.charge;
    } catch (error) {
        console.error('Erro na API Woovi (consultarCobranca):', error.response?.data || error.message);
        throw new Error('Erro ao consultar cobrança PIX na Woovi');
    }
}

/**
 * Cria uma assinatura (PIX Automático Recorrente) na Woovi
 */
async function criarAssinatura(config, dados) {
    const appId = config.appId || process.env.WOOVI_APP_ID;
    
    if (!appId) {
        throw new Error('WOOVI_APP_ID não configurado.');
    }

    const valorEmCentavos = Math.round(parseFloat(dados.value) * 100);

    const payload = {
        value: valorEmCentavos,
        customer: {
            name: dados.customer.name,
            taxID: dados.customer.cpfCnpj.replace(/\D/g, ''),
        },
        globalID: uuidv4(), // Identificador único da assinatura (semelhante ao correlationID)
    };

    if (dados.customer.email) payload.customer.email = dados.customer.email;
    if (dados.customer.phone) payload.customer.phone = dados.customer.phone.replace(/\D/g, '');

    try {
        const response = await axios.post(`${WOOVI_API_URL}/api/v1/subscription`, payload, {
            headers: {
                'Authorization': appId,
                'Content-Type': 'application/json'
            }
        });

        // O retorno principal está no objeto "subscription"
        // Geralmente retorna a assinatura e a primeira cobrança (charge)
        return response.data.subscription;
    } catch (error) {
        console.error('Erro na API Woovi (criarAssinatura):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Erro ao criar PIX Automático Recorrente na Woovi');
    }
}

/**
 * Consulta uma assinatura na Woovi
 */
async function consultarAssinatura(config, id) {
    const appId = config.appId || process.env.WOOVI_APP_ID;
    
    if (!appId) {
        throw new Error('WOOVI_APP_ID não configurado');
    }

    try {
        const response = await axios.get(`${WOOVI_API_URL}/api/v1/subscription/${id}`, {
            headers: {
                'Authorization': appId
            }
        });

        return response.data.subscription;
    } catch (error) {
        console.error('Erro na API Woovi (consultarAssinatura):', error.response?.data || error.message);
        throw new Error('Erro ao consultar assinatura na Woovi');
    }
}

/**
 * Cancela uma assinatura na Woovi
 */
async function cancelarAssinatura(config, id) {
    const appId = config.appId || process.env.WOOVI_APP_ID;
    
    if (!appId) {
        throw new Error('WOOVI_APP_ID não configurado');
    }

    try {
        const response = await axios.delete(`${WOOVI_API_URL}/api/v1/subscription/${id}`, {
            headers: {
                'Authorization': appId
            }
        });

        return response.data;
    } catch (error) {
        console.error('Erro na API Woovi (cancelarAssinatura):', error.response?.data || error.message);
        throw new Error('Erro ao cancelar assinatura na Woovi');
    }
}

module.exports = {
    criarCobranca,
    consultarCobranca,
    criarAssinatura,
    consultarAssinatura,
    cancelarAssinatura
};
