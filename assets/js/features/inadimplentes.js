// Inadimplentes Page JavaScript

// Global variables
let selectedRows = new Set();
let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const selectAllCheckbox = document.getElementById('selectAll');
const tableBody = document.querySelector('#inadimplentesTable tbody');
const countSelecionados = document.getElementById('countSelecionados');

// Dashboard state management
const inadimplentesState = {
    filters: {
        search: '',
        status: '',
        diasAtraso: '',
        valorAtraso: '',
        numeroContrato: '',
        nomeTitular: '',
        celularTitular: '',
        statusContatoAdv: '',
        planoContrato: '',
        regiaoContrato: '',
        valorMinimo: '',
        valorMaximo: '',
        diasMinimoAtraso: '',
        diasMaximoAtraso: '',
        dataInicialContrato: '',
        dataFinalContrato: '',
        vencimentoInicial: '',
        vencimentoFinal: ''
    },
    sorting: {
        sortBy: 'dias',
        sortOrder: 'desc'
    },
    visibleColumns: {
        showContrato: true,
        showData: true,
        showTitular: true,
        showCelular: true,
        showDias: true,
        showValor: true,
        showObservacao: true
    },
    selectedItems: new Set()
};

// Initialize modals functionality
function initializeModals() {
    // Advanced Filters Modal
    const advancedFiltersBtn = document.getElementById('advancedFiltersBtn');
    const advancedFiltersModal = document.getElementById('advancedFiltersModal');
    const closeAdvancedFilters = document.getElementById('closeAdvancedFilters');
    const applyAdvancedFilters = document.getElementById('applyAdvancedFilters');
    const resetAdvancedFilters = document.getElementById('resetAdvancedFilters');

    // Bulk Actions Modal
    const bulkActionsBtn = document.getElementById('bulkActionsBtn');
    const bulkActionsModal = document.getElementById('bulkActionsModal');
    const closeBulkActions = document.getElementById('closeBulkActions');

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    // Advanced filters event listeners
    if (advancedFiltersBtn) {
        advancedFiltersBtn.addEventListener('click', () => openModal('advancedFiltersModal'));
    }

    if (applyAdvancedFilters) {
        applyAdvancedFilters.addEventListener('click', applyAdvancedFiltersAction);
    }

    if (resetAdvancedFilters) {
        resetAdvancedFilters.addEventListener('click', resetAdvancedFiltersAction);
    }

    // Bulk actions event listeners
    if (bulkActionsBtn) {
        bulkActionsBtn.addEventListener('click', () => openModal('bulkActionsModal'));
    }

    // Clear all filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportData('excel'));
    }

    // Import button
    const importarBtn = document.getElementById('importarBtn');
    if (importarBtn) {
        importarBtn.addEventListener('click', initializeImport);
    }

    // Bulk actions functionality
    setupBulkActions();
}

// Open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        if (modalId === 'bulkActionsModal') {
            updateSelectedItemsCount();
        }
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
}

