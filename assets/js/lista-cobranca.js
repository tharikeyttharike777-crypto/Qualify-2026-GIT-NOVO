// Lista de Cobrança JavaScript

// Dados serão carregados dinamicamente do Firestore
const sampleCobrancas = [];

// Global variables
let selectedCobrancas = new Set();
let currentData = [];
let filteredData = [];
let filtersApplied = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    // Aguarda o UserDataManager estar disponível
    setTimeout(() => {
        loadData();
    }, 1000);
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
        const userData = await window.userDataManager.getUserData('cobrancas', {
            orderBy: { field: 'dataCobranca', direction: 'desc' }
        });
        
        currentData = userData || [];
        
        if (currentData.length === 0) {
            showEmptyState('Nenhuma cobrança encontrada');
        } else {
            hideLoadingState();
            renderTable();
            updateRecordCount();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de cobranças:', error);
        // Exibe uma mensagem neutra e centralizada
        showEmptyState('Nenhuma cobrança retornada');
        updateRecordCount();
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#cobrancaTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="12" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#cobrancaTable tbody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-container');

    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `<p>${message}</p>`;
    }
    if (tableBody) tableBody.innerHTML = '';
}

function initializePage() {
    console.log('Lista de Cobrança page initialized');
}

function setupEventListeners() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Action buttons
    document.getElementById('filterBtn').addEventListener('click', toggleFiltersBar);
    document.getElementById('createBtn').addEventListener('click', handleCreate);
    document.getElementById('removeBtn').addEventListener('click', handleRemove);
    document.getElementById('editBtn').addEventListener('click', handleEdit);

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', handleSelectAll);

    // Filters
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const filterText = document.getElementById('filterText');

    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    if (filterText) filterText.addEventListener('keyup', function(e){
        if (e.key === 'Enter') applyFilters();
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`).classList.add('active');
}

function renderTable() {
    const tableBody = document.getElementById('cobrancaTableBody');
    const emptyState = document.getElementById('emptyState');
    const dataToRender = filtersApplied ? filteredData : currentData;

    if (!dataToRender || dataToRender.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        updateRecordCount();
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';

    tableBody.innerHTML = dataToRender.map(cobranca => `
        <tr>
            <td class="checkbox-col">
                <input type="checkbox" 
                       value="${cobranca.id}" 
                       onchange="handleRowSelect(${cobranca.id}, this.checked)">
            </td>
            <td>${cobranca.numeroContrato}</td>
            <td>${cobranca.numero}</td>
            <td>${cobranca.banco}</td>
            <td>${cobranca.cobrador}</td>
            <td>${cobranca.titular}</td>
            <td>
                <span class="status-badge status-${cobranca.statusCobranca.toLowerCase().replace('ç', 'c')}">
                    ${cobranca.statusCobranca}
                </span>
            </td>
            <td>${cobranca.observacao}</td>
            <td>${formatDate(cobranca.dataCobranca)}</td>
            <td>${cobranca.reagendamento !== '-' ? formatDate(cobranca.reagendamento) : '-'}</td>
            <td>${formatDate(cobranca.vencimento)}</td>
            <td><strong>${cobranca.valorParcela}</strong></td>
        </tr>
    `).join('');

    updateRecordCount();
}

function handleRowSelect(id, isSelected) {
    if (isSelected) {
        selectedCobrancas.add(id);
    } else {
        selectedCobrancas.delete(id);
    }
    
    updateSelectAllCheckbox();
    updateActionButtons();
}

function handleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const rowCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const id = parseInt(checkbox.value);
        
        if (selectAllCheckbox.checked) {
            selectedCobrancas.add(id);
        } else {
            selectedCobrancas.delete(id);
        }
    });
    
    updateActionButtons();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalRows = (filtersApplied ? filteredData : currentData).length;
    const selectedRows = selectedCobrancas.size;
    
    if (selectedRows === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedRows === totalRows) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
}

function updateActionButtons() {
    const hasSelection = selectedCobrancas.size > 0;
    document.getElementById('removeBtn').disabled = !hasSelection;
    document.getElementById('editBtn').disabled = selectedCobrancas.size !== 1;
}

function updateRecordCount() {
    const count = (filtersApplied ? filteredData : currentData).length || 0;
    document.getElementById('recordCount').textContent = count;
}

// Action handlers
function toggleFiltersBar() {
    const bar = document.getElementById('filtersBar');
    if (!bar) return;
    const isVisible = bar.style.display !== 'none';
    bar.style.display = isVisible ? 'none' : 'block';
}

function applyFilters() {
    const text = (document.getElementById('filterText')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filterStatus')?.value || '';
    const dIni = document.getElementById('filterDataInicio')?.value || '';
    const dFim = document.getElementById('filterDataFim')?.value || '';
    const vIni = document.getElementById('filterVencInicio')?.value || '';
    const vFim = document.getElementById('filterVencFim')?.value || '';

    filteredData = currentData.filter(item => {
        // Texto livre
        const textoOk = !text || [
            item.numeroContrato,
            item.numero,
            item.banco,
            item.cobrador,
            item.titular,
            item.statusCobranca,
            item.observacao
        ].some(v => String(v || '').toLowerCase().includes(text));

        // Status
        const statusOk = !status || (item.statusCobranca === status);

        // Datas cobrança
        const dc = item.dataCobranca ? new Date(item.dataCobranca) : null;
        const dcIniOk = !dIni || (dc && dc >= new Date(dIni));
        const dcFimOk = !dFim || (dc && dc <= new Date(dFim));

        // Datas vencimento
        const dv = item.vencimento ? new Date(item.vencimento) : null;
        const dvIniOk = !vIni || (dv && dv >= new Date(vIni));
        const dvFimOk = !vFim || (dv && dv <= new Date(vFim));

        return textoOk && statusOk && dcIniOk && dcFimOk && dvIniOk && dvFimOk;
    });

    filtersApplied = true;
    document.querySelector('.filter-status span').textContent = 'Filtros aplicados';
    renderTable();
}

function clearFilters() {
    document.getElementById('filterText').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterVencInicio').value = '';
    document.getElementById('filterVencFim').value = '';

    filtersApplied = false;
    filteredData = [];
    document.querySelector('.filter-status span').textContent = 'Nenhum filtro aplicado';
    renderTable();
}

function handleCreate() {
    document.getElementById('modalTitle').textContent = 'Nova Cobrança';
    document.getElementById('cobrancaForm').reset();
    document.getElementById('cobrancaId').value = '';
    openCobrancaModal();
}

function handleEdit() {
    if (selectedCobrancas.size !== 1) {
        showToast('Selecione exatamente uma cobrança para editar', 'warning');
        return;
    }
    
    const cobrancaId = Array.from(selectedCobrancas)[0];
    const cobranca = currentData.find(c => c.id === cobrancaId);
    
    if (!cobranca) return;

    document.getElementById('modalTitle').textContent = 'Editar Cobrança';
    document.getElementById('cobrancaId').value = cobranca.id;
    document.getElementById('cobrancaCliente').value = cobranca.titular;
    document.getElementById('cobrancaValor').value = parseFloat(cobranca.valorParcela.replace('R$', '').replace(',', '.').trim()) || 0;
    document.getElementById('cobrancaVencimento').value = cobranca.vencimento ? new Date(cobranca.vencimento).toISOString().split('T')[0] : '';
    document.getElementById('cobrancaDescricao').value = cobranca.observacao || '';
    
    openCobrancaModal();
}

function openCobrancaModal() {
    document.getElementById('cobrancaModal').classList.add('active');
}

function closeCobrancaModal() {
    document.getElementById('cobrancaModal').classList.remove('active');
}

window.closeCobrancaModal = closeCobrancaModal;

async function saveCobranca() {
    const id = document.getElementById('cobrancaId').value;
    const cliente = document.getElementById('cobrancaCliente').value;
    const valor = document.getElementById('cobrancaValor').value;
    const vencimento = document.getElementById('cobrancaVencimento').value;
    const descricao = document.getElementById('cobrancaDescricao').value;

    if (!cliente || !valor || !vencimento) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    const cobrancaData = {
        titular: cliente,
        valorParcela: `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`,
        vencimento: vencimento,
        observacao: descricao,
        statusCobranca: 'Pendente',
        dataCobranca: new Date().toISOString(),
        numeroContrato: 'NEW-' + Math.floor(Math.random() * 10000),
        numero: '1/1',
        banco: 'Carteira',
        cobrador: 'Sistema',
        reagendamento: '-'
    };

    try {
        showLoadingState();
        
        if (id) {
            // Edit existing
            // In a real app, we would update Firestore here
            const index = currentData.findIndex(c => c.id == id);
            if (index !== -1) {
                currentData[index] = { ...currentData[index], ...cobrancaData, id: parseInt(id) };
                showToast('Cobrança atualizada com sucesso', 'success');
            }
        } else {
            // Create new
            // In a real app, we would add to Firestore here
            const newId = Math.max(...currentData.map(c => c.id || 0), 0) + 1;
            currentData.unshift({ ...cobrancaData, id: newId });
            showToast('Cobrança criada com sucesso', 'success');
        }

        closeCobrancaModal();
        renderTable();
        updateRecordCount();
    } catch (error) {
        console.error('Erro ao salvar cobrança:', error);
        showToast('Erro ao salvar cobrança', 'error');
    } finally {
        hideLoadingState(); // Actually renderTable hides it, but good practice
    }
}

window.saveCobranca = saveCobranca;

// Utility functions
function formatDate(dateString) {
    if (!dateString || dateString === '-') return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
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

// Export functions for global access
window.handleRowSelect = handleRowSelect;

console.log('Lista de Cobrança JavaScript loaded successfully');