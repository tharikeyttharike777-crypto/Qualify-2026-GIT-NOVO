// Contas a Pagar - JavaScript Functionality

// Dados serão carregados dinamicamente do Firestore
const contasData = [];

// Global variables
let currentData = [...contasData];
let currentPage = 1;
const itemsPerPage = 15;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o UserDataManager estar disponível
    setTimeout(() => {
        loadData();
    }, 1000);
    // Pré-carrega dados locais para evitar perder alterações após recarregar
    const localPreload = loadFromLocalStorage();
    if (Array.isArray(localPreload) && localPreload.length > 0) {
        contasData.length = 0;
        contasData.push(...localPreload);
        currentData = [...contasData];
        renderTable();
        updateSummaryCards();
        updateRecordCount();
        updatePaginationControls();
    }
    setupEventListeners();
});

// Load data from Firestore
async function loadData() {
    // Fallback imediato: se não autenticado, tenta carregar do localStorage
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado, carregando dados locais (fallback)');
        const localData = loadFromLocalStorage();
        if (Array.isArray(localData) && localData.length > 0) {
            contasData.length = 0;
            contasData.push(...localData);
            currentData = [...contasData];
            renderTable();
            updateSummaryCards();
            updateRecordCount();
            updatePaginationControls();
            return;
        }
        showEmptyState('Faça login para visualizar os dados');
        updateSummaryCards(true); // Reset cards
        return;
    }

    try {
        // Mostra loading
        showLoadingState();
        
        // Busca dados do usuário logado
        const userData = await window.userDataManager.getUserData('contas-pagar', {
            orderBy: { field: 'dataVencimento', direction: 'asc' }
        });
        
        const localData = loadFromLocalStorage();
        contasData.length = 0; // Limpa array
        // Prioriza dados do Firestore; se vazio, usa localStorage
        const sourceData = (userData && userData.length > 0) ? userData : (localData || []);
        contasData.push(...sourceData);
        currentData = [...contasData];
        
        if (contasData.length === 0) {
            showEmptyState('Nenhuma conta a pagar encontrada');
            updateSummaryCards(true); // Reset cards
        } else {
            hideLoadingState();
            renderTable();
            updateSummaryCards();
            updateRecordCount();
            updatePaginationControls();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de contas a pagar:', error);
        // Em caso de erro, tenta fallback local
        const localData = loadFromLocalStorage();
        if (Array.isArray(localData) && localData.length > 0) {
            contasData.length = 0;
            contasData.push(...localData);
            currentData = [...contasData];
            renderTable();
            updateSummaryCards();
            updateRecordCount();
            updatePaginationControls();
        } else {
            showEmptyState('Nenhuma conta a pagar encontrada');
            updateSummaryCards(true); // Reset cards
            updateRecordCount();
            disablePaginationControls();
        }
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#contasTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#contasTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">${message}</td></tr>`;
    }
    // Zera contagem e desativa paginação quando vazio
    updateRecordCount();
    disablePaginationControls();
}

function initializePage() {
    renderTable();
    updateSummaryCards();
    updateRecordCount();
}

