// Pesquisa Simplificada JavaScript

// Dados serão carregados dinamicamente do Firestore
const contractsData = [];
let fsUtils = null;

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let filteredData = [...contractsData];

// DOM Elements
const searchForm = document.getElementById('searchForm');
const tableBody = document.getElementById('tableBody');
const paginationContainer = document.querySelector('.pagination');
const recordsCount = document.querySelector('.pagination-info strong');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Form elements
const numeroContrato = document.getElementById('numeroContrato');
const nomeTitular = document.getElementById('nomeTitular');
const cpfTitular = document.getElementById('cpfTitular');
const cnpjTitular = document.getElementById('cnpjTitular');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupInputMasks();

    // Inicializa utilitário do Firestore quando disponível
    function tryInitializeUtils() {
        if (window.FirestoreUtils && !fsUtils) {
            fsUtils = new window.FirestoreUtils();
        }
    }

    tryInitializeUtils();

    // Inicialização robusta
    const initPage = () => {
        tryInitializeUtils();

        const mt = window.multitenantConfig;
        if (mt && mt.initialized && mt.getActiveCompany()) {
            loadData();
        } else {
            window.addEventListener('multitenantReady', loadData, { once: true });
            // Polling fallback
            const checkInterval = setInterval(() => {
                if (window.multitenantConfig && window.multitenantConfig.initialized && window.multitenantConfig.getActiveCompany()) {
                    clearInterval(checkInterval);
                    loadData();
                }
            }, 500);
        }
    };

    initPage();
});

// Load data from Firestore
// Helpers
function normalizeStatus(s) { const v = String(s || '').trim().toLowerCase(); return v || 'ativo'; }
function statusClass(s) { const v = normalizeStatus(s); if (['cancelado'].includes(v)) return 'cancelado'; if (['inadimplente', 'atrasado'].includes(v)) return 'inadimplente'; if (['encerrado', 'inativo'].includes(v)) return 'encerrado'; return 'ativo'; }

function toContract(data, fam) {
    const numeroRaw = data.numero || data.id || '';
    const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
    const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : Date.now();

    return {
        id: numeroNumerico,
        numero: String(numeroRaw || numeroNumerico),
        date: data.date || data.dataInicio || data.dataContrato || new Date().toLocaleDateString('pt-BR'),
        titular: (fam?.titular?.nome) || data.titular || data.clienteNome || fam?.titular || '-',
        cpf: (fam?.titular?.cpf) || data.cpf || '',
        cnpj: (fam?.titular?.cnpj) || data.cnpj || '',
        plano: data.plano || '-',
        cobranca: data.cobranca || data.tipoCobranca || '-',
        status: normalizeStatus(data.status || 'ativo'),
        situacao: data.situacao || 'Adimplente',
        carencia: data.carencia || data.carenciaRestante || '-',
        vencimento: data.vencimento || data.diaVencimento || '-',
        parcelas: data.parcelas || data.qtdParcelas || '-',
        valor: data.valor || data.valorMensalidade || 0
    };
}

// Data Loaders
async function loadFromContratosFirestore() {
    try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.getActiveCompany || !mt.getCompanyCollection || !mt.getActiveCompany()) return null;
        const snap = await mt.getCompanyCollection('contratos').get();
        return snap.docs.map(d => toContract({ id: d.id, ...d.data() }));
    } catch (e) {
        console.warn('Falha ao carregar contratos (Firestore):', e);
        return null;
    }
}

async function loadFromFamiliasFirestore() {
    try {
        const mt = window.multitenantConfig;
        if (!mt || !mt.getActiveCompany || !mt.getCompanyCollection || !mt.getActiveCompany()) return null;
        const snap = await mt.getCompanyCollection('familias').get();
        const list = [];
        snap.forEach(doc => {
            const fam = { id: doc.id, ...(doc.data() || {}) };
            const contratos = Array.isArray(fam.contratos) ? fam.contratos : [];
            contratos.forEach(ct => list.push(toContract(ct, fam)));
        });
        return list;
    } catch (e) {
        console.warn('Falha ao carregar contratos via famílias (Firestore):', e);
        return null;
    }
}

