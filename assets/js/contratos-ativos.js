// Contratos Ativos - Sistema de Gestão
// Este arquivo gerencia a exibição e manipulação de contratos ativos
// Depende de: AuthManager, UserDataManager

// Dados serão carregados dinamicamente do Firestore
let contractsData = [];

// Variáveis globais
let filteredData = [...contractsData];
let currentPage = 1;
let recordsPerPage = 25;
let currentFilters = {};
let sortConfig = { field: null, direction: 'asc' };
let currentContract = null;

// Aguardar dependências estarem disponíveis
function waitForDependencies() {
    return new Promise((resolve) => {
        const checkDependencies = () => {
            const hasAuth = typeof window.AuthManager !== 'undefined' || typeof window.authManager !== 'undefined';
            const hasUserData = typeof window.userDataManager !== 'undefined';
            if (hasAuth && hasUserData) {
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
    console.log('Contratos ativos dependencies loaded successfully');
    initializeContratosAtivos();
}).catch(error => {
    console.error('Failed to load contratos ativos dependencies:', error);
});

function initializeContratosAtivos() {
    initializeEventListeners();
    setupModals();
    // Aguarda multitenant e empresa ativa antes de carregar
    const tryLoad = () => {
        const mt = window.multitenantConfig;
        const hasCompany = mt && typeof mt.getActiveCompany === 'function' && mt.getActiveCompany();
        const isReady = mt && typeof mt.isInitialized === 'function' && mt.isInitialized();
        if (window.userDataManager && isReady && hasCompany) {
            loadData();
            return true;
        }
        return false;
    };

    // Tenta carregar imediatamente se já estiver pronto
    if (!tryLoad()) {
        // Ouve quando o multitenant sinalizar prontidão
        window.addEventListener('multitenantReady', () => {
            tryLoad() || setTimeout(tryLoad, 500);
        }, { once: true });

        // Recarrega ao trocar de empresa
        window.addEventListener('companyChanged', () => {
            // Remove listener anterior e recarrega para a nova empresa
            if (realtimeListenerId) {
                window.userDataManager?.removeListener(realtimeListenerId);
                realtimeListenerId = null;
            }
            tryLoad();
        });

        // Fallback: faz algumas tentativas adicionais em ambientes lentos
        let attempts = 0;
        const maxAttempts = 10; // ~5s
        const interval = setInterval(() => {
            if (tryLoad() || attempts++ >= maxAttempts) {
                clearInterval(interval);
            }
        }, 500);
    }
}

// Load data from Firestore with real-time updates
let realtimeListenerId = null;

async function loadData() {
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado — tentando carregar dados locais');
        if (!loadFallbackFromLocal()) {
            showEmptyState('Faça login para visualizar os dados');
            updateRecordsInfo();
        }
        return;
    }

    try {
        // Mostra loading
        showLoadingState();
        
        // Remove listener anterior se existir
        if (realtimeListenerId) {
            window.userDataManager.removeListener(realtimeListenerId);
        }
        
        // Helper para determinar se um status é considerado "ativo"
        const isActiveStatus = (status) => {
            const s = String(status || '').trim().toLowerCase();
            // Considera ativos tudo que não for explicitamente cancelado/inativo/encerrado
            // Mantém compatibilidade com dados que usam "Emitido", "Orçamento", "Pendente" etc.
            const inactive = ['cancelado', 'inativo', 'encerrado'];
            return s && !inactive.includes(s);
        };

        // Configura listener em tempo real
        realtimeListenerId = window.userDataManager.setupRealtimeListener(
            'contratos',
            (data, error) => {
                if (error) {
                    console.error('Erro no listener de contratos:', error);
                    // Fallback em caso de erro: tenta carregar contratos a partir das famílias (Firestore) e depois local
                    loadFromFamiliesFirestore().catch(() => {
                        if (!loadFallbackFromLocal()) {
                            showEmptyState('Erro ao carregar dados');
                        }
                    });
                    return;
                }
                
                // Filtra apenas contratos ativos (compatível com vários valores de status)
                const activeContracts = (Array.isArray(data) ? data : [])
                    .map(mapContractShape)
                    .filter(contract => isActiveStatus(contract.status));
                
                contractsData.length = 0; // Limpa array
                contractsData.push(...activeContracts);
                filteredData = [...contractsData];
                
                if (contractsData.length === 0) {
                    // Se a coleção "contratos" está vazia, tenta compor a lista a partir das famílias
                    loadFromFamiliesFirestore().then((ok) => {
                        if (!ok) {
                            // Como último recurso, tenta dados locais
                            if (!loadFallbackFromLocal()) {
                                showEmptyState('Nenhum contrato ativo encontrado');
                            }
                        }
                    });
                } else {
                    hideLoadingState();
                    applyFilters();
                    updateTable();
                    updateRecordsInfo();
                }
            },
            {
                orderBy: { field: 'date', direction: 'desc' }
            }
        );
        
        if (!realtimeListenerId) {
            throw new Error('Falha ao configurar listener em tempo real');
        }
    } catch (error) {
        console.error('Erro ao carregar dados de contratos ativos:', error);
        showEmptyState('Erro ao carregar dados. Tente novamente.');
        updateRecordsInfo();
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#contracts-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#contracts-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">${message}</td></tr>`;
    }
    
    // Limpa paginação
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.innerHTML = '';
    }
}

// Configurar event listeners
function initializeEventListeners() {
    // Botões principais
    document.getElementById('filterBtn')?.addEventListener('click', openFilterModal);
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    
    // Paginação
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', handlePagination);
    });
    
    // Registros por página
    document.getElementById('recordsPerPage')?.addEventListener('change', function() {
        recordsPerPage = parseInt(this.value);
        currentPage = 1;
        renderTable();
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Busca rápida
    const quickSearchInput = document.getElementById('quickSearchInput');
    if (quickSearchInput) {
        const onQuickSearch = () => {
            currentFilters.search = quickSearchInput.value.trim();
            filterData();
            currentPage = 1;
            renderTable();
        };
        quickSearchInput.addEventListener('input', debounce(onQuickSearch, 300));
    }
}

// Configurar modais
function setupModals() {
    // Modal de filtros
    document.getElementById('closeFilterModal')?.addEventListener('click', closeFilterModal);
    document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    
    // Modal de detalhes
    document.getElementById('closeDetailsModal')?.addEventListener('click', closeDetailsModal);
    document.getElementById('editContractBtn')?.addEventListener('click', editCurrentContract);
    document.getElementById('cancelContractBtn')?.addEventListener('click', cancelCurrentContract);
    document.getElementById('printContractBtn')?.addEventListener('click', printCurrentContract);
    
    // Modal de novo contrato
    document.getElementById('closeNewContractModal')?.addEventListener('click', closeNewContractModal);
    document.getElementById('cancelNewContractBtn')?.addEventListener('click', closeNewContractModal);
    document.getElementById('saveNewContractBtn')?.addEventListener('click', saveNewContract);
    
    // Tabs do modal de detalhes
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchDetailTab(this.dataset.tab);
        });
    });
    
    // Fechar modal clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
}