function setupEventListeners() {
    // Action buttons
    document.getElementById('filterBtn')?.addEventListener('click', handleFilter);
    document.getElementById('exportBtn')?.addEventListener('click', handleExport);
    document.getElementById('createBtn')?.addEventListener('click', handleCreate);
    
    // Pagination buttons
    document.getElementById('firstPage')?.addEventListener('click', () => goToPage(1));
    document.getElementById('prevPage')?.addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage')?.addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPage')?.addEventListener('click', () => goToPage(Math.ceil(currentData.length / itemsPerPage)));

    // Filter modal actions
    document.getElementById('filterApplyBtn')?.addEventListener('click', applyFiltersFromModal);
    document.getElementById('filterClearBtn')?.addEventListener('click', clearFiltersFromModal);
    document.getElementById('filterCloseBtn')?.addEventListener('click', closeFilterModal);

    // Export dropdown actions
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => { exportToCSV(); closeExportMenu(); showToast('Exportação CSV concluída.', 'success'); });
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => { exportToPDF(); closeExportMenu(); });

    // Create modal actions
    document.getElementById('createSaveBtn')?.addEventListener('click', saveCreatedConta);
    document.getElementById('createCloseBtn')?.addEventListener('click', closeCreateModal);

    // Overlay close for modals
    document.getElementById('modalOverlay')?.addEventListener('click', () => {
        closeFilterModal();
        closeCreateModal();
    });

    // Click outside closes export menu
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('exportMenu');
        const btn = document.getElementById('exportBtn');
        if (!menu || !btn) return;
        if (!menu.classList.contains('hidden')) {
            const target = e.target;
            if (!(menu.contains(target) || btn.contains(target))) {
                closeExportMenu();
            }
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('contasTableBody');
    if (!tbody) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = currentData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <h3>Nenhuma conta encontrada</h3>
                    <p>Não há contas a pagar que correspondam aos filtros aplicados.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(conta => `
        <tr data-id="${conta.id}">
            <td>
                <button class="action-btn btn-pagar" onclick="pagarConta(${conta.id})" title="Pagar" ${conta.status === 'pago' ? 'disabled' : ''}>
                    ${conta.status === 'pago' ? 'Pago' : 'Pagar'}
                </button>
                <button class="action-btn btn-delete" onclick="deleteConta(${conta.id})" title="Excluir" aria-label="Excluir">
                    <i class="fas fa-trash" aria-hidden="true"></i>
                </button>
            </td>
            <td title="${conta.descricao}">${truncateText(conta.descricao, 50)}</td>
            <td>${conta.fornecedor}</td>
            <td>${conta.planoContas}</td>
            <td>${conta.centroCusto}</td>
            <td>${conta.dataVencimento}</td>
            <td class="value-neutral">${conta.valorPrevisto}</td>
            <td>${conta.dataPagamento || '-'}</td>
            <td class="${conta.valorRealizado === 'R$ 0,00' ? 'value-neutral' : 'value-positive'}">${conta.valorRealizado}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewDetails(${conta.id})" title="Ver detalhes">
                    Detalhes
                </button>
            </td>
        </tr>
    `).join('');
}

function updateSummaryCards(reset = false) {
    if (reset) {
        // Zera todos os valores
        document.getElementById('numeroTitulos').textContent = '0';
        document.getElementById('numeroFornecedores').textContent = '0';
        document.getElementById('valorPrevisto').textContent = 'R$ 0,00';
        document.getElementById('valorRealizado').textContent = 'R$ 0,00';
        document.getElementById('faltaPagar').textContent = 'R$ 0,00';
        return;
    }
    
    const numeroTitulos = currentData.length;
    const fornecedores = [...new Set(currentData.map(conta => conta.fornecedor))].length;
    
    // Calculate totals
    const valorPrevisto = currentData.reduce((sum, conta) => {
        const valor = parseCurrency(conta.valorPrevisto);
        return sum + (isNaN(valor) ? 0 : valor);
    }, 0);

    const valorRealizado = currentData.reduce((sum, conta) => {
        const valor = parseCurrency(conta.valorRealizado);
        return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
    
    const faltaPagar = valorPrevisto - valorRealizado;
    
    // Update DOM elements
    document.getElementById('numeroTitulos').textContent = numeroTitulos;
    document.getElementById('numeroFornecedores').textContent = fornecedores;
    document.getElementById('valorPrevisto').textContent = formatCurrency(valorPrevisto);
    document.getElementById('valorRealizado').textContent = formatCurrency(valorRealizado);
    document.getElementById('faltaPagar').textContent = formatCurrency(faltaPagar);
}

function updateRecordCount() {
    const recordCountElement = document.getElementById('recordCount');
    if (recordCountElement) {
        recordCountElement.textContent = currentData.length;
    }
}

function goToPage(page) {
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    
    // Update pagination buttons state
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('lastPage').disabled = currentPage === totalPages;
    
    // Update active page number
    const pageNumbers = document.querySelectorAll('.pagination-numbers .pagination-btn:not(.pagination-dots)');
    pageNumbers.forEach((btn, index) => {
        btn.classList.toggle('active', index + 1 === currentPage);
    });
}

function disablePaginationControls() {
    const first = document.getElementById('firstPage');
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');
    const last = document.getElementById('lastPage');
    [first, prev, next, last].forEach(btn => { if (btn) btn.disabled = true; });
}

// Action handlers
function handleFilter() {
    openFilterModal();
}

function handleExport() {
    toggleExportMenu();
}

function handleCreate() {
    openCreateModal();
}

// ---- Filter Modal Logic ----
function openFilterModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('filterModal');
    if (overlay) overlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeFilterModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('filterModal');
    if (overlay) overlay.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
}

function applyFiltersFromModal() {
    const statusEl = document.getElementById('filterStatus');
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');
    if (!statusEl || !startEl || !endEl) return;

    const status = statusEl.value;
    const startDate = startEl.value;
    const endDate = endEl.value;

    // Combined filtering
    let filtered = [...contasData];
    if (status && status !== 'all') {
        filtered = filtered.filter(conta => conta.status === status);
    }
    if (startDate && endDate) {
        filtered = filtered.filter(conta => {
            const venc = new Date(conta.dataVencimento.split('/').reverse().join('-'));
            const start = new Date(startDate);
            const end = new Date(endDate);
            return venc >= start && venc <= end;
        });
    }

    currentData = filtered;
    currentPage = 1;
    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
    updateFilterStatusText(status, startDate, endDate);
    closeFilterModal();
    showToast('Filtros aplicados com sucesso!', 'success');
}

function clearFiltersFromModal() {
    const statusEl = document.getElementById('filterStatus');
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');
    statusEl && (statusEl.value = 'all');
    startEl && (startEl.value = '');
    endEl && (endEl.value = '');

    currentData = [...contasData];
    currentPage = 1;
    renderTable();
    updateSummaryCards(true);
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
    updateFilterStatusText('all', '', '');
}

function updateFilterStatusText(status, startDate, endDate) {
    const container = document.querySelector('.filter-status span');
    if (!container) return;
    const statusText = (status === 'all' || !status) ? 'Todos' : (status === 'a_pagar' ? 'A pagar' : status.charAt(0).toUpperCase() + status.slice(1));
    let dateText = '';
    if (startDate && endDate) {
        dateText = `, Data de vencimento entre ${formatDateInputToBR(startDate)} e ${formatDateInputToBR(endDate)}`;
    }
    container.textContent = `Filtro aplicado: (Status seja ${statusText}${dateText})`;
}

function formatDateInputToBR(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

// ---- Export Menu Logic ----
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    const btn = document.getElementById('exportBtn');
    if (!menu || !btn) return;
    if (menu.classList.contains('hidden')) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

function closeExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (!menu) return;
    menu.classList.add('hidden');
}

// ---- Create Modal Logic ----
function openCreateModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('createModal');
    if (overlay) overlay.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeCreateModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('createModal');
    if (overlay) overlay.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
}

