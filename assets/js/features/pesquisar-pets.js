// Pesquisar Pets JavaScript — Sistema integrado à Supabase + localStorage (Cloud & Local Sync)

const allPets = [];
let currentPage = 1;
let itemsPerPage = 15;
let totalItems = 0;
let selectedPets = new Set();
let filteredPets = [];

// DOM elements
let petsTableBody;
let selectAllCheckbox;
let editBtn;
let viewBtn;
let recordCount;
let pageNumbers;
let firstPageBtn;
let prevPageBtn;
let nextPageBtn;
let lastPageBtn;
let filterBtn;
let optionsBtn;
let filterStatus;
let loadingOverlay;
let toastContainer;

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    initializeElements();
    setupEventListeners();
    
    setTimeout(() => {
        loadAllPets();
    }, 300);
});

// Initialize DOM elements
function initializeElements() {
    petsTableBody = document.getElementById('petsTableBody');
    selectAllCheckbox = document.getElementById('selectAll');
    editBtn = document.getElementById('editBtn');
    viewBtn = document.getElementById('viewBtn');
    recordCount = document.getElementById('recordCount');
    pageNumbers = document.getElementById('pageNumbers');
    firstPageBtn = document.getElementById('firstPage');
    prevPageBtn = document.getElementById('prevPage');
    nextPageBtn = document.getElementById('nextPage');
    lastPageBtn = document.getElementById('lastPage');
    filterBtn = document.getElementById('filterBtn');
    optionsBtn = document.getElementById('optionsBtn');
    filterStatus = document.getElementById('filterStatus');
    loadingOverlay = document.getElementById('loadingOverlay');
    toastContainer = document.getElementById('toastContainer');
}

// Carrega os pets do banco de dados oficial (Supabase) e do cache local
async function loadAllPets() {
    showLoading();

    // Descobre a empresa ativa no sistema
    let activeCompanyId = null;
    try {
        const activeCompanyStr = localStorage.getItem('activeCompany');
        const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        if (activeCompany && activeCompany.id) activeCompanyId = String(activeCompany.id);
    } catch(e) {}

    if (!activeCompanyId) {
        activeCompanyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || null;
    }

    const petsMap = new Map();

    // 1. Consulta real no banco Supabase na tabela "familias" para extrair os Pets
    if (window.supabase) {
        try {
            let query = window.supabase.from('familias').select('*');
            if (activeCompanyId) {
                query = query.eq('company_id', activeCompanyId);
            }
            const { data, error } = await query;
            if (!error && Array.isArray(data)) {
                data.forEach(fam => {
                    const titular = fam.titular || (fam.dados ? fam.dados.titular : {}) || {};
                    const nomeFamilia = titular.nome || fam.nome_titular || fam.nome || 'Família';
                    const doc = titular.cpf || fam.cpf_titular || fam.cpf || '-';
                    const famId = fam.id;
                    
                    // Verifica onde os pets estão armazenados no registro
                    let listaPets = fam.pets || (fam.dados ? fam.dados.pets : null);
                    if (typeof listaPets === 'string') {
                        try { listaPets = JSON.parse(listaPets); } catch(e) { listaPets = []; }
                    }
                    
                    if (Array.isArray(listaPets)) {
                        listaPets.forEach((p, idx) => {
                            const pId = String(p.id || `${famId}_pet_${idx}`);
                            petsMap.set(pId, {
                                id: pId,
                                family: nomeFamilia,
                                document: doc,
                                name: p.nome || p.name || 'Pet sem nome',
                                species: p.especie || p.species || 'Não informado',
                                breed: p.raca || p.breed || 'SRD (Sem raça definida)',
                                coat: p.pelagem || p.coat || '',
                                gender: p.genero || p.sexo || p.gender || 'Não informado',
                                weight: p.peso || p.weight || '',
                                height: p.altura || p.height || '',
                                birthDate: p.dataNascimento || p.birthDate || p.data_nascimento || '-',
                                photo: p.foto || p.photo || null,
                                familyId: famId,
                                source: 'supabase_familias'
                            });
                        });
                    }
                });
            }
        } catch(err) {
            console.warn('Alerta na consulta do Supabase (familias/pets):', err);
        }

        // 2. Consulta tabela dedicada de pets, caso exista
        try {
            let queryPets = window.supabase.from('pets').select('*');
            if (activeCompanyId) {
                queryPets = queryPets.eq('company_id', activeCompanyId);
            }
            const { data: dataPets, error: errPets } = await queryPets;
            if (!errPets && Array.isArray(dataPets)) {
                dataPets.forEach(p => {
                    const pId = String(p.id);
                    petsMap.set(pId, {
                        id: pId,
                        family: p.familia_nome || p.nome_titular || p.titular || 'Assinante',
                        document: p.cpf_titular || p.documento || '-',
                        name: p.nome || p.name || 'Pet',
                        species: p.especie || 'Cão',
                        breed: p.raca || 'SRD',
                        gender: p.sexo || p.genero || 'Não informado',
                        birthDate: p.data_nascimento || p.dataNascimento || '-',
                        photo: p.foto || null,
                        familyId: p.familia_id || null,
                        source: 'supabase_pets'
                    });
                });
            }
        } catch(e) {}
    }

    // 3. Fallback no localStorage para não perder dados locais recentes ou em cache
    try {
        const familiasLocais = JSON.parse(localStorage.getItem('familias') || '[]');
        familiasLocais.forEach(fam => {
            if (activeCompanyId && String(fam.companyId || '') !== String(activeCompanyId) && fam.companyId) return;
            
            const titular = fam.titular || {};
            const nomeFamilia = titular.nome || fam.nome || 'Família';
            const doc = titular.cpf || '-';
            const famId = fam.id || Math.random();

            const listaPets = Array.isArray(fam.pets) ? fam.pets : [];
            listaPets.forEach((p, idx) => {
                const pId = String(p.id || `${famId}_pet_${idx}`);
                if (!petsMap.has(pId)) {
                    petsMap.set(pId, {
                        id: pId,
                        family: nomeFamilia,
                        document: doc,
                        name: p.nome || p.name || 'Pet sem nome',
                        species: p.especie || p.species || 'Não informado',
                        breed: p.raca || p.breed || 'SRD',
                        gender: p.genero || p.sexo || 'Não informado',
                        birthDate: p.dataNascimento || p.birthDate || '-',
                        photo: p.foto || p.photo || null,
                        familyId: famId,
                        source: 'localStorage'
                    });
                }
            });
        });
    } catch(e) {}

    allPets.splice(0, allPets.length, ...Array.from(petsMap.values()));
    
    // Ordenar em ordem alfabética por nome do Pet
    allPets.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    filteredPets = [...allPets];
    totalItems = allPets.length;

    hideLoading();
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
}