// Renderizar tabela
function renderTable() {
    const tableBody = document.querySelector('#contracts-table tbody');
    if (!tableBody) return;

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    const getStatusClass = (status) => {
        const s = String(status || '').toLowerCase();
        if (['emitido','ativo','assinado','vigente'].includes(s)) return 'status-emitido';
        if (['orcamento','orçamento','proposta'].includes(s)) return 'status-orcamento';
        if (['pendente','atrasado','em aberto'].includes(s)) return 'status-pendente';
        if (['pago','quitado'].includes(s)) return 'status-pago';
        if (['cancelado','inativo','encerrado'].includes(s)) return 'status-cancelado';
        return 'status-orcamento';
    };

    tableBody.innerHTML = currentData.map(contract => `
        <tr onclick="viewContract('${contract.id}')" style="cursor: pointer;">
            <td>
                <div class="action-cell">
                    <button class="action-btn btn-edit" onclick="event.stopPropagation(); editContract('${contract.id}')" title="Editar" aria-label="Editar">
                        <i class="fas fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn btn-view" onclick="event.stopPropagation(); viewContract('${contract.id}')" title="Visualizar" aria-label="Visualizar">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
            <td>${contract.id}</td>
            <td>${contract.date || '-'}</td>
            <td>${contract.titular || '-'}</td>
            <td>${contract.plano || '-'}</td>
            <td>
                <span class="status-badge ${getStatusClass(contract.status)}">
                    ${contract.status || '-'}
                </span>
            </td>
            <td>${contract.vendedor || '—'}</td>
            <td class="currency">${contract.valorTotal || 'R$ 0,00'}</td>
            <td>${contract.parcelas || 0}</td>
            <td>
                <button class="details-btn" onclick="event.stopPropagation(); showDetails('${contract.id}')" title="Ver detalhes" aria-label="Ver detalhes">
                    <i class="fas fa-info-circle" aria-hidden="true"></i>
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination();
    updateRecordsInfo();
}

// Wrapper de compatibilidade usado em outras partes do arquivo
function updateTable() { renderTable(); }

// Atualizar informações de registros
function updateRecordsInfo() {
    const totalRecords = filteredData.length;
    document.getElementById('totalRecords').textContent = totalRecords;
}

// Atualizar paginação
function updatePagination() {
    const totalRecords = filteredData.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Atualizar botões de paginação
    const pageButtons = document.querySelectorAll('.page-btn');
    pageButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page == currentPage) {
            btn.classList.add('active');
        }
        
        // Desabilitar botões conforme necessário
        if (btn.dataset.page === 'first' || btn.dataset.page === 'prev') {
            btn.disabled = currentPage === 1;
        }
        if (btn.dataset.page === 'last' || btn.dataset.page === 'next') {
            btn.disabled = currentPage === totalPages;
        }
    });
}

// Manipular paginação
function handlePagination(e) {
    const page = e.target.dataset.page;
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    
    if (page === 'first') currentPage = 1;
    else if (page === 'prev') currentPage = Math.max(1, currentPage - 1);
    else if (page === 'next') currentPage = Math.min(totalPages, currentPage + 1);
    else if (page === 'last') currentPage = totalPages;
    else currentPage = parseInt(page);
    
    renderTable();
}

// Funções de modal de filtros
function openFilterModal() {
    document.getElementById('filterModal')?.classList.add('show');
    populateFilterForm();
}

function closeFilterModal() {
    document.getElementById('filterModal')?.classList.remove('show');
}

function populateFilterForm() {
    // Preencher formulário com filtros atuais
    Object.keys(currentFilters).forEach(key => {
        const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (element) {
            element.value = currentFilters[key];
        }
    });
}

function applyFilters() {
    currentFilters = {
        contractNumber: document.getElementById('filterContractNumber')?.value || '',
        dateFrom: document.getElementById('filterDateFrom')?.value || '',
        dateTo: document.getElementById('filterDateTo')?.value || '',
        titular: document.getElementById('filterTitular')?.value || '',
        plano: document.getElementById('filterPlano')?.value || '',
        status: document.getElementById('filterStatus')?.value || '',
        vendedor: document.getElementById('filterVendedor')?.value || '',
        valorMin: parseFloat(document.getElementById('filterValorMin')?.value) || 0,
        valorMax: parseFloat(document.getElementById('filterValorMax')?.value) || Infinity
    };
    // Preserva termo da busca rápida
    const quickSearchInput = document.getElementById('quickSearchInput');
    currentFilters.search = quickSearchInput?.value.trim() || currentFilters.search || '';
    
    filterData();
    closeFilterModal();
    currentPage = 1;
    renderTable();
    showMessage('Filtros aplicados com sucesso!', 'success');
}

function clearFilters() {
    currentFilters = {};
    document.querySelectorAll('.filter-group input, .filter-group select').forEach(input => {
        input.value = '';
    });
    const quickSearchInput = document.getElementById('quickSearchInput');
    if (quickSearchInput) quickSearchInput.value = '';
    filteredData = [...contractsData];
    currentPage = 1;
    renderTable();
    showMessage('Filtros removidos!', 'info');
}

function filterData() {
    filteredData = contractsData.filter(contract => {
        // Busca rápida (termo livre)
        if (currentFilters.search && currentFilters.search.trim() !== '') {
            const s = currentFilters.search.toLowerCase();
            const haystack = [
                contract.id?.toString() || '',
                contract.titular || '',
                contract.plano || '',
                contract.vendedor || '',
                contract.status || ''
            ].map(v => v.toString().toLowerCase());
            const matchesAny = haystack.some(v => v.includes(s));
            if (!matchesAny) return false;
        }
        // Filtro por número do contrato
        if (currentFilters.contractNumber && !contract.id.toString().includes(currentFilters.contractNumber)) {
            return false;
        }
        
        // Filtro por titular
        if (currentFilters.titular && !contract.titular.toLowerCase().includes(currentFilters.titular.toLowerCase())) {
            return false;
        }
        
        // Filtro por plano
        if (currentFilters.plano && contract.plano !== currentFilters.plano) {
            return false;
        }
        
        // Filtro por status
        if (currentFilters.status && contract.status !== currentFilters.status) {
            return false;
        }
        
        // Filtro por vendedor
        if (currentFilters.vendedor && !contract.vendedor.toLowerCase().includes(currentFilters.vendedor.toLowerCase())) {
            return false;
        }
        
        // Filtro por valor (robusto para diferentes formatos)
        const valor = parseFloat(String(contract.valorTotal || '0').replace('R$', '').replace(/\s/g,'').replace(/[.]/g,'').replace(',', '.')) || 0;
        if (valor < currentFilters.valorMin || valor > currentFilters.valorMax) {
            return false;
        }
        
        return true;
    });
}

// Utilitário: debounce
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Funções de modal de detalhes
function openDetailsModal(contract) {
    currentContract = contract;
    document.getElementById('detailsModal')?.classList.add('show');
    populateDetailsModal(contract);
}

function closeDetailsModal() {
    document.getElementById('detailsModal')?.classList.remove('show');
    currentContract = null;
}

function populateDetailsModal(contract) {
    // Informações básicas
    document.getElementById('detailContractId').textContent = contract.id;
    document.getElementById('detailDate').textContent = contract.date;
    document.getElementById('detailTitular').textContent = contract.titular;
    document.getElementById('detailCpf').textContent = contract.cpf;
    document.getElementById('detailPlano').textContent = contract.plano;
    document.getElementById('detailStatus').textContent = contract.status;
    document.getElementById('detailVendedor').textContent = contract.vendedor;
    document.getElementById('detailValorTotal').textContent = contract.valorTotal;
    document.getElementById('detailParcelas').textContent = contract.parcelas;
    document.getElementById('detailObservacoes').textContent = contract.observacoes;
    
    // Histórico de pagamentos
    populatePaymentHistory(contract.payments || []);
    
    // Histórico do contrato
    populateContractHistory(contract.history || []);
}

function populatePaymentHistory(payments) {
    const tbody = document.getElementById('paymentHistoryBody');
    if (!tbody) return;
    
    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>${payment.parcela}</td>
            <td>R$ ${payment.valor.toFixed(2).replace('.', ',')}</td>
            <td>${payment.vencimento}</td>
            <td><span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></td>
            <td>${payment.dataPagamento || '-'}</td>
        </tr>
    `).join('');
}

