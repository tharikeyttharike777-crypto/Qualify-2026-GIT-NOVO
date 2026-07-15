// Ordens de Serviço Page JavaScript

document.addEventListener('DOMContentLoaded', function () {
    initializeOrdersPage();
});

function initializeOrdersPage() {
    setupFilterButtons();
    setupTableInteractions();
    setupResponsiveFeatures();
    console.log('Orders page initialized successfully');
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
        filterBtn.addEventListener('click', function () {
            showFilterModal();
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function () {
            handleWhatsappAction();
        });
    }

    if (emailBtn) {
        emailBtn.addEventListener('click', function () {
            handleEmailAction();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            handleExportAction();
        });
    }

    if (optionsBtn) {
        optionsBtn.addEventListener('click', function () {
            showOptionsMenu();
        });
    }

    if (receiveBtn) {
        receiveBtn.addEventListener('click', function () {
            handleBulkReceive();
        });
    }
}

// Filter Modal
function showFilterModal() {
    const modalHTML = `
        <div class="modal-overlay" id="filterModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Filtros - Ordens de Serviço</h3>
                    <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="filter-group">
                        <label>Número da Ordem:</label>
                        <input type="text" id="orderNumber" placeholder="Digite o número da ordem">
                    </div>
                    <div class="filter-group">
                        <label>Cliente:</label>
                        <input type="text" id="clientName" placeholder="Nome do cliente">
                    </div>
                    <div class="filter-group">
                        <label>Status:</label>
                        <select id="statusFilter">
                            <option value="">Todos</option>
                            <option value="pendente">Pendente</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="concluido">Concluído</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Período de Vencimento:</label>
                        <div class="date-range">
                            <input type="date" id="startDate">
                            <span>até</span>
                            <input type="date" id="endDate">
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>Valor:</label>
                        <div class="value-range">
                            <input type="number" id="minValue" placeholder="Valor mínimo" step="0.01">
                            <span>até</span>
                            <input type="number" id="maxValue" placeholder="Valor máximo" step="0.01">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="resetFilters()">Limpar</button>
                    <button class="btn-primary" onclick="applyFilters()">Aplicar Filtros</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handleWhatsappAction() {
    const selectedOrders = getSelectedOrders();
    if (selectedOrders.length === 0) {
        showNotification('Selecione pelo menos uma ordem de serviço para enviar WhatsApp', 'warning');
        return;
    }

    // For demonstration, we'll take the first selected order's client info if available
    // In a real scenario, you might want to send to multiple or handle differently
    const orderId = selectedOrders[0];
    // Mocking client number for now as it's not in the table data explicitly in this view
    const clientNumber = "5527998587638";
    const message = encodeURIComponent(`Olá, estou entrando em contato referente à ordem de serviço #${orderId}.`);

    const url = `https://wa.me/${clientNumber}?text=${message}`;
    window.open(url, '_blank');

    showNotification(`WhatsApp aberto para a ordem ${orderId}`, 'success');
}

function handleEmailAction() {
    const selectedOrders = getSelectedOrders();
    if (selectedOrders.length === 0) {
        showNotification('Selecione pelo menos uma ordem de serviço para enviar e-mail', 'warning');
        return;
    }

    // Simular envio de e-mail
    showNotification(`E-mail enviado para ${selectedOrders.length} ordem(ns) de serviço`, 'success');
}

function handleExportAction() {
    const options = [
        { label: 'Exportar para Excel', action: () => exportToExcel() },
        { label: 'Exportar para PDF', action: () => exportToPDF() },
        { label: 'Exportar para CSV', action: () => exportToCSV() }
    ];
    showContextMenu(event, options);
}

function showOptionsMenu() {
    const options = [
        { label: 'Configurar Colunas', action: () => configureColumns() },
        { label: 'Salvar Filtro', action: () => saveFilter() },
        { label: 'Carregar Filtro', action: () => loadFilter() }
    ];
    showContextMenu(event, options);
}

function handleBulkReceive() {
    const selectedOrders = getSelectedOrders();
    if (selectedOrders.length === 0) {
        showNotification('Selecione pelo menos uma ordem de serviço para recebimento em lote', 'warning');
        return;
    }

    // Simular recebimento em lote
    const totalValue = selectedOrders.length * 200; // Valor simulado
    showNotification(`Recebimento em lote processado: R$ ${totalValue.toFixed(2)} para ${selectedOrders.length} ordem(ns)`, 'success');
}

// Table Interactions
function setupTableInteractions() {
    const table = document.querySelector('.orders-table');
    if (table) {
        // Add sorting functionality to headers
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                sortTable(column);
            });
        });
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
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
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

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
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

function sortTable(columnIndex) {
    const table = document.querySelector('.orders-table tbody');
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
    const orders = getTableData();
    showNotification(`Exportando ${orders.length} ordens de serviço para Excel...`, 'success');
}

function exportToPDF() {
    const orders = getTableData();
    showNotification(`Exportando ${orders.length} ordens de serviço para PDF...`, 'success');
}

function exportToCSV() {
    const orders = getTableData();
    showNotification(`Exportando ${orders.length} ordens de serviço para CSV...`, 'success');
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
    document.getElementById('orderNumber').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('minValue').value = '';
    document.getElementById('maxValue').value = '';
    showNotification('Filtros limpos com sucesso!', 'success');
}

function updateStatus() {
    const selectedOrders = document.querySelectorAll('.order-checkbox:checked');
    if (selectedOrders.length === 0) {
        showNotification('Selecione pelo menos uma ordem de serviço para atualizar o status', 'warning');
        return;
    }

    const newStatus = prompt('Digite o novo status:');
    if (newStatus) {
        showNotification(`Status de ${selectedOrders.length} ordem(ns) atualizado para: ${newStatus}`, 'success');
    }
}

function applyFilters() {
    const orderNumber = document.getElementById('orderNumber').value;
    const clientName = document.getElementById('clientName').value;
    const status = document.getElementById('statusFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const minValue = document.getElementById('minValue').value;
    const maxValue = document.getElementById('maxValue').value;

    // Here you would implement the actual filtering logic
    console.log('Applying filters:', {
        orderNumber, clientName, status, startDate, endDate, minValue, maxValue
    });

    closeModal();
    showNotification('Filtros aplicados com sucesso!', 'success');
}

function closeModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.remove();
    }
}

// Responsive Features
function setupResponsiveFeatures() {
    // Handle mobile responsiveness
    function handleResize() {
        if (window.innerWidth <= 768) {
            adjustTableForMobile();
        }
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

function adjustTableForMobile() {
    const table = document.querySelector('.orders-table');
    if (table && window.innerWidth <= 768) {
        // Add mobile-friendly table behavior
        table.classList.add('mobile-table');
    } else if (table) {
        table.classList.remove('mobile-table');
    }
}

// Add embedded CSS for dynamic elements
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

.filter-group input, .filter-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
}

.date-range, .value-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-range input, .value-range input {
    flex: 1;
}

.btn-primary {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
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