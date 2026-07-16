// Metas - JavaScript

// Dados de metas carregados dinamicamente do Firestore
const metasData = {
    resumo: {
        metasAtivas: 0,
        metasConcluidas: 0,
        performanceGeral: 0,
        pontuacaoTotal: 0
    },
    metas: []
};

// Variáveis globais
let isLoading = false;
let currentDate = new Date();
let updateInterval;

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    startAutoUpdate();
});

// Função para inicializar a página
function initializePage() {
    console.log('Inicializando página de Metas...');
    // Carregar dados locais previamente salvos
    loadFromLocalStorage();

    // Renderizar metas na grade
    renderMetasGrid();

    updateResumoCards();
    updateMetasCards();
    calculatePerformance();
    showToast('Dados de metas carregados com sucesso!', 'success');
}

// Configurar event listeners
function setupEventListeners() {
    // Botões de ação com IDs dedicados
    document.getElementById('newGoalBtn')?.addEventListener('click', () => handleNovaMeta());
    document.getElementById('generateReportBtn')?.addEventListener('click', () => handleRelatorio());
    document.getElementById('historyBtn')?.addEventListener('click', () => handleHistorico());

    // Botões dos modais
    document.getElementById('closeGoalModal')?.addEventListener('click', () => closeModal('goalModal'));
    document.getElementById('cancelGoalBtn')?.addEventListener('click', () => closeModal('goalModal'));
    document.getElementById('saveGoalBtn')?.addEventListener('click', createMetaFromModal);

    document.getElementById('closeReportModal')?.addEventListener('click', () => closeModal('reportModal'));
    document.getElementById('closeReportFooterBtn')?.addEventListener('click', () => closeModal('reportModal'));
    document.getElementById('closeHistoryModal')?.addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('closeHistoryFooterBtn')?.addEventListener('click', () => closeModal('historyModal'));

    // Event listeners para cards (hover effects)
    const cards = document.querySelectorAll('.summary-card, .meta-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', handleCardHover);
        card.addEventListener('mouseleave', handleCardLeave);
    });

    // Listener para atualização manual
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            loadMetasData();
        }
    });
}

// Atualizar cards de resumo
function updateResumoCards() {
    const metasAtivasElement = document.getElementById('metas-ativas');
    const metasConcluidasElement = document.getElementById('metas-concluidas');
    const performanceGeralElement = document.getElementById('performance-geral');
    const pontuacaoTotalElement = document.getElementById('pontuacao-total');
    
    if (metasAtivasElement) {
        metasAtivasElement.textContent = metasData.resumo.metasAtivas;
    }
    
    if (metasConcluidasElement) {
        metasConcluidasElement.textContent = metasData.resumo.metasConcluidas;
    }
    
    if (performanceGeralElement) {
        performanceGeralElement.textContent = formatPercentage(metasData.resumo.performanceGeral);
    }
    
    if (pontuacaoTotalElement) {
        pontuacaoTotalElement.textContent = formatNumber(metasData.resumo.pontuacaoTotal);
    }
}

// Atualizar cards de metas
function updateMetasCards() {
    const metaCards = document.querySelectorAll('.meta-card');
    
    metasData.metas.forEach((meta, index) => {
        if (metaCards[index]) {
            updateMetaCard(metaCards[index], meta);
        }
    });
}