function populateContractHistory(history) {
    const tbody = document.getElementById('contractHistoryBody');
    if (!tbody) return;
    
    tbody.innerHTML = history.map(item => `
        <tr>
            <td>${item.data}</td>
            <td>${item.acao}</td>
            <td>${item.usuario}</td>
        </tr>
    `).join('');
}

function switchDetailTab(tabName) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Adicionar classe active na tab clicada
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Mostrar/ocultar conteúdo das tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Funções de ação do modal de detalhes
function editCurrentContract() {
    if (currentContract) {
        editContract(currentContract.id);
        closeDetailsModal();
    }
}

function cancelCurrentContract() {
    if (currentContract && confirm('Tem certeza que deseja cancelar este contrato?')) {
        // Implementar lógica de cancelamento
        showMessage(`Contrato ${currentContract.id} cancelado!`, 'warning');
        closeDetailsModal();
    }
}

function printCurrentContract() {
    if (currentContract) {
        showMessage(`Imprimindo contrato ${currentContract.id}...`, 'info');
        // Implementar lógica de impressão
        window.print();
    }
}

// Funções de modal de novo contrato
function openNewContractModal() {
    document.getElementById('newContractModal')?.classList.add('show');
    clearNewContractForm();
}

function closeNewContractModal() {
    document.getElementById('newContractModal')?.classList.remove('show');
}