// Switch tabs in modals
function switchTab(tabId) {
    // Remove active class from all tabs and tab panes
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    // Add active class to clicked tab and corresponding pane
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Apply advanced filters
function applyAdvancedFiltersAction() {
    // Collect filter values
    const filters = {
        diasAtraso: document.querySelector('input[name="diasAtraso"]:checked')?.value || '',
        valorAtraso: document.querySelector('input[name="valorAtraso"]:checked')?.value || '',
        numeroContrato: document.getElementById('numeroContrato')?.value || '',
        nomeTitular: document.getElementById('nomeTitular')?.value || '',
        celularTitular: document.getElementById('celularTitular')?.value || '',
        statusContatoAdv: document.getElementById('statusContatoAdv')?.value || '',
        planoContrato: document.getElementById('planoContrato')?.value || '',
        regiaoContrato: document.getElementById('regiaoContrato')?.value || '',
        valorMinimo: document.getElementById('valorMinimo')?.value || '',
        valorMaximo: document.getElementById('valorMaximo')?.value || '',
        diasMinimoAtraso: document.getElementById('diasMinimoAtraso')?.value || '',
        diasMaximoAtraso: document.getElementById('diasMaximoAtraso')?.value || '',
        dataInicialContrato: document.getElementById('dataInicialContrato')?.value || '',
        dataFinalContrato: document.getElementById('dataFinalContrato')?.value || '',
        vencimentoInicial: document.getElementById('vencimentoInicial')?.value || '',
        vencimentoFinal: document.getElementById('vencimentoFinal')?.value || ''
    };

    // Collect sorting options
    const sorting = {
        sortBy: document.getElementById('sortBy')?.value || 'dias',
        sortOrder: document.querySelector('input[name="sortOrder"]:checked')?.value || 'desc'
    };

    // Collect visible columns
    const visibleColumns = {
        showContrato: document.getElementById('showContrato')?.checked || false,
        showData: document.getElementById('showData')?.checked || false,
        showTitular: document.getElementById('showTitular')?.checked || false,
        showCelular: document.getElementById('showCelular')?.checked || false,
        showDias: document.getElementById('showDias')?.checked || false,
        showValor: document.getElementById('showValor')?.checked || false,
        showObservacao: document.getElementById('showObservacao')?.checked || false
    };

    // Update state
    Object.assign(inadimplentesState.filters, filters);
    Object.assign(inadimplentesState.sorting, sorting);
    Object.assign(inadimplentesState.visibleColumns, visibleColumns);

    // Apply filters and close modal
    applyFiltersToData();
    closeModal('advancedFiltersModal');

    showNotification('Filtros aplicados com sucesso!', 'success');
}

// Reset advanced filters
function resetAdvancedFiltersAction() {
    // Reset all form inputs
    document.querySelectorAll('#advancedFiltersModal input[type="radio"]').forEach(input => input.checked = false);
    document.querySelectorAll('#advancedFiltersModal input[type="text"], #advancedFiltersModal input[type="number"], #advancedFiltersModal input[type="date"]').forEach(input => input.value = '');
    document.querySelectorAll('#advancedFiltersModal select').forEach(select => select.selectedIndex = 0);
    document.querySelectorAll('#advancedFiltersModal input[type="checkbox"]').forEach(checkbox => checkbox.checked = true);

    // Reset sorting to default
    document.getElementById('sortBy').value = 'dias';
    document.getElementById('sortAsc').checked = false;
    document.getElementById('sortDesc').checked = true;

    showNotification('Filtros resetados!', 'info');
}

// Clear all filters
function clearAllFilters() {
    // Reset state
    inadimplentesState.filters = {
        search: '',
        status: '',
        diasAtraso: '',
        valorAtraso: '',
        numeroContrato: '',
        nomeTitular: '',
        celularTitular: '',
        statusContatoAdv: '',
        planoContrato: '',
        regiaoContrato: '',
        valorMinimo: '',
        valorMaximo: '',
        diasMinimoAtraso: '',
        diasMaximoAtraso: '',
        dataInicialContrato: '',
        dataFinalContrato: '',
        vencimentoInicial: '',
        vencimentoFinal: ''
    };

    // Clear UI elements
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').selectedIndex = 0;

    // Reload data
    loadData();
    updateFilterInfo();

    showNotification('Todos os filtros foram limpos!', 'success');
}

// Refresh data
function refreshData() {
    showNotification('Atualizando dados...', 'info');
    loadData();
    updateSummaryCards();
    updateFilterInfo();

    setTimeout(() => {
        showNotification('Dados atualizados com sucesso!', 'success');
    }, 1000);
}

// Setup bulk actions
function setupBulkActions() {
    // Export actions
    document.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', function () {
            const format = this.dataset.export;
            exportData(format);
            closeModal('bulkActionsModal');
        });
    });

    // Bulk send message
    const bulkSendMessage = document.getElementById('bulkSendMessage');
    if (bulkSendMessage) {
        bulkSendMessage.addEventListener('click', function () {
            closeModal('bulkActionsModal');
            openModal('messageModal');
        });
    }

    // Bulk status update
    const applyBulkStatus = document.getElementById('applyBulkStatus');
    if (applyBulkStatus) {
        applyBulkStatus.addEventListener('click', function () {
            const status = document.getElementById('bulkStatusUpdate').value;
            if (status) {
                updateBulkStatus(status);
                closeModal('bulkActionsModal');
            }
        });
    }

    // Bulk remove
    const bulkRemove = document.getElementById('bulkRemove');
    if (bulkRemove) {
        bulkRemove.addEventListener('click', function () {
            if (confirm('Tem certeza que deseja remover os contratos selecionados da lista?')) {
                removeBulkItems();
                closeModal('bulkActionsModal');
            }
        });
    }
}

