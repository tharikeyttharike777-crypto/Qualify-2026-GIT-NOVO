// Renovações Pendentes JavaScript

// Dados de contratos carregados dinamicamente do Firestore
let sampleContracts = [];

// Global variables
let currentContracts = [];
let filteredContracts = [];
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 0;
let activeFilters = {};

// Elementos DOM
const elements = {
    filterBtn: document.getElementById('filterBtn'),
    optionsBtn: document.getElementById('optionsBtn'),
    filterStatusText: document.getElementById('filterStatusText'),
    contractsTableBody: document.getElementById('contractsTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    recordsCount: document.getElementById('recordsCount'),

    // Pagination
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    pageNumbers: document.getElementById('pageNumbers'),

    // Filter Modal
    filterModal: document.getElementById('filterModal'),
    closeFilterModal: document.getElementById('closeFilterModal'),
    contractId: document.getElementById('contractId'),
    contractNumber: document.getElementById('contractNumber'),
    planType: document.getElementById('planType'),
    holderName: document.getElementById('holderName'),
    contractDateFrom: document.getElementById('contractDateFrom'),
    contractDateTo: document.getElementById('contractDateTo'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),

    // Options Modal
    optionsModal: document.getElementById('optionsModal'),
    closeOptionsModal: document.getElementById('closeOptionsModal'),
    exportExcelBtn: document.getElementById('exportExcelBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    printReportBtn: document.getElementById('printReportBtn'),
    sendEmailBtn: document.getElementById('sendEmailBtn'),
    renewAllBtn: document.getElementById('renewAllBtn')
};

// Inicialização — FIX: Agora carrega dados do Firestore
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    loadContractsFromFirestore();
});

/**
 * Carrega contratos do Firestore para popular a tabela de renovações
 * FIX: Antes começava com array vazio e nunca carregava dados
 */
