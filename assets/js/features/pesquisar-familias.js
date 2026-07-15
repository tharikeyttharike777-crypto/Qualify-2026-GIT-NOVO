// Dados serão carregados dinamicamente do localStorage
const sampleFamilies = [];

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalRecords = 0;
let filteredData = [];
let selectedRows = new Set();

// ═══ FLAG DE SUPRESSÃO DURANTE EXCLUSÃO ═══
let _deletionInProgress = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    setupEventListeners();
    loadData();
});

function initializePage() {
    console.log('Pesquisar Famílias page initialized');

    // Set initial filter status
    updateFilterStatus();
}

// Load data preferencialmente do Firestore por empresa; fallback localStorage
async function loadData() {
    try {
        // Mostra loading
        showLoadingState();

        // Deduplicação local preventiva por companyId+CPF
        try {
            const raw = localStorage.getItem('familias');
            if (raw) {
                const list = JSON.parse(raw || '[]') || [];
                const byKey = new Map();
                list.forEach(f => {
                    const companyId = f?.companyId || '';
                    const cpfDigits = String(f?.titular?.cpf || '').replace(/\D+/g, '');
                    const key = `${companyId}#${cpfDigits || f.id || ''}`;
                    const prev = byKey.get(key);
                    if (!prev) byKey.set(key, f);
                    else {
                        const tPrev = new Date(prev?.dataCriacao || 0).getTime();
                        const tCur = new Date(f?.dataCriacao || 0).getTime();
                        if (tCur >= tPrev) byKey.set(key, f);
                    }
                });
                const deduped = Array.from(byKey.values());
                localStorage.setItem('familias', JSON.stringify(deduped));
            }
        } catch (_) { }

        // Validar empresa ativa
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let activeCompany = null;
        try {
            activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        } catch (e) {
            activeCompany = null;
        }
        if (!activeCompany || !activeCompany.id) {
            showEmptyState('Selecione uma empresa ativa para visualizar famílias.');
            return;
        }
        const companyId = activeCompany.id;

        let familiasComTitulares = [];
        let carregadoDe = 'firestore';

        // Tenta carregar do Supabase
        try {
            const { data: familias, error } = await window.supabase
                .from('familias')
                .select('*')
                .eq('company_id', companyId);

            if (error) throw error;

            familiasComTitulares = familias.map(f => ({
                id: f.id,
                nome: f.titular?.nome || '',
                cpf: f.titular?.cpf || '',
                endereco: f.endereco,
                dependentes: f.dependentes || [],
                dataCriacao: f.created_at,
                status: f.status || 'Ativo',
                telefone: f.titular?.telefone || f.titular?.celular || '',
                email: f.titular?.email || '',
                rg: f.titular?.rg || '',
                dataNascimento: f.titular?.nascimento || f.titular?.dataNascimento || ''
            }));
        } catch (sbErr) {
            console.warn('Falha ao carregar do Supabase, usando cache local:', sbErr);
            carregadoDe = 'localStorage';
            const familias = (JSON.parse(localStorage.getItem('familias') || '[]') || []).filter(f => f.companyId === companyId);

            // Fallback localStorage logic remains similar but simplified
            familiasComTitulares = familias.map(f => ({
                id: f.id,
                nome: f.titular?.nome || '',
                cpf: f.titular?.cpf || '',
                endereco: f.endereco,
                dependentes: f.dependentes || [],
                dataCriacao: f.dataCriacao,
                status: f.status,
                telefone: f.titular?.telefone || '',
                email: f.titular?.email || '',
                rg: f.titular?.rg || '',
                dataNascimento: f.titular?.dataNascimento || ''
            }));
        }

        sampleFamilies.length = 0; // Limpa array
        sampleFamilies.push(...familiasComTitulares);
        filteredData = [...sampleFamilies];
        totalRecords = sampleFamilies.length;
        // Atualiza contador imediatamente após calcular total
        updateRecordsCount();

        if (sampleFamilies.length === 0) {
            showEmptyState('Nenhuma família encontrada');
        } else {
            hideLoadingState();
            updateTable();
            updatePagination();

            // Se houver um ID de família para abrir automaticamente, exibe o modal de visualização
            try {
                const toOpenId = localStorage.getItem('openFamilyId');
                if (toOpenId) {
                    // Limpa imediatamente para evitar reaberturas
                    localStorage.removeItem('openFamilyId');
                    const fam = sampleFamilies.find(f => String(f.id) === String(toOpenId));
                    if (fam) {
                        handleViewFamily(String(toOpenId));
                    }
                }
            } catch (e) {
                console.warn('Falha ao processar openFamilyId:', e);
            }
        }

    } catch (error) {
        console.error('Erro ao carregar dados de famílias:', error);
        showEmptyState('Erro ao carregar dados. Tente novamente.');
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#familiesTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função updateTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#familiesTable tbody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">${message}</td></tr>`;
    }

    // Limpa/oculta paginação
    const controls = document.querySelector('.pagination-controls');
    if (controls) {
        controls.style.display = 'none';
    }
    const numbers = document.querySelector('.page-numbers');
    if (numbers) numbers.innerHTML = '';

    // Garante que a contagem reflita o estado atual (ex.: 0)
    updateRecordsCount();
}