function clearNewContractForm() {
    document.getElementById('newContractForm')?.reset();
}

function saveNewContract() {
    const form = document.getElementById('newContractForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const newContract = {
        id: Math.max(...contractsData.map(c => c.id)) + 1,
        date: new Date().toLocaleDateString('pt-BR'),
        titular: document.getElementById('newTitular').value,
        cpf: document.getElementById('newCpf').value,
        plano: document.getElementById('newPlano').value,
        status: 'Orçamento',
        vendedor: document.getElementById('newVendedor').value,
        valorTotal: `R$ ${parseFloat(document.getElementById('newValorTotal').value).toFixed(2).replace('.', ',')}`,
        parcelas: parseInt(document.getElementById('newParcelas').value),
        statusIcon: '⏳',
        dataInicio: document.getElementById('newDataInicio').value,
        observacoes: document.getElementById('newObservacoes').value,
        payments: [],
        history: [
            {
                data: new Date().toLocaleDateString('pt-BR'),
                acao: 'Contrato criado',
                usuario: document.getElementById('newVendedor').value
            }
        ]
    };
    
    contractsData.push(newContract);
    filteredData = [...contractsData];
    renderTable();
    closeNewContractModal();
    showMessage('Contrato criado com sucesso!', 'success');
}

// Funções CRUD
function viewContract(id) {
    const contract = contractsData.find(c => c.id === id);
    if (contract) {
        openContractDetailsModal(contract);
    }
}