async function loadContractsFromFirestore() {
    // Mostrar loading
    if (elements.contractsTableBody) {
        elements.contractsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;"><i class="fas fa-spinner fa-spin"></i> Carregando contratos...</td></tr>';
    }
    if (elements.noDataMessage) elements.noDataMessage.classList.add('hidden');

    try {
        // Aguardar Firebase e empresa ativa
        const companyId = window.getActiveCompanyId
            ? window.getActiveCompanyId()
            : (localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId'));

        if (!companyId || typeof firebase === 'undefined' || !firebase.firestore) {
            showMessage('Selecione uma empresa ou aguarde o carregamento.', 'info');
            if (elements.noDataMessage) elements.noDataMessage.classList.remove('hidden');
            if (elements.contractsTableBody) elements.contractsTableBody.innerHTML = '';
            return;
        }

        const db = firebase.firestore();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Buscar contratos que vencem nos próximos 90 dias ou já venceram
        const contratosRef = db.collection('empresas').doc(companyId).collection('contratos');
        const snapshot = await contratosRef.get();

        sampleContracts = [];
        let idCounter = 1;

        snapshot.forEach(doc => {
            const data = doc.data();
            const lastDue = data.dataFimVigencia || data.ultimoVencimento || data.fim || null;
            if (!lastDue) return;

            const lastDueDate = lastDue.toDate ? lastDue.toDate() : new Date(lastDue);
            const diffTime = lastDueDate.getTime() - today.getTime();
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Incluir contratos que vencem em até 90 dias ou já venceram (até 180 dias atrás)
            if (daysUntilExpiry <= 90 && daysUntilExpiry >= -180) {
                let status = 'normal';
                if (daysUntilExpiry < 0) status = 'vencido';
                else if (daysUntilExpiry === 0) status = 'vence_hoje';
                else if (daysUntilExpiry <= 30) status = 'vence_em_breve';

                let priority = 'baixa';
                if (daysUntilExpiry < 0) priority = 'alta';
                else if (daysUntilExpiry <= 7) priority = 'alta';
                else if (daysUntilExpiry <= 30) priority = 'media';

                sampleContracts.push({
                    id: idCounter++,
                    firestoreId: doc.id,
                    number: data.numero || data.contratoNumero || doc.id,
                    plan: data.plano || data.modalidade || 'N/A',
                    holder: data.titular || data.nomeTitular || 'Sem titular',
                    contractDate: data.dataContrato || data.dataInicio || '',
                    firstDue: data.primeiraParcela || data.primeiroVencimento || '',
                    lastDue: lastDue.toDate ? lastDue.toDate().toISOString().split('T')[0] : lastDue,
                    status: status,
                    daysUntilExpiry: daysUntilExpiry,
                    renewalStatus: data.renovacaoStatus || 'pendente',
                    priority: priority
                });
            }
        });

        // Ordenar: vencidos primeiro, depois por proximidade de vencimento
        sampleContracts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        currentContracts = [...sampleContracts];
        filteredContracts = [...sampleContracts];
        totalPages = Math.ceil(currentContracts.length / itemsPerPage);

        renderContractsTable();
        updatePagination();
        updateRecordsCount();
        updateDashboardStats();
        checkExpirationAlerts();

        console.log(`✅ ${sampleContracts.length} contratos carregados para renovações pendentes`);

    } catch (error) {
        console.error('❌ Erro ao carregar contratos:', error);
        showMessage('Erro ao carregar contratos. Tente recarregar a página.', 'error');
        if (elements.contractsTableBody) elements.contractsTableBody.innerHTML = '';
        if (elements.noDataMessage) elements.noDataMessage.classList.remove('hidden');
    }
}

// Recarregar ao trocar empresa
window.addEventListener('activeCompanyChanged', () => loadContractsFromFirestore());
window.addEventListener('companyChanged', () => loadContractsFromFirestore());

// Event Listeners
function initializeEventListeners() {
    // Action buttons
    elements.filterBtn.addEventListener('click', openFilterModal);
    elements.optionsBtn.addEventListener('click', openOptionsModal);

    // Filter modal
    elements.closeFilterModal.addEventListener('click', closeFilterModal);
    elements.clearFiltersBtn.addEventListener('click', clearFilters);
    elements.applyFiltersBtn.addEventListener('click', applyFilters);

    // Options modal
    elements.closeOptionsModal.addEventListener('click', closeOptionsModal);
    elements.exportExcelBtn.addEventListener('click', () => exportData('excel'));
    elements.exportPdfBtn.addEventListener('click', () => exportData('pdf'));
    elements.printReportBtn.addEventListener('click', printReport);
    elements.sendEmailBtn.addEventListener('click', sendEmail);
    elements.renewAllBtn.addEventListener('click', renewSelectedContracts);

    // Pagination
    elements.firstPageBtn.addEventListener('click', () => goToPage(1));
    elements.prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    elements.lastPageBtn.addEventListener('click', () => goToPage(totalPages));

    // Close modals on outside click
    elements.filterModal.addEventListener('click', function (e) {
        if (e.target === elements.filterModal) {
            closeFilterModal();
        }
    });

    elements.optionsModal.addEventListener('click', function (e) {
        if (e.target === elements.optionsModal) {
            closeOptionsModal();
        }
    });

    // ESC key to close modals
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeFilterModal();
            closeOptionsModal();
        }
    });
}

