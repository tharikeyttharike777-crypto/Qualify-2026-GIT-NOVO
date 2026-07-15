// Contratos Mensalidades JavaScript

// Firestore está disponível globalmente através do firebase-config.js

// Função para carregar e exibir as mensalidades
async function carregarMensalidades() {
    const tabelaCorpo = document.getElementById('duplicatesTableBody'); // Dê um ID ao <tbody> da sua tabela

    if (!tabelaCorpo) {
        console.warn('Elemento tbody com ID "duplicatesTableBody" não encontrado - funcionalidade de duplicatas desabilitada');
        return;
    }

    try {
        // Aguarda o sistema multitenant estar disponível
        if (!window.multitenantConfig) {
            console.warn('Sistema multitenant não disponível');
            return;
        }

        // Busca os dados da coleção "mensalidades" usando o sistema multitenant
        const snapshot = await window.multitenantConfig.getCompanyCollection('mensalidades').get();

        // Limpa a tabela antes de adicionar os novos dados
        tabelaCorpo.innerHTML = '';

        if (snapshot.empty) {
            return fallbackCarregarMensalidadesLocais(tabelaCorpo);
        }

        // Processa cada documento e adiciona à tabela
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');

            // Formata a data de vencimento
            const vencimento = data.vencimento ? new Date(data.vencimento.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A';
            const recebimento = data.recebimento ? new Date(data.recebimento.seconds * 1000).toLocaleDateString('pt-BR') : '-';

            // Formata o valor
            const valor = data.valor ? `R$ ${data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00';
            const valorRecebido = data.valorRecebido ? `R$ ${data.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00';

            // Define a classe CSS baseada no status
            const statusClass = data.status === 'pago' ? 'status-pago' :
                data.status === 'vencido' ? 'status-vencido' :
                    data.status === 'cancelado' ? 'status-cancelado' : 'status-pendente';

            row.innerHTML = `
                <td><input type="checkbox" value="${doc.id}"></td>
                <td>${data.numero || 'N/A'}</td>
                <td>${data.contrato || 'N/A'}</td>
                <td>${data.titular || 'N/A'}</td>
                <td>${vencimento}</td>
                <td>${valor}</td>
                <td>${recebimento}</td>
                <td>${valorRecebido}</td>
                <td><span class="status ${statusClass}">${data.status || 'pendente'}</span></td>
                <td>${data.formaPagamento || '-'}</td>
            `;

            tabelaCorpo.appendChild(row);
        });

        console.log('Mensalidades carregadas com sucesso do Firebase!');

    } catch (error) {
        console.error('Erro ao carregar mensalidades:', error);
        tabelaCorpo.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Erro ao carregar dados</td></tr>';
    }
}