function openContractDetailsModal(contract) {
    currentContract = contract;
    document.getElementById('contractDetailsModal')?.classList.add('show');
    document.getElementById('contractDetailNumber').textContent = contract.id;
    
    // Preencher informações gerais
    const infoContent = document.getElementById('contractInfo');
    if (infoContent) {
        infoContent.innerHTML = `
            <div class="contract-info-grid">
                <div class="info-item">
                    <label>Titular:</label>
                    <span>${contract.titular}</span>
                </div>
                <div class="info-item">
                    <label>CPF:</label>
                    <span>${contract.cpf}</span>
                </div>
                <div class="info-item">
                    <label>Plano:</label>
                    <span>${contract.plano}</span>
                </div>
                <div class="info-item">
                    <label>Status:</label>
                    <span class="status-badge status-${contract.status.toLowerCase().replace(' ', '-')}">${contract.status}</span>
                </div>
                <div class="info-item">
                    <label>Vendedor:</label>
                    <span>${contract.vendedor}</span>
                </div>
                <div class="info-item">
                    <label>Valor Total:</label>
                    <span>${contract.valorTotal}</span>
                </div>
                <div class="info-item">
                    <label>Parcelas:</label>
                    <span>${contract.parcelas}</span>
                </div>
                <div class="info-item">
                    <label>Data de Início:</label>
                    <span>${contract.dataInicio}</span>
                </div>
                <div class="info-item full-width">
                    <label>Observações:</label>
                    <span>${contract.observacoes || 'Nenhuma observação'}</span>
                </div>
            </div>
        `;
    }
    
    // Preencher pagamentos
    const paymentsContent = document.getElementById('contractPayments');
    if (paymentsContent) {
        const payments = contract.payments || [];
        paymentsContent.innerHTML = `
            <div class="payments-table">
                <table>
                    <thead>
                        <tr>
                            <th>Parcela</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th>Data Pagamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${payment.parcela}</td>
                                <td>R$ ${payment.valor.toFixed(2).replace('.', ',')}</td>
                                <td>${payment.vencimento}</td>
                                <td><span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></td>
                                <td>${payment.dataPagamento || '-'}</td>
                            </tr>
                        `).join('')}
                        ${payments.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #666;">Nenhum pagamento registrado</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Preencher histórico
    const historyContent = document.getElementById('contractHistory');
    if (historyContent) {
        const history = contract.history || [];
        historyContent.innerHTML = `
            <div class="history-table">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ação</th>
                            <th>Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(item => `
                            <tr>
                                <td>${item.data}</td>
                                <td>${item.acao}</td>
                                <td>${item.usuario}</td>
                            </tr>
                        `).join('')}
                        ${history.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: #666;">Nenhum histórico disponível</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
}

function editContract(id) {
    const contract = contractsData.find(c => c.id === id);
    if (contract) {
        // Abrir modal de edição (similar ao de novo contrato, mas preenchido)
        openEditContractModal(contract);
    }
}

function openEditContractModal(contract) {
    // Por simplicidade, vamos usar um prompt para edição
    const newTitular = prompt('Titular:', contract.titular);
    if (newTitular && newTitular !== contract.titular) {
        contract.titular = newTitular;
        contract.history.push({
            data: new Date().toLocaleDateString('pt-BR'),
            acao: 'Titular alterado',
            usuario: 'Sistema'
        });
        renderTable();
        showMessage('Contrato atualizado com sucesso!', 'success');
    }
}

function deleteContract(id) {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
        const index = contractsData.findIndex(c => c.id === id);
        if (index > -1) {
            contractsData.splice(index, 1);
            filteredData = [...contractsData];
            renderTable();
            showMessage('Contrato excluído com sucesso!', 'success');
        }
    }
}

// Funções utilitárias
function showOptionsMenu() {
    const options = [
        'Exportar para Excel',
        'Importar contratos',
        'Configurações',
        'Relatórios avançados'
    ];
    
    const choice = prompt(`Escolha uma opção:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`);
    
    switch(choice) {
        case '1':
            exportData();
            break;
        case '2':
            showMessage('Funcionalidade de importação será implementada', 'info');
            break;
        case '3':
            showMessage('Configurações serão implementadas', 'info');
            break;
        case '4':
            showMessage('Relatórios avançados serão implementados', 'info');
            break;
        default:
            if (choice) showMessage('Opção inválida', 'error');
    }
}

function exportData() {
    try {
        const data = filteredData.length > 0 ? filteredData : contractsData;
        if (!data || data.length === 0) {
            showMessage('Nenhum contrato para exportar', 'warning');
            return;
        }

        const jsPDF = window.jspdf?.jsPDF;
        const hasJsPDF = typeof jsPDF === 'function';
        const hasJSZip = typeof window.JSZip === 'function';

        if (!hasJsPDF) {
            showMessage('Biblioteca jsPDF não carregada. Verifique sua conexão.', 'error');
            return;
        }

        const pdfBlobs = [];
        data.forEach(contract => {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const left = 40; let top = 50; const line = 20;
            doc.setFontSize(16);
            doc.text(`Contrato #${contract.id}`, left, top); top += line * 2;
            doc.setFontSize(12);
            const rows = [
                `Data: ${contract.date || '-'}`,
                `Titular: ${contract.titular || '-'}`,
                `CPF: ${contract.cpf || '-'}`,
                `Plano: ${contract.plano || '-'}`,
                `Status: ${contract.status || '-'}`,
                `Vendedor: ${contract.vendedor || '-'}`,
                `Valor total: ${contract.valorTotal || '-'}`,
                `Parcelas: ${contract.parcelas || '-'}`,
            ];
            rows.forEach(text => { doc.text(text, left, top); top += line; });

            if (contract.observacoes) {
                top += line;
                doc.text('Observações:', left, top); top += line;
                const split = doc.splitTextToSize(String(contract.observacoes), 500);
                doc.text(split, left, top);
            }

            const blob = doc.output('blob');
            pdfBlobs.push({ filename: `contrato-${contract.id}.pdf`, blob });
        });

        if (pdfBlobs.length === 1) {
            const { filename, blob } = pdfBlobs[0];
            downloadBlob(blob, filename);
            showMessage('PDF gerado com sucesso!', 'success');
            return;
        }

        if (!hasJSZip) {
            const { filename, blob } = pdfBlobs[0];
            downloadBlob(blob, filename);
            showMessage('JSZip não carregado. Baixando apenas o primeiro PDF.', 'warning');
            return;
        }

        const zip = new window.JSZip();
        pdfBlobs.forEach(({ filename, blob }) => zip.file(filename, blob));
        zip.generateAsync({ type: 'blob' }).then(zipBlob => {
            downloadBlob(zipBlob, `contratos_ativos_${new Date().toISOString().slice(0,10)}.zip`);
            showMessage('ZIP com PDFs gerado com sucesso!', 'success');
        }).catch(err => {
            console.error('Erro ao gerar ZIP:', err);
            showMessage('Erro ao gerar ZIP de PDFs', 'error');
        });
    } catch (error) {
        console.error('Erro ao exportar PDFs:', error);
        showMessage('Erro ao exportar PDFs', 'error');
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function switchTab(tabName) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Adicionar classe active na tab clicada
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    if (tabName === 'relatorios') {
        showMessage('Seção de relatórios será implementada', 'info');
    }
}

