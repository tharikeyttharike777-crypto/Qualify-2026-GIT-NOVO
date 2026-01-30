// Dashboard principal do sistema
// Firebase sera carregado via CDN e firebase-config.js

// Dependências globais:
// firebase - carregado via CDN
// authManager sera disponibilizado globalmente pelo auth-manager.js
// firestoreUtils sera disponibilizado globalmente pelo firestore-utils.js

// Aguardar dependências estarem disponíveis
function waitForDependencies() {
    return new Promise((resolve) => {
        const checkDependencies = () => {
            if (typeof window.AuthManager !== 'undefined' && typeof window.FirestoreUtils !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkDependencies, 100);
            }
        };
        checkDependencies();
    });
}

// Inicializar apenas quando dependências estiverem prontas
waitForDependencies().then(() => {
    console.log('Dashboard dependencies loaded successfully');
}).catch(error => {
    console.error('Failed to load dashboard dependencies:', error);
});

// Chart configurations and data
const chartConfigs = {
    receitas: {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Receitas',
                data: [],
                backgroundColor: '#007bff',
                borderColor: '#007bff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    },
    
    inadimplencia: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Inadimplência (%)',
                data: [],
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    },
    
    receitasMensais: {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Receitas Mensais',
                data: [],
                backgroundColor: '#007bff',
                borderColor: '#007bff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    },
    
    novosContratos: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Novos Contratos',
                data: [],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    },
    
    contratosAtivos: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Contratos Ativos',
                data: [],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 600
                }
            }
        }
    },
    
    contratosCancelados: {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Contratos Cancelados',
                data: [],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    },
    
    contratosPlano: {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    }
};

// Initialize all charts
function initializeCharts() {
    const charts = {};
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não foi carregado!');
        return charts;
    }
    
    // Initialize each chart
    Object.keys(chartConfigs).forEach(chartId => {
        const canvasId = chartId + 'Chart';
        const canvas = document.getElementById(canvasId);
        
        if (canvas) {
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    charts[chartId] = new Chart(ctx, chartConfigs[chartId]);
                    console.log('Gráfico ' + chartId + ' inicializado com sucesso');
                } else {
                    console.error('Não foi possível obter o contexto 2D para ' + canvasId);
                }
            } catch (error) {
                console.error('Erro ao inicializar gráfico ' + chartId + ':', error);
            }
        } else {
            console.warn('Canvas ' + canvasId + ' não encontrado');
        }
    });
    
    console.log(Object.keys(charts).length + ' gráficos inicializados');
    return charts;
}