function setupEventListeners() {
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportClick);
    }

    // New button
    const newBtn = document.getElementById('newBtn');
    if (newBtn) {
        newBtn.addEventListener('click', handleNewClick);
    }

    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', handleTabClick);
    });

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAll);
    }

    // Pagination buttons
    setupPaginationListeners();

    // Table row interactions
    setupTableInteractions();

    // Campo de busca (nome/CPF)
    const searchInput = document.getElementById('familySearch');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applySearch(term);
            }, 200);
        });
    }
}

function handleFilterClick() {
    const filterType = prompt('Filtrar por:\n1 - Bairro\n2 - Número de membros\n3 - Status\n\nDigite o número da opção:');
    if (filterType) {
        showToast(`Aplicando filtro tipo ${filterType}`, 'success');
    }
    console.log('Filter button clicked');
}

function handleOptionsClick() {
    const option = prompt('Opções disponíveis:\n1 - Exportar lista\n2 - Enviar comunicado\n3 - Configurar visualização\n\nDigite o número da opção:');
    if (option) {
        showToast(`Executando opção ${option}`, 'success');
    }
    console.log('Options button clicked');
}

function handleNewClick() {
    showToast('Redirecionando para nova família...', 'success');
    console.log('New family button clicked');
    // Limpa qualquer ID de edição pendente para garantir modo de criação
    localStorage.removeItem('editFamilyId');
    // Redireciona para a página de criação de nova família
    window.location.href = 'nova-familia.html';
}

function handleTabClick(event) {
    const clickedTab = event.target;
    const tabType = clickedTab.dataset.tab;

    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });

    // Add active class to clicked tab
    clickedTab.classList.add('active');

    if (tabType === 'mapa') {
        showToast('Carregando visualização em mapa das famílias...', 'success');
    }

    console.log(`Tab switched to: ${tabType}`);
}

function handleSelectAll(event) {
    const isChecked = event.target.checked;
    const rowCheckboxes = document.querySelectorAll('.row-select');

    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const row = checkbox.closest('tr');
        const familyId = String(row.dataset.familyId || '');

        if (isChecked) {
            selectedRows.add(familyId);
            row.classList.add('selected');
        } else {
            selectedRows.delete(familyId);
            row.classList.remove('selected');
        }
    });

    updateBulkBar();
    console.log(`Selected rows: ${selectedRows.size}`);
}

function setupPaginationListeners() {
    // First page
    const firstPageBtn = document.getElementById('firstPage');
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => goToPage(1));
    }

    // Previous page
    const prevPageBtn = document.getElementById('prevPage');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }

    // Next page
    const nextPageBtn = document.getElementById('nextPage');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }

    // Last page
    const lastPageBtn = document.getElementById('lastPage');
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(totalRecords / itemsPerPage);
            goToPage(totalPages);
        });
    }

    // Page number buttons (delegação)
    const pageNumbers = document.querySelector('.page-numbers');
    if (pageNumbers) {
        pageNumbers.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (!btn) return;
            const pageNum = parseInt(btn.dataset.page || btn.textContent, 10);
            if (Number.isFinite(pageNum)) goToPage(pageNum);
        });
    }
}

