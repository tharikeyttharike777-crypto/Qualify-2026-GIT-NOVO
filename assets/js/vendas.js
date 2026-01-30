// Vendas Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSalesPage();
});

function initializeSalesPage() {
    setupFilterButtons();
    setupTableInteractions();
    setupResponsiveFeatures();
    console.log('Sales page initialized successfully');
}

// Filter Button Functionality
function setupFilterButtons() {
    const filterBtn = document.getElementById('filterBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    const receivablesBtn = document.getElementById('receivablesBtn');

    if (filterBtn) {
        filterBtn.addEventListener('click', showFilterModal);
    }

    if (optionsBtn) {
        optionsBtn.addEventListener('click', showOptionsMenu);
    }

    if (receivablesBtn) {
        receivablesBtn.addEventListener('click', handleReceivablesAction);
    }

    // Setup modal close functionality
    const modalOverlay = document.getElementById('filterModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // Setup ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function showFilterModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        const firstInput = modal.querySelector('input, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function handleReceivablesAction() {
    showNotification('Redirecionando para Contas a Receber...', 'info');
    // Here you would typically redirect to the receivables page
    // window.location.href = 'contas-receber.html';
}

function showOptionsMenu() {
    const options = [
        { label: 'Exportar para Excel', action: exportToExcel },
        { label: 'Exportar para PDF', action: exportToPDF },
        { label: 'Exportar para CSV', action: exportToCSV },
        { label: 'Configurar Colunas', action: configureColumns },
        { label: 'Salvar Filtro', action: saveFilter },
        { label: 'Carregar Filtro', action: loadFilter }
    ];
    
    showContextMenu(event, options);
}

// Table Interactions
function setupTableInteractions() {
    const table = document.getElementById('salesTable');
    if (table) {
        // Add click handlers for sortable columns
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (index > 0 && index < headers.length - 1) { // Skip first and last columns
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => sortTable(index));
            }
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
    
    // Remove menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function removeMenu() {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        });
    }, 0);
}

function sortTable(columnIndex) {
    showNotification('Funcionalidade de ordenação será implementada', 'info');
}

function exportToExcel() {
    showNotification('Exportando para Excel...', 'info');
}

function exportToPDF() {
    showNotification('Exportando para PDF...', 'info');
}

function exportToCSV() {
    showNotification('Exportando para CSV...', 'info');
}

function configureColumns() {
    showNotification('Configuração de colunas será implementada', 'info');
}

function saveFilter() {
    showNotification('Filtro salvo com sucesso!', 'success');
}

function loadFilter() {
    showNotification('Carregando filtro salvo...', 'info');
}

function resetFilters() {
    // Reset all filter inputs
    document.getElementById('statusFilter').value = '';
    document.getElementById('clientFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('minValue').value = '';
    document.getElementById('maxValue').value = '';
    
    showNotification('Filtros limpos', 'info');
}

function updateStatus() {
    showNotification('Status atualizado com sucesso!', 'success');
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const clientFilter = document.getElementById('clientFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const minValue = document.getElementById('minValue').value;
    const maxValue = document.getElementById('maxValue').value;
    
    // Here you would typically send the filters to your backend
    console.log('Applying filters:', {
        status: statusFilter,
        client: clientFilter,
        dateRange: { start: startDate, end: endDate },
        valueRange: { min: minValue, max: maxValue }
    });
    
    closeModal();
    showNotification('Filtros aplicados com sucesso!', 'success');
}

function closeModal() {
    const modal = document.getElementById('filterModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Responsive Features
function setupResponsiveFeatures() {
    // Handle window resize
    window.addEventListener('resize', adjustTableForMobile);
    
    // Initial check
    adjustTableForMobile();
    
    // Setup mobile menu toggle if needed
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            // Mobile menu functionality would go here
            showNotification('Menu mobile será implementado', 'info');
        });
    }
}

function adjustTableForMobile() {
    const table = document.getElementById('salesTable');
    const isMobile = window.innerWidth < 768;
    
    if (table && isMobile) {
        // Add mobile-friendly classes or modifications
        table.classList.add('mobile-table');
    } else if (table) {
        table.classList.remove('mobile-table');
    }
}

// Additional styles for notifications and context menus
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
.notification-warning { border-left: 4px solid #ffc107; }

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

.mobile-table {
    font-size: 0.8rem;
}

.mobile-table th,
.mobile-table td {
    padding: 0.5rem 0.25rem;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);