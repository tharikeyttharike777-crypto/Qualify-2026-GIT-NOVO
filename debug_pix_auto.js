const axios = require('axios');

// Configuração
//const API_URL = 'http://localhost:10000/api/subscriptions/criar-link';
const API_URL = 'https://qualify-2026.onrender.com/api/subscriptions/criar-link'; // Descomente para testar produção

const payload = {
    empresaId: 'QckclVUsop3Oj8x9ZMvt', // ID da empresa do print (ou pegue do banco)
    cpfCnpj: '54901547801', // CPF do print
    nomeCliente: 'THARSO HENRIQUE FERREIRA SANTOS',
    value: 10,
    nextDueDate: '2026-02-18',
    description: 'Teste Script PIX Automatico',
    cycle: 'MONTHLY',
    billingType: 'PIX',
    contratoNumero: '0000057'
};

async function testarCriacao() {
    console.log('🚀 Enviando payload:', payload);
    try {
        const response = await axios.post(API_URL, payload);
        console.log('✅ Resposta do Servidor:', JSON.stringify(response.data, null, 2));

        if (response.data.qrcode) {
            console.log('📦 QR Code (Imagem) recebido: SIM');
        } else {
            console.log('⚠️  QR Code (Imagem) recebido: NÃO');
        }

        if (response.data.pixCopiaECola) {
            console.log('📦 Pix Copia e Cola recebido: SIM');
            console.log('👉', response.data.pixCopiaECola);
        } else {
            console.log('⚠️  Pix Copia e Cola recebido: NÃO');
        }

    } catch (error) {
        console.error('❌ Erro:', error.response ? error.response.data : error.message);
    }
}

testarCriacao();
