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

    const rawComment = dados.description || 'Cobrança PIX';
    const payload = {
        correlationID: correlationID,
        value: valorEmCentavos,
        comment: rawComment.substring(0, 30),
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

    const dataVencimento = dados.nextDueDate || dados.vencimento;
    
    // Define a frequência (padrão MONTHLY)
    const frequency = dados.cycle || 'MONTHLY';
    
    // Define a jornada
    // PAYMENT_ON_APPROVAL: Cobra a 1ª fatura AGORA, e a 2ª no próximo ciclo
    // ONLY_RECURRENCY: Cobra apenas na data programada (respeitando regra dos 3 dias do Bacen)
    const journey = dados.cobrarImediatamente ? "PAYMENT_ON_APPROVAL" : "ONLY_RECURRENCY";

    const hojeObj = new Date();
    hojeObj.setUTCHours(0,0,0,0);
    const diaHojeUTC = hojeObj.getUTCDate();

    // Data de vencimento baseada no input
    const dataVencimentoObj = dataVencimento ? new Date(dataVencimento + 'T12:00:00Z') : new Date();
    dataVencimentoObj.setUTCHours(0,0,0,0);
    
    // Calcula diferença em dias do vencimento para hoje
    const diffTime = dataVencimentoObj.getTime() - hojeObj.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Fallback de segurança (se a data já passou, usamos 0 como base)
    if (diffDays < 0) {
        diffDays = 0;
    }

    let dayGenerate;
    let computedDaysDueDate;

    if (journey === 'PAYMENT_ON_APPROVAL') {
        // A API exige que seja o dia atual (UTC) para PAYMENT_ON_APPROVAL
        dayGenerate = diaHojeUTC;
        computedDaysDueDate = diffDays;
    } else {
        // A Woovi exige que dayGenerateCharge seja pelo menos 3 dias no futuro para ONLY_RECURRENCY
        if (diffDays < 3) {
            // Empurra a geração para 3 dias a partir de hoje (Fallback de segurança)
            const genDate = new Date(hojeObj);
            genDate.setUTCDate(genDate.getUTCDate() + 3);
            dayGenerate = genDate.getUTCDate();
            computedDaysDueDate = 0;
        } else {
            // Gera 3 dias antes do vencimento
            const genDate = new Date(dataVencimentoObj);
            genDate.setUTCDate(genDate.getUTCDate() - 3);
            dayGenerate = genDate.getUTCDate();
            computedDaysDueDate = 3;
        }
    }

    const rawComment = dados.description || 'Assinatura Mensal';

    // O PULO DO GATO: A API da Woovi tem um bug onde valida o campo "dayDue" exigindo
    // que seja sempre entre 3 e 7, independentemente do vencimento desejado.
    // Para contornar e permitir QUALQUER data, nós OMITIMOS o campo "dayDue" 
    // e enviamos a diferença exata de dias no campo "daysDueDate".
    const payload = {
        name: dados.name || rawComment.substring(0, 99) || 'Assinatura Mensal',
        value: valorEmCentavos,
        type: 'PIX_RECURRING',
        frequency: frequency,
        // dayDue: OMITIDO PROPOSITALMENTE PARA EVITAR O ERRO 'menor ou igual a 7'
        dayGenerateCharge: dayGenerate,
        daysDueDate: computedDaysDueDate, 
        chargeDaysDueDate: computedDaysDueDate,
        pixRecurringOptions: {
            journey: journey,
            retryPolicy: "NON_PERMITED" // Ignora regras absurdas de retentativa
        },
        comment: rawComment.substring(0, 30),
        customer: {
            name: dados.customer.name,
            taxID: dados.customer.cpfCnpj.replace(/\D/g, ''),
            ...(dados.customer.address && { address: dados.customer.address })
        },

        globalID: uuidv4(), // Identificador único da assinatura
    };

    if (dados.customer.email) payload.customer.email = dados.customer.email;
    if (dados.customer.phone) payload.customer.phone = dados.customer.phone.replace(/\D/g, '');

    try {
        console.log('--- PAYLOAD ENVIADO PARA A WOOVI ---');
        console.log(JSON.stringify(payload, null, 2));
        console.log('------------------------------------');

        const response = await axios.post(`${WOOVI_API_URL}/api/v1/subscriptions`, payload, {
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
        const response = await axios.get(`${WOOVI_API_URL}/api/v1/subscriptions/${id}`, {
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