function switchDetailTab(tabName) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Adicionar classe active na tab clicada
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Mostrar/ocultar conteúdo das tabs
    document.querySelectorAll('.detail-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`contract${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`)?.classList.add('active');
}

// Sistema de mensagens
function showMessage(message, type = 'info') {
    // Criar elemento de mensagem se não existir
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(messageContainer);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.style.cssText = `
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    
    // Cores por tipo
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    messageElement.style.backgroundColor = colors[type] || colors.info;
    messageElement.textContent = message;
    
    // Remover mensagem ao clicar
    messageElement.addEventListener('click', () => {
        messageElement.remove();
    });
    
    messageContainer.appendChild(messageElement);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
}

// Adicionar estilos CSS dinamicamente
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .contract-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .info-item.full-width {
            grid-column: 1 / -1;
        }
        
        .info-item label {
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        
        .info-item span {
            color: #666;
            font-size: 14px;
        }
        
        .payments-table table,
        .history-table table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .payments-table th,
        .payments-table td,
        .history-table th,
        .history-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        .payments-table th,
        .history-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .status-emitido { background: #d4edda; color: #155724; }
        .status-orçamento { background: #fff3cd; color: #856404; }
        .status-pendente { background: #f8d7da; color: #721c24; }
        .status-pago { background: #d4edda; color: #155724; }
        .status-cancelado { background: #f8d7da; color: #721c24; }
    `;
    document.head.appendChild(style);
}