// Atualizar card individual de meta
function updateMetaCard(cardElement, metaData) {
    // Atualizar valores
    const targetElement = cardElement.querySelector('.value-amount.target');
    const currentElement = cardElement.querySelector('.value-amount.current');
    const remainingElement = cardElement.querySelector('.value-amount.remaining');
    
    if (targetElement) {
        targetElement.textContent = formatValue(metaData.objetivo, metaData.tipo);
    }
    
    if (currentElement) {
        currentElement.textContent = formatValue(metaData.atual, metaData.tipo);
    }
    
    if (remainingElement) {
        const restante = metaData.objetivo - metaData.atual;
        remainingElement.textContent = formatValue(restante, metaData.tipo);
    }
    
    // Atualizar barra de progresso
    const progressFill = cardElement.querySelector('.progress-fill');
    const progressPercentage = cardElement.querySelector('.progress-percentage');
    
    if (progressFill && progressPercentage) {
        const percentage = (metaData.atual / metaData.objetivo) * 100;
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
        progressPercentage.textContent = `${Math.round(percentage)}%`;
        
        // Atualizar cor da barra baseada na performance
        progressFill.classList.remove('warning');
        if (percentage < 50) {
            progressFill.classList.add('warning');
        }
    }
    
    // Atualizar status
    const statusElement = cardElement.querySelector('.meta-status');
    if (statusElement) {
        statusElement.className = `meta-status ${metaData.status}`;
        const statusText = getStatusText(metaData.status);
        statusElement.querySelector('span').textContent = statusText;
    }
    
    // Atualizar prazo
    const prazoElement = cardElement.querySelector('.detail-item span');
    if (prazoElement && prazoElement.textContent.includes('Prazo:')) {
        const diasRestantes = calculateDaysRemaining(metaData.prazo);
        prazoElement.textContent = `Prazo: ${formatDate(metaData.prazo)}`;
        
        // Atualizar dias restantes
        const diasElement = cardElement.querySelectorAll('.detail-item span')[1];
        if (diasElement) {
            diasElement.textContent = `${diasRestantes} dias restantes`;
        }
    }
}

// Calcular performance geral
function calculatePerformance() {
    let totalPerformance = 0;
    let metasAtivas = 0;
    
    metasData.metas.forEach(meta => {
        if (meta.status === 'active' || meta.status === 'warning') {
            const percentage = (meta.atual / meta.objetivo) * 100;
            totalPerformance += percentage;
            metasAtivas++;
        }
    });
    
    if (metasAtivas > 0) {
        metasData.resumo.performanceGeral = totalPerformance / metasAtivas;
    }
}

// Handler para cliques nos botões de ação
function handleActionClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const buttonText = button.textContent.trim();
    
    switch (true) {
        case buttonText.includes('Nova Meta'):
            handleNovaMeta();
            break;
        case buttonText.includes('Relatório'):
            handleRelatorio();
            break;
        case buttonText.includes('Histórico'):
            handleHistorico();
            break;
        default:
            console.log('Ação não reconhecida:', buttonText);
    }
}

// Handler para nova meta
function handleNovaMeta() {
    // Abrir modal centralizado com design da plataforma
    openModal('goalModal');
}

// Handler para relatório
function handleRelatorio() {
    // Abrir modal de relatório e iniciar geração
    openModal('reportModal');
    const reportStatus = document.getElementById('reportStatus');
    if (reportStatus) {
        reportStatus.textContent = 'Gerando relatório de performance...';
    }

    setTimeout(() => {
        const csv = generatePerformanceCSV(metasData.metas);
        if (!csv) {
            reportStatus && (reportStatus.textContent = 'Não há metas para gerar relatório.');
            showToast('Não há metas para gerar relatório.', 'warning');
            return;
        }
        // Baixar arquivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_metas_${formatDate(new Date()).replace(/\//g, '-')}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        reportStatus && (reportStatus.textContent = 'Relatório gerado com sucesso! O download foi iniciado.');
        showToast('Relatório gerado com sucesso!', 'success');
    }, 800);
}

// Handler para histórico
function handleHistorico() {
    showToast('Carregando histórico de metas...', 'info');
    renderHistoryModal();
    openModal('historyModal');
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

// Iniciar atualização automática
function startAutoUpdate() {
    updateInterval = setInterval(() => {
        updateDateTime();
        simulateDataUpdate();
    }, 30000); // Atualizar a cada 30 segundos
}

// Parar atualização automática
function stopAutoUpdate() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Atualizar data e hora
function updateDateTime() {
    currentDate = new Date();
    console.log('Dados atualizados em:', formatDateTime(currentDate));
}

// ====== Persistência Local ======
function getStorageKey() {
    const empresaId = localStorage.getItem('empresaSelecionadaId') || 'default';
    return `metas_${empresaId}`;
}

function getHistoryStorageKey() {
    const empresaId = localStorage.getItem('empresaSelecionadaId') || 'default';
    return `metas_history_${empresaId}`;
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(metasData));
    } catch (e) {
        console.warn('Falha ao salvar metas no localStorage:', e.message);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(getStorageKey());
        if (raw) {
            const parsed = JSON.parse(raw);
            // Mesclar dados válidos
            metasData.resumo = parsed.resumo || metasData.resumo;
            metasData.metas = Array.isArray(parsed.metas) ? parsed.metas : metasData.metas;
        }
    } catch (e) {
        console.warn('Falha ao carregar metas do localStorage:', e.message);
    }
}

