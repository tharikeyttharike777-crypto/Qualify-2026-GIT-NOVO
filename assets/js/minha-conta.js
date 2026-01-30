/**
 * Minha Conta - Painel de Gestão Financeira
 * Gerencia todas as funcionalidades da página de gestão financeira
 */

(function() {
    'use strict';

    /**
     * Classe principal para gerenciar o painel Minha Conta
     */
    function MinhaContaManager() {
        this.init();
    }

    /**
     * Inicializa o gerenciador
     */
    MinhaContaManager.prototype.init = function() {
        this.setupElements();
        this.bindEvents();
        this.loadInitialData();
        this.setupMasks();
    };

    /**
     * Configura elementos DOM
     */
    MinhaContaManager.prototype.setupElements = function() {
        // Estados da página
        this.loadingState = document.getElementById('loadingState');
        this.errorState = document.getElementById('errorState');
        this.mainContent = document.getElementById('mainContent');
        
        // Busca rápida
        this.searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
        this.searchInput = document.getElementById('searchInput');
        this.searchIcon = document.getElementById('searchIcon');
        this.searchHelp = document.getElementById('searchHelp');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchResults = document.getElementById('searchResults');
        this.searchTableHead = document.getElementById('searchTableHead');
        this.searchTableBody = document.getElementById('searchTableBody');
        this.noResults = document.getElementById('noResults');
        
        // Dashboard
        this.lastUpdate = document.getElementById('lastUpdate');
        this.totalChargebacks = document.getElementById('totalChargebacks');
        this.lostDisputes = document.getElementById('lostDisputes');
        this.pendingDisputes = document.getElementById('pendingDisputes');
        this.wonDisputes = document.getElementById('wonDisputes');
        this.balanceAmount = document.getElementById('balanceAmount');
        
        // Botões de ação
        this.helpBtn = document.getElementById('helpBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.viewChargebacksBtn = document.getElementById('viewChargebacksBtn');
        this.viewStatementBtn = document.getElementById('viewStatementBtn');
        this.makeTransferBtn = document.getElementById('makeTransferBtn');
        this.reportsBtn = document.getElementById('reportsBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.supportBtn = document.getElementById('supportBtn');
        this.notificationsBtn = document.getElementById('notificationsBtn');
        
        // Toast
        this.notificationToast = document.getElementById('notificationToast');
        this.toastMessage = document.getElementById('toastMessage');
    };

    /**
     * Vincula eventos
     */
    MinhaContaManager.prototype.bindEvents = function() {
        // Busca rápida
        this.searchTypeRadios.forEach(radio => {
            radio.addEventListener('change', this.handleSearchTypeChange.bind(this));
        });
        
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', this.handleSearch.bind(this));
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }
        
        // Botões de ação - verificar se existem antes de adicionar listeners
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', this.showHelp.bind(this));
        }
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', this.refreshData.bind(this));
        }
        if (this.viewChargebacksBtn) {
            this.viewChargebacksBtn.addEventListener('click', this.navigateToChargebacks.bind(this));
        }
        if (this.viewStatementBtn) {
            this.viewStatementBtn.addEventListener('click', this.navigateToStatement.bind(this));
        }
        if (this.makeTransferBtn) {
            this.makeTransferBtn.addEventListener('click', this.navigateToTransfer.bind(this));
        }
        if (this.reportsBtn) {
            this.reportsBtn.addEventListener('click', this.navigateToReports.bind(this));
        }
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', this.navigateToSettings.bind(this));
        }
        if (this.supportBtn) {
            this.supportBtn.addEventListener('click', this.navigateToSupport.bind(this));
        }
        if (this.notificationsBtn) {
            this.notificationsBtn.addEventListener('click', this.navigateToNotifications.bind(this));
        }
    };

    /**
     * Carrega dados iniciais
     */
    MinhaContaManager.prototype.loadInitialData = function() {
        this.showLoading();
        
        // Carrega sem dados fictícios; mostra conteúdo com valores neutros
        setTimeout(() => {
            try {
                this.loadDashboardData();
                this.updateLastUpdate();
                this.showContent();
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                this.showError();
            }
        }, 600);
    };

    /**
     * Configura máscaras de input
     */
    MinhaContaManager.prototype.setupMasks = function() {
        // Máscara será aplicada dinamicamente baseada no tipo de busca
        this.updateSearchMask();
    };

    /**
     * Atualiza máscara do campo de busca
     */
    MinhaContaManager.prototype.updateSearchMask = function() {
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        
        if (searchType === 'cpf-cnpj') {
            this.searchInput.addEventListener('input', this.applyCpfCnpjMask.bind(this));
        } else {
            this.searchInput.removeEventListener('input', this.applyCpfCnpjMask.bind(this));
        }
    };

    /**
     * Aplica máscara de CPF/CNPJ
     */
    MinhaContaManager.prototype.applyCpfCnpjMask = function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            // CPF: 000.000.000-00
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // CNPJ: 00.000.000/0000-00
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        
        e.target.value = value;
    };

    /**
     * Manipula mudança no tipo de busca
     */
    MinhaContaManager.prototype.handleSearchTypeChange = function(e) {
        const searchType = e.target.value;
        const icon = this.searchIcon.querySelector('i');
        
        if (searchType === 'cpf-cnpj') {
            icon.className = 'fas fa-id-card';
            this.searchInput.placeholder = 'Digite o CPF ou CNPJ';
            this.searchHelp.textContent = 'Digite apenas números, sem pontos ou traços';
        } else {
            icon.className = 'fas fa-receipt';
            this.searchInput.placeholder = 'Digite o ID da transação';
            this.searchHelp.textContent = 'Digite o código identificador da transação';
        }
        
        this.searchInput.value = '';
        this.hideSearchResults();
        this.updateSearchMask();
    };

    /**
     * Manipula busca
     */
    MinhaContaManager.prototype.handleSearch = function() {
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const searchValue = this.searchInput.value.trim();
        
        if (!searchValue) {
            this.showNotification('Por favor, digite um valor para buscar', 'warning');
            return;
        }
        
        this.performSearch(searchType, searchValue);
    };

    /**
     * Executa a busca
     */
    MinhaContaManager.prototype.performSearch = function(type, value) {
        this.searchBtn.disabled = true;
        this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Buscando...';
        
        // Simula busca no servidor
        setTimeout(() => {
            const results = this.simulateSearch(type, value);
            this.displaySearchResults(type, results);
            
            this.searchBtn.disabled = false;
            this.searchBtn.innerHTML = '<i class="fas fa-search me-2"></i>Buscar';
        }, 1000);
    };

    /**
     * Simula busca no servidor
     */
    MinhaContaManager.prototype.simulateSearch = function(type, value) {
        if (type === 'cpf-cnpj') {
            return this.simulateCpfCnpjSearch(value);
        } else {
            return this.simulateTransactionSearch(value);
        }
    };

    /**
     * Simula busca por CPF/CNPJ
     */
    MinhaContaManager.prototype.simulateCpfCnpjSearch = function(value) {
        // Removido: não retornar dados fictícios
        return [];
    };

    /**
     * Simula busca por ID de transação
     */
    MinhaContaManager.prototype.simulateTransactionSearch = function(value) {
        // Removido: não retornar dados fictícios
        return [];
    };

    /**
     * Exibe resultados da busca
     */
    MinhaContaManager.prototype.displaySearchResults = function(type, results) {
        if (results.length === 0) {
            this.showNoResults();
            return;
        }
        
        this.buildResultsTable(type, results);
        this.showSearchResults();
    };

    /**
     * Constrói tabela de resultados
     */
    MinhaContaManager.prototype.buildResultsTable = function(type, results) {
        if (type === 'cpf-cnpj') {
            this.buildContractsTable(results);
        } else {
            this.buildTransactionsTable(results);
        }
    };

    /**
     * Constrói tabela de contratos
     */
    MinhaContaManager.prototype.buildContractsTable = function(contracts) {
        this.searchTableHead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Documento</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Ações</th>
            </tr>
        `;
        
        this.searchTableBody.innerHTML = contracts.map(contract => `
            <tr>
                <td><strong>${contract.id}</strong></td>
                <td>${contract.documento}</td>
                <td>${contract.nome}</td>
                <td>
                    <span class="badge bg-${contract.status === 'Ativo' ? 'success' : 'warning'}">
                        ${contract.status}
                    </span>
                </td>
                <td><strong>${contract.valor}</strong></td>
                <td>${contract.vencimento}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="minhaContaManager.viewContract('${contract.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    };

    /**
     * Constrói tabela de transações
     */
    MinhaContaManager.prototype.buildTransactionsTable = function(transactions) {
        this.searchTableHead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Método</th>
                <th>Ações</th>
            </tr>
        `;
        
        this.searchTableBody.innerHTML = transactions.map(transaction => `
            <tr>
                <td><strong>${transaction.id}</strong></td>
                <td>${transaction.data}</td>
                <td>${transaction.tipo}</td>
                <td><strong>${transaction.valor}</strong></td>
                <td>
                    <span class="badge bg-${transaction.status === 'Aprovado' ? 'success' : 'danger'}">
                        ${transaction.status}
                    </span>
                </td>
                <td>${transaction.metodo}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="minhaContaManager.viewTransaction('${transaction.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    };

    /**
     * Carrega dados do dashboard
     */
    MinhaContaManager.prototype.loadDashboardData = function() {
        // Sem dados fictícios: inicializa valores neutros até haver integração real
        const dashboardData = {
            chargebacks: {
                total: 0,
                lost: 0,
                pending: 0,
                won: 0
            },
            balance: 0
        };
        
        this.updateChargebacksData(dashboardData.chargebacks);
        this.updateBalanceData(dashboardData.balance);
    };

    /**
     * Atualiza dados de chargebacks
     */
    MinhaContaManager.prototype.updateChargebacksData = function(data) {
        this.totalChargebacks.textContent = data.total;
        this.lostDisputes.textContent = data.lost;
        this.pendingDisputes.textContent = data.pending;
        this.wonDisputes.textContent = data.won;
    };

    /**
     * Atualiza dados de saldo
     */
    MinhaContaManager.prototype.updateBalanceData = function(balance) {
        this.balanceAmount.textContent = this.formatCurrency(balance);
    };

    /**
     * Formata valor monetário
     */
    MinhaContaManager.prototype.formatCurrency = function(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    /**
     * Atualiza timestamp da última atualização
     */
    MinhaContaManager.prototype.updateLastUpdate = function() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        this.lastUpdate.textContent = timeString;
    };

    /**
     * Mostra estado de carregamento
     */
    MinhaContaManager.prototype.showLoading = function() {
        this.loadingState.classList.remove('d-none');
        this.errorState.classList.add('d-none');
        this.mainContent.classList.add('d-none');
    };

    /**
     * Mostra estado de erro
     */
    MinhaContaManager.prototype.showError = function() {
        this.loadingState.classList.add('d-none');
        this.errorState.classList.remove('d-none');
        this.mainContent.classList.add('d-none');
    };

    /**
     * Mostra conteúdo principal
     */
    MinhaContaManager.prototype.showContent = function() {
        this.loadingState.classList.add('d-none');
        this.errorState.classList.add('d-none');
        this.mainContent.classList.remove('d-none');
    };

    /**
     * Mostra resultados da busca
     */
    MinhaContaManager.prototype.showSearchResults = function() {
        this.searchResults.classList.remove('d-none');
        this.noResults.classList.add('d-none');
    };

    /**
     * Mostra estado sem resultados
     */
    MinhaContaManager.prototype.showNoResults = function() {
        this.searchResults.classList.remove('d-none');
        this.noResults.classList.remove('d-none');
        this.searchTableBody.innerHTML = '';
    };

    /**
     * Esconde resultados da busca
     */
    MinhaContaManager.prototype.hideSearchResults = function() {
        this.searchResults.classList.add('d-none');
        this.noResults.classList.add('d-none');
    };

    /**
     * Atualiza dados
     */
    MinhaContaManager.prototype.refreshData = function() {
        this.refreshBtn.disabled = true;
        this.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        setTimeout(() => {
            this.loadDashboardData();
            this.updateLastUpdate();
            this.refreshBtn.disabled = false;
            this.refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            this.showNotification('Dados atualizados com sucesso!', 'success');
        }, 1000);
    };

    /**
     * Navegação - Métodos de redirecionamento
     */
    MinhaContaManager.prototype.navigateToChargebacks = function() {
        window.location.href = 'chargebacks.html';
    };

    MinhaContaManager.prototype.navigateToStatement = function() {
        window.location.href = 'extrato.html';
    };

    MinhaContaManager.prototype.navigateToTransfer = function() {
        window.location.href = 'transferencia.html';
    };

    MinhaContaManager.prototype.navigateToReports = function() {
        window.location.href = 'relatorios.html';
    };

    MinhaContaManager.prototype.navigateToSettings = function() {
        // Página de configurações foi descontinuada; redireciona para Minha Conta
        if (window.userMenu && window.userMenu.navigateToAccount) {
            window.userMenu.navigateToAccount();
        } else {
            window.location.href = 'minha-conta.html';
        }
    };

    MinhaContaManager.prototype.navigateToSupport = function() {
        window.location.href = 'suporte.html';
    };

    MinhaContaManager.prototype.navigateToNotifications = function() {
        window.location.href = 'notificacoes.html';
    };

    /**
     * Visualizar contrato
     */
    MinhaContaManager.prototype.viewContract = function(contractId) {
        this.showNotification(`Visualizando contrato ${contractId}`, 'info');
        // Implementar navegação para detalhes do contrato
    };

    /**
     * Visualizar transação
     */
    MinhaContaManager.prototype.viewTransaction = function(transactionId) {
        this.showNotification(`Visualizando transação ${transactionId}`, 'info');
        // Implementar navegação para detalhes da transação
    };

    /**
     * Mostra ajuda
     */
    MinhaContaManager.prototype.showHelp = function() {
        this.showNotification('Ajuda: Use as seções para gerenciar suas transações e chargebacks', 'info');
    };

    /**
     * Mostra notificação
     */
    MinhaContaManager.prototype.showNotification = function(message, type = 'info') {
        if (!this.notificationToast) {
            console.warn('Toast notification element not found');
            return;
        }
        
        const iconMap = {
            success: 'fas fa-check-circle text-success',
            warning: 'fas fa-exclamation-triangle text-warning',
            error: 'fas fa-times-circle text-danger',
            info: 'fas fa-info-circle text-primary'
        };
        
        const toastHeader = this.notificationToast.querySelector('.toast-header i');
        if (toastHeader) {
            toastHeader.className = iconMap[type] + ' me-2';
        }
        
        if (this.toastMessage) {
            this.toastMessage.textContent = message;
        }
        
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toast = new bootstrap.Toast(this.notificationToast);
            toast.show();
        } else {
            console.warn('Bootstrap Toast not available');
        }
    };

    // Inicializa quando o DOM estiver carregado
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            try {
                window.minhaContaManager = new MinhaContaManager();
            } catch (error) {
                console.error('Erro ao inicializar MinhaContaManager:', error);
            }
        }, 100);
    });

    // Exporta para uso global
    window.MinhaContaManager = MinhaContaManager;

})();