function saveCreatedConta() {
    const descEl = document.getElementById('createDescricao');
    const fornEl = document.getElementById('createFornecedor');
    const planoEl = document.getElementById('createPlanoContas');
    const centroEl = document.getElementById('createCentroCusto');
    const vencEl = document.getElementById('createDataVencimento');
    const valorEl = document.getElementById('createValorPrevisto');
    if (!descEl || !fornEl || !planoEl || !centroEl || !vencEl || !valorEl) return;

    const descricao = descEl.value.trim();
    if (!descricao) { showToast('Informe a descrição.', 'warning'); return; }

    const newConta = {
        id: Date.now(),
        descricao,
        fornecedor: fornEl.value.trim() || '-',
        planoContas: planoEl.value.trim() || '-',
        centroCusto: centroEl.value.trim() || '-',
        dataVencimento: vencEl.value ? formatDateInputToBR(vencEl.value) : '-',
        valorPrevisto: valorEl.value ? formatCurrency(parseFloat(valorEl.value)) : 'R$ 0,00',
        dataPagamento: '',
        valorRealizado: 'R$ 0,00',
        status: 'a_pagar'
    };

    contasData.push(newConta);
    currentData = [...contasData];
    currentPage = 1;
    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
    saveToLocalStorage();
    closeCreateModal();
    showToast('Conta criada e salva localmente. Integração com Firestore pendente.', 'info');
}

function pagarConta(id) {
    const conta = currentData.find(c => c.id === id);
    if (conta) {
        // Evitar múltiplos pagamentos
        if (conta.status === 'pago') {
            showToast(`Conta já paga: ${conta.descricao}`, 'info');
            return;
        }

        showToast(`Processando pagamento para: ${conta.descricao}`, 'info');

        // Simula processamento e registra pagamento localmente
        setTimeout(() => {
            const hoje = new Date();
            const dataBR = hoje.toLocaleDateString('pt-BR');
            const valorPrev = parseCurrency(conta.valorPrevisto);
            // Atualiza campos
            conta.dataPagamento = dataBR;
            conta.valorRealizado = formatCurrency(isNaN(valorPrev) ? 0 : valorPrev);
            conta.status = 'pago';

            // Re-renderiza e atualiza cartões
            renderTable();
            updateSummaryCards();
            updateRecordCount();
            saveToLocalStorage();

            showToast(`Pagamento registrado: ${conta.descricao}`, 'success');
        }, 600);
    }
}

function viewConta(id) {
    const conta = currentData.find(c => c.id === id);
    if (conta) {
        showToast(`Visualizando conta: ${conta.descricao}`, 'info');
        // Here you would typically open a modal or redirect to view page
    }
}