function loadFromLocalFamilias() {
    try {
        const raw = localStorage.getItem('familias');
        if (!raw) return null;
        const familias = JSON.parse(raw || '[]') || [];
        const list = [];
        familias.forEach(fam => {
            const contratos = Array.isArray(fam.contratos) ? fam.contratos : [];
            contratos.forEach(ct => list.push(toContract(ct, fam)));
        });
        return list;
    } catch (e) {
        console.warn('Falha ao carregar contratos via famílias (localStorage):', e);
        return null;
    }
}

function loadFromLocalContractEdits() {
    try {
        const list = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i) || '';
            if (k.startsWith('CONTRACT_EDIT_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(k) || '{}');
                    if (data && (data.numero || data.id)) {
                        list.push(toContract({
                            numero: data.numero || data.id,
                            date: (data.dataContrato ? new Date(data.dataContrato).toLocaleDateString('pt-BR') : undefined),
                            plano: data.plano,
                            status: data.situacao, // Map situacao to status if needed, or keep separate
                            vendedor: data.vendedor,
                            ...data
                        }));
                    }
                } catch (_) { }
            }
        }
        return list;
    } catch (e) {
        console.warn('Falha ao carregar contratos locais (CONTRACT_EDIT_*):', e);
        return null;
    }
}

// Load data from all sources
async function loadData() {
    try {
        showLoadingState();

        const a = await loadFromContratosFirestore();
        const b = await loadFromFamiliasFirestore();
        const c = loadFromLocalFamilias();
        const d = loadFromLocalContractEdits();

        const combined = [...(a || []), ...(b || []), ...(c || []), ...(d || [])];
        const dedup = new Map();

        combined.forEach(cn => {
            const key = String(cn.numero || cn.id || '').trim();
            if (!dedup.has(key)) dedup.set(key, cn);
        });

        const docs = Array.from(dedup.values());

        // Normaliza e carrega dados
        contractsData.length = 0; // Limpa array
        contractsData.push(...(docs || []));
        filteredData = [...contractsData];

        if (contractsData.length === 0) {
            showEmptyState('Nenhum contrato encontrado');
        } else {
            hideLoadingState();
            renderTable();
            setupPagination();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de contratos:', error);
        showEmptyState('Erro ao carregar dados. Tente novamente.');
    }
}

// Mostra estado de loading
function showLoadingState() {
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Event Listeners
function setupEventListeners() {
    // Search form submission
    searchForm.addEventListener('submit', handleSearch);

    // Real-time search on input
    nomeTitular.addEventListener('input', debounce(handleRealTimeSearch, 300));
    cpfTitular.addEventListener('input', debounce(handleRealTimeSearch, 300));
    cnpjTitular.addEventListener('input', debounce(handleRealTimeSearch, 300));
    numeroContrato.addEventListener('change', handleRealTimeSearch);
    numeroContrato.addEventListener('input', debounce(handleRealTimeSearch, 300));

    // Pagination clicks
    paginationContainer.addEventListener('click', handlePaginationClick);

    // Limpar filtros
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            numeroContrato.value = '';
            nomeTitular.value = '';
            cpfTitular.value = '';
            cnpjTitular.value = '';
            filteredData = [...contractsData];
            currentPage = 1;
            renderTable();
            updatePagination();
            if (recordsCount) recordsCount.textContent = filteredData.length;
        });
    }

    // Exportar Excel (CSV)
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', () => {
            exportToCSV(filteredData.length ? filteredData : contractsData);
        });
    }

    // Exportar PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            exportToPDF(filteredData.length ? filteredData : contractsData);
        });
    }

    // Details buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-details')) {
            const row = e.target.closest('tr');
            const contractId = row.cells[1].textContent;
            showContractDetails(contractId);
        }
    });
}

// Input masks
function setupInputMasks() {
    // CPF mask
    cpfTitular.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });

    // CNPJ mask
    cnpjTitular.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1/$2');
        value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });
}