function appendHistoryEntry(action, meta) {
    const entry = {
        id: Date.now(),
        timestamp: formatDateTime(new Date()),
        action,
        meta: {
            nome: meta?.nome || meta?.title || 'Meta',
            objetivo: meta?.objetivo || 0,
            atual: meta?.atual || 0,
            status: meta?.status || 'active'
        }
    };
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem(getHistoryStorageKey())) || [];
    } catch {}
    history.unshift(entry);
    localStorage.setItem(getHistoryStorageKey(), JSON.stringify(history));
}

// ====== Renderização ======
function renderMetasGrid() {
    const grid = document.querySelector('.metas-grid');
    if (!grid) return;

    // Limpar conteúdo
    grid.innerHTML = '';

    if (!metasData.metas || metasData.metas.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-flag"></i>
                <h3>Nenhuma meta ativa</h3>
                <p>Crie uma nova meta para começar.</p>
            </div>`;
        return;
    }

    metasData.metas.forEach(meta => {
        const percentage = Math.round((meta.atual / meta.objetivo) * 100);
        const diasRestantes = calculateDaysRemaining(meta.prazo);
        const cardHtml = `
            <div class="meta-card">
                <div class="meta-header">
                    <div class="meta-info">
                        <div class="meta-title">${meta.nome}</div>
                        <div class="meta-period">${meta.periodo || 'Mês atual'}</div>
                    </div>
                    <div class="meta-status ${meta.status}"><i class="fas fa-circle"></i><span>${getStatusText(meta.status)}</span></div>
                </div>
                <div class="meta-content">
                    <div class="meta-values">
                        <div class="value-item"><span class="value-label">Objetivo</span><span class="value-amount target">${formatValue(meta.objetivo, meta.tipo)}</span></div>
                        <div class="value-item"><span class="value-label">Atual</span><span class="value-amount current">${formatValue(meta.atual, meta.tipo)}</span></div>
                        <div class="value-item"><span class="value-label">Restante</span><span class="value-amount remaining">${formatValue(Math.max(meta.objetivo - meta.atual,0), meta.tipo)}</span></div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar"><div class="progress-fill${percentage < 50 ? ' warning' : ''}" style="width: ${Math.min(percentage,100)}%"></div></div>
                        <div class="progress-percentage">${percentage}%</div>
                    </div>
                    <div class="meta-details">
                        <div class="detail-item"><i class="fas fa-calendar"></i><span>Prazo: ${formatDate(meta.prazo)}</span></div>
                        <div class="detail-item"><i class="fas fa-hourglass-half"></i><span>${diasRestantes} dias restantes</span></div>
                    </div>
                </div>
            </div>`;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Abrir/fechar modais
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        // Focar primeiro input se existir
        const firstInput = modal.querySelector('input, select');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Criar meta a partir do modal
function createMetaFromModal() {
    const nome = document.getElementById('goalName')?.value?.trim();
    const tipo = document.getElementById('goalType')?.value || 'number';
    const objetivo = parseFloat(document.getElementById('goalTarget')?.value || '0');
    const prazo = document.getElementById('goalDeadline')?.value;
    if (!nome || !objetivo || !prazo) {
        showToast('Preencha Nome, Objetivo e Prazo.', 'warning');
        return;
    }

    const novaMeta = {
        id: Date.now(),
        nome,
        tipo,
        objetivo,
        atual: 0,
        prazo,
        status: 'active',
        periodo: 'Mês atual'
    };
    metasData.metas.push(novaMeta);
    metasData.resumo.metasAtivas = metasData.metas.filter(m => m.status !== 'completed').length;
    saveToLocalStorage();
    appendHistoryEntry('Meta criada', novaMeta);
    renderMetasGrid();
    updateResumoCards();
    calculatePerformance();
    showToast(`Meta '${nome}' criada com sucesso!`, 'success');
    closeModal('goalModal');
}

// Gerar CSV de performance
function generatePerformanceCSV(metas) {
    if (!metas || metas.length === 0) return '';
    const header = ['Nome','Tipo','Objetivo','Atual','Restante','Prazo','Status','Progresso(%)'];
    const rows = metas.map(m => {
        const pct = ((m.atual / m.objetivo) * 100) || 0;
        return [
            m.nome,
            m.tipo,
            m.objetivo,
            m.atual,
            Math.max(m.objetivo - m.atual,0),
            formatDate(m.prazo),
            getStatusText(m.status),
            Math.round(pct)
        ];
    });
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
}

// Renderizar histórico no modal
function renderHistoryModal() {
    const container = document.getElementById('historyList');
    if (!container) return;
    let history = [];
    try { history = JSON.parse(localStorage.getItem(getHistoryStorageKey())) || []; } catch {}
    if (history.length === 0) {
        container.innerHTML = '<li class="history-empty">Nenhum histórico disponível</li>';
        return;
    }
    container.innerHTML = history.map(h => `
        <li class="history-item">
            <div class="history-title">${h.action}</div>
            <div class="history-meta">${h.timestamp} • ${h.meta.nome} • Objetivo: ${formatValue(h.meta.objetivo, 'number')}</div>
        </li>
    `).join('');
}

// Simular carregamento de dados
function loadMetasData() {
    if (isLoading) return;
    
    isLoading = true;
    
    // Adicionar classe de loading
    const cards = document.querySelectorAll('.meta-card, .summary-card');
    cards.forEach(card => card.classList.add('loading'));
    
    // Simular carregamento
    setTimeout(() => {
        // Simular pequenas variações nos dados
        simulateDataUpdate();
        
        // Atualizar interface
        updateResumoCards();
        updateMetasCards();
        calculatePerformance();
        updateDateTime();
        
        // Remover classe de loading
        cards.forEach(card => card.classList.remove('loading'));
        
        isLoading = false;
        showToast('Dados de metas atualizados!', 'success');
    }, 2000);
}

// Simular atualização de dados
function simulateDataUpdate() {
    // Pequenas variações aleatórias nos valores atuais
    metasData.metas.forEach(meta => {
        const variation = Math.random() * 0.1 - 0.05; // -5% a +5%
        const newValue = meta.atual * (1 + variation);
        
        // Manter valores dentro de limites realistas
        meta.atual = Math.max(0, Math.min(newValue, meta.objetivo * 1.1));
        
        // Atualizar status baseado na performance
        const percentage = (meta.atual / meta.objetivo) * 100;
        if (percentage >= 90) {
            meta.status = 'completed';
        } else if (percentage >= 60) {
            meta.status = 'active';
        } else {
            meta.status = 'warning';
        }
    });
    
    // Atualizar pontuação total
    metasData.resumo.pontuacaoTotal += Math.floor(Math.random() * 50 - 25);
    metasData.resumo.pontuacaoTotal = Math.max(0, metasData.resumo.pontuacaoTotal);
}

// Função para obter texto do status
function getStatusText(status) {
    switch (status) {
        case 'active':
            return 'Ativa';
        case 'warning':
            return 'Atenção';
        case 'completed':
            return 'Concluída';
        case 'paused':
            return 'Pausada';
        default:
            return 'Desconhecido';
    }
}

// Calcular dias restantes
function calculateDaysRemaining(prazoString) {
    const prazo = new Date(prazoString);
    const hoje = new Date();
    const diffTime = prazo - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

// Função para formatar valores
function formatValue(value, tipo) {
    switch (tipo) {
        case 'currency':
            return formatCurrency(value);
        case 'number':
            return formatNumber(value);
        case 'percentage':
            return formatPercentage(value);
        default:
            return value.toString();
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

// Função para formatar números
function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

// Função para formatar porcentagem
function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
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
function debugMetas() {
    console.log('=== DEBUG METAS ===');
    
    
    console.log('Loading:', isLoading);
    console.log('Auto-update ativo:', !!updateInterval);
    console.log('==================');
}

// Função para exportar dados
function exportMetasData() {
    const dataStr = JSON.stringify(metasData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `metas_${formatDate(currentDate).replace(/\//g, '-')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Dados exportados com sucesso!', 'success');
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', function() {
    stopAutoUpdate();
});

// Expor funções globais para debug
window.debugMetas = debugMetas;
window.metasData = metasData;
window.loadMetasData = loadMetasData;
window.exportMetasData = exportMetasData;

console.log('Metas JavaScript carregado com sucesso!');