// Remover conta a pagar
function deleteConta(id) {
    const conta = currentData.find(c => c.id === id);
    if (!conta) return;

    const confirmado = window.confirm(`Excluir a conta "${conta.descricao}"? Esta ação não pode ser desfeita.`);
    if (!confirmado) return;

    const idxGlobal = contasData.findIndex(c => c.id === id);
    if (idxGlobal !== -1) contasData.splice(idxGlobal, 1);

    const idxCurrent = currentData.findIndex(c => c.id === id);
    if (idxCurrent !== -1) currentData.splice(idxCurrent, 1);

    // Ajustar paginação se necessário
    const totalPages = Math.ceil(currentData.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
    saveToLocalStorage();

    showToast('Conta excluída com sucesso.', 'success');
}

function viewDetails(id) {
    const conta = currentData.find(c => c.id === id);
    if (conta) {
        showToast(`Carregando detalhes da conta: ${conta.descricao}`, 'info');
        // Here you would typically open a details modal
    }
}

// Utility functions
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Converte string monetária (BR/US) para número de forma robusta
function parseCurrency(valueStr) {
    if (typeof valueStr === 'number') return valueStr;
    if (!valueStr) return 0;
    let s = String(valueStr).trim();
    // Remove símbolo e espaços
    s = s.replace(/[Rr]\$\s?/g, '').replace(/\s/g, '');
    // Mantém apenas dígitos, ponto, vírgula e sinal
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return 0;
    // Se contém vírgula, assumimos vírgula como decimal e removemos pontos (milhar)
    if (s.includes(',')) {
        s = s.replace(/\./g, '');
        s = s.replace(/,/g, '.');
    } else {
        // Caso contrário, assumimos ponto como decimal e removemos vírgulas (milhar)
        s = s.replace(/,/g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// ----- Persistência Local (localStorage) -----
function getActiveCompanyId() {
    try {
        const activeCompanyStr = localStorage.getItem('activeCompany');
        const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        return activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
    } catch (e) {
        return localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
    }
}

function getStorageKey() {
    const companyId = getActiveCompanyId();
    return `contasPagar_${companyId}`;
}

function saveToLocalStorage() {
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(contasData));
    } catch (e) {
        console.warn('Falha ao salvar contas a pagar no localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const str = localStorage.getItem(getStorageKey());
        const arr = str ? JSON.parse(str) : [];
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        console.warn('Falha ao carregar contas a pagar do localStorage:', e);
        return [];
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Search and filter functions
function searchContas(query) {
    if (!query.trim()) {
        currentData = [...contasData];
    } else {
        currentData = contasData.filter(conta => 
            conta.descricao.toLowerCase().includes(query.toLowerCase()) ||
            conta.fornecedor.toLowerCase().includes(query.toLowerCase()) ||
            conta.planoContas.toLowerCase().includes(query.toLowerCase()) ||
            conta.centroCusto.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    currentPage = 1;
    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
}

function filterByStatus(status) {
    if (status === 'all') {
        currentData = [...contasData];
    } else {
        currentData = contasData.filter(conta => conta.status === status);
    }
    
    currentPage = 1;
    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
}

function filterByDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
        currentData = [...contasData];
    } else {
        currentData = contasData.filter(conta => {
            const vencimento = new Date(conta.dataVencimento.split('/').reverse().join('-'));
            const start = new Date(startDate);
            const end = new Date(endDate);
            return vencimento >= start && vencimento <= end;
        });
    }
    
    currentPage = 1;
    renderTable();
    updateSummaryCards();
    updateRecordCount();
    updatePaginationControls();
}

// Export functions
function exportToCSV() {
    const headers = ['Descrição', 'Fornecedor', 'Plano de Contas', 'Centro de Custo', 'Data de Vencimento', 'Valor Previsto', 'Data de Pagamento', 'Valor Realizado'];
    const csvContent = [headers.join(',')];
    
    currentData.forEach(conta => {
        const row = [
            `"${conta.descricao}"`,
            `"${conta.fornecedor}"`,
            `"${conta.planoContas}"`,
            `"${conta.centroCusto}"`,
            conta.dataVencimento,
            conta.valorPrevisto,
            conta.dataPagamento || '',
            conta.valorRealizado
        ];
        csvContent.push(row.join(','));
    });
    
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contas-a-pagar.csv';
    link.click();
}

function exportToPDF() {
    const contas = document.querySelectorAll('.conta-item');
    showToast(`Exportando ${contas.length} contas a pagar para PDF...`, 'success');
}

// Initialize tooltips and other UI enhancements
function initializeTooltips() {
    const elements = document.querySelectorAll('[title]');
    elements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            // Tooltip functionality can be enhanced here
        });
    });
}

// Call initialization functions
document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
});