// Update selected items count
function updateSelectedItemsCount() {
    const count = inadimplentesState.selectedItems.size;
    const countElement = document.getElementById('selectedItemsCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Update bulk status
function updateBulkStatus(status) {
    const count = inadimplentesState.selectedItems.size;
    showNotification(`Status atualizado para ${count} contratos!`, 'success');
    inadimplentesState.selectedItems.clear();
    updateSelectedItemsCount();
}

// Remove bulk items
function removeBulkItems() {
    const count = inadimplentesState.selectedItems.size;
    showNotification(`${count} contratos removidos da lista!`, 'success');
    inadimplentesState.selectedItems.clear();
    updateSelectedItemsCount();
}

// Apply filters to data
function applyFiltersToData() {
    // This would normally filter the data based on the current state
    // For now, we'll just reload the data
    loadData();
    updateFilterInfo();
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Update filter info
function updateFilterInfo() {
    // This function would update the filter information display
    // For now, it's just a placeholder
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeModals();
    // Aguarda sistema multitenant e empresa ativa antes de carregar
    (async () => {
        showLoadingState();
        await waitForActiveCompanyReady();
        await loadData();
        updateSummaryCards();
        setupModals();
    })();
});

// Event Listeners
function initializeEventListeners() {
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Select all checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAll);
    }

    // Filter button
    const filtrosBtn = document.getElementById('filtrosBtn');
    if (filtrosBtn) {
        filtrosBtn.addEventListener('click', () => {
            const filterModal = new bootstrap.Modal(document.getElementById('filterModal'));
            filterModal.show();
        });
    }

    // Message button
    const enviarMensagemBtn = document.getElementById('enviarMensagemBtn');
    if (enviarMensagemBtn) {
        enviarMensagemBtn.addEventListener('click', () => {
            updateSelectedCount();
            const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
            messageModal.show();
        });
    }

    // Apply filters button
    const aplicarFiltros = document.getElementById('aplicarFiltros');
    if (aplicarFiltros) {
        aplicarFiltros.addEventListener('click', applyFilters);
    }

    // Send message button
    const enviarMensagem = document.getElementById('enviarMensagem');
    if (enviarMensagem) {
        enviarMensagem.addEventListener('click', sendMessage);
    }

    // Schedule checkbox
    const agendarEnvio = document.getElementById('agendarEnvio');
    if (agendarEnvio) {
        agendarEnvio.addEventListener('change', toggleScheduleContainer);
    }

    // Message template selector
    const modeloMensagem = document.getElementById('modeloMensagem');
    if (modeloMensagem) {
        modeloMensagem.addEventListener('change', loadMessageTemplate);
    }

    // Export dropdown items
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
        if (link.textContent.includes('Excel') || link.textContent.includes('PDF') || link.textContent.includes('CSV')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const format = link.textContent.trim().toLowerCase();
                exportData(format);
            });
        }
    });
}

// Load initial data
async function loadData() {
    // Garante que multitenant e empresa ativa estão prontos
    const mtReady = !!(window.multitenantConfig && typeof window.multitenantConfig.getActiveCompany === 'function');
    const activeCompany = mtReady ? window.multitenantConfig.getActiveCompany() : null;

    if (!mtReady || !activeCompany) {
        // Tenta aguardar brevemente
        const waited = await waitForActiveCompanyReady(3000);
        if (!waited) {
            showEmptyState('Selecione uma empresa para visualizar os dados');
            return;
        }
    }

    const waitForAuthReady = async (timeoutMs = 3000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const udmReady = !!(window.userDataManager && typeof window.userDataManager.isAuthenticated === 'function');
            const udmAuth = udmReady && window.userDataManager.isAuthenticated();
            const fbAuth = !!(window.firebase && window.firebase.auth && window.firebase.auth().currentUser);
            if (udmAuth || fbAuth) return true;
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    };

    const udmReady = !!(window.userDataManager && typeof window.userDataManager.isAuthenticated === 'function');
    const udmAuth = udmReady && window.userDataManager.isAuthenticated();
    const fbAuth = !!(window.firebase && window.firebase.auth && window.firebase.auth().currentUser);

    if (!udmAuth && !fbAuth) {
        const ready = await waitForAuthReady(3000);
        if (!ready) {
            console.log('Usuário não autenticado, não é possível carregar dados');
            showEmptyState('Faça login para visualizar os dados');
            return;
        }
    }

    try {
        // Mostra loading
        showLoadingState();

        // Busca dados do usuário logado
        const userData = await window.userDataManager.getUserData('inadimplentes', {
            orderBy: { field: 'dataVencimento', direction: 'desc' }
        });

        allData = userData || [];
        filteredData = [...allData];

        if (allData.length === 0) {
            showEmptyState('Nenhum contrato inadimplente encontrado');
        } else {
            hideLoadingState();
            renderTable();
            updatePagination();
            updateSummaryCards();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de inadimplentes:', error);
        showEmptyState('Erro ao carregar dados. Tente novamente.');
    }
}

// Aguarda empresa ativa do sistema multitenant
async function waitForActiveCompanyReady(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const mtReady = !!(window.multitenantConfig && typeof window.multitenantConfig.getActiveCompany === 'function');
        const activeCompany = mtReady ? window.multitenantConfig.getActiveCompany() : null;
        if (mtReady && activeCompany) return true;
        await new Promise(r => setTimeout(r, 100));
    }
    return false;
}

