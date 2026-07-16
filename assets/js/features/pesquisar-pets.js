// Dados de pets carregados dinamicamente (localStorage / futuro Firestore)
const samplePets = [];

// Carrega pets do localStorage (famílias) e popula samplePets
function loadPetsFromLocalStorage() {
    let familias = [];
    try {
        familias = JSON.parse(localStorage.getItem('familias') || '[]');
    } catch (e) {
        familias = [];
    }

    if (!Array.isArray(familias) || familias.length === 0) {
        // Nada a carregar
        return;
    }

    // Descobrir empresa ativa para filtrar (quando disponível)
    let activeCompanyId = null;
    try {
        const activeCompanyStr = localStorage.getItem('activeCompany');
        const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        activeCompanyId = activeCompany && activeCompany.id ? String(activeCompany.id) : null;
    } catch (e) {
        activeCompanyId = null;
    }
    // Fallbacks
    if (!activeCompanyId) {
        activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || null;
    }

    const pets = [];
    familias
        .filter(f => !activeCompanyId || String(f.companyId) === String(activeCompanyId))
        .forEach(f => {
            const familyName = f?.titular?.nome || 'Família';
            const document = f?.titular?.cpf || '';
            const familyId = f?.id || '';

            const listaPets = Array.isArray(f.pets) ? f.pets : [];
            listaPets.forEach(p => {
                pets.push({
                    id: p.id || Date.now(),
                    family: familyName,
                    document: document,
                    name: p.nome || '',
                    species: p.especie || '',
                    breed: p.raca || '',
                    coat: p.pelagem || '',
                    gender: p.genero || '',
                    weight: p.peso || '',
                    height: p.altura || '',
                    birthDate: p.dataNascimento || '',
                    photo: p.foto || '',
                    familyId: familyId
                });
            });
        });

    // Atualiza o array constante mantendo a referência
    samplePets.splice(0, samplePets.length, ...pets);
}

// Global variables
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = samplePets.length;
let selectedPets = new Set();
let filteredPets = [...samplePets];

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
    // Carregar dados reais dos pets
    loadPetsFromLocalStorage();
    filteredPets = [...samplePets];
    totalItems = samplePets.length;
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
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

// Setup event listeners
function setupEventListeners() {
    // Select all checkbox
    selectAllCheckbox.addEventListener('change', handleSelectAll);

    // Action buttons
    editBtn.addEventListener('click', handleEdit);
    viewBtn.addEventListener('click', handleView);

    // Pagination buttons
    firstPageBtn.addEventListener('click', () => goToPage(1));
    prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    lastPageBtn.addEventListener('click', () => goToPage(getTotalPages()));

    // Filter and options buttons
    filterBtn.addEventListener('click', handleFilter);
    optionsBtn.addEventListener('click', handleOptions);

    // Search input with debounce
    const petSearchInput = document.getElementById('petSearch');
    if (petSearchInput) {
        let debounceTimer;
        petSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchPets(term);
            }, 300);
        });
    }
}

// Render the table with current data
function renderTable() {
    if (!petsTableBody) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    petsTableBody.innerHTML = '';

    currentPets.forEach(pet => {
        const row = createTableRow(pet);
        petsTableBody.appendChild(row);
    });

    updateActionButtons();
}

// Create a table row for a pet
function createTableRow(pet) {
    const row = document.createElement('tr');
    row.dataset.petId = pet.id;

    if (selectedPets.has(pet.id)) {
        row.classList.add('selected');
    }

    row.innerHTML = `
        <td class="checkbox-col">
            <input type="checkbox" ${selectedPets.has(pet.id) ? 'checked' : ''} 
                   onchange="handleRowSelect(${pet.id}, this.checked)">
        </td>
        <td class="actions-col">
            <button class="table-action-btn btn-edit" onclick="editPet(${pet.id})" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="table-action-btn btn-view" onclick="viewPet(${pet.id})" title="Visualizar">
                <i class="fas fa-eye"></i>
            </button>
        </td>
        <td class="photo-col">
            ${pet.photo ?
            `<img src="${pet.photo}" alt="${pet.name}" class="pet-photo">` :
            `<div class="pet-photo-placeholder"><i class="fas fa-paw"></i></div>`
        }
        </td>
        <td class="family-col">${pet.family}</td>
        <td class="document-col">${pet.document}</td>
        <td class="name-col">${pet.name}</td>
        <td class="species-col">${pet.species}</td>
        <td class="breed-col">${pet.breed}</td>
        <td class="coat-col">${pet.coat}</td>
        <td class="gender-col">${pet.gender}</td>
        <td class="weight-col">${pet.weight}</td>
        <td class="height-col">${pet.height}</td>
        <td class="birth-col">${pet.birthDate}</td>
    `;

    return row;
}

// Handle row selection
function handleRowSelect(petId, isSelected) {
    if (isSelected) {
        selectedPets.add(petId);
    } else {
        selectedPets.delete(petId);
    }

    updateSelectAllCheckbox();
    updateActionButtons();

    // Update row styling
    const row = document.querySelector(`tr[data-pet-id="${petId}"]`);
    if (row) {
        if (isSelected) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }
}

