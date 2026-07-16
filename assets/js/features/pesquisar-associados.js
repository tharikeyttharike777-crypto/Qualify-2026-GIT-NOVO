// Dados serão carregados dinamicamente do localStorage
const associadosData = [];

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalRecords = 0;
let filteredData = [];
let selectedRows = new Set();

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadData();
});

function initializePage() {
    console.log('Pesquisar Associados page initialized');
    
    // Set initial filter status
    updateFilterStatus();
}

// Load data de associados garantindo titulares e dependentes das famílias
async function loadData() {
    try {
        // Mostra loading
        showLoadingState();
        
        // Validar empresa ativa
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let activeCompany = null;
        try {
            activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        } catch (e) {
            activeCompany = null;
        }
        if (!activeCompany || !activeCompany.id) {
            showEmptyState('Selecione uma empresa ativa para visualizar associados.');
            return;
        }
        const companyId = activeCompany.id;

        // Carrega famílias da empresa via Supabase
        let familias = [];
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('familias')
                    .select('*')
                    .eq('company_id', companyId);
                
                if (!error && data) {
                    familias = data.map(f => ({
                        id: f.id,
                        companyId: f.company_id,
                        titular: f.titular || {},
                        dependentes: f.dependentes || [],
                        endereco: f.endereco || {}
                    }));
                }
            }
        } catch (e) {
            console.warn('Falha ao carregar famílias do Supabase, usando dados locais se houver:', e);
        }

        if (familias.length === 0) {
            familias = (JSON.parse(localStorage.getItem('familias') || '[]') || []).filter(f => String(f.companyId) === String(companyId));
        }

        // Mapa de famílias por ID para acesso rápido
        const familiaById = new Map(familias.map(f => [String(f.id), f]));
        const familyIds = new Set(familias.map(f => String(f.id)));

        // Carrega associados via Supabase
        let associadosFiltrados = [];
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('associados')
                    .select('*');
                
                if (!error && data) {
                    associadosFiltrados = data.filter(a => String(a.company_id) === String(companyId) || (a.familia_id && familyIds.has(String(a.familia_id))));
                }
            }
        } catch (e) {
            console.warn('Falha ao carregar associados do Supabase, usando dados locais para complementar:', e);
        }

        // Complementa com localStorage
        const associadosLocal = (JSON.parse(localStorage.getItem('associados') || '[]') || [])
            .filter(a => String(a.companyId) === String(companyId) || (a.familiaId && familyIds.has(String(a.familiaId))));
        const byKey = new Map();
        const addSafe = (a) => {
            if (!a) return;
            const key = String(a.id || `${a.familiaId || 'semFamilia'}-${a.tipo || 'assoc'}-${(a.nome || '').trim()}`);
            if (!byKey.has(key)) byKey.set(key, a);
        };
        associadosFiltrados.forEach(addSafe);
        associadosLocal.forEach(addSafe);
        associadosFiltrados = Array.from(byKey.values());

        // Constrói associados a partir das famílias (fallback) e mescla com armazenados
        const associadosMap = new Map();
        const pushAssoc = (a) => {
            if (!a) return;
            const key = String(a.id || `${a.familiaId || 'semFamilia'}-${a.tipo || 'assoc'}-${(a.nome || '').trim()}`);
            if (!associadosMap.has(key)) associadosMap.set(key, a);
        };

        // Primeiro, adiciona os associados existentes (preferência para dados mais completos)
        associadosFiltrados.forEach(a => pushAssoc(a));

        // Agora, adiciona titulares e dependentes a partir das famílias (garante presença)
        familias.forEach(familia => {
            // Titular
            const titularAssoc = {
                id: familia?.titular?.id || `fam_${familia.id}_titular`,
                familiaId: String(familia.id),
                companyId: companyId,
                tipo: 'titular',
                nome: familia?.titular?.nome || '',
                cpf: familia?.titular?.cpf || '',
                telefone: familia?.titular?.telefone || '',
                email: familia?.titular?.email || '',
                dataNascimento: familia?.titular?.dataNascimento || '',
                endereco: familia?.endereco || {},
                seguradora: familia?.titular?.seguradora || ''
            };
            pushAssoc(titularAssoc);

            // Dependentes
            (familia?.dependentes || []).forEach((dep, idx) => {
                const depAssoc = {
                    id: dep?.id || `fam_${familia.id}_dep_${idx}_${(dep?.nome || '').replace(/\s+/g,'_')}`,
                    familiaId: String(familia.id),
                    companyId: companyId,
                    tipo: 'dependente',
                    nome: dep?.nome || '',
                    cpf: dep?.cpf || '',
                    telefone: dep?.telefone || '',
                    email: dep?.email || '',
                    dataNascimento: dep?.dataNascimento || '',
                    endereco: familia?.endereco || {},
                    parentesco: dep?.parentesco || 'Dependente',
                    seguradora: dep?.seguradora || ''
                };
                pushAssoc(depAssoc);
            });
        });

        // Mapeia todos os associados com informações completas e consistentes para a tabela
        const associadosCompletos = Array.from(associadosMap.values()).map(associado => {
            const familia = associado.familiaId ? familiaById.get(String(associado.familiaId)) : null;
            const titularNome = familia?.titular?.nome || '';
            return {
                id: associado.id,
                nome: associado.nome,
                idade: associado.idade || calcularIdade(associado.dataNascimento),
                cpf: associado.cpf,
                parentesco: associado.tipo === 'titular' ?
                    `Titular de ${associado.nome || titularNome}` :
                    `${associado.parentesco || 'Dependente'} de ${titularNome || 'N/A'}`,
                contatos: [associado.telefone, associado.email].filter(Boolean).join(' | ') || '-',
                contratos: familia ? (Array.isArray(familia.contratos) ? familia.contratos.length : 0) : 0,
                extra: "Não",
                tipo: associado.tipo,
                familiaId: associado.familiaId,
                dataNascimento: associado.dataNascimento
            };
        });
        
        associadosData.length = 0; // Limpa array
        associadosData.push(...associadosCompletos);
        filteredData = [...associadosData];
        totalRecords = associadosData.length;
        
        if (associadosData.length === 0) {
            showEmptyState('Nenhum associado encontrado');
        } else {
            hideLoadingState();
            updateTable();
            updatePagination();
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados de associados:', error);
        showEmptyState('Erro ao carregar dados. Tente novamente.');
    }
}

