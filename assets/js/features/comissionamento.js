// Comissionamento - JavaScript

// Dados reais do comissionamento (integração com Firestore)
let comissionamentoData = {
    resumo: {
        valorEmAberto: 0.00,
        valorRecebido: 0.00
    },
    planos: []
};

// Função para carregar dados reais do Supabase
async function loadComissionamentoData() {
    try {
        if (!window.supabase) {
            console.warn('Supabase não disponível');
            return;
        }
        
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
            console.log('Usuário não autenticado');
            return;
        }

        const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
        if (!companyId) return;

        // Carregar dados de comissionamento usando Supabase
        const { data: dadosComissionamento, error } = await window.supabase
            .from('comissionamento')
            .select('*')
            .eq('company_id', companyId);
            
        if (error) throw error;
        
        if (dadosComissionamento && dadosComissionamento.length > 0) {
            const planos = [];
            let valorEmAberto = 0;
            let valorRecebido = 0;
            
            dadosComissionamento.forEach(data => {
                planos.push({
                    id: data.id,
                    nome: data.nome || 'Plano não identificado',
                    tipoComissao: data.tipoComissao || 'Valor',
                    comissao: data.comissao || 0.00,
                    valorRecebido: data.valorRecebido || 0.00,
                    valorPendente: data.valorPendente || 0.00,
                    contratos: data.contratos || []
                });
                
                valorEmAberto += data.valorPendente || 0;
                valorRecebido += data.valorRecebido || 0;
            });
            
            comissionamentoData = {
                resumo: {
                    valorEmAberto,
                    valorRecebido
                },
                planos
            };
        }
        
        // Atualizar interface
        updateComissionamentoInterface();
        
    } catch (error) {
        console.error('Erro ao carregar dados de comissionamento:', error);
        // Manter dados vazios em caso de erro
        updateComissionamentoInterface();
    }
}

// Função para atualizar a interface com dados reais
function updateComissionamentoInterface() {
    // Atualizar resumo
    const valorEmAbertoEl = document.getElementById('valor-em-aberto');
    const valorRecebidoEl = document.getElementById('valor-recebido');
    
    if (valorEmAbertoEl) {
        valorEmAbertoEl.textContent = `R$ ${comissionamentoData.resumo.valorEmAberto.toFixed(2).replace('.', ',')}`;  
    }
    
    if (valorRecebidoEl) {
        valorRecebidoEl.textContent = `R$ ${comissionamentoData.resumo.valorRecebido.toFixed(2).replace('.', ',')}`;  
    }
    
    // Atualizar lista de planos
    updatePlanosTable();
}