function setupTableInteractions() {
    // Add event delegation for dynamically created elements
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.addEventListener('click', handleTableClick);
        tableBody.addEventListener('change', handleTableChange);
    }
}

function animateActionButton(btn) {
    // Adds a short pulse effect for click feedback
    if (!btn) return;
    try {
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 320);
    } catch (err) {
        // no-op
    }
}

function handleTableClick(event) {
    const target = event.target;
    const btn = target.closest('.action-btn');
    if (!btn) return;

    const row = btn.closest('tr');
    const familyId = row?.dataset?.familyId;

    // visual feedback on click
    animateActionButton(btn);

    if (btn.classList.contains('edit-btn')) {
        handleEditFamily(familyId);
    } else if (btn.classList.contains('view-btn')) {
        handleViewFamily(familyId);
    } else if (btn.classList.contains('delete-btn')) {
        handleDeleteFamily(familyId);
    }
}

function handleTableChange(event) {
    const target = event.target;

    if (target.classList.contains('row-select')) {
        const row = target.closest('tr');
        const familyId = String(row.dataset.familyId || '');

        if (target.checked) {
            selectedRows.add(familyId);
            row.classList.add('selected');
        } else {
            selectedRows.delete(familyId);
            row.classList.remove('selected');
        }

        updateSelectAllCheckbox();
        updateBulkBar();
    }
}

function handleEditFamily(familyId) {
    const id = String(familyId || '');
    if (!id) {
        showToast('ID de família inválido', 'error');
        return;
    }
    try {
        // Sincroniza opcionalmente no localStorage, mas o modo edição será guiado pelo parâmetro de URL
        localStorage.setItem('editFamilyId', id);
    } catch (e) {
        console.warn('Falha ao persistir editFamilyId:', e);
    }
    console.log(`Redirecionando para cadastro para editar família: ${id}`);
    window.location.href = `../pages/nova-familia.html?id=${encodeURIComponent(id)}`;
}

function handleViewFamily(familyId) {
    const id = String(familyId || '');
    const family = sampleFamilies.find(f => String(f.id) === id);
    if (!family) {
        showToast('Família não encontrada', 'error');
        return;
    }
    const modalEl = document.getElementById('viewFamilyModal');
    const detailsEl = document.getElementById('familyDetails');
    if (!modalEl || !detailsEl) {
        console.warn('Modal de visualização não encontrado no DOM');
        showToast('Modal de visualização indisponível', 'warning');
        return;
    }
    // Endereço completo
    const enderecoCompleto = family.endereco ?
        `${family.endereco.rua || ''}, ${family.endereco.numero || ''} - ${family.endereco.bairro || ''}, ${family.endereco.cidade || ''}`
            .replace(/\s*,\s*,/g, ',')
            .replace(/^,\s*|\s*,\s*$/g, '') : '-';
    // Dependentes
    const dependentesHtml = (family.dependentes && family.dependentes.length)
        ? family.dependentes.map(dep => `
            <div class="border rounded p-2 mb-2">
                <strong>${dep.nome || '-'}</strong>
                ${dep.idade ? ` - ${dep.idade}` : ''}
                ${dep.parentesco ? ` - ${dep.parentesco}` : ''}
            </div>
        `).join('')
        : '<p class="text-muted">Nenhum dependente cadastrado</p>';
    // Conteúdo do modal (visualização não editável)
    detailsEl.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">Dados do Titular</h6>
                        <p><strong>Nome:</strong> ${family.nome || '-'}</p>
                        <p><strong>CPF:</strong> ${family.cpf ? formatDocument(family.cpf) : '-'}</p>
                        <p><strong>RG:</strong> ${family.rg || '-'}</p>
                        <p><strong>Data de Nascimento:</strong> ${family.dataNascimento || '-'}</p>
                        <p><strong>Status:</strong> ${family.status || '-'}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-body">
                        <h6 class="card-title">Contatos</h6>
                        <p><strong>Telefone:</strong> ${family.telefone ? formatPhone(family.telefone) : '-'}</p>
                        <p><strong>E-mail:</strong> ${family.email || '-'}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">Endereço</h6>
                        <p>${enderecoCompleto}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-12">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">Dependentes</h6>
                        ${dependentesHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    // Abrir modal (Bootstrap se disponível; caso contrário, fallback simples)
    try {
        if (window.bootstrap && bootstrap.Modal) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        } else {
            modalEl.classList.add('show');
            modalEl.style.display = 'flex';
            modalEl.removeAttribute('aria-hidden');
            const closeEls = modalEl.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
            closeEls.forEach(el => el.addEventListener('click', () => {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                modalEl.setAttribute('aria-hidden', 'true');
            }));
        }
    } catch (e) {
        console.warn('Falha ao abrir modal:', e);
        showToast('Não foi possível abrir a visualização', 'error');
    }
}