// Modal functions
function openFilterModal() {
    elements.filterModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeFilterModal() {
    elements.filterModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function openOptionsModal() {
    elements.optionsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeOptionsModal() {
    elements.optionsModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Filter functions
function clearFilters() {
    elements.contractId.value = '';
    elements.contractNumber.value = '';
    elements.planType.value = '';
    elements.holderName.value = '';
    elements.contractDateFrom.value = '';
    elements.contractDateTo.value = '';

    activeFilters = {};
    filteredContracts = [...sampleContracts];
    currentContracts = [...sampleContracts];
    currentPage = 1;

    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    updateFilterStatus();
    updateDashboardStats();

    showMessage('Filtros limpos com sucesso!', 'success');
}

function applyFilters() {
    const filters = {
        contractId: elements.contractId.value.trim(),
        contractNumber: elements.contractNumber.value.trim(),
        planType: elements.planType.value,
        holderName: elements.holderName.value.trim().toLowerCase(),
        contractDateFrom: elements.contractDateFrom.value,
        contractDateTo: elements.contractDateTo.value
    };

    // Remove empty filters
    activeFilters = {};
    Object.keys(filters).forEach(key => {
        if (filters[key]) {
            activeFilters[key] = filters[key];
        }
    });

    // Apply filters
    filteredContracts = sampleContracts.filter(contract => {
        // Filter by contract ID
        if (activeFilters.contractId && !contract.id.toString().includes(activeFilters.contractId)) {
            return false;
        }

        // Filter by contract number
        if (activeFilters.contractNumber && !contract.number.toString().includes(activeFilters.contractNumber)) {
            return false;
        }

        // Filter by plan type
        if (activeFilters.planType && contract.plan !== activeFilters.planType) {
            return false;
        }

        // Filter by holder name
        if (activeFilters.holderName && !contract.holder.toLowerCase().includes(activeFilters.holderName)) {
            return false;
        }

        // Filter by contract date range
        if (activeFilters.contractDateFrom && contract.contractDate < activeFilters.contractDateFrom) {
            return false;
        }

        if (activeFilters.contractDateTo && contract.contractDate > activeFilters.contractDateTo) {
            return false;
        }

        return true;
    });

    currentContracts = [...filteredContracts];
    currentPage = 1;
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);

    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    updateFilterStatus();
    updateDashboardStats();
    closeFilterModal();

    showMessage(`Filtros aplicados! ${currentContracts.length} contrato(s) encontrado(s).`, 'success');
}

function updateFilterStatus() {
    const filterCount = Object.keys(activeFilters).length;
    if (filterCount === 0) {
        elements.filterStatusText.textContent = 'Nenhum filtro aplicado';
    } else {
        elements.filterStatusText.textContent = `${filterCount} filtro(s) aplicado(s)`;
    }
}

// Alert and Dashboard functions
function checkExpirationAlerts() {
    const expiredContracts = currentContracts.filter(c => c.status === 'vencido');
    const expiringToday = currentContracts.filter(c => c.status === 'vence_hoje');
    const expiringSoon = currentContracts.filter(c => c.status === 'vence_em_breve');

    if (expiredContracts.length > 0) {
        showAlert(`⚠️ ATENÇÃO: ${expiredContracts.length} contrato(s) vencido(s)!`, 'error', true);
    }

    if (expiringToday.length > 0) {
        showAlert(`🔔 ${expiringToday.length} contrato(s) vence(m) hoje!`, 'warning', true);
    }

    if (expiringSoon.length > 0) {
        showAlert(`📅 ${expiringSoon.length} contrato(s) vence(m) em breve!`, 'info', false);
    }
}

function updateDashboardStats() {
    const stats = {
        total: currentContracts.length,
        expired: currentContracts.filter(c => c.status === 'vencido').length,
        expiringToday: currentContracts.filter(c => c.status === 'vence_hoje').length,
        expiringSoon: currentContracts.filter(c => c.status === 'vence_em_breve').length,
        renewed: currentContracts.filter(c => c.renewalStatus === 'renovado').length,
        inProgress: currentContracts.filter(c => c.renewalStatus === 'em_andamento').length,
        pending: currentContracts.filter(c => c.renewalStatus === 'pendente').length
    };

    // Update page title with urgent count
    const urgentCount = stats.expired + stats.expiringToday;
    if (urgentCount > 0) {
        document.title = `(${urgentCount}) Renovações Pendentes - QUALIFY`;
    }

    // Add stats display to the page
    updateStatsDisplay(stats);
}

function updateStatsDisplay(stats) {
    const existingStats = document.querySelector('.renewal-stats');
    if (existingStats) {
        existingStats.remove();
    }

    const statsHTML = `
        <div class="renewal-stats">
            <div class="stat-card urgent">
                <div class="stat-number">${stats.expired}</div>
                <div class="stat-label">Vencidos</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-number">${stats.expiringToday}</div>
                <div class="stat-label">Vencem Hoje</div>
            </div>
            <div class="stat-card info">
                <div class="stat-number">${stats.expiringSoon}</div>
                <div class="stat-label">Vencem em Breve</div>
            </div>
            <div class="stat-card success">
                <div class="stat-number">${stats.renewed}</div>
                <div class="stat-label">Renovados</div>
            </div>
            <div class="stat-card progress">
                <div class="stat-number">${stats.inProgress}</div>
                <div class="stat-label">Em Andamento</div>
            </div>
        </div>
    `;

    const pageHeader = document.querySelector('.page-header');
    pageHeader.insertAdjacentHTML('afterend', statsHTML);
}

// Table rendering
function renderContractsTable() {
    if (currentContracts.length === 0) {
        elements.contractsTableBody.innerHTML = '';
        elements.noDataMessage.classList.remove('hidden');
        return;
    }

    elements.noDataMessage.classList.add('hidden');

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageContracts = currentContracts.slice(startIndex, endIndex);

    const tableHTML = pageContracts.map(contract => {
        const statusClass = getStatusClass(contract.status);
        const renewalStatusBadge = getRenewalStatusBadge(contract.renewalStatus);
        const priorityBadge = getPriorityBadge(contract.priority);
        const daysText = getDaysUntilExpiryText(contract.daysUntilExpiry);

        return `
            <tr class="${statusClass}">
                <td class="action-cell">
                    <button class="action-btn btn-edit" onclick="editContract(${contract.id})" title="Editar" aria-label="Editar">
                        <i class="fas fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn btn-view" onclick="viewContract(${contract.id})" title="Visualizar" aria-label="Visualizar">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn btn-renew ${contract.renewalStatus === 'renovado' ? 'disabled' : ''}" 
                            onclick="renewContract(${contract.id})" 
                            title="${contract.renewalStatus === 'renovado' ? 'Já renovado' : 'Renovar'}" 
                            aria-label="${contract.renewalStatus === 'renovado' ? 'Já renovado' : 'Renovar'}" 
                            ${contract.renewalStatus === 'renovado' ? 'disabled' : ''}>
                        <i class="fas fa-rotate-right" aria-hidden="true"></i>
                    </button>
                </td>
                <td>${contract.id}</td>
                <td>${contract.number}</td>
                <td>
                    <span class="plan-badge">${contract.plan}</span>
                </td>
                <td>${contract.holder}</td>
                <td class="date-cell">${formatDate(contract.contractDate)}</td>
                <td class="date-cell">${formatDate(contract.firstDue)}</td>
                <td class="date-cell">
                    ${formatDate(contract.lastDue)}
                    <div class="days-until-expiry">${daysText}</div>
                </td>
                <td class="status-cell">
                    ${renewalStatusBadge}
                    ${priorityBadge}
                </td>
            </tr>
        `;
    }).join('');

    elements.contractsTableBody.innerHTML = tableHTML;
}

// Pagination functions
function updatePagination() {
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);

    // Update button states
    elements.firstPageBtn.disabled = currentPage === 1;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    elements.lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Update page numbers
    renderPageNumbers();
}

function renderPageNumbers() {
    const maxVisiblePages = 8;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let pageNumbersHTML = '';

    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    elements.pageNumbers.innerHTML = pageNumbersHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderContractsTable();
    updatePagination();
}

// Records count
function updateRecordsCount() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, currentContracts.length);

    if (currentContracts.length === 0) {
        elements.recordsCount.textContent = 'Nenhum registro encontrado';
    } else {
        elements.recordsCount.textContent = `Mostrando ${startIndex} a ${endIndex} de ${currentContracts.length} registros`;
    }
}