// Recarrega dados ao trocar empresa
window.addEventListener('activeCompanyChanged', () => {
    loadData();
});
window.addEventListener('companyChanged', () => {
    loadData();
});

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#inadimplentesTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#inadimplentesTable tbody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">${message}</td></tr>`;
    }

    // Limpa paginação
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.innerHTML = '';
    }

    // Zera cards de resumo
    updateSummaryCards(true);
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(item =>
            item.contrato.toLowerCase().includes(searchTerm) ||
            item.titular.toLowerCase().includes(searchTerm) ||
            item.celular.includes(searchTerm) ||
            item.observacao.toLowerCase().includes(searchTerm)
        );
    }

    currentPage = 1;
    renderTable();
    updatePagination();
    updateSummaryCards();
}

// Select all functionality
function handleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    const checkboxes = document.querySelectorAll('.row-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const row = checkbox.closest('tr');
        const contractId = parseInt(row.cells[1].textContent);

        if (isChecked) {
            selectedRows.add(contractId);
            row.classList.add('table-active');
        } else {
            selectedRows.delete(contractId);
            row.classList.remove('table-active');
        }
    });

    updateSelectedCount();
}

// Handle individual row selection
function handleRowSelection(checkbox) {
    const row = checkbox.closest('tr');
    const contractId = parseInt(row.cells[1].textContent);

    if (checkbox.checked) {
        selectedRows.add(contractId);
        row.classList.add('table-active');
    } else {
        selectedRows.delete(contractId);
        row.classList.remove('table-active');
    }

    // Update select all checkbox
    const totalCheckboxes = document.querySelectorAll('.row-checkbox').length;
    const checkedCheckboxes = document.querySelectorAll('.row-checkbox:checked').length;

    selectAllCheckbox.checked = totalCheckboxes === checkedCheckboxes;
    selectAllCheckbox.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;

    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    if (countSelecionados) {
        countSelecionados.textContent = selectedRows.size;
    }
}