// Inicializar estilos dinâmicos
addDynamicStyles();

// Funções de ação dos contratos
function editContract(contractId) {
    showMessage(`Editando contrato ${contractId}`, 'success');
    // Implementar lógica de edição
}

function viewContract(contractId) {
    showMessage(`Visualizando contrato ${contractId}`, 'info');
    // Implementar lógica de visualização
}

function showDetails(contractId) {
    const contract = contractsData.find(c => c.id === contractId);
    if (contract) {
        const details = `
            Contrato: ${contract.id}\n
            Titular: ${contract.titular}\n
            Plano: ${contract.plano}\n
            Status: ${contract.status}\n
            Vendedor: ${contract.vendedor}\n
            Valor Total: ${contract.valorTotal}\n
            Parcelas: ${contract.parcelas}
        `;
        alert(details);
    }
}

// Função para exibir mensagens
function showMessage(message, type = 'info') {
    // Criar elemento de mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Estilos da mensagem
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // Cores baseadas no tipo
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    messageDiv.style.backgroundColor = colors[type] || colors.info;
    
    // Adicionar ao DOM
    document.body.appendChild(messageDiv);
    
    // Remover após 3 segundos
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Função para filtrar contratos (exemplo)
function filterContracts(searchTerm) {
    if (!searchTerm) {
        filteredData = [...contractsData];
    } else {
        const s = String(searchTerm || '').toLowerCase();
        filteredData = contractsData.filter(contract => 
            String(contract.titular || '').toLowerCase().includes(s) ||
            String(contract.plano || '').toLowerCase().includes(s) ||
            String(contract.vendedor || '').toLowerCase().includes(s) ||
            String(contract.id || '').toLowerCase().includes(s)
        );
    }
    
    currentPage = 1;
    renderTable();
    updatePaginationInfo();
    updateActivePage();
}

// Informações adicionais de paginação (compatibilidade)
function updatePaginationInfo() {
    // Já atualizamos total de registros em updateRecordsInfo
    // Esta função é mantida por compatibilidade com chamadas existentes
}

function updateActivePage() {
    // O estado ativo de botões é manipulado em updatePagination
}

// Normaliza o formato de contratos para a tabela
function mapContractShape(contract) {
    if (!contract) return {};
    return {
        id: String(contract.id ?? contract.numero ?? '').trim(),
        numero: String(contract.numero ?? contract.id ?? '').trim(),
        date: contract.date ?? contract.data ?? contract.dataInicio ?? '-',
        titular: contract.titular ?? '-',
        cpf: contract.cpf ?? '',
        plano: contract.plano ?? '-',
        status: contract.status ?? 'ativo',
        vendedor: contract.vendedor ?? '—',
        valorTotal: contract.valorTotal ?? 'R$ 0,00',
        parcelas: contract.parcelas ?? 0,
        payments: Array.isArray(contract.payments) ? contract.payments : [],
        history: Array.isArray(contract.history) ? contract.history : [],
        observacoes: contract.observacoes ?? ''
    };
}

// Fallback a partir de dados locais (familias)
function loadFallbackFromLocal() {
    try {
        const raw = localStorage.getItem('familias');
        if (!raw) return false;
        const familias = JSON.parse(raw);
        if (!Array.isArray(familias) || familias.length === 0) return false;

        const flattened = [];
        familias.forEach(fam => {
            const contratos = Array.isArray(fam.contratos) ? fam.contratos : [];
            contratos.forEach(ct => {
                const numeroRaw = ct.numero || ct.id || '';
                const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
                const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : Date.now();
                flattened.push(mapContractShape({
                    id: numeroNumerico,
                    numero: String(numeroRaw || numeroNumerico),
                    date: ct.dataInicio || new Date().toLocaleDateString('pt-BR'),
                    titular: fam?.titular?.nome || fam?.titular || '-',
                    cpf: fam?.titular?.cpf || '',
                    plano: ct.plano || '',
                    status: ct.status || 'ativo',
                    vendedor: ct.vendedor || '—',
                    valorTotal: ct.valorTotal || 'R$ 0,00',
                    parcelas: ct.parcelas || 0,
                    familyId: String(fam.id || '')
                }));
            });
        });

        // Helper igual ao usado no listener
        const isActiveStatus = (status) => {
            const s = String(status || '').trim().toLowerCase();
            const inactive = ['cancelado', 'inativo', 'encerrado'];
            return s && !inactive.includes(s);
        };

        contractsData.length = 0;
        contractsData.push(...flattened.filter(c => isActiveStatus(c.status)));
        filteredData = [...contractsData];

        if (contractsData.length === 0) {
            showEmptyState('Nenhum contrato ativo encontrado (dados locais)');
        } else {
            hideLoadingState();
            applyFilters();
            renderTable();
            updateRecordsInfo();
        }
        return true;
    } catch (e) {
        console.warn('Falha ao carregar fallback local de contratos:', e);
        return false;
    }
}

// Fallback: Carrega contratos a partir da coleção de famílias no Firestore (por empresa)
async function loadFromFamiliesFirestore() {
    try {
        // Verifica se o multitenant está pronto e há empresa ativa
        const mt = window.multitenantConfig;
        const ready = mt && typeof mt.getCompanyCollection === 'function' && mt.getActiveCompany();
        if (!ready) {
            return false;
        }

        // Mostra loading enquanto consulta famílias
        showLoadingState();

        const familiasSnap = await mt.getCompanyCollection('familias').get();
        const flattened = [];
        familiasSnap.forEach(doc => {
            const fam = { id: doc.id, ...(doc.data() || {}) };
            const contratos = Array.isArray(fam.contratos) ? fam.contratos : [];
            contratos.forEach(ct => {
                const numeroRaw = ct.numero || ct.id || '';
                const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
                const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : Date.now();
                flattened.push(mapContractShape({
                    id: numeroNumerico,
                    numero: String(numeroRaw || numeroNumerico),
                    date: ct.dataInicio || new Date().toLocaleDateString('pt-BR'),
                    titular: fam?.titular?.nome || fam?.titular || '-',
                    cpf: fam?.titular?.cpf || '',
                    plano: ct.plano || '',
                    status: ct.status || 'ativo',
                    vendedor: ct.vendedor || '—',
                    valorTotal: ct.valorTotal || 'R$ 0,00',
                    parcelas: ct.parcelas || 0,
                    familyId: String(fam.id || '')
                }));
            });
        });

        // Helper igual ao usado no listener
        const isActiveStatus = (status) => {
            const s = String(status || '').trim().toLowerCase();
            const inactive = ['cancelado', 'inativo', 'encerrado'];
            return s && !inactive.includes(s);
        };

        contractsData.length = 0;
        contractsData.push(...flattened.filter(c => isActiveStatus(c.status)));
        filteredData = [...contractsData];

        if (contractsData.length === 0) {
            showEmptyState('Nenhum contrato ativo encontrado (famílias)');
            updateRecordsInfo();
            return false;
        }

        hideLoadingState();
        applyFilters();
        updateTable();
        updateRecordsInfo();
        return true;
    } catch (e) {
        console.warn('Falha ao carregar contratos a partir das famílias (Firestore):', e);
        return false;
    }
}

// Função para inicializar importação
function initializeImport() {
    if (typeof ExcelImportManager === 'undefined') {
        console.warn('ExcelImportManager não está disponível - funcionalidade de importação desabilitada');
        return;
    }
    
    const fieldMappings = {
        'numero_contrato': 'Número do Contrato',
        'nome_cliente': 'Nome do Cliente',
        'cpf_cnpj': 'CPF/CNPJ',
        'data_inicio': 'Data de Início',
        'data_vencimento': 'Data de Vencimento',
        'valor_mensal': 'Valor Mensal',
        'status': 'Status',
        'observacoes': 'Observações'
    };
    
    const importCallbacks = {
        onSuccess: (data) => {
            console.log('Dados importados com sucesso:', data);
            renderTable(); // Atualizar tabela após importação
        },
        onError: (error) => {
            console.error('Erro na importação:', error);
        }
    };
    
    ExcelImportManager.showImportInterface(fieldMappings, importCallbacks);
}

// Exportar funções para uso global
window.editContract = editContract;
window.viewContract = viewContract;
window.showDetails = showDetails;
window.filterContracts = filterContracts;