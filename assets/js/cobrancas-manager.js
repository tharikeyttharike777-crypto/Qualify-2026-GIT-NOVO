/**
 * Sistema de Cobranças - Integração com Asaas PIX
 * Gerencia a criação, visualização e pagamento de cobranças
 */

(function () {
    'use strict';

    // URL do Backend
    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:4570/api'
        : 'https://qualify-2026.onrender.com/api';

    // Estado global
    let currentContract = null;

    // Elementos DOM
    const $ = id => document.getElementById(id);

    /**
     * Obtém o ID da empresa ativa (busca dinâmica)
     */
    function getEmpresaId() {
        // Tenta múltiplas fontes
        let id = localStorage.getItem('empresaSelecionadaId') ||
            localStorage.getItem('activeCompanyId') ||
            localStorage.getItem('companyId');

        // Tenta também do multitenantConfig se disponível
        if (!id && window.multitenantConfig && window.multitenantConfig.getActiveCompany) {
            const company = window.multitenantConfig.getActiveCompany();
            if (company && company.id) {
                id = company.id;
            }
        }

        console.log('🏢 Empresa ID obtido:', id);
        return id;
    }

    // Inicialização
    document.addEventListener('DOMContentLoaded', function () {
        console.log('🔄 Inicializando sistema de cobranças...');

        // Bind dos eventos
        bindChargeEvents();
        bindModalEvents();

        console.log('✅ Sistema de cobranças inicializado');
    });

    /**
     * Vincula eventos do botão de adicionar cobrança
     */
    function bindChargeEvents() {
        const btnAddCharge = $('btnAddCharge');
        if (btnAddCharge) {
            btnAddCharge.addEventListener('click', function (e) {
                e.preventDefault();
                openAddChargeModal();
            });
            console.log('✅ Evento btnAddCharge vinculado');
        } else {
            console.warn('⚠️ Botão btnAddCharge não encontrado');
        }
    }

    /**
     * Vincula eventos do modal
     */
    function bindModalEvents() {
        // Botão Salvar cobrança
        const btnSalvar = $('btnSalvarCharge');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', saveCharge);
        }

        // Botão Cancelar
        const btnCancelar = $('btnCancelarCharge');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', closeAddChargeModal);
        }

        // Botão X (fechar)
        const closeBtn = $('closeAddCharge');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAddChargeModal);
        }

        // Fechar modal ao clicar fora
        const modal = $('modalAddCharge');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    closeAddChargeModal();
                }
            });
        }

        // Modal PIX - Copiar código
        const copyPix = $('copyPix');
        if (copyPix) {
            copyPix.addEventListener('click', function () {
                const pixCode = $('pixCode');
                if (pixCode) {
                    navigator.clipboard.writeText(pixCode.value);
                    showToast('Código PIX copiado!', 'success');
                }
            });
        }

        // Fechar modal PIX
        const closePix = $('closePix');
        if (closePix) {
            closePix.addEventListener('click', function () {
                $('modalPix').style.display = 'none';
                $('modalPix').setAttribute('aria-hidden', 'true');
            });
        }
    }

    /**
     * Abre o modal de adicionar cobrança
     */
    function openAddChargeModal() {
        console.log('📝 Abrindo modal de adicionar cobrança...');

        // Preenche data de vencimento padrão (hoje + 7 dias)
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + 7);
        const vencimentoDefault = hoje.toISOString().split('T')[0];

        const mcVencimento = $('mcVencimento');
        if (mcVencimento) {
            mcVencimento.value = vencimentoDefault;
        }

        // Preenche valor padrão a partir do contrato
        const valorMensalidade = $('ivValor') || $('cvValor');
        if (valorMensalidade) {
            const valorTexto = valorMensalidade.textContent || '';
            const valorNum = parseFloat(valorTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            const mcValor = $('mcValor');
            if (mcValor && valorNum > 0) {
                mcValor.value = valorNum.toFixed(2);
            }
        }

        // Abre o modal
        const modal = $('modalAddCharge');
        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Fecha o modal de adicionar cobrança
     */
    function closeAddChargeModal() {
        const modal = $('modalAddCharge');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Salva a cobrança e gera PIX/Boleto
     */
    async function saveCharge() {
        console.log('💾 Salvando cobrança...');

        const vencimento = $('mcVencimento')?.value;
        const valor = parseFloat($('mcValor')?.value) || 0;
        const qtdParcelas = parseInt($('mcQtdParcelas')?.value) || 1;
        const metodo = $('mcMetodo')?.value || 'pix';
        const mensagem = $('mcMensagem')?.value || '';

        // Validações
        if (!vencimento) {
            showToast('Informe a data de vencimento', 'error');
            return;
        }
        if (valor <= 0) {
            showToast('Informe um valor válido', 'error');
            return;
        }

        // Obtém empresa dinamicamente
        const empresaId = getEmpresaId();
        console.log('📦 Usando empresaId:', empresaId);

        if (!empresaId) {
            showToast('Selecione uma empresa primeiro', 'error');
            console.error('❌ empresaId não encontrado!');
            return;
        }

        // Obtém dados do contrato
        const numeroContrato = $('ivNumero')?.textContent || '';
        const titular = $('holderName')?.textContent || 'Cliente';

        showLoading('Gerando cobrança...');

        try {
            if (metodo === 'pix') {
                await gerarCobrancaPix(empresaId, vencimento, valor, titular, mensagem, numeroContrato);
            } else if (metodo === 'boleto') {
                await gerarCobrancaBoleto(empresaId, vencimento, valor, titular, mensagem, numeroContrato);
            } else {
                // Salva localmente para outros métodos
                await salvarCobrancaLocal(vencimento, valor, metodo, mensagem, numeroContrato);
            }

            closeAddChargeModal();
            hideLoading();
            showToast('Cobrança gerada com sucesso!', 'success');

            // Recarrega a lista de cobranças
            if (typeof reloadCharges === 'function') {
                reloadCharges();
            }

        } catch (error) {
            console.error('❌ Erro ao gerar cobrança:', error);
            hideLoading();
            showToast(error.message || 'Erro ao gerar cobrança', 'error');
        }
    }

    /**
     * Gera cobrança PIX via API do Asaas
     */
    async function gerarCobrancaPix(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('🔵 Gerando cobrança PIX para empresa:', empresaId);

        // PRIORIDADE 1: Busca do campo CPF no modal (digitado pelo usuário)
        let cpfDevedor = null;
        const cpfInput = document.getElementById('mcCpfPagador');
        if (cpfInput && cpfInput.value) {
            cpfDevedor = cpfInput.value.replace(/\D/g, '');
            console.log('📋 CPF obtido do campo do modal');
        }

        // PRIORIDADE 2: Busca do elemento holderCpf (data-cpf)
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            const cpfEl = document.getElementById('holderCpf');
            if (cpfEl && cpfEl.dataset.cpf) {
                cpfDevedor = cpfEl.dataset.cpf.replace(/\D/g, '');
                console.log('📋 CPF obtido do holderCpf');
            }
        }

        // PRIORIDADE 3: Fallback do localStorage
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            const contractKey = `CONTRACT_EDIT_${numeroContrato}`;
            const contractData = localStorage.getItem(contractKey);
            if (contractData) {
                try {
                    const parsed = JSON.parse(contractData);
                    cpfDevedor = (parsed.cpf || parsed.cpfTitular || parsed.documento || '').replace(/\D/g, '');
                    console.log('📋 CPF obtido do localStorage');
                } catch (e) { }
            }
        }

        // Se não tiver CPF válido, mostra erro claro
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            console.error('❌ CPF do devedor não encontrado ou inválido!');
            throw new Error('CPF do pagador é obrigatório. Por favor, informe um CPF válido.');
        }

        console.log('📋 CPF do devedor:', cpfDevedor.substring(0, 3) + '***' + cpfDevedor.substring(8));

        // Captura campos de endereço do modal
        const cep = document.getElementById('mcCep')?.value || '';
        const logradouro = document.getElementById('mcLogradouro')?.value || '';
        const numero = document.getElementById('mcNumero')?.value || '';
        const bairro = document.getElementById('mcBairro')?.value || '';
        const cidade = document.getElementById('mcCidade')?.value || '';
        const uf = document.getElementById('mcUf')?.value?.toUpperCase() || '';

        // Monta endereço completo (logradouro + número)
        const enderecoCompleto = numero ? `${logradouro}, ${numero}` : logradouro;

        console.log('📍 Endereço capturado:', { cep, logradouro: enderecoCompleto, bairro, cidade, uf });

        const payload = {
            empresaId: empresaId,
            valor: valor,
            descricao: mensagem || `Cobrança contrato ${numeroContrato}`,
            pagador: {
                nome: devedor,
                cpf: cpfDevedor,
                endereco: {
                    cep: cep,
                    logradouro: enderecoCompleto,
                    bairro: bairro,
                    cidade: cidade,
                    uf: uf
                }
            },
            expiracao: 3600 // 1 hora para cobrança imediata
        };

        // CORRIGIDO: URL é /api/pix/cob (cobrança imediata, não cobv)
        const response = await fetch(`${API_BASE}/pix/cob`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.message || 'Erro ao gerar PIX');
        }

        // Exibe modal com QR Code
        if (result.qrcode || result.imagemQrcode) {
            showPixModal(result);
        }

        // Salva cobrança localmente
        await salvarCobrancaFirestore({
            tipo: 'pix',
            valor: valor,
            vencimento: vencimento,
            status: 'pendente',
            txid: result.txid,
            pixCopiaECola: result.qrcode,
            imagemQrcode: result.imagemQrcode,
            contratoNumero: numeroContrato,
            criadoEm: new Date().toISOString()
        });

        return result;
    }

    /**
     * Gera cobrança Boleto (placeholder)
     */
    async function gerarCobrancaBoleto(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('📄 Gerando cobrança Boleto para empresa:', empresaId);

        // Por enquanto, salva localmente
        await salvarCobrancaLocal(vencimento, valor, 'boleto', mensagem, numeroContrato);

        showToast('Boleto salvo como pendente (integração em desenvolvimento)', 'info');
    }

    /**
     * Salva cobrança localmente
     */
    async function salvarCobrancaLocal(vencimento, valor, metodo, mensagem, numeroContrato) {
        console.log('💾 Salvando cobrança local...');

        const cobranca = {
            id: Date.now().toString(),
            tipo: metodo,
            valor: valor,
            vencimento: vencimento,
            mensagem: mensagem,
            status: 'pendente',
            contratoNumero: numeroContrato,
            criadoEm: new Date().toISOString()
        };

        await salvarCobrancaFirestore(cobranca);
    }

    /**
     * Salva cobrança no Firestore
     */
    async function salvarCobrancaFirestore(cobranca) {
        try {
            if (window.multitenantConfig && window.multitenantConfig.getCompanyCollection) {
                const colRef = window.multitenantConfig.getCompanyCollection('cobrancas');
                await colRef.add(cobranca);
                console.log('✅ Cobrança salva no Firestore');
            } else {
                // Fallback: salva no localStorage
                const key = `COBRANCA_${cobranca.contratoNumero}_${Date.now()}`;
                localStorage.setItem(key, JSON.stringify(cobranca));
                console.log('✅ Cobrança salva no localStorage');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar cobrança:', error);
        }
    }

    /**
     * Exibe modal com QR Code PIX
     */
    function showPixModal(pixData) {
        const modal = $('modalPix');
        const qrImg = $('pixQrImg');
        const pixCode = $('pixCode');

        if (qrImg && pixData.qrcode) {
            qrImg.src = `data:image/png;base64,${pixData.qrcode}`;
        }

        if (pixCode && pixData.pixCopiaECola) {
            pixCode.value = pixData.pixCopiaECola;
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Exibe mensagem de loading
     */
    function showLoading(message) {
        const overlay = $('loadingOverlay');
        const msg = $('loadingMessage');

        if (msg) msg.textContent = message || 'Processando...';
        if (overlay) overlay.style.display = 'flex';
    }

    /**
     * Esconde loading
     */
    function hideLoading() {
        const overlay = $('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    /**
     * Exibe toast de notificação
     */
    function showToast(message, type = 'info') {
        const container = $('toastContainer') || document.body;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Expõe funções globalmente
    window.openAddChargeModal = openAddChargeModal;
    window.closeAddChargeModal = closeAddChargeModal;
    window.showPixModal = showPixModal;

})();