function fallbackCarregarMensalidadesLocais(tabelaCorpo) {
    try {
        tabelaCorpo.innerHTML = '';
        const familias = JSON.parse(localStorage.getItem('familias') || '[]') || [];
        const rows = [];
        const fmtBR = (d) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch (_) { return d || '—'; } };
        const money = (v) => { const n = Number(v); return 'R$ ' + (Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'); };
        familias.forEach(f => {
            const contratos = Array.isArray(f.contratos) ? f.contratos : [];
            contratos.forEach(ct => {
                let charges = Array.isArray(ct.cobrancasAbertas) ? ct.cobrancasAbertas : [];
                if (charges.length === 0 && ct.parcelas && ct.valor && ct.dataInicio) {
                    try {
                        const start = new Date(ct.dataInicio);
                        for (let i = 0; i < Number(ct.parcelas); i++) {
                            const d = new Date(start); d.setMonth(d.getMonth() + i);
                            charges.push({ id: i + 1, vencimento: d.toISOString().slice(0, 10), valor: Number(String(ct.valor).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,/g, '.')), metodo: ct.formaPagamento || 'boleto' });
                        }
                    } catch (_) { }
                }
                charges.forEach(c => {
                    rows.push({ numero: c.id, contrato: ct.numero, titular: f.titular?.nome || f.titular || '—', vencimento: c.vencimento, valor: c.valor, recebimento: null, valorRecebido: null, formaPagamento: c.metodo || '—', status: 'pendente' });
                });
            });
        });
        if (rows.length === 0) { tabelaCorpo.innerHTML = '<tr><td colspan="9" class="text-center">Nenhuma mensalidade encontrada</td></tr>'; return; }
        rows.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="checkbox" value="${r.contrato}-${r.numero}"></td><td>${r.contrato}</td><td>${r.titular}</td><td>${fmtBR(r.vencimento)}</td><td>${money(r.valor)}</td><td>${r.recebimento ? fmtBR(r.recebimento) : '-'}</td><td>${r.valorRecebido ? money(r.valorRecebido) : 'R$ 0,00'}</td><td>${r.formaPagamento}</td><td><span class="status status-pendente">pendente</span></td>`;
            tabelaCorpo.appendChild(tr);
        });
        document.getElementById('noDataMessage')?.classList.add('hidden');
        document.getElementById('recordsCount')?.textContent = String(rows.length);
    } catch (e) { tabelaCorpo.innerHTML = '<tr><td colspan="9" class="text-center">Erro ao carregar dados locais</td></tr>'; }
}

// Dados carregados dinamicamente do Firestore
const sampleDuplicates = [];

// Estado da aplicação
let currentDuplicates = [...sampleDuplicates];
let filteredDuplicates = [];
let selectedCash = null;
let currentPage = 1;
let recordsPerPage = 10;
let currentDetailTab = 'info';

// Estado dos modais e filtros avançados
const mensalidadesState = {
    filters: {
        quick: {},
        advanced: {},
        dateRange: {},
        sorting: { field: 'vencimento', order: 'asc' }
    },
    visibleColumns: {
        numero: true,
        contrato: true,
        titular: true,
        vencimento: true,
        valor: true,
        recebimento: true,
        valorRecebido: true,
        formaPagamento: true
    },
    selectedItems: new Set()
};

// Elementos DOM
const elements = {
    numeroContrato: document.getElementById('numeroContrato'),
    nomeTitular: document.getElementById('nomeTitular'),
    vencimentoInicial: document.getElementById('vencimentoInicial'),
    vencimentoFinal: document.getElementById('vencimentoFinal'),
    cpf: document.getElementById('cpf'),
    cnpj: document.getElementById('cnpj'),
    status: document.getElementById('status'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    searchBtn: document.getElementById('searchBtn'),
    selectCashBtn: document.getElementById('selectCashBtn'),
    optionsBtn: document.getElementById('optionsBtn'),
    duplicatesTableBody: document.getElementById('duplicatesTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    recordsCount: document.getElementById('recordsCount'),
    recordsPerPageSelect: document.getElementById('recordsPerPage'),
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo')
};

// Initialize the page
function init() {
    // Inicializar dados filtrados
    filteredDuplicates = [...sampleDuplicates];
    currentDuplicates = [...sampleDuplicates];

    initializeEventListeners();
    initializeModals();
    applyInputMasks();

    // Tenta carregar dados do Firebase primeiro, se falhar usa dados de exemplo
    carregarMensalidades().catch(error => {
        console.warn('Falha ao carregar do Firebase, usando dados de exemplo:', error);
        renderDuplicatesTable();
        updateRecordsCount();
        updatePagination();
    });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Event Listeners
function initializeEventListeners() {
    // Filtros
    elements.clearFiltersBtn.addEventListener('click', clearFilters);
    elements.searchBtn.addEventListener('click', performSearch);

    // Top Action Bar
    const advancedFiltersBtn = document.getElementById('advancedFiltersBtn');
    const bulkActionsBtn = document.getElementById('bulkActionsBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const importBtn = document.getElementById('importBtn');
    const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
    const exportDropdown = document.getElementById('exportDropdown');

    if (advancedFiltersBtn) advancedFiltersBtn.addEventListener('click', () => openModal('advancedFiltersModal'));
    if (bulkActionsBtn) bulkActionsBtn.addEventListener('click', () => openModal('bulkActionsModal'));
    if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
    if (importBtn) importBtn.addEventListener('click', initializeImport);
    if (clearAllFiltersBtn) clearAllFiltersBtn.addEventListener('click', clearAllFilters);

    // Export dropdown
    if (exportDropdown) {
        exportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = exportDropdown.querySelector('.dropdown-menu');
            menu.classList.toggle('show');
        });

        // Export options
        document.querySelectorAll('#exportDropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const format = e.target.dataset.format;
                exportData(format);
                exportDropdown.querySelector('.dropdown-menu').classList.remove('show');
            });
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    });

    // Seleção de caixa
    // Caixa selecionado removido

    // Opções
    elements.optionsBtn.addEventListener('click', showOptions);

    // Pagination
    elements.recordsPerPageSelect.addEventListener('change', changeRecordsPerPage);
    elements.prevPageBtn.addEventListener('click', previousPage);
    elements.nextPageBtn.addEventListener('click', nextPage);

    // Modal close events
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Detail tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', switchDetailTab);
    });

    // Modal backdrop close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });

    // Enter key para pesquisa
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Máscaras de input
function applyInputMasks() {
    // Máscara CPF
    elements.cpf.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });

    // Máscara CNPJ
    elements.cnpj.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1/$2');
        value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });
}

// Limpar filtros
function clearFilters() {
    elements.numeroContrato.value = '';
    elements.nomeTitular.value = '';
    elements.vencimentoInicial.value = '';
    elements.vencimentoFinal.value = '';
    elements.cpf.value = '';
    elements.cnpj.value = '';
    elements.status.value = '';

    // Resetar dados
    currentDuplicates = [...sampleDuplicates];
    renderDuplicatesTable();
    updateRecordsCount();

    showMessage('Filtros limpos com sucesso!', 'success');
}

// Realizar pesquisa
function performSearch() {
    const filters = {
        numeroContrato: elements.numeroContrato.value,
        nomeTitular: elements.nomeTitular.value.toLowerCase(),
        vencimentoInicial: elements.vencimentoInicial.value,
        vencimentoFinal: elements.vencimentoFinal.value,
        cpf: elements.cpf.value.replace(/\D/g, ''),
        cnpj: elements.cnpj.value.replace(/\D/g, ''),
        status: elements.status.value
    };

    // Filtrar dados
    filteredDuplicates = sampleDuplicates.filter(duplicate => {
        // Filtro por número do contrato
        if (filters.numeroContrato && duplicate.contrato !== filters.numeroContrato) {
            return false;
        }

        // Filtro por nome do titular
        if (filters.nomeTitular && !duplicate.titular.toLowerCase().includes(filters.nomeTitular)) {
            return false;
        }

        // Filtro por data de vencimento inicial
        if (filters.vencimentoInicial && duplicate.vencimento < filters.vencimentoInicial) {
            return false;
        }

        // Filtro por data de vencimento final
        if (filters.vencimentoFinal && duplicate.vencimento > filters.vencimentoFinal) {
            return false;
        }

        // Filtro por status
        if (filters.status && duplicate.status !== filters.status) {
            return false;
        }

        return true;
    });

    currentDuplicates = [...filteredDuplicates];
    currentPage = 1;
    renderDuplicatesTable();
    updatePagination();
    updateRecordsCount();

    showMessage(`Pesquisa realizada! ${filteredDuplicates.length} registro(s) encontrado(s).`, 'success');
}

// Selecionar caixa
function selectCash() {
    // Simular seleção de caixa
    const cashOptions = ['Caixa Principal', 'Caixa Secundário', 'Caixa Online'];
    const selectedOption = cashOptions[Math.floor(Math.random() * cashOptions.length)];

    selectedCash = selectedOption;

    // Atualizar interface
    const cashInfo = document.querySelector('.cash-info span');
    cashInfo.textContent = `Caixa selecionado: ${selectedCash}`;

    elements.selectCashBtn.textContent = 'Alterar';
    elements.selectCashBtn.style.backgroundColor = '#28a745';

    showMessage(`Caixa "${selectedCash}" selecionado com sucesso!`, 'success');
}

// Mostrar opções
function showOptions() {
    const options = [
        'Exportar para Excel',
        'Exportar para PDF',
        'Imprimir relatório',
        'Enviar por email',
        'Configurações'
    ];

    const optionsList = options.map((option, index) => `${index + 1}. ${option}`).join('\n');

    alert(`Opções disponíveis:\n\n${optionsList}`);
}

// Renderizar tabela de duplicatas com paginação
function renderDuplicatesTable() {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const paginatedData = currentDuplicates.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        elements.duplicatesTableBody.innerHTML = '';
        elements.noDataMessage.classList.remove('hidden');
        return;
    }

    elements.noDataMessage.classList.add('hidden');

    const tableHTML = paginatedData.map(duplicate => {
        const statusClass = duplicate.status === 'pago' ? 'success' : duplicate.status === 'vencido' ? 'danger' : 'warning';
        const statusText = getStatusText(duplicate.status);

        return `
            <tr>
                <td>${duplicate.numero}</td>
                <td>${duplicate.contrato}</td>
                <td>${duplicate.titular}</td>
                <td>${formatDate(duplicate.vencimento)}</td>
                <td class="currency">${formatCurrency(duplicate.valor)}</td>
                <td>${duplicate.recebimento ? formatDate(duplicate.recebimento) : '-'}</td>
                <td class="currency ${duplicate.valorRecebido > 0 ? 'positive' : ''}">
                    ${duplicate.valorRecebido > 0 ? formatCurrency(duplicate.valorRecebido) : '-'}
                </td>
                <td>${duplicate.formaPagamento || '-'}</td>
                <td class="action-cell">
                    <button class="action-btn btn-view" onclick="viewDuplicate(${duplicate.id})" title="Visualizar" aria-label="Visualizar">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                    </button>
                    ${duplicate.status !== 'pago' ? `
                        <button class="action-btn btn-payment" onclick="processPayment(${duplicate.id})" title="Processar Pagamento" aria-label="Processar Pagamento">
                            <i class="fas fa-money-bill" aria-hidden="true"></i>
                        </button>
                    ` : ''}
                    <button class="action-btn btn-edit" onclick="editDuplicate(${duplicate.id})" title="Editar" aria-label="Editar">
                        <i class="fas fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteDuplicate(${duplicate.id})" title="Excluir" aria-label="Excluir">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    elements.duplicatesTableBody.innerHTML = tableHTML;
    updatePagination();
}

// Atualizar contador de registros
function updateRecordsCount() {
    const total = filteredDuplicates.length;
    const showing = Math.min(recordsPerPage, total - (currentPage - 1) * recordsPerPage);
    const start = total > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0;
    const end = Math.min(currentPage * recordsPerPage, total);

    elements.recordsCount.innerHTML = `
        Mostrando <strong>${start}</strong> a <strong>${end}</strong> de <strong>${total}</strong> registro${total !== 1 ? 's' : ''}
    `;
}

// Ações da tabela
// View duplicate details
function viewDuplicate(id) {
    const duplicate = sampleDuplicates.find(d => d.id === id);
    if (duplicate) {
        // Preencher dados do modal
        document.getElementById('detailNumero').textContent = duplicate.numero;
        document.getElementById('detailContrato').textContent = duplicate.contrato;
        document.getElementById('detailTitular').textContent = duplicate.titular;
        document.getElementById('detailVencimento').textContent = duplicate.vencimento;
        document.getElementById('detailValor').textContent = formatCurrency(duplicate.valor);
        document.getElementById('detailStatus').textContent = getStatusText(duplicate.status);

        // Dados de pagamento
        document.getElementById('detailRecebimento').textContent = duplicate.recebimento || 'Não pago';
        document.getElementById('detailValorRecebido').textContent = duplicate.valorRecebido ? formatCurrency(duplicate.valorRecebido) : '-';
        document.getElementById('detailFormaPagamento').textContent = duplicate.formaPagamento || '-';

        // Histórico (simulado)
        const historyHTML = `
            <div class="history-item">
                <strong>Criação:</strong> ${duplicate.vencimento} - Mensalidade criada<br>
                <small>Sistema</small>
            </div>
            ${duplicate.recebimento ? `
                <div class="history-item">
                    <strong>Pagamento:</strong> ${duplicate.recebimento} - Pagamento registrado<br>
                    <small>Usuário</small>
                </div>
            ` : ''}
        `;
        document.getElementById('detailHistorico').innerHTML = historyHTML;

        // Mostrar modal
        document.getElementById('detailModal').style.display = 'flex';

        // Ativar primeira aba
        document.querySelector('.detail-tab[data-tab="info"]').click();
    }
}

// Edit duplicate
function editDuplicate(id) {
    const duplicate = sampleDuplicates.find(d => d.id === id);
    if (duplicate) {
        // Preencher formulário de edição
        document.getElementById('editVencimento').value = duplicate.vencimento.split('/').reverse().join('-');
        document.getElementById('editValor').value = duplicate.valor;
        document.getElementById('editStatus').value = duplicate.status;
        document.getElementById('editObservacoes').value = duplicate.observacoes || '';

        // Armazenar ID para salvar
        document.getElementById('editModal').dataset.duplicateId = id;

        // Mostrar modal
        document.getElementById('editModal').style.display = 'flex';
    }
}

// Delete duplicate
function deleteDuplicate(id) {
    if (confirm('Tem certeza que deseja excluir esta mensalidade?')) {
        const index = sampleDuplicates.findIndex(d => d.id === id);
        if (index > -1) {
            sampleDuplicates.splice(index, 1);
            performSearch(); // Reaplica filtros
            showMessage('Mensalidade excluída com sucesso!', 'success');
        }
    }
}

// Process payment
function processPayment(id) {
    const duplicate = sampleDuplicates.find(d => d.id === id);
    if (duplicate) {
        // Preencher dados do pagamento
        document.getElementById('paymentNumero').textContent = duplicate.numero;
        document.getElementById('paymentTitular').textContent = duplicate.titular;
        document.getElementById('paymentValor').textContent = formatCurrency(duplicate.valor);

        // Preencher formulário
        document.getElementById('paymentData').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentValorRecebido').value = duplicate.valor;

        // Armazenar ID
        document.getElementById('paymentModal').dataset.duplicateId = id;

        // Mostrar modal
        document.getElementById('paymentModal').style.display = 'flex';
    }
}

// Save payment
function savePayment() {
    const modal = document.getElementById('paymentModal');
    const id = parseInt(modal.dataset.duplicateId);
    const duplicate = sampleDuplicates.find(d => d.id === id);

    if (duplicate) {
        const paymentData = {
            data: document.getElementById('paymentData').value,
            valorRecebido: parseFloat(document.getElementById('paymentValorRecebido').value),
            formaPagamento: document.getElementById('paymentFormaPagamento').value,
            desconto: parseFloat(document.getElementById('paymentDesconto').value) || 0,
            taxa: parseFloat(document.getElementById('paymentTaxa').value) || 0,
            observacoes: document.getElementById('paymentObservacoes').value
        };

        // Atualizar duplicate
        duplicate.recebimento = new Date(paymentData.data).toLocaleDateString('pt-BR');
        duplicate.valorRecebido = paymentData.valorRecebido;
        duplicate.formaPagamento = paymentData.formaPagamento;
        duplicate.status = 'pago';
        duplicate.observacoes = paymentData.observacoes;

        // Fechar modal e atualizar tabela
        closeModal();
        performSearch();
        showMessage('Pagamento registrado com sucesso!', 'success');
    }
}

// Save edit
function saveEdit() {
    const modal = document.getElementById('editModal');
    const id = parseInt(modal.dataset.duplicateId);
    const duplicate = sampleDuplicates.find(d => d.id === id);

    if (duplicate) {
        const vencimento = document.getElementById('editVencimento').value;
        duplicate.vencimento = new Date(vencimento).toLocaleDateString('pt-BR');
        duplicate.valor = parseFloat(document.getElementById('editValor').value);
        duplicate.status = document.getElementById('editStatus').value;
        duplicate.observacoes = document.getElementById('editObservacoes').value;

        // Fechar modal e atualizar tabela
        closeModal();
        performSearch();
        showMessage('Mensalidade atualizada com sucesso!', 'success');
    }
}

// Funções utilitárias
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function getStatusText(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'pago': 'Pago',
        'vencido': 'Vencido',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

function showMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Criar nova mensagem
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'success' ? 'success-message' : 'error-message'}`;
    messageDiv.textContent = message;

    // Inserir no início do container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);

    // Remover após 3 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// Funções de paginação
function changeRecordsPerPage() {
    recordsPerPage = parseInt(elements.recordsPerPageSelect.value);
    currentPage = 1;
    renderDuplicatesTable();
    updateRecordsCount();
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderDuplicatesTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(currentDuplicates.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderDuplicatesTable();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredDuplicates.length / recordsPerPage);

    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    elements.pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
}

// Funções de modal — UNIFICADA (antes havia definição duplicada)
function closeModal() {
    // Fecha modais com style.display
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    // Fecha modais com classe .show
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });
}

function switchDetailTab(event) {
    const tabId = event.target.dataset.tab;

    // Remover classe ativa de todas as abas
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Adicionar classe ativa à aba clicada
    event.target.classList.add('active');

    // Mostrar conteúdo da aba
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    const tabContent = document.getElementById(`${tabId}-content`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }

    currentDetailTab = tabId;
}

// Inicializar modais
function initializeModals() {
    // Advanced Filters Modal
    const applyAdvancedBtn = document.getElementById('applyAdvancedFilters');
    const resetAdvancedBtn = document.getElementById('resetAdvancedFilters');

    if (applyAdvancedBtn) applyAdvancedBtn.addEventListener('click', applyAdvancedFiltersAction);
    if (resetAdvancedBtn) resetAdvancedBtn.addEventListener('click', resetAdvancedFiltersAction);

    // Bulk Actions Modal
    const exportBulkBtn = document.getElementById('exportBulkBtn');
    const processPaymentsBulkBtn = document.getElementById('processPaymentsBulkBtn');
    const updateStatusBulkBtn = document.getElementById('updateStatusBulkBtn');
    const removeBulkBtn = document.getElementById('removeBulkBtn');

    if (exportBulkBtn) exportBulkBtn.addEventListener('click', () => exportData('excel'));
    if (processPaymentsBulkBtn) processPaymentsBulkBtn.addEventListener('click', () => setupBulkActions('processPayments'));
    if (updateStatusBulkBtn) updateStatusBulkBtn.addEventListener('click', () => setupBulkActions('updateStatus'));
    if (removeBulkBtn) removeBulkBtn.addEventListener('click', () => setupBulkActions('remove'));

    // Modal tabs
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // Visible columns checkboxes
    document.querySelectorAll('input[name="visibleColumns"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            mensalidadesState.visibleColumns[e.target.value] = e.target.checked;
            renderDuplicatesTable();
        });
    });
}

// Funções de modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');

        // Ativar primeira aba se for modal com abas
        const firstTab = modal.querySelector('.modal-tab');
        if (firstTab) {
            switchTab(firstTab.dataset.tab);
        }

        // Atualizar contagem de itens selecionados se for modal de ações em massa
        if (modalId === 'bulkActionsModal') {
            updateSelectedItemsCount();
        }
    }
}

// closeModal já definida acima — reutilizada aqui (antes era duplicada)

function switchTab(tabId) {
    const modal = document.querySelector('.modal.show');
    if (!modal) return;

    // Remover classe ativa de todas as abas
    modal.querySelectorAll('.modal-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Adicionar classe ativa à aba clicada
    const activeTab = modal.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Mostrar conteúdo da aba
    modal.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabContent = modal.querySelector(`#${tabId}`);
    if (tabContent) tabContent.classList.add('active');
}