function handleViewDetails(familyId) {
    // Removido: coluna "Detalhes" não é mais utilizada
}

function handleDeleteFamily(familyId) {
    const id = String(familyId || '');
    if (!id) {
        showToast('ID de família inválido', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este cadastro? Esta ação não pode ser desfeita.')) {
        return;
    }
    (async () => {
        // Obtém empresa ativa
        let companyId = null;
        try {
            const activeCompanyStr = localStorage.getItem('activeCompany');
            const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
            companyId = activeCompany && activeCompany.id ? activeCompany.id : null;
        } catch (_) { companyId = null; }

        // Tenta remover no Firestore quando disponível
        try {
            if (typeof window !== 'undefined' && window.db && companyId) {
                const db = window.db;
                // Remove família
                await db.collection(`empresas/${companyId}/familias`).doc(id).delete();
                // Remove associados vinculados
                const associadosSnap = await db
                    .collection(`empresas/${companyId}/associados`)
                    .where('familiaId', '==', id)
                    .get();
                const batch = db.batch ? db.batch() : null;
                if (batch) {
                    associadosSnap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } else {
                    const deletions = [];
                    associadosSnap.forEach(doc => deletions.push(doc.ref.delete()));
                    await Promise.all(deletions);
                }
                showToast('Cadastro excluído com sucesso!', 'success');
                await loadData();
                return;
            }
            throw new Error('Firestore indisponível, usando fallback local');
        } catch (fsErr) {
            console.warn('Falha na exclusão via Firestore:', fsErr);
            // Fallback para localStorage
            try {
                let familias = JSON.parse(localStorage.getItem('familias') || '[]');
                familias = familias.filter(f => String(f.id) !== id);
                localStorage.setItem('familias', JSON.stringify(familias));

                let associados = JSON.parse(localStorage.getItem('associados') || '[]');
                associados = associados.filter(a => String(a.familiaId) !== id);
                localStorage.setItem('associados', JSON.stringify(associados));

                showToast('Cadastro excluído com sucesso! (modo offline)', 'success');
                await loadData();
            } catch (e) {
                console.error('Erro ao excluir família no fallback local:', e);
                showToast('Erro ao excluir cadastro', 'error');
            }
        }
    })();
}

function renderTableData() {
    if (_deletionInProgress) { console.log('⏸️ renderTableData suprimido — exclusão em andamento'); return; }
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    // Render rows
    pageData.forEach(family => {
        const row = createTableRow(family);
        tableBody.appendChild(row);
    });
}

function createTableRow(family) {
    const row = document.createElement('tr');
    row.dataset.familyId = String(family.id);

    // Formatar endereço
    const enderecoCompleto = family.endereco ?
        `${family.endereco.rua || ''}, ${family.endereco.numero || ''} - ${family.endereco.bairro || ''}, ${family.endereco.cidade || ''}`.replace(/^,\s*|,\s*$|,\s*,/g, ',').replace(/^,|,$/, '') :
        '-';

    // Formatar contatos
    const contatos = [family.telefone, family.email].filter(c => c).join(' | ') || '-';

    // Contar dependentes
    const numDependentes = family.dependentes ? family.dependentes.length : 0;

    row.innerHTML = `
        <td>
            <input type="checkbox" class="row-select" ${selectedRows.has(family.id) ? 'checked' : ''}>
        </td>
        <td class="actions-cell">
            <button class="action-btn edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="action-btn view-btn" title="Visualizar"><i class="fas fa-eye"></i></button>
            <button class="action-btn delete-btn" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
        <td class="name-cell">${family.nome || '-'}</td>
        <td class="responsible-cell">-</td>
        <td class="contacts-cell">${contatos}</td>
        <td class="document-cell">${family.cpf || '-'}</td>
        <td class="address-cell" title="${enderecoCompleto}">${enderecoCompleto}</td>
        <td class="dependents-cell">${numDependentes}</td>
    `;

    return row;
}

function goToPage(pageNumber) {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);

    if (pageNumber < 1 || pageNumber > totalPages) {
        return;
    }

    currentPage = pageNumber;
    showLoading();

    // Simulate loading delay
    setTimeout(() => {
        renderTableData();
        updatePagination();
        hideLoading();

        // Scroll to top of table
        document.querySelector('.table-container').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 500);
}

function renderPagination(totalItems, perPage, page) {
    const totalPages = Math.ceil(totalItems / perPage);
    const controls = document.querySelector('.pagination-controls');
    const numbers = document.querySelector('.page-numbers');
    if (!controls || !numbers) return;
    numbers.innerHTML = '';
    if (totalPages <= 0) {
        controls.style.display = 'none';
        return;
    }
    controls.style.display = 'flex';
    const maxButtons = Math.min(totalPages, 10);
    let start = Math.max(1, page - 4);
    let end = Math.min(totalPages, start + 9);
    start = Math.max(1, end - 9);
    for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === page ? ' active' : '');
        btn.textContent = String(i);
        btn.dataset.page = String(i);
        numbers.appendChild(btn);
    }
}

