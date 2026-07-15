// Renegociação de Cobranças JavaScript

// Dados de contratos carregados dinamicamente do Firestore
const sampleContracts = [];

// Estado da aplicação
let currentContracts = [...sampleContracts];
let baseContracts = [...sampleContracts];
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = Math.ceil(currentContracts.length / itemsPerPage);
let activeFilter = 'all';
let selectedContract = null;

// Elementos DOM
const elements = {
    filterBtn: document.getElementById('filterBtn'),
    filterDropdown: document.getElementById('filterDropdown'),
    filterStatusText: document.getElementById('filterStatusText'),
    renegotiationTableBody: document.getElementById('renegotiationTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    recordsCount: document.getElementById('recordsCount'),
    searchInput: document.getElementById('renegociacaoSearch'),
    
    // Pagination
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    pageNumbers: document.getElementById('pageNumbers'),
    
    // Renegotiation Modal
    renegotiationModal: document.getElementById('renegotiationModal'),
    closeRenegotiationModal: document.getElementById('closeRenegotiationModal'),
    contractInfo: document.getElementById('contractInfo'),
    discountPercentage: document.getElementById('discountPercentage'),
    installments: document.getElementById('installments'),
    firstDueDate: document.getElementById('firstDueDate'),
    observations: document.getElementById('observations'),
    originalValue: document.getElementById('originalValue'),
    discountValue: document.getElementById('discountValue'),
    finalValue: document.getElementById('finalValue'),
    cancelRenegotiationBtn: document.getElementById('cancelRenegotiationBtn'),
    confirmRenegotiationBtn: document.getElementById('confirmRenegotiationBtn')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    setDefaultDueDate();
});

// Event Listeners
function initializeEventListeners() {
    // Filter dropdown
    elements.filterBtn.addEventListener('click', toggleFilterDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!elements.filterBtn.contains(e.target) && !elements.filterDropdown.contains(e.target)) {
            elements.filterDropdown.classList.add('hidden');
            document.querySelector('.filter-dropdown').classList.remove('active');
        }
    });
    
    // Renegotiation modal
    elements.closeRenegotiationModal.addEventListener('click', closeRenegotiationModal);
    elements.cancelRenegotiationBtn.addEventListener('click', closeRenegotiationModal);
    elements.confirmRenegotiationBtn.addEventListener('click', confirmRenegotiation);
    
    // Form calculations
    elements.discountPercentage.addEventListener('input', calculateValues);
    elements.installments.addEventListener('change', calculateValues);
    
    // Pagination
    elements.firstPageBtn.addEventListener('click', () => goToPage(1));
    elements.prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    elements.lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    
    // Close modal on outside click
    elements.renegotiationModal.addEventListener('click', function(e) {
        if (e.target === elements.renegotiationModal) {
            closeRenegotiationModal();
        }
    });
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeRenegotiationModal();
        }
    });

    // Search input
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
}

// Filter functions
function toggleFilterDropdown() {
    const dropdown = elements.filterDropdown;
    const filterDropdownContainer = document.querySelector('.filter-dropdown');
    
    dropdown.classList.toggle('hidden');
    filterDropdownContainer.classList.toggle('active');
}

function applyFilter(filterType) {
    activeFilter = filterType;
    
    // Filter contracts based on type
    switch (filterType) {
        case 'all':
            baseContracts = [...sampleContracts];
            elements.filterStatusText.textContent = 'Nenhum filtro aplicado';
            break;
        case 'high_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays > 300);
            elements.filterStatusText.textContent = 'Filtro aplicado: Alta inadimplência (>300 dias)';
            break;
        case 'medium_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays >= 100 && contract.overdueDays <= 300);
            elements.filterStatusText.textContent = 'Filtro aplicado: Média inadimplência (100-300 dias)';
            break;
        case 'low_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays < 100);
            elements.filterStatusText.textContent = 'Filtro aplicado: Baixa inadimplência (<100 dias)';
            break;
        case 'high_value':
            baseContracts = sampleContracts.filter(contract => contract.totalOpen > 500);
            elements.filterStatusText.textContent = 'Filtro aplicado: Alto valor em aberto (>R$ 500)';
            break;
        default:
            baseContracts = [...sampleContracts];
            elements.filterStatusText.textContent = 'Nenhum filtro aplicado';
    }
    
    // Reset currentContracts to base after filter change (before search)
    currentContracts = [...baseContracts];
    
    currentPage = 1;
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);
    
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    
    // Close dropdown
    elements.filterDropdown.classList.add('hidden');
    document.querySelector('.filter-dropdown').classList.remove('active');
    
    showMessage(`Filtro aplicado! ${currentContracts.length} contrato(s) encontrado(s).`, 'success');
}

// Search filtering
function handleSearch(e) {
    const query = (e && e.target ? e.target.value : '').toLowerCase();
    const base = [...baseContracts];
    
    if (!query) {
        currentContracts = base;
    } else {
        currentContracts = base.filter(contract => {
            const number = String(contract.number || '').toLowerCase();
            const holder = String(contract.holder || '').toLowerCase();
            const plan = String(contract.plan || '').toLowerCase();
            const vendor = String(contract.vendor || '').toLowerCase();
            return (
                number.includes(query) ||
                holder.includes(query) ||
                plan.includes(query) ||
                vendor.includes(query)
            );
        });
    }
    
    currentPage = 1;
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
}

