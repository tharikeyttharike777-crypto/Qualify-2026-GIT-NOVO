// Resumo do Dia - JavaScript

// Dados reais do resumo do dia (integração com Firestore)
let resumoData = {
    indicadores: {
        recebido: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'duplicata'
        },
        aReceber: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'duplicata'
        },
        receberAtraso: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'duplicata'
        },
        pago: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'conta'
        },
        aPagar: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'conta'
        },
        pagarAtraso: {
            valor: 0.00,
            quantidade: 0,
            tipo: 'conta'
        }
    },
    boletos: {
        quitado: {
            valor: 0.00,
            quantidade: 0
        }
    },
    movimentacoes: [],
    ultimosAcessos: []
};

// Função para carregar dados reais do Firestore
async function loadResumoData() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('Usuário não autenticado');
            return;
        }

        // Carregar dados de resumo do dia do Firestore
        const resumoRef = window.db
            .collection('users')
            .doc(user.uid)
            .collection('resumo-dia');
        
        const today = new Date().toISOString().split('T')[0];
        const doc = await resumoRef.doc(today).get();
        
        if (doc.exists) {
            const data = doc.data();
            resumoData = {
                indicadores: data.indicadores || resumoData.indicadores,
                boletos: data.boletos || resumoData.boletos,
                movimentacoes: data.movimentacoes || []
            };
        }
        
        // Atualizar interface
        updateResumoInterface();
        
    } catch (error) {
        console.error('Erro ao carregar dados de resumo:', error);
        // Manter dados vazios em caso de erro
        updateResumoInterface();
    }
}

// Carregar dados por data selecionada (YYYY-MM-DD)
async function loadResumoDataForDate(isoDate) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.log('Usuário não autenticado');
            return;
        }

        const resumoRef = window.db
            .collection('users')
            .doc(user.uid)
            .collection('resumo-dia');

        const doc = await resumoRef.doc(isoDate).get();
        if (doc.exists) {
            const data = doc.data();
            resumoData = {
                indicadores: data.indicadores || resumoData.indicadores,
                boletos: data.boletos || resumoData.boletos,
                movimentacoes: data.movimentacoes || [],
                ultimosAcessos: data.ultimosAcessos || []
            };
        } else {
            // Sem dados para a data: zera listas e mantém 0
            resumoData.movimentacoes = [];
            resumoData.ultimosAcessos = [];
            Object.keys(resumoData.indicadores).forEach(k => {
                resumoData.indicadores[k].valor = 0;
                resumoData.indicadores[k].quantidade = 0;
            });
            resumoData.boletos.quitado.valor = 0;
            resumoData.boletos.quitado.quantidade = 0;
        }

        updateResumoInterface();
    } catch (error) {
        console.error('Erro ao carregar dados (por data):', error);
        updateResumoInterface();
    }
}

// Função para atualizar a interface com dados reais
function updateResumoInterface() {
    // Atualizar indicadores
    updateIndicadores();
    
    // Atualizar boletos
    updateBoletos();
    
    // Atualizar movimentações
    updateMovimentacoes();
}