// Update metrics cards with animation
async function updateMetricsCards() {
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado, não é possível carregar métricas');
        return;
    }

    try {
        // Busca dados do usuário para calcular métricas
        const [contratos, inadimplentes, receitas] = await Promise.all([
            window.userDataManager.getUserData('contratos'),
            window.userDataManager.getUserData('inadimplentes'),
            window.userDataManager.getUserData('receitas')
        ]);

        // Calcula métricas baseadas nos dados reais
        const metrics = [
            {
                id: 'total-contratos',
                value: contratos.length,
                prefix: '',
                suffix: ''
            },
            {
                id: 'contratos-ativos',
                value: contratos.filter(c => c.status === 'ativo').length,
                prefix: '',
                suffix: ''
            },
            {
                id: 'inadimplentes',
                value: inadimplentes.length,
                prefix: '',
                suffix: ''
            },
            {
                id: 'receita-mensal',
                value: receitas.reduce((total, r) => total + (r.valor || 0), 0),
                prefix: 'R$ ',
                suffix: ''
            }
        ];
        
        metrics.forEach(metric => {
            const element = document.querySelector('[data-metric="' + metric.id + '"]');
            if (element) {
                animateValue(element, 0, metric.value, 1000, metric.prefix, metric.suffix);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar métricas:', error);
        // Mostra métricas zeradas em caso de erro
        const defaultMetrics = [
            { id: 'total-contratos', value: 0 },
            { id: 'contratos-ativos', value: 0 },
            { id: 'inadimplentes', value: 0 },
            { id: 'receita-mensal', value: 0, prefix: 'R$ ' }
        ];
        
        defaultMetrics.forEach(metric => {
            const element = document.querySelector('[data-metric="' + metric.id + '"]');
            if (element) {
                element.textContent = (metric.prefix || '') + '0' + (metric.suffix || '');
            }
        });
    }
}

// Animate number values
function animateValue(element, start, end, duration, prefix, suffix) {
    prefix = prefix || '';
    suffix = suffix || '';
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * progress;
        const formatted = prefix + current.toLocaleString('pt-BR', {
            minimumFractionDigits: prefix.includes('R$') ? 2 : 0,
            maximumFractionDigits: prefix.includes('R$') ? 2 : 0
        }) + suffix;
        
        element.textContent = formatted;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Filter functionality
function setupFilters() {
    const applyButton = document.getElementById('applyFilters');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const operatorSelect = document.getElementById('operatorSelect');
    const clearButton = document.getElementById('clearFilters');
    
    if (applyButton) {
        applyButton.addEventListener('click', async function() {
            const filters = {
                startDate: startDate?.value || null,
                endDate: endDate?.value || null,
                operator: operatorSelect?.value || 'all'
            };

            // Estado de carregamento
            applyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
            applyButton.disabled = true;

            try {
                // Atualiza os gráficos com os filtros
                await updateChartsWithFilters(filters);
                showNotification('Filtros aplicados com sucesso!', 'success');
            } catch (err) {
                console.error('Erro ao aplicar filtros:', err);
                showNotification('Falha ao aplicar filtros. Tente novamente.', 'error');
            } finally {
                // Reset do botão
                applyButton.innerHTML = '<i class="fas fa-filter"></i> Filtrar';
                applyButton.disabled = false;
            }
        });
    }

    // Fallback: garantir que o botão de limpar filtros funcione
    if (clearButton) {
        // Evita múltiplos listeners duplicados clonando e substituindo
        const newClear = clearButton.cloneNode(true);
        clearButton.parentNode.replaceChild(newClear, clearButton);
        newClear.addEventListener('click', clearAllFilters);
    }
}

// Notification system
function showNotification(message, type) {
    type = type || 'info';
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'info-circle') + '"></i>' +
        '<span>' + message + '</span>' +
        '<button class="notification-close">' +
        '<i class="fas fa-times"></i>' +
        '</button>';
    
    // Add styles
    notification.style.cssText = 'position: fixed;' +
        'top: 20px;' +
        'right: 20px;' +
        'background: ' + (type === 'success' ? '#d4edda' : '#d1ecf1') + ';' +
        'color: ' + (type === 'success' ? '#155724' : '#0c5460') + ';' +
        'border: 1px solid ' + (type === 'success' ? '#c3e6cb' : '#bee5eb') + ';' +
        'border-radius: 4px;' +
        'padding: 12px 16px;' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 10px;' +
        'z-index: 1000;' +
        'box-shadow: 0 2px 8px rgba(0,0,0,0.1);' +
        'animation: slideIn 0.3s ease-out;';
    
    document.body.appendChild(notification);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', function() {
        notification.remove();
    });
    
    // Auto remove after 3 seconds
    setTimeout(function() {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Add CSS for notification animation
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = '@keyframes slideIn {' +
        'from {' +
        'transform: translateX(100%);' +
        'opacity: 0;' +
        '}' +
        'to {' +
        'transform: translateX(0);' +
        'opacity: 1;' +
        '}' +
        '}' +
        '.notification-close {' +
        'background: none;' +
        'border: none;' +
        'cursor: pointer;' +
        'padding: 0;' +
        'margin-left: 10px;' +
        '}';
    document.head.appendChild(style);
}

// Advanced Dashboard Features
const dashboardState = {
    currentFilters: {
        quickPeriod: 'month',
        viewType: 'summary',
        plans: [],
        status: [],
        valueRange: { min: null, max: null },
        dateRange: { start: null, end: null },
        groupBy: 'month',
        compareWith: 'previous-period'
    },
    visibleCharts: {
        receitas: true,
        inadimplencia: true,
        novosContratos: true,
        contratosAtivos: true
    },
    options: {
        showKPIs: true,
        showCharts: false,
        autoRefresh: false,
        refreshInterval: 300,
        notifications: false
    }
};

// Modal Management
function initializeModals() {
    const modals = {
        filters: document.getElementById('filtersModal'),
        options: document.getElementById('optionsModal')
    };
    
    // Modal open buttons
    document.getElementById('openFiltersModal')?.addEventListener('click', () => openModal('filters'));
    document.getElementById('openOptionsModal')?.addEventListener('click', () => openModal('options'));
    
    // Modal close buttons
    document.getElementById('closeFiltersModal')?.addEventListener('click', () => closeModal('filters'));
    document.getElementById('closeOptionsModal')?.addEventListener('click', () => closeModal('options'));
    
    // Close modal when clicking outside
    Object.values(modals).forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id.replace('Modal', ''));
                }
            });
        }
    });
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab, e.target.closest('.modal'));
        });
    });
    
    // Filter modal actions
    document.getElementById('applyAdvancedFilters')?.addEventListener('click', applyAdvancedFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetAdvancedFilters);
    
    // Options modal actions
    document.getElementById('saveOptions')?.addEventListener('click', saveOptions);
    document.getElementById('resetOptions')?.addEventListener('click', resetOptions);
    
    // Export buttons
    document.getElementById('exportPDF')?.addEventListener('click', () => exportDashboard('pdf'));
    document.getElementById('exportExcel')?.addEventListener('click', () => exportDashboard('excel'));
    document.getElementById('exportImage')?.addEventListener('click', () => exportDashboard('image'));
    document.getElementById('exportData')?.addEventListener('click', () => exportDashboard('data'));
    
    // Top action bar buttons
    document.getElementById('refreshDashboard')?.addEventListener('click', refreshDashboard);
    document.getElementById('exportDashboard')?.addEventListener('click', () => exportDashboard('excel'));
    document.getElementById('clearFilters')?.addEventListener('click', clearAllFilters);
    
    // KPI actions
    document.getElementById('compareKPIs')?.addEventListener('click', compareKPIs);
    document.getElementById('exportKPIs')?.addEventListener('click', () => exportDashboard('kpis'));
    
    console.log('Modais inicializados com sucesso!');
}

function openModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalType) {
    const modal = document.getElementById(modalType + 'Modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

function switchTab(tabId, modal) {
    // Remove active class from all tabs and content
    modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    modal.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    modal.querySelector(`#${tabId}`).classList.add('active');
}

// Advanced Filters
function applyAdvancedFilters() {
    const filters = {
        quickPeriod: document.getElementById('quickPeriod')?.value,
        viewType: document.getElementById('viewType')?.value,
        plans: Array.from(document.getElementById('plansFilter')?.selectedOptions || []).map(opt => opt.value),
        status: Array.from(document.getElementById('statusFilter')?.selectedOptions || []).map(opt => opt.value),
        valueRange: {
            min: document.getElementById('minValue')?.value,
            max: document.getElementById('maxValue')?.value
        },
        dateRange: {
            start: document.getElementById('customStartDate')?.value,
            end: document.getElementById('customEndDate')?.value
        },
        groupBy: document.getElementById('groupBy')?.value,
        compareWith: document.getElementById('compareWith')?.value
    };
    
    dashboardState.currentFilters = { ...dashboardState.currentFilters, ...filters };
    
    // Show loading state
    const applyBtn = document.getElementById('applyAdvancedFilters');
    if (applyBtn) {
        applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
        applyBtn.disabled = true;
    }
    
    // Simulate API call and update charts
    setTimeout(() => {
        updateChartsWithFilters(filters);
        closeModal('filters');
        
        // Reset button
        if (applyBtn) {
            applyBtn.innerHTML = 'Aplicar Filtros';
            applyBtn.disabled = false;
        }
        
        showNotification('Filtros aplicados com sucesso!', 'success');
    }, 1500);
}

function resetAdvancedFilters() {
    // Reset all filter inputs
    document.getElementById('quickPeriod').value = 'month';
    document.getElementById('viewType').value = 'summary';
    document.getElementById('plansFilter').selectedIndex = -1;
    document.getElementById('statusFilter').selectedIndex = -1;
    document.getElementById('minValue').value = '';
    document.getElementById('maxValue').value = '';
    document.getElementById('customStartDate').value = '';
    document.getElementById('customEndDate').value = '';
    document.getElementById('groupBy').value = 'month';
    document.getElementById('compareWith').value = 'previous-period';
    
    showNotification('Filtros limpos!', 'info');
}

function clearAllFilters() {
    // Reset basic filters
    document.getElementById('startDate').value = '2024-01-01';
    document.getElementById('endDate').value = '2024-12-31';
    document.getElementById('operatorSelect').value = 'all';
    
    // Reset advanced filters
    resetAdvancedFilters();
    
    // Update dashboard
    refreshDashboard();
    
    showNotification('Todos os filtros foram limpos!', 'success');
}

// Dashboard Options
function saveOptions() {
    const options = {
        showKPIs: document.getElementById('showKPIs')?.checked,
        showCharts: document.getElementById('showCharts')?.checked,
        autoRefresh: document.getElementById('autoRefresh')?.checked,
        refreshInterval: document.getElementById('refreshInterval')?.value,
        notifications: document.getElementById('enableNotifications')?.checked,
        chartVisibility: {
            receitas: document.getElementById('showReceitas')?.checked,
            inadimplencia: document.getElementById('showInadimplencia')?.checked,
            novosContratos: document.getElementById('showNovosContratos')?.checked,
            contratosAtivos: document.getElementById('showContratosAtivos')?.checked
        }
    };
    
    dashboardState.options = { ...dashboardState.options, ...options };
    dashboardState.visibleCharts = { ...dashboardState.visibleCharts, ...options.chartVisibility };
    
    // Apply options
    applyDashboardOptions(options);
    closeModal('options');
    
    showNotification('Configurações salvas com sucesso!', 'success');
}

function resetOptions() {
    // Reset to default values
    document.getElementById('showKPIs').checked = true;
    document.getElementById('showCharts').checked = true;
    document.getElementById('autoRefresh').checked = false;
    document.getElementById('refreshInterval').value = '300';
    document.getElementById('enableNotifications').checked = false;
    document.getElementById('showReceitas').checked = true;
    document.getElementById('showInadimplencia').checked = true;
    document.getElementById('showNovosContratos').checked = true;
    document.getElementById('showContratosAtivos').checked = true;
    
    showNotification('Configurações restauradas!', 'info');
}

function applyDashboardOptions(options) {
    // Show/hide KPIs
    const kpiSection = document.querySelector('.metrics-cards');
    if (kpiSection) {
        kpiSection.style.display = options.showKPIs ? 'grid' : 'none';
    }
    
    // Show/hide charts
    const chartsSection = document.querySelector('.charts-grid');
    if (chartsSection) {
        chartsSection.style.display = options.showCharts ? 'grid' : 'none';
    }
    
    // Setup auto refresh
    if (options.autoRefresh) {
        setupAutoRefresh(parseInt(options.refreshInterval) * 1000);
    } else {
        clearAutoRefresh();
    }
    
    // Apply chart visibility
    Object.keys(options.chartVisibility).forEach(chartId => {
        const chartContainer = document.querySelector(`#${chartId}Chart`)?.closest('.chart-container');
        if (chartContainer) {
            chartContainer.style.display = options.chartVisibility[chartId] ? 'block' : 'none';
        }
    });
}

// Export Functions
function exportDashboard(format) {
    const exportBtn = document.querySelector(`#export${format.charAt(0).toUpperCase() + format.slice(1)}`);
    if (exportBtn) {
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';
        exportBtn.disabled = true;
    }
    
    // Simulate export process
    setTimeout(() => {
        console.log(`Exportando dashboard em formato ${format}`);
        
        // Reset button
        if (exportBtn) {
            exportBtn.innerHTML = exportBtn.innerHTML.replace('<i class="fas fa-spinner fa-spin"></i> Exportando...', exportBtn.textContent.trim());
            exportBtn.disabled = false;
        }
        
        showNotification(`Dashboard exportado em ${format.toUpperCase()} com sucesso!`, 'success');
    }, 2000);
}

// Utility Functions
function refreshDashboard() {
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        refreshBtn.disabled = true;
    }
    
    // Simulate refresh
    setTimeout(() => {
        // Reinitialize charts
        if (window.dashboardCharts) {
            Object.values(window.dashboardCharts).forEach(chart => {
                if (chart && chart.update) {
                    chart.update();
                }
            });
        }
        
        // Update metrics
        updateMetricsCards();
        
        // Reset button
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
            refreshBtn.disabled = false;
        }
        
        showNotification('Dashboard atualizado!', 'success');
    }, 1500);
}