function updatePagination() {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    renderPagination(totalRecords, itemsPerPage, currentPage);
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    if (firstPageBtn) firstPageBtn.disabled = currentPage <= 1 || totalPages <= 0;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1 || totalPages <= 0;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages || totalPages <= 0;
    if (lastPageBtn) lastPageBtn.disabled = currentPage >= totalPages || totalPages <= 0;
}

function updateTable() {
    renderTableData();
    updatePagination();
    updateRecordsCount();
}

function updateRecordsCount() {
    const recordsCountElement = document.querySelector('.records-count strong');
    if (recordsCountElement) {
        recordsCountElement.textContent = totalRecords.toLocaleString('pt-BR');
    }
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const rowCheckboxes = document.querySelectorAll('.row-select');
    const checkedBoxes = document.querySelectorAll('.row-select:checked');

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = rowCheckboxes.length > 0 && checkedBoxes.length === rowCheckboxes.length;
        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < rowCheckboxes.length;
    }
}

function updateFilterStatus(filterText = 'Nenhum filtro aplicado') {
    const filterStatusElement = document.querySelector('.filter-text');
    if (filterStatusElement) {
        filterStatusElement.textContent = filterText;
    }
}

// Busca por nome do titular e CPF
function applySearch(term) {
    if (!term) {
        filteredData = [...sampleFamilies];
        totalRecords = filteredData.length;
        currentPage = 1;
        updateFilterStatus('Nenhum filtro aplicado');
        updateTable();
        return;
    }
    const lower = term.toLowerCase();
    const digits = term.replace(/\D+/g, '');
    filteredData = sampleFamilies.filter(f => {
        const nome = String(f.nome || '').toLowerCase();
        const cpfDigits = String(f.cpf || '').replace(/\D+/g, '');
        return nome.includes(lower) || (digits && cpfDigits.includes(digits));
    });
    totalRecords = filteredData.length;
    currentPage = 1;
    updateFilterStatus(`Filtro: "${term}"`);
    updateTable();
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// ===== Exportação de dados =====
function handleExportClick() {
    const choice = prompt('Exportar como:\n1 - CSV\n2 - XLSX (compatível)\n\nDigite 1 ou 2:');
    if (choice === '2') {
        exportFamilies('xlsx');
    } else {
        exportFamilies('csv');
    }
}

function exportFamilies(format = 'csv') {
    const data = filteredData && Array.isArray(filteredData) ? filteredData : [];
    if (!data.length) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }
    try {
        if (format === 'xlsx') {
            exportXLS(data);
        } else {
            exportCSV(data);
        }
        showToast(`Exportação ${format.toUpperCase()} concluída`, 'success');
    } catch (e) {
        console.error('Falha na exportação:', e);
        showToast('Falha na exportação', 'error');
    }
}