// Search handlers
function handleSearch(e) {
    e.preventDefault();
    performSearch();
}

function handleRealTimeSearch() {
    performSearch();
}

function performSearch() {
    const filters = {
        numeroContrato: numeroContrato.value,
        nomeTitular: nomeTitular.value.toLowerCase(),
        cpfTitular: cpfTitular.value.replace(/\D/g, ''),
        cnpjTitular: cnpjTitular.value.replace(/\D/g, '')
    };

    filteredData = contractsData.filter(contract => {
        const matchesNumero = !filters.numeroContrato || contract.id.toString() === filters.numeroContrato;
        const matchesNome = !filters.nomeTitular || contract.titular.toLowerCase().includes(filters.nomeTitular);
        const matchesCpf = !filters.cpfTitular || contract.cpf.replace(/\D/g, '').includes(filters.cpfTitular);
        const matchesCnpj = !filters.cnpjTitular || (contract.cnpj && contract.cnpj.replace(/\D/g, '').includes(filters.cnpjTitular));

        return matchesNumero && matchesNome && matchesCpf && matchesCnpj;
    });

    currentPage = 1;
    renderTable();
    updatePagination();

    // Show search feedback
    if (filteredData.length === 0) {
        showEmptyState();
    }
}

// Table rendering
function renderTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        showEmptyState();
        return;
    }

    tableBody.innerHTML = pageData.map(contract => `
        <tr>
            <td><button class="btn-details"><i class="fas fa-bars"></i></button></td>
            <td>${safe(contract.numero)}</td>
            <td>${formatDateValue(contract.date)}</td>
            <td>${safe(contract.titular)}</td>
            <td>${safe(contract.plano)}</td>
            <td>${safe(contract.cobranca)}</td>
            <td><span class="status-badge ${statusClass(contract.status)}">
                <i class="fas fa-circle" style="font-size: 8px; margin-right: 4px;"></i>
                ${safe(contract.status)}
            </span></td>
            <td>${safe(contract.situacao)}</td>
            <td>${safe(contract.carencia)}</td>
            <td>${safe(contract.vencimento)}</td>
            <td>${safe(contract.parcelas)}</td>
        </tr>
    `).join('');

    // Update records count com base nos dados filtrados
    recordsCount.textContent = filteredData.length;
}

function showEmptyState(message = 'Nenhum resultado encontrado') {
    tableBody.innerHTML = `
        <tr>
            <td colspan="11" class="empty-state">
                <i class="fas fa-search"></i>
                <h3>${message}</h3>
                <p>Tente ajustar os filtros de pesquisa</p>
            </td>
        </tr>
    `;

    // Limpa paginação
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }

    // Zera contagem de registros quando vazio
    if (recordsCount) {
        recordsCount.textContent = '0';
    }
}

// Helpers
function safe(value) {
    return (value === undefined || value === null || value === '') ? '—' : value;
}

function formatDateValue(value) {
    if (!value) return '—';
    try {
        const d = value.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
        if (isNaN(d.getTime())) return '—';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '—';
    }
}