// Função para atualizar tabela de planos
function updatePlanosTable() {
    const tableBody = document.querySelector('#planos-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (comissionamentoData.planos.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-2"></i><br>
                Nenhum dado de comissionamento encontrado
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    comissionamentoData.planos.forEach(plano => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${plano.nome}</td>
            <td>${plano.tipoComissao}</td>
            <td>R$ ${plano.comissao.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${plano.valorRecebido.toFixed(2).replace('.', ',')}</td>
            <td>R$ ${plano.valorPendente.toFixed(2).replace('.', ',')}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewPlanoDetails('${plano.id}')">
                    <i class="fas fa-eye"></i> Ver Detalhes
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Variáveis globais
let isLoading = false;
let currentDate = new Date();

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// Função para inicializar a página
function initializePage() {
    console.log('Inicializando página de Comissionamento...');
    updateResumoCards();
    updateComissoesCards();
    showToast('Dados de comissionamento carregados com sucesso!', 'success');
}

// Configurar event listeners
function setupEventListeners() {
    // Botões "Abrir página de vendas"
    const vendaButtons = document.querySelectorAll('.btn-link');
    vendaButtons.forEach(button => {
        button.addEventListener('click', handleAbrirVendas);
    });

    // Event listeners para cards (hover effects)
    const cards = document.querySelectorAll('.summary-card, .commission-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', handleCardHover);
        card.addEventListener('mouseleave', handleCardLeave);
    });

    // Adicionar listener para atualização automática
    setInterval(updateDateTime, 60000); // Atualizar a cada minuto
}

// Atualizar cards de resumo
function updateResumoCards() {
    const valorEmAbertoElement = document.querySelector('.summary-card.blue .card-value');
    const valorRecebidoElement = document.querySelector('.summary-card.green .card-value');
    
    if (valorEmAbertoElement) {
        valorEmAbertoElement.textContent = formatCurrency(comissionamentoData.resumo.valorEmAberto);
    }
    
    if (valorRecebidoElement) {
        valorRecebidoElement.textContent = formatCurrency(comissionamentoData.resumo.valorRecebido);
    }
}

// Atualizar cards de comissões
function updateComissoesCards() {
    const commissionCards = document.querySelectorAll('.commission-card');
    
    comissionamentoData.planos.forEach((plano, index) => {
        if (commissionCards[index]) {
            updateComissaoCard(commissionCards[index], plano);
        }
    });
}

// Atualizar card individual de comissão
function updateComissaoCard(cardElement, planoData) {
    // Atualizar informações do plano
    const tipoComissaoElement = cardElement.querySelector('.info-item:nth-child(1) .info-value');
    const comissaoElement = cardElement.querySelector('.info-item:nth-child(2) .info-value');
    const valorRecebidoElement = cardElement.querySelector('.info-row:nth-child(2) .info-item:nth-child(1) .info-value');
    const valorPendenteElement = cardElement.querySelector('.info-row:nth-child(2) .info-item:nth-child(2) .info-value');
    
    if (tipoComissaoElement) {
        tipoComissaoElement.textContent = planoData.tipoComissao;
    }
    
    if (comissaoElement) {
        comissaoElement.textContent = formatCurrency(planoData.comissao);
    }
    
    if (valorRecebidoElement) {
        valorRecebidoElement.textContent = formatCurrency(planoData.valorRecebido);
    }
    
    if (valorPendenteElement) {
        valorPendenteElement.textContent = formatCurrency(planoData.valorPendente);
    }
    
    // Atualizar tabela de contratos
    updateContratosTable(cardElement, planoData.contratos);
}

// Atualizar tabela de contratos
function updateContratosTable(cardElement, contratos) {
    const tbody = cardElement.querySelector('tbody');
    const recordCountElement = cardElement.querySelector('.record-count');
    
    if (!tbody || !recordCountElement) return;
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (contratos.length === 0) {
        // Mostrar mensagem de "nenhum contrato encontrado"
        const noDataRow = document.createElement('tr');
        noDataRow.className = 'no-data';
        noDataRow.innerHTML = '<td colspan="6">Nenhum contrato encontrado.</td>';
        tbody.appendChild(noDataRow);
    } else {
        // Adicionar contratos à tabela
        contratos.forEach(contrato => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${contrato.contrato}</td>
                <td>${contrato.numero}</td>
                <td><span class="status-badge ${getStatusClass(contrato.status)}">${contrato.status}</span></td>
                <td>${formatDate(contrato.dataPagamento)}</td>
                <td>${contrato.formaPagamento}</td>
                <td>${formatCurrency(contrato.valor)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Atualizar contador de registros
    recordCountElement.textContent = `Quantidade de registros: ${contratos.length}`;
}

// Handler para abrir página de vendas
function handleAbrirVendas(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const card = button.closest('.commission-card');
    const planoNome = card.querySelector('.commission-title').textContent;
    
    showToast(`Abrindo página de vendas para ${planoNome}`, 'info');
    
    // Simular redirecionamento
    setTimeout(() => {
        console.log(`Redirecionando para vendas do plano: ${planoNome}`);
        // window.location.href = `vendas.html?plano=${encodeURIComponent(planoNome)}`;
    }, 1000);
}

// Handler para hover nos cards
function handleCardHover(event) {
    const card = event.currentTarget;
    card.style.transform = 'translateY(-3px)';
}

// Handler para leave nos cards
function handleCardLeave(event) {
    const card = event.currentTarget;
    card.style.transform = 'translateY(0)';
}

// Atualizar data e hora
function updateDateTime() {
    currentDate = new Date();
    console.log('Dados atualizados em:', formatDateTime(currentDate));
}

// Simular carregamento de dados
function loadComissionamentoData() {
    if (isLoading) return;
    
    isLoading = true;
    
    // Adicionar classe de loading
    const cards = document.querySelectorAll('.commission-card');
    cards.forEach(card => card.classList.add('loading'));
    
    // Simular carregamento
    setTimeout(() => {
        // Simular pequenas variações nos dados
        simulateDataUpdate();
        
        // Atualizar interface
        updateResumoCards();
        updateComissoesCards();
        updateDateTime();
        
        // Remover classe de loading
        cards.forEach(card => card.classList.remove('loading'));
        
        isLoading = false;
        showToast('Dados de comissionamento atualizados!', 'success');
    }, 2000);
}

// Simular atualização de dados
function simulateDataUpdate() {
    // Pequenas variações aleatórias nos valores
    const variation = () => Math.random() * 1000;
    
    comissionamentoData.resumo.valorEmAberto += variation();
    comissionamentoData.resumo.valorRecebido += variation();
    
    comissionamentoData.planos.forEach(plano => {
        plano.comissao += variation() * 0.1;
        plano.valorRecebido += variation() * 0.5;
        plano.valorPendente += variation() * 0.3;
        
        // Manter valores não negativos
        plano.comissao = Math.max(0, plano.comissao);
        plano.valorRecebido = Math.max(0, plano.valorRecebido);
        plano.valorPendente = Math.max(0, plano.valorPendente);
    });
}

// Função para obter classe CSS do status
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'ativo':
        case 'pago':
        case 'quitado':
            return 'active';
        case 'pendente':
        case 'aguardando':
            return 'pending';
        case 'cancelado':
        case 'vencido':
            return 'inactive';
        default:
            return 'pending';
    }
}

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value);
}

// Função para formatar data
function formatDate(date) {
    if (!date) return '-';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

// Função para formatar data e hora
function formatDateTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    // Remover toast existente
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Criar novo toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Estilos do toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    // Cores por tipo
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Adicionar ao DOM
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Função para debug
function debugComissionamento() {
    console.log('=== DEBUG COMISSIONAMENTO ===');
    
    
    console.log('Loading:', isLoading);
    console.log('============================');
}

// Expor funções globais para debug
window.debugComissionamento = debugComissionamento;
window.comissionamentoData = comissionamentoData;
window.loadComissionamentoData = loadComissionamentoData;

console.log('Comissionamento JavaScript carregado com sucesso!');