function setupEventListeners() {
    if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', handleSelectAll);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (viewBtn) viewBtn.addEventListener('click', handleView);

    if (firstPageBtn) firstPageBtn.addEventListener('click', () => goToPage(1));
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    if (lastPageBtn) lastPageBtn.addEventListener('click', () => goToPage(getTotalPages()));

    if (filterBtn) filterBtn.addEventListener('click', handleFilter);
    if (optionsBtn) optionsBtn.addEventListener('click', handleOptions);

    const petSearchInput = document.getElementById('petSearch');
    if (petSearchInput) {
        let debounceTimer;
        petSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchPets(term);
            }, 250);
        });
    }
}

// Render the table with modern UI design
function renderTable() {
    if (!petsTableBody) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    petsTableBody.innerHTML = '';

    if (currentPets.length === 0) {
        petsTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 45px; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 12px; opacity: 0.7;">🐕</div>
                    <strong style="font-size: 1.1rem; display: block; color: #334155;">Nenhum pet encontrado</strong>
                    <span style="font-size: 0.9rem; color: #94a3b8; display: block; margin-top: 4px;">Os animais cadastrados nas fichas das famílias aparecerão automaticamente aqui.</span>
                </td>
            </tr>
        `;
        updateActionButtons();
        return;
    }

    currentPets.forEach(pet => {
        const row = createTableRow(pet);
        petsTableBody.appendChild(row);
    });

    updateActionButtons();
}

function createTableRow(pet) {
    const row = document.createElement('tr');
    row.dataset.petId = pet.id;
    row.style.borderBottom = '1px solid #f1f5f9';
    row.style.transition = 'background-color 0.2s ease';
    row.onmouseover = () => row.style.backgroundColor = '#f8fafc';
    row.onmouseout = () => row.style.backgroundColor = 'transparent';

    if (selectedPets.has(pet.id)) row.classList.add('selected');

    // Ícone bonito para o Pet de acordo com a espécie
    let fotoHtml = '';
    if (pet.photo && typeof pet.photo === 'string' && (pet.photo.startsWith('http') || pet.photo.startsWith('data:'))) {
        fotoHtml = `<img src="${pet.photo}" alt="${pet.name}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
    } else {
        const esp = String(pet.species).toLowerCase();
        if (esp.includes('cao') || esp.includes('cão') || esp.includes('cachorro') || esp.includes('dog')) {
            fotoHtml = `<div style="width: 42px; height: 42px; border-radius: 50%; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);" title="Cão"><i class="fas fa-dog"></i></div>`;
        } else if (esp.includes('gato') || esp.includes('cat') || esp.includes('felino')) {
            fotoHtml = `<div style="width: 42px; height: 42px; border-radius: 50%; background: #f3e8ff; color: #7c3aed; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);" title="Gato"><i class="fas fa-cat"></i></div>`;
        } else if (esp.includes('ave') || esp.includes('passaro') || esp.includes('pássaro')) {
            fotoHtml = `<div style="width: 42px; height: 42px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;" title="Ave"><i class="fas fa-dove"></i></div>`;
        } else {
            fotoHtml = `<div style="width: 42px; height: 42px; border-radius: 50%; background: #e2e8f0; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;" title="Pet"><i class="fas fa-paw"></i></div>`;
        }
    }

    // Sexo
    const s = String(pet.gender).toLowerCase();
    let iconeSexo = '<i class="fas fa-genderless" style="color: #64748b;"></i>';
    if (s.includes('femea') || s.includes('fêmea') || s.includes('f')) {
        iconeSexo = '<span style="color: #e11d48; font-weight: 600;"><i class="fas fa-venus"></i> Fêmea</span>';
    } else if (s.includes('macho') || s.includes('m')) {
        iconeSexo = '<span style="color: #2563eb; font-weight: 600;"><i class="fas fa-mars"></i> Macho</span>';
    } else {
        iconeSexo = `<span style="color: #64748b;">${pet.gender || 'Não ind.'}</span>`;
    }

    // Formatar Nascimento
    let nascFormatado = pet.birthDate;
    if (nascFormatado && nascFormatado.includes('-') && nascFormatado.length === 10) {
        const [a, m, d] = nascFormatado.split('-');
        nascFormatado = `${d}/${m}/${a}`;
    }

    row.innerHTML = `
        <td class="checkbox-col" style="text-align: center; padding: 12px;">
            <input type="checkbox" ${selectedPets.has(pet.id) ? 'checked' : ''} onchange="handleRowSelect('${pet.id}', this.checked)">
        </td>
        <td class="actions-col" style="text-align: center; padding: 12px;">
            <div style="display: flex; justify-content: center; gap: 6px;">
                <button onclick="editPet('${pet.id}')" title="Editar Pet" style="padding: 6px 10px; background: #f8fafc; color: #3b82f6; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s;"><i class="fas fa-edit"></i></button>
                <button onclick="viewPet('${pet.id}')" title="Ver Detalhes do Pet" style="padding: 6px 10px; background: #f8fafc; color: #059669; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s;"><i class="fas fa-eye"></i></button>
            </div>
        </td>
        <td style="text-align: center; padding: 10px;">${fotoHtml}</td>
        <td style="padding: 12px; font-weight: 700; color: #1e293b; font-size: 1.02rem;">${pet.name}</td>
        <td style="padding: 12px;">
            <div style="font-weight: 600; color: #334155; font-size: 0.92rem;">${pet.species}</div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${pet.breed}</div>
        </td>
        <td style="padding: 12px;">
            <div style="font-weight: 600; color: #0056b3;">${pet.family}</div>
            ${pet.familyId ? `<span style="font-size: 0.76rem; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">Família Associada</span>` : ''}
        </td>
        <td style="padding: 12px; font-family: monospace; color: #475569; font-size: 0.92rem;">${pet.document}</td>
        <td style="padding: 12px;">
            <div style="margin-bottom: 3px;">${iconeSexo}</div>
            <div style="font-size: 0.82rem; color: #64748b;"><i class="far fa-calendar-alt" style="margin-right: 3px;"></i> ${nascFormatado || 'Não informada'}</div>
        </td>
    `;

    return row;
}