// Função auxiliar para calcular idade
function calcularIdade(dataNascimento) {
    if (!dataNascimento) return '-';
    
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    
    return idade;
}

// DOM Elements
const tableBody = document.getElementById('tableBody');
const totalRecordsSpan = document.getElementById('totalRecords');
const pageNumbers = document.getElementById('pageNumbers');
const filterBtn = document.getElementById('filterBtn');
const optionsBtn = document.getElementById('optionsBtn');
const filterStatus = document.getElementById('filterStatus');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Initialize the page
function initializePage() {
    console.log('Pesquisar Associados page initialized');
    
    // Set initial filter status
    updateFilterStatus();
}

// Setup event listeners
function setupEventListeners() {
    // Filter button
    if (filterBtn) {
        filterBtn.addEventListener('click', handleFilterClick);
    }
    
    // Options button
    if (optionsBtn) {
        optionsBtn.addEventListener('click', handleOptionsClick);
    }
    
    // Setup pagination listeners
    setupPaginationListeners();
    
    // Setup table interactions
    setupTableInteractions();
    
    // Setup search functionality
    setupSearchListeners();
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function hideLoadingState() {
    // A função renderTable() já vai substituir o conteúdo
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">${message}</td></tr>`;
    }
    
    // Limpa paginação
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
    }
    
    // Atualiza contador
    const totalRecordsSpan = document.getElementById('totalRecords');
    if (totalRecordsSpan) {
        totalRecordsSpan.textContent = '0';
    }
}

// Update table with current data
function updateTable() {
    renderTable();
    updatePagination();
    updateRecordCount();
}

// Render table data
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // Render rows
    pageData.forEach(associado => {
        const row = createTableRow(associado);
        tableBody.appendChild(row);
    });
}

