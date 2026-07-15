// Contratos Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeContractsPage();
});

function initializeContractsPage() {
    setupFilterButtons();
    setupActionButtons();
    setupTableInteractions();
    setupResponsiveFeatures();
}

// Filter Button Functionality
function setupFilterButtons() {
    const filterBtn = document.querySelector('.filter-btn');
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    const emailBtn = document.querySelector('.email-btn');
    const exportBtn = document.querySelector('.export-btn');
    const optionsBtn = document.querySelector('.options-btn');
    const receiveBtn = document.querySelector('.receive-btn');

    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            showFilterModal();
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            handleWhatsappAction();
        });
    }

    if (emailBtn) {
        emailBtn.addEventListener('click', function() {
            handleEmailAction();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            handleExportAction();
        });
    }

    if (optionsBtn) {
        optionsBtn.addEventListener('click', function() {
            showOptionsMenu();
        });
    }

    if (receiveBtn) {
        receiveBtn.addEventListener('click', function() {
            handleBulkReceive();
        });
    }
}

// Action Button Functions
function showFilterModal() {
    // Create and show filter modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Filtros Avançados</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="filter-group">
                    <label>Data de Vencimento:</label>
                    <div class="date-range">
                        <input type="date" id="start-date" placeholder="Data inicial">
                        <span>até</span>
                        <input type="date" id="end-date" placeholder="Data final">
                    </div>
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="status-filter">
                        <option value="">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="vencido">Vencido</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Valor:</label>
                    <div class="value-range">
                        <input type="number" id="min-value" placeholder="Valor mínimo">
                        <span>até</span>
                        <input type="number" id="max-value" placeholder="Valor máximo">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
                <button class="btn-primary" onclick="applyFilters()">Aplicar Filtros</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function handleWhatsappAction() {
    const selectedContracts = getSelectedContracts();
    if (selectedContracts.length === 0) {
        showNotification('Selecione pelo menos um contrato para enviar WhatsApp', 'warning');
        return;
    }
    
    // Simular envio de WhatsApp
    showNotification(`WhatsApp enviado para ${selectedContracts.length} contrato(s)`, 'success');
}

function handleEmailAction() {
    const selectedContracts = getSelectedContracts();
    if (selectedContracts.length === 0) {
        showNotification('Selecione pelo menos um contrato para enviar e-mail', 'warning');
        return;
    }
    
    // Simular envio de e-mail
    showNotification(`E-mail enviado para ${selectedContracts.length} contrato(s)`, 'success');
}

function handleExportAction() {
    const exportOptions = [
        { label: 'Exportar para Excel', action: () => exportToExcel() },
        { label: 'Exportar para PDF', action: () => exportToPDF() },
        { label: 'Exportar para CSV', action: () => exportToCSV() }
    ];
    
    showContextMenu(event, exportOptions);
}

function showOptionsMenu() {
    const options = [
        { label: 'Configurar Colunas', action: () => configureColumns() },
        { label: 'Salvar Filtro', action: () => saveFilter() },
        { label: 'Carregar Filtro', action: () => loadFilter() },
        { label: 'Resetar Filtros', action: () => resetFilters() }
    ];
    
    showContextMenu(event, options);
}

function handleBulkReceive() {
    const selectedContracts = getSelectedContracts();
    if (selectedContracts.length === 0) {
        showNotification('Selecione pelo menos um contrato para recebimento em lote', 'warning');
        return;
    }
    
    // Simular recebimento em lote
    const totalValue = selectedContracts.length * 150; // Valor simulado
    showNotification(`Recebimento em lote processado: R$ ${totalValue.toFixed(2)} para ${selectedContracts.length} contrato(s)`, 'success');
}

// Table Interactions
function setupTableInteractions() {
    const table = document.querySelector('.contracts-table');
    if (!table) return;
    
    // Add sorting functionality to headers
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        if (index > 0 && index < headers.length - 1) { // Skip first and last columns
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => sortTable(index));
        }
    });
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.parentNode.removeChild(notification);
    });
}

function showContextMenu(event, options) {
    event.preventDefault();
    
    // Remove existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    
    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.textContent = option.label;
        item.addEventListener('click', () => {
            option.action();
            menu.remove();
        });
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            if (menu.parentNode) {
                menu.remove();
            }
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

function sortTable(columnIndex) {
    const table = document.querySelector('.contracts-table tbody');
    if (!table) return;
    
    const rows = Array.from(table.querySelectorAll('tr'));
    const isAscending = table.dataset.sortOrder !== 'asc';
    
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex]?.textContent.trim() || '';
        const bText = b.cells[columnIndex]?.textContent.trim() || '';
        
        if (isAscending) {
            return aText.localeCompare(bText);
        } else {
            return bText.localeCompare(aText);
        }
    });
    
    table.dataset.sortOrder = isAscending ? 'asc' : 'desc';
    rows.forEach(row => table.appendChild(row));
    
    showNotification(`Tabela ordenada ${isAscending ? 'crescente' : 'decrescente'}`, 'success');
}

function exportToExcel() {
    const contracts = getTableData();
    showNotification(`Exportando ${contracts.length} contratos para Excel...`, 'success');
}

function exportToPDF() {
    const contracts = getTableData();
    showNotification(`Exportando ${contracts.length} contratos para PDF...`, 'success');
}

function exportToCSV() {
    const contracts = getTableData();
    showNotification(`Exportando ${contracts.length} contratos para CSV...`, 'success');
}

function configureColumns() {
    showNotification('Configuração de colunas ativada', 'success');
}

function saveFilter() {
    const filterName = prompt('Nome do filtro:');
    if (filterName) {
        showNotification(`Filtro '${filterName}' salvo com sucesso`, 'success');
    }
}

function loadFilter() {
    showNotification('Carregando filtros salvos...', 'success');
}

function resetFilters() {
    showNotification('Filtros resetados', 'success');
}

function applyFilters() {
    showNotification('Filtros aplicados com sucesso', 'success');
    closeModal();
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Responsive Features
function setupResponsiveFeatures() {
    // Handle mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        adjustTableForMobile();
    });
    
    // Initial adjustment
    adjustTableForMobile();
}

function adjustTableForMobile() {
    const table = document.querySelector('.contracts-table');
    const container = document.querySelector('.table-container');
    
    if (table && container) {
        if (window.innerWidth < 768) {
            container.style.overflowX = 'auto';
        } else {
            container.style.overflowX = 'visible';
        }
    }
}

// Add CSS for notifications and modals
const additionalStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
}

.notification-info { border-left: 4px solid #007bff; }
.notification-success { border-left: 4px solid #28a745; }
.notification-error { border-left: 4px solid #dc3545; }

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.notification-close {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #666;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-body {
    padding: 1rem;
}

.modal-footer {
    padding: 1rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.filter-group {
    margin-bottom: 1rem;
}

.filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.date-range, .value-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.context-menu {
    background: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 150px;
}

.context-menu-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
}

.context-menu-item:hover {
    background: #f8f9fa;
}

.context-menu-item:last-child {
    border-bottom: none;
}

@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);