// Contract actions
function editContract(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (contract) {
        alert(`Editando contrato:\nID: ${contract.id}\nNúmero: ${contract.number}\nTitular: ${contract.holder}`);
        // Implementar lógica de edição
    }
}

function viewContract(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (contract) {
        const details = `
            Detalhes do Contrato:
            
            ID: ${contract.id}
            Número: ${contract.number}
            Plano: ${contract.plan}
            Titular: ${contract.holder}
            Data do Contrato: ${formatDate(contract.contractDate)}
            Primeiro Vencimento: ${formatDate(contract.firstDue)}
            Último Vencimento: ${formatDate(contract.lastDue)}
        `;
        alert(details);
    }
}

function renewContract(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (!contract) return;

    if (contract.renewalStatus === 'renovado') {
        showMessage('Este contrato já foi renovado!', 'info');
        return;
    }

    const confirmMessage = `Renovar contrato ${contract.number}?\n\nTitular: ${contract.holder}\nPlano: ${contract.plan}\nVencimento: ${formatDate(contract.lastDue)}\nStatus: ${getStatusText(contract.status)}`;

    if (confirm(confirmMessage)) {
        // Atualizar UI imediatamente
        contract.renewalStatus = 'em_andamento';
        renderContractsTable();
        updateDashboardStats();
        showMessage(`Renovando contrato ${contract.number}...`, 'info');

        // PERSISTÊNCIA REAL no Firestore
        (async () => {
            try {
                const companyId = window.getActiveCompanyId
                    ? window.getActiveCompanyId()
                    : (localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId'));

                if (companyId && contract.firestoreId && typeof firebase !== 'undefined' && firebase.firestore) {
                    const db = firebase.firestore();
                    const newEndDate = new Date();
                    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

                    await db.collection('empresas').doc(companyId)
                        .collection('contratos').doc(contract.firestoreId)
                        .update({
                            renovacaoStatus: 'renovado',
                            dataFimVigencia: newEndDate,
                            renovadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                            statusAnterior: contract.status
                        });

                    contract.renewalStatus = 'renovado';
                    contract.status = 'normal';
                    contract.daysUntilExpiry = 365;
                    renderContractsTable();
                    updateDashboardStats();
                    checkExpirationAlerts();
                    showMessage(`✅ Contrato ${contract.number} renovado e salvo no Firestore!`, 'success');
                } else {
                    throw new Error('Firebase ou empresa não disponíveis');
                }
            } catch (error) {
                console.error('❌ Erro ao renovar contrato:', error);
                contract.renewalStatus = 'pendente';
                renderContractsTable();
                updateDashboardStats();
                showMessage('Erro ao renovar contrato. Tente novamente.', 'error');
            }
        })();
    }
}

// Options functions — IMPLEMENTAÇÃO REAL (antes era stub)
function exportData(format) {
    if (!currentContracts || currentContracts.length === 0) {
        showMessage('Nenhum contrato para exportar.', 'info');
        closeOptionsModal();
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rows = currentContracts.map(c => ({
        'ID': c.id,
        'Número': c.number,
        'Plano': c.plan,
        'Titular': c.holder,
        'Data Contrato': formatDate(c.contractDate),
        '1º Vencimento': formatDate(c.firstDue),
        'Último Vencimento': formatDate(c.lastDue),
        'Dias p/ Vencer': c.daysUntilExpiry,
        'Status': getStatusText(c.status),
        'Renovação': c.renewalStatus
    }));

    closeOptionsModal();

    if (format === 'excel') {
        const doExport = () => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Renovações');
            ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
            XLSX.writeFile(wb, `renovacoes_pendentes_${timestamp}.xlsx`);
            showMessage(`${rows.length} contratos exportados para Excel!`, 'success');
        };
        if (typeof XLSX !== 'undefined') {
            doExport();
        } else {
            showMessage('Carregando biblioteca...', 'info');
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            s.onload = doExport;
            s.onerror = () => showMessage('Erro ao carregar SheetJS. Use PDF.', 'error');
            document.head.appendChild(s);
        }
    } else if (format === 'pdf') {
        if (typeof window.jspdf === 'undefined') {
            showMessage('jsPDF não encontrado. Tente Excel.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text('Relatório de Renovações Pendentes', 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
        const headers = Object.keys(rows[0]);
        const body = rows.map(r => Object.values(r));
        doc.autoTable({ head: [headers], body: body, startY: 28, styles: { fontSize: 7 } });
        doc.save(`renovacoes_pendentes_${timestamp}.pdf`);
        showMessage(`${rows.length} contratos exportados para PDF!`, 'success');
    } else {
        // CSV fallback
        const headers = Object.keys(rows[0]).join(';');
        const csv = [headers, ...rows.map(r => Object.values(r).join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `renovacoes_pendentes_${timestamp}.csv`;
        a.click();
        showMessage(`${rows.length} contratos exportados para CSV!`, 'success');
    }
}

function printReport() {
    showMessage('Preparando relatório para impressão...', 'success');
    closeOptionsModal();
    setTimeout(() => window.print(), 300);
}

function sendEmail() {
    showMessage('Funcionalidade de envio por email em desenvolvimento.', 'info');
    closeOptionsModal();
}

function renewSelectedContracts() {
    const pendingContracts = currentContracts.filter(c => c.renewalStatus === 'pendente');

    if (pendingContracts.length === 0) {
        showMessage('Não há contratos pendentes para renovar!', 'info');
        closeOptionsModal();
        return;
    }

    if (confirm(`Tem certeza que deseja renovar ${pendingContracts.length} contrato(s) pendente(s)?`)) {
        let processedCount = 0;

        showMessage(`Iniciando renovação em lote de ${pendingContracts.length} contratos...`, 'info');
        closeOptionsModal();

        // Processar contratos em lote com delay
        pendingContracts.forEach((contract, index) => {
            setTimeout(() => {
                contract.renewalStatus = 'em_andamento';
                renderContractsTable();
                updateDashboardStats();

                setTimeout(() => {
                    contract.renewalStatus = 'renovado';
                    contract.status = 'normal';
                    contract.daysUntilExpiry = 365;
                    processedCount++;

                    renderContractsTable();
                    updateDashboardStats();

                    if (processedCount === pendingContracts.length) {
                        checkExpirationAlerts();
                        showMessage(`✅ ${processedCount} contratos renovados com sucesso!`, 'success');
                    }
                }, 1000);
            }, index * 500);
        });
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
    const statusClasses = {
        'vencido': 'row-expired',
        'vence_hoje': 'row-expires-today',
        'vence_em_breve': 'row-expires-soon',
        'normal': 'row-normal'
    };
    return statusClasses[status] || 'row-normal';
}

function getRenewalStatusBadge(renewalStatus) {
    const badges = {
        'pendente': '<span class="status-badge pending">Pendente</span>',
        'em_andamento': '<span class="status-badge in-progress">Em Andamento</span>',
        'renovado': '<span class="status-badge renewed">Renovado</span>'
    };
    return badges[renewalStatus] || '';
}

function getPriorityBadge(priority) {
    const badges = {
        'alta': '<span class="priority-badge high">Alta</span>',
        'media': '<span class="priority-badge medium">Média</span>',
        'baixa': '<span class="priority-badge low">Baixa</span>'
    };
    return badges[priority] || '';
}

function getDaysUntilExpiryText(days) {
    if (days < 0) {
        return `<span class="days-expired">Vencido há ${Math.abs(days)} dia(s)</span>`;
    } else if (days === 0) {
        return '<span class="days-today">Vence hoje</span>';
    } else if (days <= 30) {
        return `<span class="days-soon">Vence em ${days} dia(s)</span>`;
    } else {
        return `<span class="days-normal">${days} dias restantes</span>`;
    }
}

function getStatusText(status) {
    const statusTexts = {
        'vencido': 'Vencido',
        'vence_hoje': 'Vence hoje',
        'vence_em_breve': 'Vence em breve',
        'normal': 'Normal'
    };
    return statusTexts[status] || 'Normal';
}

function showMessage(message, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;

    // Insert at the beginning of container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);

    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

function showAlert(message, type = 'info', persistent = false) {
    // Remove existing alert
    const existingAlert = document.querySelector('.alert-banner');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-banner ${type}-alert`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${message}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Insert at the top of the page
    document.body.insertBefore(alertDiv, document.body.firstChild);

    // Auto-remove if not persistent
    if (!persistent) {
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Global functions for HTML onclick events
window.editContract = editContract;
window.viewContract = viewContract;
window.renewContract = renewContract;
window.goToPage = goToPage;