// Aplicar filtros avançados
function applyAdvancedFiltersAction() {
    // Coletar dados dos filtros
    const quickFilters = {};
    const advancedFilters = {};
    const dateRange = {};

    // Aplicar filtros (implementação simplificada)
    performSearch();
    closeModal();
    showNotification('Filtros avançados aplicados com sucesso!', 'success');
}

// Resetar filtros avançados
function resetAdvancedFiltersAction() {
    mensalidadesState.filters = {
        quick: {},
        advanced: {},
        dateRange: {},
        sorting: { field: 'vencimento', order: 'asc' }
    };

    // Limpar formulários
    document.querySelectorAll('#advancedFiltersModal input, #advancedFiltersModal select').forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });

    showNotification('Filtros avançados resetados!', 'info');
}

// Limpar todos os filtros
function clearAllFilters() {
    clearFilters();
    resetAdvancedFiltersAction();
    showNotification('Todos os filtros foram limpos!', 'success');
}

// Atualizar dados
function refreshData() {
    // Simular atualização de dados
    currentDuplicates = [...sampleDuplicates];
    filteredDuplicates = [...sampleDuplicates];
    renderDuplicatesTable();
    updateRecordsCount();
    showNotification('Dados atualizados com sucesso!', 'success');
}

// Exportar dados — IMPLEMENTAÇÃO REAL (antes era stub com setTimeout)
function exportData(format) {
    const data = filteredDuplicates.length > 0 ? filteredDuplicates : currentDuplicates;

    if (!data || data.length === 0) {
        showNotification('Nenhum dado para exportar.', 'warning');
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rows = data.map(d => ({
        'Número': d.numero || '',
        'Contrato': d.contrato || '',
        'Titular': d.titular || '',
        'Vencimento': d.vencimento || '',
        'Valor (R$)': d.valor ? d.valor.toFixed(2) : '0.00',
        'Recebimento': d.recebimento || '',
        'Valor Recebido (R$)': d.valorRecebido ? d.valorRecebido.toFixed(2) : '',
        'Forma Pagamento': d.formaPagamento || '',
        'Status': getStatusText(d.status)
    }));

    if (format === 'csv') {
        const headers = Object.keys(rows[0]).join(';');
        const csvContent = [headers, ...rows.map(r => Object.values(r).join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mensalidades_${timestamp}.csv`;
        a.click();
        showNotification(`${data.length} registros exportados para CSV!`, 'success');

    } else if (format === 'excel') {
        const doExport = () => {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Mensalidades');
            ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
            XLSX.writeFile(wb, `mensalidades_${timestamp}.xlsx`);
            showNotification(`${data.length} registros exportados para Excel!`, 'success');
        };
        if (typeof XLSX !== 'undefined') {
            doExport();
        } else {
            showNotification('Carregando biblioteca...', 'info');
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
            s.onload = doExport;
            s.onerror = () => showNotification('Erro ao carregar SheetJS.', 'error');
            document.head.appendChild(s);
        }

    } else if (format === 'pdf') {
        if (typeof window.jspdf === 'undefined') {
            showNotification('jsPDF não encontrado. Tente Excel ou CSV.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text('Relatório de Mensalidades', 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
        doc.autoTable({ head: [Object.keys(rows[0])], body: rows.map(r => Object.values(r)), startY: 28, styles: { fontSize: 7 } });
        doc.save(`mensalidades_${timestamp}.pdf`);
        showNotification(`${data.length} registros exportados para PDF!`, 'success');
    }
}

// Configurar ações em massa
function setupBulkActions(action) {
    const selectedCount = mensalidadesState.selectedItems.size;

    if (selectedCount === 0) {
        showNotification('Nenhum item selecionado!', 'warning');
        return;
    }

    switch (action) {
        case 'processPayments':
            if (confirm(`Processar pagamento de ${selectedCount} mensalidade(s) selecionada(s)?`)) {
                showNotification(`Processando pagamento de ${selectedCount} mensalidades...`, 'info');
                setTimeout(() => {
                    showNotification('Pagamentos processados com sucesso!', 'success');
                    mensalidadesState.selectedItems.clear();
                    renderDuplicatesTable();
                }, 2000);
            }
            break;
        case 'updateStatus':
            if (confirm(`Atualizar status de ${selectedCount} mensalidade(s) selecionada(s)?`)) {
                showNotification(`Atualizando status de ${selectedCount} mensalidades...`, 'info');
                setTimeout(() => {
                    showNotification('Status atualizado com sucesso!', 'success');
                    mensalidadesState.selectedItems.clear();
                    renderDuplicatesTable();
                }, 1500);
            }
            break;
        case 'remove':
            if (confirm(`Remover ${selectedCount} mensalidade(s) selecionada(s)? Esta ação não pode ser desfeita.`)) {
                showNotification(`Removendo ${selectedCount} mensalidades...`, 'info');
                setTimeout(() => {
                    showNotification('Mensalidades removidas com sucesso!', 'success');
                    mensalidadesState.selectedItems.clear();
                    renderDuplicatesTable();
                }, 1500);
            }
            break;
    }

    closeModal();
}

// Atualizar contagem de itens selecionados
function updateSelectedItemsCount() {
    const countElement = document.getElementById('selectedItemsCount');
    if (countElement) {
        countElement.textContent = mensalidadesState.selectedItems.size;
    }
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remover notificação anterior se existir
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Adicionar estilos inline
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease;
    `;

    // Cores por tipo
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    notification.style.backgroundColor = colors[type] || colors.info;

    // Adicionar ao body
    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Funções globais para serem acessíveis no HTML
window.viewDuplicate = viewDuplicate;
window.editDuplicate = editDuplicate;
window.deleteDuplicate = deleteDuplicate;
window.processPayment = processPayment;
window.savePayment = savePayment;
window.saveEdit = saveEdit;
window.closeModal = closeModal;
window.openModal = openModal;
window.switchTab = switchTab;

// Função para inicializar importação
function initializeImport() {
    if (typeof ExcelImportManager === 'undefined') {
        console.warn('ExcelImportManager não está disponível - funcionalidade de importação desabilitada');
        return;
    }

    const fieldMappings = {
        'numero_contrato': 'Número do Contrato',
        'nome_titular': 'Nome do Titular',
        'cpf_cnpj': 'CPF/CNPJ',
        'data_vencimento': 'Data de Vencimento',
        'valor_mensalidade': 'Valor da Mensalidade',
        'status_pagamento': 'Status do Pagamento',
        'observacoes': 'Observações'
    };

    const importCallbacks = {
        onSuccess: (data) => {
            console.log('Dados importados com sucesso:', data);
            renderDuplicatesTable(); // Atualizar tabela após importação
        },
        onError: (error) => {
            console.error('Erro na importação:', error);
        }
    };

    ExcelImportManager.showImportInterface(fieldMappings, importCallbacks);
}
