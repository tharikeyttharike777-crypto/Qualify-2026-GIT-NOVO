// Contratos Adimplentes JavaScript

// Dados serão carregados dinamicamente do Firestore
let adimplentesData = [];
// Base para filtros (modal) e busca (texto)
let baseData = [];
let currentData = []; // após filtros
let filteredData = []; // após busca
let currentPage = 1;
const itemsPerPage = 10;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o UserDataManager estar disponível
    setTimeout(() => {
        loadData();
    }, 1000);
    setupEventListeners();
});

// Load data from Firestore
async function loadData() {
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado, não é possível carregar dados');
        showEmptyState('Faça login para visualizar os dados');
        return;
    }

    try {
        // Mostra loading
        showLoadingState();
        
        // Busca dados do usuário logado
        const userData = await window.userDataManager.getUserData('contratos', {
            where: [['status', '==', 'adimplente']],
            orderBy: { field: 'dataVencimento', direction: 'desc' }
        });
        
        adimplentesData = userData || [];
        baseData = [...adimplentesData];
        currentData = [...baseData];
        filteredData = [...currentData];
        
        if (adimplentesData.length === 0) {
            showEmptyState('Nenhum contrato adimplente encontrado');
        } else {
            hideLoadingState();
            renderTable();
            updatePagination();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de contratos adimplentes:', error);
        // Exibe uma mensagem neutra para o usuário
        showEmptyState('Nenhum contrato para exibir no momento.');
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.getElementById('adimplentesTableBody');
    const noDataDiv = document.getElementById('noDataMessage');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    if (noDataDiv) {
        noDataDiv.classList.remove('hidden');
        noDataDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Carregando dados...</p>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.getElementById('adimplentesTableBody');
    const noDataDiv = document.getElementById('noDataMessage');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    if (noDataDiv) {
        noDataDiv.classList.remove('hidden');
        noDataDiv.innerHTML = `<p>${message || 'Nenhum contrato adimplente encontrado.'}</p>`;
    }
    // Atualiza contagem
    const recordCountEl = document.getElementById('recordsCount');
    if (recordCountEl) recordCountEl.textContent = '0';
    
    // Desativa paginação
    ['firstPageBtn','prevPageBtn','nextPageBtn','lastPageBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    });
}

// Render table
function renderTable() {
    const tableBody = document.getElementById('adimplentesTableBody');
    const noDataDiv = document.getElementById('noDataMessage');
    
    if (!tableBody) {
        console.warn('Table body not found - funcionalidade de tabela desabilitada');
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tableBody.innerHTML = '';
        if (noDataDiv) noDataDiv.classList.remove('hidden');
        return;
    }
    
    if (noDataDiv) noDataDiv.classList.add('hidden');
    
    tableBody.innerHTML = pageData.map(contract => `
        <tr>
            <td class="action-cell">
                <button class="action-btn btn-view" onclick="viewContract(${contract.id})" title="Visualizar" aria-label="Visualizar">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
            </td>
            <td class="contract-number">${contract.contractNumber}</td>
            <td class="holder-name">${contract.holder}</td>
            <td class="due-day">${contract.dueDay}</td>
            <td class="phone-number">${contract.cellPhone}</td>
            <td class="date-cell">${formatDate(contract.contractDate)}</td>
            <td class="currency-value">${formatCurrency(contract.paidValue)}</td>
            <td class="payment-count">${contract.paid}</td>
            <td class="currency-value">${formatCurrency(contract.monthlyFee)}</td>
            <td class="date-cell">${formatDate(contract.lastPayment)}</td>
            <td class="last-observation">${contract.lastObservation}</td>
            <td class="action-cell">
                <button class="btn-options" onclick="showContractOptions(${contract.id})">
                    Opções
                </button>
            </td>
        </tr>
    `).join('');
}

// Update pagination
function updatePagination() {
    const recordCountEl = document.getElementById('recordsCount');
    const totalRecords = filteredData.length;
    
    if (recordCountEl) {
        recordCountEl.textContent = totalRecords;
    }
    
    // Update pagination buttons
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Setup event listeners
function setupEventListeners() {
    const filterBtn = document.getElementById('filterBtn');
    const messageBtn = document.getElementById('messageBtn');
    const exportBtn = document.getElementById('exportBtn');
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    const searchInput = document.getElementById('contractSearchInput');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const filterType = prompt('Filtrar por:\n1 - Valor do contrato\n2 - Data de vencimento\n3 - Status de pagamento\n\nDigite o número da opção:');
            if (filterType) {
                showMessage(`Aplicando filtro tipo ${filterType}`, 'success');
            }
        });
    }
    
    if (messageBtn) {
        messageBtn.addEventListener('click', () => {
            const selectedContracts = document.querySelectorAll('.contract-checkbox:checked');
            if (selectedContracts.length > 0) {
                showMessage(`Enviando mensagem para ${selectedContracts.length} contrato(s) adimplente(s)`, 'success');
            } else {
                showMessage('Selecione pelo menos um contrato para enviar mensagem', 'warning');
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const contracts = document.querySelectorAll('.contract-item');
            showMessage(`Exportando ${contracts.length} contratos adimplentes...`, 'success');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (firstBtn) {
        firstBtn.addEventListener('click', () => goToPage(1));
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    
    if (lastBtn) {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        lastBtn.addEventListener('click', () => goToPage(totalPages));
    }
}

// Go to page
function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    updatePagination();
}

// Busca rápida por número, titular, celular e observação
function handleSearch() {
    const input = document.getElementById('contractSearchInput');
    const query = (input?.value || '').trim().toLowerCase();
    
    if (!query) {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(c => {
            const number = String(c.contractNumber || '').toLowerCase();
            const holder = String(c.holder || '').toLowerCase();
            const phone = String(c.cellPhone || '').toLowerCase();
            const note = String(c.lastObservation || '').toLowerCase();
            return number.includes(query) || holder.includes(query) || phone.includes(query) || note.includes(query);
        });
    }
    currentPage = 1;
    renderTable();
    updatePagination();
}

// View contract
function viewContract(contractId) {
    const contract = adimplentesData.find(c => c.id === contractId);
    if (contract) {
        showMessage(`Visualizando contrato ${contract.contractNumber} - ${contract.holder}`, 'success');
    }
}

// Show contract options
function showContractOptions(contractId) {
    const contract = adimplentesData.find(c => c.id === contractId);
    if (contract) {
        const options = [
            'Editar contrato',
            'Histórico de pagamentos',
            'Enviar mensagem',
            'Gerar boleto',
            'Imprimir contrato'
        ];
        
        const selectedOption = prompt(`Opções para contrato ${contract.contractNumber}:\n\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nDigite o número da opção:`);
        
        if (selectedOption && selectedOption >= 1 && selectedOption <= options.length) {
            showMessage(`${options[selectedOption - 1]} - Contrato ${contract.contractNumber}`, 'success');
        }
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'success' ? 'success-message' : 'error-message'}`;
    messageDiv.textContent = message;
    
    // Add styles
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        font-size: 14px;
        max-width: 300px;
    `;
    
    // Insert into body
    document.body.appendChild(messageDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}