// Função para atualizar indicadores
function updateIndicadores() {
    const indicadores = resumoData.indicadores;
    
    // Recebido
    const recebidoValor = document.getElementById('recebido-valor');
    const recebidoQtd = document.getElementById('recebido-quantidade');
    if (recebidoValor) recebidoValor.textContent = `R$ ${indicadores.recebido.valor.toFixed(2).replace('.', ',')}`;
    if (recebidoQtd) recebidoQtd.textContent = `${indicadores.recebido.quantidade} ${indicadores.recebido.tipo}(s)`;
    
    // A Receber
    const aReceberValor = document.getElementById('areceber-valor');
    const aReceberQtd = document.getElementById('areceber-quantidade');
    if (aReceberValor) aReceberValor.textContent = `R$ ${indicadores.aReceber.valor.toFixed(2).replace('.', ',')}`;
    if (aReceberQtd) aReceberQtd.textContent = `${indicadores.aReceber.quantidade} ${indicadores.aReceber.tipo}(s)`;
    
    // Receber em Atraso
    const receberAtrasoValor = document.getElementById('receber-atraso-valor');
    const receberAtrasoQtd = document.getElementById('receber-atraso-quantidade');
    if (receberAtrasoValor) receberAtrasoValor.textContent = `R$ ${indicadores.receberAtraso.valor.toFixed(2).replace('.', ',')}`;
    if (receberAtrasoQtd) receberAtrasoQtd.textContent = `${indicadores.receberAtraso.quantidade} ${indicadores.receberAtraso.tipo}(s)`;
    
    // Pago
    const pagoValor = document.getElementById('pago-valor');
    const pagoQtd = document.getElementById('pago-quantidade');
    if (pagoValor) pagoValor.textContent = `R$ ${indicadores.pago.valor.toFixed(2).replace('.', ',')}`;
    if (pagoQtd) pagoQtd.textContent = `${indicadores.pago.quantidade} ${indicadores.pago.tipo}(s)`;
    
    // A Pagar
    const aPagarValor = document.getElementById('apagar-valor');
    const aPagarQtd = document.getElementById('apagar-quantidade');
    if (aPagarValor) aPagarValor.textContent = `R$ ${indicadores.aPagar.valor.toFixed(2).replace('.', ',')}`;
    if (aPagarQtd) aPagarQtd.textContent = `${indicadores.aPagar.quantidade} ${indicadores.aPagar.tipo}(s)`;
    
    // Pagar em Atraso
    const pagarAtrasoValor = document.getElementById('pagar-atraso-valor');
    const pagarAtrasoQtd = document.getElementById('pagar-atraso-quantidade');
    if (pagarAtrasoValor) pagarAtrasoValor.textContent = `R$ ${indicadores.pagarAtraso.valor.toFixed(2).replace('.', ',')}`;
    if (pagarAtrasoQtd) pagarAtrasoQtd.textContent = `${indicadores.pagarAtraso.quantidade} ${indicadores.pagarAtraso.tipo}(s)`;
}

// Função para atualizar boletos
function updateBoletos() {
    const boletosValor = document.getElementById('boletos-valor');
    const boletosQtd = document.getElementById('boletos-quantidade');
    
    if (boletosValor) boletosValor.textContent = `R$ ${resumoData.boletos.quitado.valor.toFixed(2).replace('.', ',')}`;
    if (boletosQtd) boletosQtd.textContent = `${resumoData.boletos.quitado.quantidade} boleto(s)`;
}

// Função para atualizar movimentações
function updateMovimentacoes() {
    const movimentacoesContainer = document.getElementById('movimentacoes-container');
    if (!movimentacoesContainer) return;
    
    movimentacoesContainer.innerHTML = '';
    
    if (resumoData.movimentacoes.length === 0) {
        movimentacoesContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-2x mb-2"></i><br>
                Nenhuma movimentação encontrada para hoje
            </div>
        `;
        return;
    }
    
    resumoData.movimentacoes.forEach(mov => {
        const movDiv = document.createElement('div');
        movDiv.className = 'movimentacao-item';
        movDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">${mov.nome}</span>
                <div>
                    <span class="text-success me-2">+R$ ${mov.entrada.toFixed(2).replace('.', ',')}</span>
                    <span class="text-danger">-R$ ${mov.saida.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        `;
        movimentacoesContainer.appendChild(movDiv);
    });
}

// Removido conteúdo fictício de últimos acessos; dados virão do Firestore (resumoData.ultimosAcessos)

// Variáveis globais
let currentDate = new Date();
let isLoading = false;

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    // Define data padrão (hoje) no filtro e carrega
    const input = document.getElementById('filterDate');
    if (input) {
        input.value = getTodayISO();
    }
    applyDateFilter();
    updateDateTime();
});

// Função para inicializar a página
function initializePage() {
    console.log('Inicializando página Resumo do Dia...');
    updateIndicadores();
    updateBoletos();
    updateMovimentacoes();
    updateUltimosAcessos();
    showToast('Dados carregados com sucesso!', 'success');
}

// Configurar event listeners
function setupEventListeners() {
    // Botão de atualizar dados
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', applyDateFilter);
    }

    // Filtro por data
    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.addEventListener('change', applyDateFilter);
    }

    // Event listeners para cards (hover effects)
    const cards = document.querySelectorAll('.indicator-card, .situation-card, .update-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', handleCardHover);
        card.addEventListener('mouseleave', handleCardLeave);
    });
}