// Create table row
function createTableRow(associado) {
    const row = document.createElement('tr');
    row.dataset.associadoId = associado.id;
    
    row.innerHTML = `
        <td class="actions-cell">
            <div class="action-buttons">
                <button class="btn-action btn-edit" title="Editar" aria-label="Editar">
                    <i class="fas fa-edit" aria-hidden="true"></i>
                </button>
                <button class="btn-action btn-view" title="Visualizar" aria-label="Visualizar">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
            </div>
        </td>
        <td class="id-cell">${associado.id || '-'}</td>
        <td class="name-cell">${associado.nome || '-'}</td>
        <td class="age-cell">${associado.idade || '-'}</td>
        <td class="document-cell">${associado.cpf || '-'}</td>
        <td class="relationship-cell">${associado.parentesco || '-'}</td>
        <td class="contacts-cell">${associado.contatos || '-'}</td>
        <td class="contracts-cell">${associado.contratos || 0}</td>
        <td class="extra-cell">${associado.extra || 'Não'}</td>
    `;
    
    return row;
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    // Remover botões numéricos estáticos
    const pageNumbersEl = document.getElementById('pageNumbers');
    if (pageNumbersEl) {
        pageNumbersEl.innerHTML = '';
    }
    
    // Update page buttons
    const pageButtons = document.querySelectorAll('.page-numbers .page-btn');
    pageButtons.forEach((btn, index) => {
        const pageNum = index + 1;
        btn.textContent = pageNum;
        btn.classList.toggle('active', pageNum === currentPage);
        btn.style.display = pageNum <= totalPages ? 'block' : 'none';
    });
    
    // Update navigation buttons
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
}

// Update record count
function updateRecordCount() {
    const totalRecordsSpan = document.getElementById('totalRecords');
    if (totalRecordsSpan) {
        totalRecordsSpan.textContent = totalRecords.toString();
    }
}

// Update filter status
function updateFilterStatus(text = 'Nenhum filtro aplicado') {
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.textContent = text;
    }
}

// Event handlers
function handleFilterClick() {
    console.log('Filter button clicked');
    showToast('Filtros em desenvolvimento', 'info');
}

function handleOptionsClick() {
    console.log('Options button clicked');
    showToast('Opções em desenvolvimento', 'info');
}

// Setup pagination listeners
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
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    }
    
    // Page number buttons
    const pageButtons = document.querySelectorAll('.page-numbers .page-btn');
    pageButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageNum = parseInt(e.target.textContent);
            goToPage(pageNum);
        });
    });
}

// Setup table interactions
function setupTableInteractions() {
    // Add event delegation for dynamically created elements
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.addEventListener('click', handleTableClick);
        tableBody.addEventListener('change', handleTableChange);
    }
}

// Setup search listeners
function setupSearchListeners() {
    const searchInput = document.getElementById('associadoSearch');
    if (!searchInput) return;
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyAssociadosSearch(term);
        }, 200);
    });
}

function applyAssociadosSearch(term) {
    if (!term) {
        filteredData = [...associadosData];
        totalRecords = filteredData.length;
        currentPage = 1;
        updateFilterStatus('Nenhum filtro aplicado');
        updateTable();
        return;
    }
    const lower = term.toLowerCase();
    const digits = term.replace(/\D+/g, '');
    filteredData = associadosData.filter(a => {
        const nome = String(a.nome || '').toLowerCase();
        const cpfDigits = String(a.cpf || '').replace(/\D+/g, '');
        const parentesco = String(a.parentesco || '').toLowerCase();
        const contatos = String(a.contatos || '').toLowerCase();
        return (
            nome.includes(lower) ||
            parentesco.includes(lower) ||
            contatos.includes(lower) ||
            (digits && cpfDigits.includes(digits))
        );
    });
    totalRecords = filteredData.length;
    currentPage = 1;
    updateFilterStatus(`Filtro: "${term}"`);
    updateTable();
}