// Pagination
function setupPagination() {
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const pagination = document.querySelector('.pagination');

    // Clear existing pagination
    pagination.innerHTML = '';

    // First and Previous buttons
    pagination.innerHTML += `
        <button class="pagination-btn" data-page="first" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button class="pagination-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-left"></i>
        </button>
    `;

    // Page numbers
    const startPage = Math.max(1, currentPage - 4);
    const endPage = Math.min(totalPages, startPage + 9);

    for (let i = startPage; i <= endPage; i++) {
        pagination.innerHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    // Next and Last buttons
    pagination.innerHTML += `
        <button class="pagination-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-right"></i>
        </button>
        <button class="pagination-btn" data-page="last" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;
}

function handlePaginationClick(e) {
    const btn = e.target.closest('.pagination-btn');
    if (!btn || btn.disabled) return;

    const page = btn.dataset.page;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    switch (page) {
        case 'first':
            currentPage = 1;
            break;
        case 'prev':
            currentPage = Math.max(1, currentPage - 1);
            break;
        case 'next':
            currentPage = Math.min(totalPages, currentPage + 1);
            break;
        case 'last':
            currentPage = totalPages;
            break;
        default:
            currentPage = parseInt(page);
    }

    renderTable();
    updatePagination();

    // Scroll to top of table
    document.querySelector('.results-container').scrollIntoView({ behavior: 'smooth' });
}

// Contract details
function showContractDetails(contractId) {
    const contract = contractsData.find(c => c.id.toString() === contractId);
    if (contract) {
        alert(`Detalhes do Contrato ${contractId}:\n\nTitular: ${contract.titular}\nPlano: ${contract.plano}\nStatus: ${contract.status}\nValor: ${contract.carencia}`);
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for external use
window.PesquisaSimplificada = {
    performSearch,
    showContractDetails,
    filteredData,
    contractsData
};

// ===== Export Helpers =====
function extractContractFields(contract) {
    return {
        numero: contract.id,
        data: formatDateValue(contract.date || contract.data || contract.createdAt),
        titular: safe(contract.titular || contract.nomeTitular || contract.nome),
        plano: safe(contract.plano || contract.planoNome),
        cobranca: safe(contract.cobranca || contract.tipoCobranca),
        status: safe(contract.status || 'Emitido'),
        situacao: safe(contract.situacao),
        carencia: safe(contract.carencia),
        vencimento: safe(contract.vencimento || contract.diaVencimento),
        parcelas: safe(contract.parcelas || contract.qtdParcelas)
    };
}

function exportToCSV(data) {
    if (!data || data.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const headers = ['Número', 'Data do contrato', 'Titular', 'Plano', 'Tipo de cobrança', 'Status', 'Situação', 'Carência', 'Dia do vencimento', 'Qtd. de parcelas'];
    const rows = data.map(d => {
        const v = extractContractFields(d);
        return [v.numero, v.data, v.titular, v.plano, v.cobranca, v.status, v.situacao, v.carencia, v.vencimento, v.parcelas]
            .map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pesquisa_simplificada_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportToPDF(data) {
    // Sem libs externas, usamos janela de impressão com HTML da tabela
    const toRender = data && data.length ? data : [];
    const headers = ['Número', 'Data do contrato', 'Titular', 'Plano', 'Tipo de cobrança', 'Status', 'Situação', 'Carência', 'Dia do vencimento', 'Qtd. de parcelas'];
    const rowsHtml = toRender.map(d => {
        const v = extractContractFields(d);
        return `<tr>
            <td>${v.numero ?? ''}</td>
            <td>${v.data ?? ''}</td>
            <td>${v.titular ?? ''}</td>
            <td>${v.plano ?? ''}</td>
            <td>${v.cobranca ?? ''}</td>
            <td>${v.status ?? ''}</td>
            <td>${v.situacao ?? ''}</td>
            <td>${v.carencia ?? ''}</td>
            <td>${v.vencimento ?? ''}</td>
            <td>${v.parcelas ?? ''}</td>
        </tr>`;
    }).join('');

    const tableHtml = `<html><head><title>Exportar PDF</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2 { margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            th { background: #f3f3f3; }
        </style>
    </head><body>
        <h2>Pesquisa Simplificada - Exportação</h2>
        <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="10">Sem dados para exportar</td></tr>'}</tbody>
        </table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
        alert('Não foi possível abrir a janela de impressão. Verifique bloqueadores de pop-up.');
        return;
    }
    win.document.open();
    win.document.write(tableHtml);
    win.document.close();
    win.focus();
    // Usuário pode escolher "Salvar como PDF" no diálogo
    win.print();
}

// Navigation back to dashboard
function goBackToDashboard() {
    window.location.href = '../index.html';
}

// Add navigation functionality to logo
document.querySelector('.logo').addEventListener('click', goBackToDashboard);

console.log('Pesquisa Simplificada carregada com sucesso!');