function handleRowSelect(petId, isSelected) {
    if (isSelected) {
        selectedPets.add(String(petId));
    } else {
        selectedPets.delete(String(petId));
    }
    updateSelectAllCheckbox();
    updateActionButtons();
}

function handleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    currentPets.forEach(pet => {
        if (isChecked) {
            selectedPets.add(String(pet.id));
        } else {
            selectedPets.delete(String(pet.id));
        }
    });

    renderTable();
    updateActionButtons();
}

function updateSelectAllCheckbox() {
    if (!selectAllCheckbox) return;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    const selectedInCurrentPage = currentPets.filter(pet => selectedPets.has(String(pet.id))).length;

    if (selectedInCurrentPage === 0 || currentPets.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedInCurrentPage === currentPets.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function updateActionButtons() {
    const hasSelection = selectedPets.size > 0;
    if (editBtn) editBtn.disabled = selectedPets.size !== 1;
    if (viewBtn) viewBtn.disabled = !hasSelection;
}

function getTotalPages() {
    return Math.max(1, Math.ceil(filteredPets.length / itemsPerPage));
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderTable();
    updatePagination();
    updateSelectAllCheckbox();
}

function updatePagination() {
    const totalPages = getTotalPages();
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    updatePageNumbers();
}

function updatePageNumbers() {
    if (!pageNumbers) return;
    const totalPages = getTotalPages();
    pageNumbers.innerHTML = '';

    if (totalPages <= 1) return;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

function updateRecordCount() {
    if (recordCount) recordCount.textContent = `Quantidade de pets: ${filteredPets.length}`;
}

function updateFilterStatus() {
    if (!filterStatus) return;
    if (filteredPets.length === allPets.length) {
        filterStatus.textContent = 'Todos os pets cadastrados na plataforma';
    } else {
        filterStatus.textContent = `Filtros ativos — Exibindo ${filteredPets.length} de ${allPets.length} pets`;
    }
}

function handleFilter() {
    const filterType = prompt('Filtrar Pets por:\n1 - Apenas Cachorros\n2 - Apenas Gatos\n3 - Todos\n\nDigite o número da opção:');
    if (filterType === '1') {
        filteredPets = allPets.filter(p => {
            const e = String(p.species).toLowerCase();
            return e.includes('cão') || e.includes('cao') || e.includes('cachorro') || e.includes('dog');
        });
        showToast('Filtrado por: Cachorros', 'success');
    } else if (filterType === '2') {
        filteredPets = allPets.filter(p => {
            const e = String(p.species).toLowerCase();
            return e.includes('gato') || e.includes('cat') || e.includes('felino');
        });
        showToast('Filtrado por: Gatos', 'success');
    } else if (filterType === '3') {
        filteredPets = [...allPets];
        showToast('Exibindo todos os pets', 'info');
    } else if (filterType) {
        return;
    }
    currentPage = 1;
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
}

function handleOptions() {
    const op = prompt('Ações Rápida de Pets:\n1 - Exportar Lista (CSV)\n2 - Atualizar Lista do Banco\n\nDigite o número da opção:');
    if (op === '1') exportData();
    else if (op === '2') loadAllPets();
}

function handleEdit() {
    if (selectedPets.size !== 1) return;
    const pId = Array.from(selectedPets)[0];
    editPet(pId);
}

function handleView() {
    if (selectedPets.size === 0) return;
    const pId = Array.from(selectedPets)[0];
    viewPet(pId);
}

function editPet(petId) {
    const pet = allPets.find(p => String(p.id) === String(petId));
    if (pet && pet.familyId && String(pet.familyId) !== 'undefined' && String(pet.familyId) !== 'null') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: `<div style="display:flex;align-items:center;gap:10px;"><i class="fas fa-edit" style="color:#2563eb;"></i> Editar Pet: <strong>${pet.name}</strong></div>`,
                html: `<p style="text-align:left;color:#475569;">Este pet está vinculado à família do titular <strong>${pet.family}</strong>.</p><p style="text-align:left;font-size:0.9rem;color:#64748b;">Para alterar dados da espécie, raça ou carteira de vacinação do pet, você será redirecionado para a ficha da família no cadastro.</p>`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="fas fa-external-link-alt"></i> Abrir Cadastro da Família',
                cancelButtonText: 'Fechar'
            }).then(result => {
                if (result.isConfirmed) {
                    window.location.href = `nova-familia.html?id=${pet.familyId}`;
                }
            });
        } else {
            const c = confirm(`O pet ${pet.name} pretence à família de ${pet.family}. Deseja abrir a ficha da família para edição?`);
            if (c) window.location.href = `nova-familia.html?id=${pet.familyId}`;
        }
    } else if (pet) {
        showToast(`Editar dados avulsos do pet: ${pet.name}`, 'info');
    } else {
        showToast('Pet não identificado.', 'error');
    }
}