function exportCSV(data) {
    const headers = ['Nome', 'Documento', 'Endereço da família', 'Nº de dependentes', 'Contatos'];
    const rows = data.map(family => {
        const endereco = family.endereco ? `${family.endereco.rua || ''}, ${family.endereco.numero || ''} - ${family.endereco.bairro || ''}, ${family.endereco.cidade || ''}`
            .replace(/\s*,\s*,/g, ',').replace(/^,\s*|\s*,\s*$/g, '') : '';
        const contatos = [family.telefone, family.email].filter(Boolean).join(' | ');
        return [family.nome || '', family.cpf || '', endereco, String((family.dependentes || []).length), contatos];
    });
    const escapeCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csvContent = [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:\.]/g, '-');
    a.download = `familias_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Gera arquivo .xls baseado em HTML (compatível com Excel)
function exportXLS(data) {
    const headers = ['Nome', 'Documento', 'Endereço da família', 'Nº de dependentes', 'Contatos'];
    const rowsHtml = data.map(family => {
        const endereco = family.endereco ? `${family.endereco.rua || ''}, ${family.endereco.numero || ''} - ${family.endereco.bairro || ''}, ${family.endereco.cidade || ''}`
            .replace(/\s*,\s*,/g, ',').replace(/^,\s*|\s*,\s*$/g, '') : '';
        const contatos = [family.telefone, family.email].filter(Boolean).join(' | ');
        return `<tr>
            <td>${escapeHtml(family.nome || '')}</td>
            <td>${escapeHtml(family.cpf || '')}</td>
            <td>${escapeHtml(endereco)}</td>
            <td>${(family.dependentes || []).length}</td>
            <td>${escapeHtml(contatos)}</td>
        </tr>`;
    }).join('');
    const headerHtml = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
        <table border="1">${headerHtml}${rowsHtml}</table>
    </body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:\.]/g, '-');
    a.download = `familias_${ts}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>\"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
}

// Utility functions
function formatDocument(document) {
    // Format CPF/CNPJ
    const numbers = document.replace(/\D/g, '');
    if (numbers.length === 11) {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return document;
}

function formatPhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
}

// ═══════════════════════════════════════════════════
// BULK ACTION BAR
// ═══════════════════════════════════════════════════
function updateBulkBar() {
    const bar = document.getElementById('bulkBarFamilias');
    const countEl = document.getElementById('selectedCountFamilias');
    if (!bar) return;
    if (selectedRows.size > 0) {
        bar.classList.add('visible');
        if (countEl) countEl.textContent = selectedRows.size;
    } else {
        bar.classList.remove('visible');
    }
}
window.updateBulkBar = updateBulkBar;

function clearSelectionFamilias() {
    selectedRows.clear();
    document.querySelectorAll('.row-select').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('#tableBody tr.selected').forEach(r => r.classList.remove('selected'));
    const master = document.getElementById('selectAll');
    if (master) { master.checked = false; master.indeterminate = false; }
    updateBulkBar();
}
window.clearSelectionFamilias = clearSelectionFamilias;