// Handle select all checkbox
function handleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    currentPets.forEach(pet => {
        if (isChecked) {
            selectedPets.add(pet.id);
        } else {
            selectedPets.delete(pet.id);
        }
    });

    renderTable();
    updateActionButtons();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPets = filteredPets.slice(startIndex, endIndex);

    const selectedInCurrentPage = currentPets.filter(pet => selectedPets.has(pet.id)).length;

    if (selectedInCurrentPage === 0) {
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

// Update action buttons state
function updateActionButtons() {
    const hasSelection = selectedPets.size > 0;
    editBtn.disabled = !hasSelection;
    viewBtn.disabled = !hasSelection;
}

// Pagination functions
function getTotalPages() {
    return Math.ceil(filteredPets.length / itemsPerPage);
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

    // Update button states
    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Update page numbers
    updatePageNumbers();
}

function updatePageNumbers() {
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

// Update record count
function updateRecordCount() {
    recordCount.textContent = `Quantidade registros: ${filteredPets.length}`;
}

// Update filter status
function updateFilterStatus() {
    if (filteredPets.length === samplePets.length) {
        filterStatus.textContent = 'Nenhum filtro aplicado';
    } else {
        filterStatus.textContent = `Filtro aplicado - ${filteredPets.length} de ${samplePets.length} registros`;
    }
}

// Event handlers
function handleFilter() {
    const filterType = prompt('Filtrar por:\n1 - Espécie\n2 - Idade\n3 - Status\n\nDigite o número da opção:');
    if (filterType) {
        showToast(`Aplicando filtro tipo ${filterType}`, 'success');
    }
}

function handleOptions() {
    const option = prompt('Opções disponíveis:\n1 - Exportar lista\n2 - Configurar colunas\n3 - Salvar filtro\n\nDigite o número da opção:');
    if (option) {
        showToast(`Executando opção ${option}`, 'success');
    }
}

function handleEdit() {
    if (selectedPets.size === 0) return;

    const selectedCount = selectedPets.size;
    showToast(`Editando ${selectedCount} pet(s) selecionado(s)`, 'info');
}

function handleView() {
    if (selectedPets.size === 0) return;

    const selectedCount = selectedPets.size;
    showToast(`Visualizando ${selectedCount} pet(s) selecionado(s)`, 'info');
}

function editPet(petId) {
    const pet = samplePets.find(p => p.id === petId);
    if (pet) {
        showToast(`Editando pet: ${pet.name}`, 'info');
    }
}

function viewPet(petId) {
    const pet = samplePets.find(p => p.id === petId);
    if (pet) {
        showToast(`Visualizando pet: ${pet.name}`, 'info');
    }
}

// Utility functions
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

function showToast(message, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Search and filter functions (for future implementation)
function searchPets(query) {
    if (!query.trim()) {
        filteredPets = [...samplePets];
    } else {
        const searchTerm = query.toLowerCase();
        filteredPets = samplePets.filter(pet => {
            // Busca em todos os campos relevantes do pet
            const searchableFields = [
                pet.name,
                pet.family,
                pet.species,
                pet.breed,
                pet.document,
                pet.coat,
                pet.gender,
                pet.weight,
                pet.height
            ].map(field => String(field || '').toLowerCase());

            return searchableFields.some(field => field.includes(searchTerm));
        });
    }

    currentPage = 1;
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
    selectedPets.clear();
    updateActionButtons();
    updateSelectAllCheckbox();
}

function filterBySpecies(species) {
    if (!species || species === 'all') {
        filteredPets = [...samplePets];
    } else {
        filteredPets = samplePets.filter(pet => pet.species === species);
    }

    currentPage = 1;
    renderTable();
    updatePagination();
    updateRecordCount();
    updateFilterStatus();
    selectedPets.clear();
    updateActionButtons();
    updateSelectAllCheckbox();
}

// Debug function
function debugInfo() {
    console.log('Current Page:', currentPage);
    console.log('Items Per Page:', itemsPerPage);
    console.log('Total Items:', totalItems);
    console.log('Filtered Items:', filteredPets.length);
    console.log('Selected Pets:', Array.from(selectedPets));
    console.log('Total Pages:', getTotalPages());
}

// Export data function (for future implementation)
function exportData() {
    const dataToExport = filteredPets.map(pet => ({
        Família: pet.family,
        Documento: pet.document,
        Nome: pet.name,
        Espécie: pet.species,
        Raça: pet.breed,
        Pelagem: pet.coat,
        Sexo: pet.gender,
        Peso: pet.weight,
        Altura: pet.height,
        'Data de Nascimento': pet.birthDate
    }));

    
    showToast(`Exportando ${dataToExport.length} pets para planilha...`, 'success');
}

// Make functions available globally
window.handleRowSelect = handleRowSelect;
window.editPet = editPet;
window.viewPet = viewPet;
window.searchPets = searchPets;
window.filterBySpecies = filterBySpecies;
window.exportData = exportData;
window.debugInfo = debugInfo;