function viewPet(petId) {
    const pet = allPets.find(p => String(p.id) === String(petId));
    if (!pet) return;

    if (typeof Swal !== 'undefined') {
        let iconeEsp = '🐾';
        if (String(pet.species).toLowerCase().includes('cão') || String(pet.species).toLowerCase().includes('cachorro')) iconeEsp = '🐕';
        if (String(pet.species).toLowerCase().includes('gato')) iconeEsp = '🐈';

        Swal.fire({
            title: `<div style="font-size:1.6rem;color:#1e293b;">${iconeEsp} <strong>${pet.name}</strong></div>`,
            html: `
                <div style="text-align: left; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <p style="margin: 8px 0;"><strong>Espécie/Raça:</strong> ${pet.species} - ${pet.breed}</p>
                    <p style="margin: 8px 0;"><strong>Sexo:</strong> ${pet.gender || 'Não especificado'}</p>
                    <p style="margin: 8px 0;"><strong>Data de Nascimento:</strong> ${pet.birthDate || '-'}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                    <p style="margin: 8px 0; color: #0056b3;"><strong>Responsável da Família:</strong> ${pet.family}</p>
                    <p style="margin: 8px 0;"><strong>Documento do Titular:</strong> <span style="font-family: monospace;">${pet.document}</span></p>
                </div>
            `,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#3b82f6'
        });
    } else {
        alert(`Pet: ${pet.name}\nEspécie: ${pet.species}\nRaça: ${pet.breed}\nFamília: ${pet.family}\nCPF: ${pet.document}`);
    }
}

function showLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('show');
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.remove('show');
}

function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type} show`;
    toast.style.cssText = 'position:fixed;bottom:25px;right:25px;background:#334155;color:white;padding:14px 24px;border-radius:8px;font-weight:600;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);z-index:99999;transition:opacity 0.3s ease;';
    if (type === 'success') toast.style.backgroundColor = '#10b981';
    if (type === 'info') toast.style.backgroundColor = '#3b82f6';
    if (type === 'error') toast.style.backgroundColor = '#ef4444';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function searchPets(query) {
    if (!query.trim()) {
        filteredPets = [...allPets];
    } else {
        const searchTerm = query.toLowerCase();
        filteredPets = allPets.filter(pet => {
            return (
                String(pet.name).toLowerCase().includes(searchTerm) ||
                String(pet.family).toLowerCase().includes(searchTerm) ||
                String(pet.species).toLowerCase().includes(searchTerm) ||
                String(pet.breed).toLowerCase().includes(searchTerm) ||
                String(pet.document).toLowerCase().includes(searchTerm)
            );
        });
    }

    currentPage = 1;
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
}

function exportData() {
    if (filteredPets.length === 0) {
        showToast('Nenhum pet para exportar.', 'error');
        return;
    }
    const headers = ["Nome do Pet", "Espécie", "Raça", "Sexo", "Nascimento", "Responsável", "CPF Titular"];
    const rows = filteredPets.map(p => [
        p.name, p.species, p.breed, p.gender, p.birthDate, p.family, p.document
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lista_pets_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exportados ${filteredPets.length} pets com sucesso!`, 'success');
}

// Global scope bindings
window.handleRowSelect = handleRowSelect;
window.editPet = editPet;
window.viewPet = viewPet;
window.searchPets = searchPets;
window.exportData = exportData;

console.log('✅ Módulo Pesquisar Pets com integração Supabase ativado com sucesso!');