// Table rendering
function renderContractsTable() {
    if (currentContracts.length === 0) {
        elements.renegotiationTableBody.innerHTML = '';
        elements.noDataMessage.classList.remove('hidden');
        return;
    }
    
    elements.noDataMessage.classList.add('hidden');
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageContracts = currentContracts.slice(startIndex, endIndex);
    
    const tableHTML = pageContracts.map(contract => `
        <tr>
            <td class="action-cell">
                <button class="action-btn btn-renegotiate" onclick="openRenegotiationModal(${contract.id})" aria-label="Renegociar">
                    <i class="fas fa-money-bill" aria-hidden="true"></i>
                </button>
                <button class="action-btn btn-view" onclick="viewContract(${contract.id})" aria-label="Visualizar">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
            </td>
            <td class="contract-number">${contract.number}</td>
            <td class="date-cell">${formatDate(contract.contractDate)}</td>
            <td class="holder-name">${contract.holder}</td>
            <td>
                <span class="plan-badge">${contract.plan}</span>
            </td>
            <td class="vendor-name">${contract.vendor}</td>
            <td class="quantity-cell">${contract.quantityOpen}</td>
            <td class="currency-value">R$ ${formatCurrency(contract.totalOpen)}</td>
            <td>
                <span class="overdue-days ${getOverdueClass(contract.overdueDays)}">
                    Há ${contract.overdueDays} dias
                </span>
            </td>
        </tr>
    `).join('');
    
    elements.renegotiationTableBody.innerHTML = tableHTML;
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
    const maxVisiblePages = 10;
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
    elements.recordsCount.textContent = currentContracts.length;
}

// Renegotiation Modal functions
function openRenegotiationModal(contractId) {
    selectedContract = currentContracts.find(c => c.id === contractId);
    if (!selectedContract) return;
    
    // Populate contract info
    elements.contractInfo.innerHTML = `
        <div class="contract-info-item">
            <span class="contract-info-label">Número do Contrato:</span>
            <span class="contract-info-value">${selectedContract.number}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Titular:</span>
            <span class="contract-info-value">${selectedContract.holder}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Plano:</span>
            <span class="contract-info-value">${selectedContract.plan}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Valor em Aberto:</span>
            <span class="contract-info-value">R$ ${formatCurrency(selectedContract.totalOpen)}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Dias em Atraso:</span>
            <span class="contract-info-value">${selectedContract.overdueDays} dias</span>
        </div>
    `;
    
    // Reset form
    elements.discountPercentage.value = '';
    elements.installments.value = '1';
    elements.observations.value = '';
    
    // Calculate initial values
    calculateValues();
    
    // Show modal
    elements.renegotiationModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeRenegotiationModal() {
    elements.renegotiationModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    selectedContract = null;
}

function calculateValues() {
    if (!selectedContract) return;
    
    const originalValue = selectedContract.totalOpen;
    const discountPercent = parseFloat(elements.discountPercentage.value) || 0;
    const discountAmount = (originalValue * discountPercent) / 100;
    const finalValue = originalValue - discountAmount;
    
    elements.originalValue.textContent = `R$ ${formatCurrency(originalValue)}`;
    elements.discountValue.textContent = `R$ ${formatCurrency(discountAmount)}`;
    elements.finalValue.textContent = `R$ ${formatCurrency(finalValue)}`;
}

function confirmRenegotiation() {
    if (!selectedContract) return;
    
    const discountPercent = parseFloat(elements.discountPercentage.value) || 0;
    const installments = parseInt(elements.installments.value);
    const firstDueDate = elements.firstDueDate.value;
    const observations = elements.observations.value.trim();
    
    if (!firstDueDate) {
        showMessage('Por favor, selecione a data do primeiro vencimento.', 'error');
        return;
    }
    
    const finalValue = selectedContract.totalOpen - ((selectedContract.totalOpen * discountPercent) / 100);
    
    const renegotiationData = {
        contractId: selectedContract.id,
        contractNumber: selectedContract.number,
        holder: selectedContract.holder,
        originalValue: selectedContract.totalOpen,
        discountPercent: discountPercent,
        finalValue: finalValue,
        installments: installments,
        firstDueDate: firstDueDate,
        observations: observations
    };
    
    // Simulate API call
    showMessage(`Renegociação do contrato ${selectedContract.number} realizada com sucesso! Valor final: R$ ${formatCurrency(finalValue)} em ${installments}x.`, 'success');
    
    closeRenegotiationModal();
    
    // In a real application, you would send this data to the server
    console.log('Renegotiation data:', renegotiationData);
}

// Contract actions
function viewContract(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (contract) {
        const details = `
            Detalhes do Contrato:
            
            Número: ${contract.number}
            Data do Contrato: ${formatDate(contract.contractDate)}
            Titular: ${contract.holder}
            Plano: ${contract.plan}
            Vendedor: ${contract.vendor}
            Quantidade em Aberto: ${contract.quantityOpen}
            Total em Aberto: R$ ${formatCurrency(contract.totalOpen)}
            Dias em Atraso: ${contract.overdueDays} dias
        `;
        alert(details);
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '0,00';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getOverdueClass(days) {
    if (days > 300) return 'high';
    if (days >= 100) return 'medium';
    return 'low';
}

function setDefaultDueDate() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const dateString = nextMonth.toISOString().split('T')[0];
    elements.firstDueDate.value = dateString;
}

function showMessage(message, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'success' ? 'success-message' : 'error-message'}`;
    messageDiv.textContent = message;
    
    // Insert at the beginning of container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Remove after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// Global functions for HTML onclick events
window.applyFilter = applyFilter;
window.openRenegotiationModal = openRenegotiationModal;
window.viewContract = viewContract;
window.goToPage = goToPage;