// ═══════════════════════════════════════════════════
// MODAL DE CONFIRMAÇÃO
// ═══════════════════════════════════════════════════
function openBulkDeleteModal() {
    if (selectedRows.size === 0) { showToast('Selecione ao menos uma família.', 'warning'); return; }
    const count = selectedRows.size;
    const elCount = document.getElementById('deleteCountFamilias');
    const elBtn = document.getElementById('deleteCountBtnFamilias');
    if (elCount) elCount.textContent = count;
    if (elBtn) elBtn.textContent = count;
    const modal = document.getElementById('deleteFamiliasModal');
    if (modal) modal.classList.add('open');
}
window.openBulkDeleteModal = openBulkDeleteModal;

function closeBulkDeleteModal() {
    const modal = document.getElementById('deleteFamiliasModal');
    if (modal) modal.classList.remove('open');
    const btn = document.getElementById('btnConfirmDeleteFamilias');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> Sim, excluir'; }
}
window.closeBulkDeleteModal = closeBulkDeleteModal;

// ═══════════════════════════════════════════════════
// EXCLUSÃO ATÔMICA EM LOTE COM CASCADING
// ═══════════════════════════════════════════════════
async function confirmBulkDeleteFamilias() {
    const totalToDelete = selectedRows.size;
    if (totalToDelete === 0) return;

    if (!confirm(`TEM CERTEZA? Você está prestes a excluir ${totalToDelete} família(s) e TODOS os seus contratos e associados vinculados via Supabase Cascade. Esta ação é irreversível!`)) {
        return;
    }

    showToast(`Iniciando exclusão de ${totalToDelete} famílias...`, 'info');
    _deletionInProgress = true;

    const frozenIds = Array.from(selectedRows);
    const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId');

    try {
        // ─── PASSO ÚNICO: EXCLUSÃO NO SUPABASE (CASCADING ON DELETE NO BANCO) ───
        const { error } = await window.supabase
            .from('familias')
            .delete()
            .in('id', frozenIds);

        if (error) throw error;

        // Limpeza LocalStorage (Retrocompatibilidade)
        frozenIds.forEach(famIdStr => {
            try {
                let localFamilias = JSON.parse(localStorage.getItem('familias') || '[]');
                localStorage.setItem('familias', JSON.stringify(localFamilias.filter(f => String(f.id) !== famIdStr)));

                let localAssoc = JSON.parse(localStorage.getItem('associados') || '[]');
                localStorage.setItem('associados', JSON.stringify(localAssoc.filter(a => String(a.familiaId) !== famIdStr)));
            } catch (_) { }
        });

        // Atualizar estado local
        const frozenSet = new Set(frozenIds);
        sampleFamilies.splice(0, sampleFamilies.length, ...sampleFamilies.filter(f => !frozenSet.has(String(f.id))));
        filteredData = [...sampleFamilies];
        totalRecords = sampleFamilies.length;
        selectedRows.clear();

        _deletionInProgress = false;
        updateTable();
        updateBulkBar();
        updateSelectAllCheckbox();
        if (typeof closeBulkDeleteModal === 'function') closeBulkDeleteModal();

        showToast(`${totalToDelete} família(s) excluída(s) com sucesso.`, 'success');
        console.log(`🏁 Exclusão concluída: ${totalToDelete} famílias.`);

    } catch (error) {
        console.error('❌ Erro na exclusão via Supabase:', error);
        _deletionInProgress = false;
        if (typeof closeBulkDeleteModal === 'function') closeBulkDeleteModal();
        showToast('Erro ao excluir: ' + error.message, 'error');
    }
}
window.confirmBulkDeleteFamilias = confirmBulkDeleteFamilias;

// Export functions for debugging
window.pesquisarFamilias = {
    goToPage,
    showToast,
    updateTable,
    selectedRows,
    currentPage,
    totalRecords,
    updateBulkBar,
    confirmBulkDeleteFamilias
};

console.log('Pesquisar Famílias JavaScript loaded successfully');