// Atualizar indicadores
function updateIndicadores() {
    const data = resumoData.indicadores;
    
    // Atualizar cards dos indicadores
    updateIndicadorCard(0, data.recebido.valor, data.recebido.quantidade, data.recebido.tipo);
    updateIndicadorCard(1, data.aReceber.valor, data.aReceber.quantidade, data.aReceber.tipo);
    updateIndicadorCard(2, data.receberAtraso.valor, data.receberAtraso.quantidade, data.receberAtraso.tipo);
    updateIndicadorCard(3, data.pago.valor, data.pago.quantidade, data.pago.tipo);
    updateIndicadorCard(4, data.aPagar.valor, data.aPagar.quantidade, data.aPagar.tipo);
    updateIndicadorCard(5, data.pagarAtraso.valor, data.pagarAtraso.quantidade, data.pagarAtraso.tipo);
}

// Atualizar card individual do indicador
function updateIndicadorCard(index, valor, quantidade, tipo) {
    const cards = document.querySelectorAll('.indicator-card');
    if (cards[index]) {
        const card = cards[index];
        const valueElement = card.querySelector('.card-value');
        const countElement = card.querySelector('.card-count');
        
        if (valueElement) {
            valueElement.textContent = formatCurrency(valor);
        }
        
        if (countElement) {
            countElement.textContent = `${quantidade} ${tipo}(s)`;
        }
    }
}

// Atualizar boletos
function updateBoletos() {
    const data = resumoData.boletos;
    const card = document.querySelector('.situation-card');
    
    if (card) {
        const valueElement = card.querySelector('.card-value');
        const countElement = card.querySelector('.card-count');
        
        if (valueElement) {
            valueElement.textContent = formatCurrency(data.quitado.valor);
        }
        
        if (countElement) {
            countElement.textContent = `${data.quitado.quantidade} boleto(s)`;
        }
    }
}

// (mantido) A atualização de movimentações cria a lista dinamicamente em #movimentacoes-container

// Atualizar últimos acessos (render dinâmico)
function updateUltimosAcessos() {
    const container = document.getElementById('acessos-container');
    if (!container) return;
    container.innerHTML = '';

    if (!resumoData.ultimosAcessos || resumoData.ultimosAcessos.length === 0) {
        container.innerHTML = '<div class="text-muted">Nenhum acesso recente.</div>';
        return;
    }

    resumoData.ultimosAcessos.forEach(acesso => {
        const item = document.createElement('div');
        item.className = 'access-item';
        item.innerHTML = `
            <div class="access-avatar"><span class="avatar-initials">${acesso.iniciais || ''}</span></div>
            <div class="access-info">
                <div class="access-name">${acesso.nome || ''}</div>
                <div class="access-time">${acesso.data || ''}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Handler para atualizar dados
function handleUpdateData() {
    if (isLoading) return;
    
    isLoading = true;
    const updateBtn = document.getElementById('updateBtn');
    
    if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="icon-refresh"></i> Atualizando...';
    }
    
    // Simular carregamento
    setTimeout(() => {
        // Simular pequenas variações nos dados
        simulateDataUpdate();
        
        // Atualizar interface
        updateIndicadores();
        updateBoletos();
        updateMovimentacoes();
        updateUltimosAcessos();
        updateDateTime();
        
        // Restaurar botão
        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="icon-refresh"></i> Atualizar dados';
        }
        
        isLoading = false;
        showToast('Dados atualizados com sucesso!', 'success');
    }, 1500);
}

// Simular atualização de dados
function simulateDataUpdate() {
    // Pequenas variações aleatórias nos valores
    const variation = () => (Math.random() - 0.5) * 100;
    
    resumoData.indicadores.recebido.valor += variation();
    resumoData.indicadores.aReceber.valor += variation();
    
    // Manter valores não negativos
    Object.keys(resumoData.indicadores).forEach(key => {
        if (resumoData.indicadores[key].valor < 0) {
            resumoData.indicadores[key].valor = 0;
        }
    });
}

// Aplicar filtro por data
function applyDateFilter() {
    const input = document.getElementById('filterDate');
    const iso = input && input.value ? input.value : getTodayISO();
    loadResumoDataForDate(iso);
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

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(value);
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

// ISO de hoje (YYYY-MM-DD)
function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
function debugResumo() {
    console.log('=== DEBUG RESUMO DO DIA ===');
    console.log('Data atual:', formatDateTime(currentDate));
    console.log('Dados:', resumoData);
    console.log('Loading:', isLoading);
    console.log('========================');
}

// Expor funções globais para debug
window.debugResumo = debugResumo;
window.resumoData = resumoData;

console.log('Resumo do Dia JavaScript carregado com sucesso!');