// Handle table clicks
function handleTableClick(event) {
    const target = event.target;
    const editBtn = target.closest('.btn-edit');
    const viewBtn = target.closest('.btn-view');

    if (editBtn) {
        const row = editBtn.closest('tr');
        const associadoId = row && row.dataset ? row.dataset.associadoId : undefined;
        handleEditAssociado(associadoId);
        return;
    }
    if (viewBtn) {
        const row = viewBtn.closest('tr');
        const associadoId = row && row.dataset ? row.dataset.associadoId : undefined;
        handleViewAssociado(associadoId);
        return;
    }
}

// Handle table changes
function handleTableChange(event) {
    const target = event.target;
    
    if (target.classList.contains('row-select')) {
        const row = target.closest('tr');
        const associadoId = parseInt(row.dataset.associadoId || '0');
        
        if (target.checked) {
            selectedRows.add(associadoId);
            row.classList.add('selected');
        } else {
            selectedRows.delete(associadoId);
            row.classList.remove('selected');
        }
        
        updateSelectAllCheckbox();
    }
}

// Handle edit associado
function handleEditAssociado(associadoId) {
    try {
        const idStr = String(associadoId || '').trim();
        if (!idStr) {
            showToast('ID do associado inválido', 'error');
            return;
        }
        // Localiza o associado atual para obter a família correspondente
        const associado = (filteredData && Array.isArray(filteredData)
            ? filteredData
            : associadosData).find(a => String(a.id) === idStr);
        if (!associado || !associado.familiaId) {
            showToast('Família do associado não encontrada', 'warning');
            console.warn('Associado sem familiaId ou não encontrado:', associadoId, associado);
            return;
        }
        // Redireciona para a tela de edição da família com parâmetro de URL
        const famId = String(associado.familiaId);
        try { localStorage.setItem('editFamilyId', famId); } catch (e) { console.warn('Falha ao persistir editFamilyId:', e); }
        window.location.href = `nova-familia.html?id=${encodeURIComponent(famId)}`;
    } catch (err) {
        console.error('Erro ao processar edição do associado:', err);
        showToast('Erro ao redirecionar para edição', 'error');
    }
}

// Handle view associado
function handleViewAssociado(associadoId) {
    try {
        const idStr = String(associadoId || '').trim();
        if (!idStr) {
            showToast('ID do associado inválido', 'error');
            return;
        }
        const associado = (filteredData && Array.isArray(filteredData)
            ? filteredData
            : associadosData).find(a => String(a.id) === idStr);
        if (!associado || !associado.familiaId) {
            showToast('Família do associado não encontrada', 'warning');
            console.warn('Associado sem familiaId ou não encontrado:', associadoId, associado);
            return;
        }
        // Persiste o ID para auto-abrir visualização na página de famílias
        try {
            localStorage.setItem('openFamilyId', String(associado.familiaId));
        } catch (e) {
            console.warn('Falha ao persistir openFamilyId:', e);
        }
        // Redireciona para a listagem de famílias, que abrirá a visualização
        window.location.href = 'pesquisar-familias.html';
    } catch (err) {
        console.error('Erro ao processar visualização do associado:', err);
        showToast('Erro ao abrir visualização', 'error');
    }
}

// Update select all checkbox
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.querySelector('.select-all');
    if (selectAllCheckbox) {
        const totalVisibleRows = document.querySelectorAll('.row-select').length;
        const selectedVisibleRows = document.querySelectorAll('.row-select:checked').length;
        
        selectAllCheckbox.checked = totalVisibleRows > 0 && selectedVisibleRows === totalVisibleRows;
        selectAllCheckbox.indeterminate = selectedVisibleRows > 0 && selectedVisibleRows < totalVisibleRows;
    }
}

// Go to page
function goToPage(pageNumber) {
    const totalPages = Math.ceil(totalRecords / itemsPerPage);
    
    if (pageNumber < 1 || pageNumber > totalPages) {
        return;
    }
    
    currentPage = pageNumber;
    renderTable();
    updatePagination();
}

// Show toast message
function showToast(message, type = 'info') {
    console.log(`Toast: ${message} (${type})`);
    // Toast implementation would go here
}

// Console welcome message
console.log('🔍 Pesquisar Associados - Sistema carregado com sucesso!');

console.log('🛠️ Use associadosDebug para funções de debug');