// Render table
function renderTable() {
    if (!tableBody) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    tableBody.innerHTML = '';

    pageData.forEach(item => {
        const row = document.createElement('tr');
        const isSelected = selectedRows.has(item.id);

        if (isSelected) {
            row.classList.add('table-active');
        }

        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input row-checkbox" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${item.contrato}</td>
            <td>${item.data}</td>
            <td>${item.titular}</td>
            <td>${item.celular}</td>
            <td>${item.dias}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
            <td>${item.observacao}</td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-primary dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="fas fa-cog"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="viewContract(${item.id})"><i class="fas fa-eye"></i> Visualizar</a></li>
                        <li><a class="dropdown-item" href="#" onclick="editContract(${item.id})"><i class="fas fa-edit"></i> Editar</a></li>
                        <li><a class="dropdown-item" href="#" onclick="sendMessageToContract(${item.id})"><i class="fas fa-envelope"></i> Enviar mensagem</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteContract(${item.id})"><i class="fas fa-trash"></i> Excluir</a></li>
                    </ul>
                </div>
            </td>
        `;

        // Add event listener to checkbox
        const checkbox = row.querySelector('.row-checkbox');
        checkbox.addEventListener('change', () => handleRowSelection(checkbox));

        tableBody.appendChild(row);
    });
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const pagination = document.querySelector('.pagination');

    if (!pagination) return;

    pagination.innerHTML = '';

    // Previous buttons
    pagination.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(1)">
                <i class="fas fa-angle-double-left"></i>
            </a>
        </li>
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
                <i class="fas fa-angle-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    const startPage = Math.max(1, currentPage - 4);
    const endPage = Math.min(totalPages, startPage + 9);

    for (let i = startPage; i <= endPage; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        pagination.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#">
                    <i class="fas fa-ellipsis-h"></i>
                </a>
            </li>
        `;
    }

    // Next buttons
    pagination.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
                <i class="fas fa-angle-right"></i>
            </a>
        </li>
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${totalPages})">
                <i class="fas fa-angle-double-right"></i>
            </a>
        </li>
    `;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderTable();
    updatePagination();

    // Scroll to top of table
    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
}

// Update summary cards
function updateSummaryCards(reset = false) {
    if (reset) {
        // Zera todos os valores
        const summaryValues = document.querySelectorAll('.summary-value');
        if (summaryValues.length >= 3) {
            summaryValues[0].textContent = 'R$ 0,00';
            summaryValues[1].textContent = '0';
            summaryValues[2].textContent = '0';
        }
        return;
    }

    const totalValue = filteredData.reduce((sum, item) => sum + item.valor, 0);
    const totalContracts = filteredData.length;
    const totalParcels = filteredData.reduce((sum, item) => sum + item.quantidade, 0);

    // Update summary values
    const summaryValues = document.querySelectorAll('.summary-value');
    if (summaryValues.length >= 3) {
        summaryValues[0].textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
        summaryValues[1].textContent = totalContracts;
        summaryValues[2].textContent = totalParcels;
    }
}

// Apply filters
function applyFilters() {
    const dataInicial = document.getElementById('dataInicial').value;
    const dataFinal = document.getElementById('dataFinal').value;
    const diasMinimo = parseInt(document.getElementById('diasMinimo').value) || 0;
    const diasMaximo = parseInt(document.getElementById('diasMaximo').value) || Infinity;
    const valorMinimo = parseFloat(document.getElementById('valorMinimo').value) || 0;
    const valorMaximo = parseFloat(document.getElementById('valorMaximo').value) || Infinity;
    const statusContato = document.getElementById('statusContato').value;

    filteredData = allData.filter(item => {
        // Date filter
        if (dataInicial && item.data) {
            const itemDate = parseDate(item.data);
            const startDate = new Date(dataInicial);
            if (itemDate < startDate) return false;
        }

        if (dataFinal && item.data) {
            const itemDate = parseDate(item.data);
            const endDate = new Date(dataFinal);
            if (itemDate > endDate) return false;
        }

        // Days filter
        if (item.dias < diasMinimo || item.dias > diasMaximo) return false;

        // Value filter
        if (item.valor < valorMinimo || item.valor > valorMaximo) return false;

        // Status filter (simplified)
        if (statusContato && statusContato !== '') {
            // This would need to be implemented based on actual status logic
            return true;
        }

        return true;
    });

    currentPage = 1;
    renderTable();
    updatePagination();
    updateSummaryCards();

    // Close modal
    const filterModal = bootstrap.Modal.getInstance(document.getElementById('filterModal'));
    filterModal.hide();

    showAlert('Filtros aplicados com sucesso!', 'success');
}

// Parse date from DD/MM/YYYY format
function parseDate(dateString) {
    const parts = dateString.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Setup modals
function setupModals() {
    // Reset forms when modals are hidden
    document.getElementById('filterModal').addEventListener('hidden.bs.modal', function () {
        this.querySelector('form')?.reset();
    });

    document.getElementById('messageModal').addEventListener('hidden.bs.modal', function () {
        this.querySelector('form')?.reset();
        document.getElementById('agendamentoContainer').style.display = 'none';
    });
}

// Toggle schedule container
function toggleScheduleContainer() {
    const container = document.getElementById('agendamentoContainer');
    const checkbox = document.getElementById('agendarEnvio');

    container.style.display = checkbox.checked ? 'block' : 'none';
}

// Load message template
function loadMessageTemplate() {
    const select = document.getElementById('modeloMensagem');
    const textarea = document.getElementById('mensagemTexto');

    const templates = {
        'cobranca1': 'Olá {nome}, temos uma mensalidade em atraso no valor de R$ {valor}. Por favor, regularize sua situação. Obrigado!',
        'cobranca2': 'Prezado(a) {nome}, sua mensalidade no valor de R$ {valor} está em atraso há {dias} dias. Entre em contato conosco.',
        'cobranca3': 'URGENTE: {nome}, sua mensalidade de R$ {valor} está em atraso. Regularize imediatamente para evitar suspensão.',
        'negociacao': 'Olá {nome}, vamos negociar sua pendência de R$ {valor}? Temos condições especiais. Entre em contato!'
    };

    if (templates[select.value]) {
        textarea.value = templates[select.value];
    }
}

// Send message
function sendMessage() {
    const destinatarios = document.querySelector('input[name="destinatarios"]:checked').value;
    const tipoMensagem = document.getElementById('tipoMensagem').value;
    const mensagem = document.getElementById('mensagemTexto').value;
    const agendarEnvio = document.getElementById('agendarEnvio').checked;

    if (!mensagem.trim()) {
        showAlert('Por favor, digite uma mensagem.', 'warning');
        return;
    }

    let recipientCount = 0;
    if (destinatarios === 'selecionados') {
        recipientCount = selectedRows.size;
        if (recipientCount === 0) {
            showAlert('Selecione pelo menos um contrato.', 'warning');
            return;
        }
    } else {
        recipientCount = filteredData.length;
    }

    // Simulate sending message
    setTimeout(() => {
        const messageModal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
        messageModal.hide();

        const action = agendarEnvio ? 'agendadas' : 'enviadas';
        showAlert(`${recipientCount} mensagens ${action} com sucesso!`, 'success');
    }, 1000);
}

// Export data — IMPLEMENTAÇÃO REAL (antes era stub)
function exportData(format) {
    const selectedData = (selectedRows && selectedRows.size > 0)
        ? [...selectedRows].map(id => allData.find(item => item.id === id)).filter(Boolean)
        : filteredData;

    if (!selectedData || selectedData.length === 0) {
        showAlert('Nenhum dado para exportar.', 'warning');
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rows = selectedData.map(item => ({
        'Contrato': item.contrato || '',
        'Data': item.data || '',
        'Titular': item.titular || '',
        'Celular': item.celular || '',
        'Dias Atraso': item.dias || 0,
        'Parcelas': item.quantidade || 0,
        'Valor (R$)': item.valor ? item.valor.toFixed(2) : '0.00',
        'Observação': item.observacao || ''
    }));

    if (format.includes('csv')) {
        // CSV nativo - sem dependência externa
        const headers = Object.keys(rows[0]).join(';');
        const csvContent = [headers, ...rows.map(r => Object.values(r).join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inadimplentes_${timestamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showAlert(`${selectedData.length} registros exportados para CSV!`, 'success');

    } else if (format.includes('excel')) {
        // SheetJS - carrega dinamicamente se necessário
        const doExport = () => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inadimplentes');
            // Auto-width das colunas
            const colWidths = Object.keys(rows[0]).map(key => ({ wch: Math.max(key.length, 15) }));
            ws['!cols'] = colWidths;
            XLSX.writeFile(wb, `inadimplentes_${timestamp}.xlsx`);
            showAlert(`${selectedData.length} registros exportados para Excel!`, 'success');
        };

        if (typeof XLSX !== 'undefined') {
            doExport();
        } else {
            showAlert('Carregando biblioteca de exportação...', 'info');
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            script.onload = doExport;
            script.onerror = () => showAlert('Erro ao carregar biblioteca de exportação. Tente CSV.', 'error');
            document.head.appendChild(script);
        }

    } else if (format.includes('pdf')) {
        // jsPDF - já deve estar carregado no projeto
        if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
            showAlert('Biblioteca jsPDF não encontrada. Tente exportar em Excel ou CSV.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text('Relatório de Inadimplentes', 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

        const headers = Object.keys(rows[0]);
        const body = rows.map(r => Object.values(r));
        doc.autoTable({ head: [headers], body: body, startY: 28, styles: { fontSize: 8 } });
        doc.save(`inadimplentes_${timestamp}.pdf`);
        showAlert(`${selectedData.length} registros exportados para PDF!`, 'success');

    } else {
        showAlert('Formato não suportado. Use Excel, PDF ou CSV.', 'warning');
    }
}

// Contract actions
function viewContract(id) {
    showAlert(`Visualizando contrato ${id}`, 'info');
}

function editContract(id) {
    showAlert(`Editando contrato ${id}`, 'info');
}

function sendMessageToContract(id) {
    selectedRows.clear();
    selectedRows.add(id);
    updateSelectedCount();

    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    messageModal.show();
}

function deleteContract(id) {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
        // Simulate deletion
        allData = allData.filter(item => item.id !== id);
        filteredData = filteredData.filter(item => item.id !== id);
        selectedRows.delete(id);

        renderTable();
        updatePagination();
        updateSummaryCards();
        updateSelectedCount();

        showAlert('Contrato excluído com sucesso!', 'success');
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

function showAlert(message, type = 'info') {
    // Use the new notification system
    showNotification(message, type);
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Add loading state
function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.style.position = 'relative';
    } else {
        element.classList.remove('loading');
    }
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Initialize import functionality
function initializeImport() {
    if (typeof ExcelImportManager === 'undefined') {
        showAlert('Módulo de importação não carregado. Recarregue a página e tente novamente.', 'error');
        return;
    }

    const importManager = new ExcelImportManager();

    // Configurar mapeamentos de campos específicos para inadimplentes
    importManager.setFieldMappings({
        'nome': { required: true, type: 'text', description: 'Nome do cliente' },
        'cpf': { required: true, type: 'text', description: 'CPF do cliente' },
        'contrato': { required: true, type: 'text', description: 'Número do contrato' },
        'valor_devido': { required: true, type: 'currency', description: 'Valor em atraso' },
        'dias_atraso': { required: true, type: 'number', description: 'Dias em atraso' },
        'data_vencimento': { required: false, type: 'date', description: 'Data de vencimento' },
        'telefone': { required: false, type: 'text', description: 'Telefone de contato' },
        'email': { required: false, type: 'email', description: 'E-mail de contato' }
    });

    // Configurar callbacks de importação
    importManager.setImportCallbacks({
        onSuccess: (count) => {
            showAlert(`${count} registros de inadimplentes importados com sucesso!`, 'success');
            refreshData(); // Atualizar a lista
        },
        onError: (error) => {
            showAlert('Erro durante a importação: ' + error.message, 'error');
        }
    });

    // Mostrar interface de importação
    document.getElementById('importContainer').style.display = 'block';
    importManager.createImportInterface('importContainer');
}

pageData.forEach(item => {
    const row = document.createElement('tr');
    const isSelected = selectedRows.has(item.id);

    if (isSelected) {
        row.classList.add('table-active');
    }

    row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input row-checkbox" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${item.contrato}</td>
            <td>${item.data}</td>
            <td>${item.titular}</td>
            <td>${item.celular}</td>
            <td>${item.dias}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
            <td>${item.observacao}</td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#"><i class="fas fa-edit"></i> Editar</a></li>
                        <li><a class="dropdown-item" href="#"><i class="fas fa-comment"></i> Mensagem</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#"><i class="fas fa-trash"></i> Excluir</a></li>
                    </ul>
                </div>
            </td>
        `;

    const checkbox = row.querySelector('.row-checkbox');
    checkbox.addEventListener('change', () => handleRowSelection(checkbox));

    tableBody.appendChild(row);
});
// Render table row with dropdown actions
function renderTableRow(item, isSelected) {
    return `
        <td>
            <input type="checkbox" class="form-check-input row-checkbox" ${isSelected ? 'checked' : ''}>
        </td>
        <td>${item.contrato}</td>
        <td>${item.data}</td>
        <td>${item.titular}</td>
        <td>${item.celular}</td>
        <td>${item.dias}</td>
        <td>${item.quantidade}</td>
        <td>R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
        <td>${item.observacao}</td>
        <td>
            <div class="dropdown">
                <button class="btn btn-sm btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" onclick="viewDetails(${item.id})">
                        <i class="fas fa-eye"></i> Ver Detalhes
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="editContract(${item.id})">
                        <i class="fas fa-edit"></i> Editar
                    </a></li>
                    <li><a class="dropdown-item" href="#" onclick="sendMessage(${item.id})">
                        <i class="fas fa-comment"></i> Enviar Mensagem
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="removeContract(${item.id})">
                        <i class="fas fa-trash"></i> Remover
                    </a></li>
                </ul>
            </div>
        </td>
    `;
}

// Call initialize tooltips when DOM is ready
document.addEventListener('DOMContentLoaded', initializeTooltips);