function compareKPIs() {
    showNotification('Funcionalidade de comparação de KPIs em desenvolvimento!', 'info');
}

async function updateChartsWithFilters(filters) {
    console.log('Atualizando gráficos com filtros:', filters);
    
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado, não é possível carregar dados dos gráficos');
        return;
    }

    try {
        // Busca dados do usuário para os gráficos
        const [contratos, receitas, inadimplentes] = await Promise.all([
            window.userDataManager.getUserData('contratos'),
            window.userDataManager.getUserData('receitas'),
            window.userDataManager.getUserData('inadimplentes')
        ]);

        // Atualiza gráfico de receitas
        await updateReceitasChart(receitas, filters);
        
        // Atualiza gráfico de inadimplência
        await updateInadimplenciaChart(contratos, inadimplentes, filters);
        
        // Atualiza gráfico de receitas mensais
        await updateReceitasMensaisChart(receitas, filters);
        
        console.log('Gráficos atualizados com dados reais');
    } catch (error) {
        console.error('Erro ao atualizar gráficos:', error);
    }
}

let autoRefreshInterval;

function setupAutoRefresh(interval) {
    clearAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        refreshDashboard();
    }, interval);
}

function clearAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Initialize dashboard
function initializeDashboard() {
    // Use global authentication system instances
    authManager = window.authManager;
    
    // Setup authentication UI
    authManager.displayUserInfo('.user-info');
    authManager.addLogoutButton('.logout-container');
    
    // Add notification styles
    addNotificationStyles();
    
    // Initialize charts
    const charts = initializeCharts();
    
    // Setup filters
    setupFilters();
    
    // Initialize modals and advanced features
    initializeModals();
    
    // Update metrics with animation
    updateMetricsCards();
    
    // Load real data into charts
    updateChartsWithFilters({});
    
    console.log('Dashboard inicializado com sucesso!');
    
    return charts;
}

// Export for use in other scripts
window.dashboardCharts = null;

// Initialize when DOM is loaded and Chart.js is available
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Chart.js and sidebar to be loaded
    function waitForDependencies() {
        if (typeof Chart !== 'undefined' && window.sidebarMenu) {
            // Initialize dashboard directly - auth-guard.js handles authentication
            console.log('Inicializando dashboard...');
            window.dashboardCharts = initializeDashboard();
        } else {
            console.log('Aguardando dependências carregar... Chart.js:', typeof Chart !== 'undefined', 'Sidebar:', !!window.sidebarMenu);
            setTimeout(waitForDependencies, 100);
        }
    }
    
    waitForDependencies();
});

// Export for use in other scripts
window.getAuthManager = () => authManager;
window.getFirestoreUtils = () => window.firestoreUtils;