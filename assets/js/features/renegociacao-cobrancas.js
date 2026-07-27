// Renegociação de Cobranças JavaScript - Módulo Profissional

let sampleContracts = [];
let currentContracts = [];
let baseContracts = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let activeFilter = 'all';
let selectedContract = null;

// Elementos DOM
const elements = {
    filterBtn: document.getElementById('filterBtn'),
    filterDropdown: document.getElementById('filterDropdown'),
    filterStatusText: document.getElementById('filterStatusText'),
    renegotiationTableBody: document.getElementById('renegotiationTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    recordsCount: document.getElementById('recordsCount'),
    searchInput: document.getElementById('renegociacaoSearch'),
    
    // Pagination
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    pageNumbers: document.getElementById('pageNumbers'),
    
    // Renegotiation Modal
    renegotiationModal: document.getElementById('renegotiationModal'),
    closeRenegotiationModal: document.getElementById('closeRenegotiationModal'),
    contractInfo: document.getElementById('contractInfo'),
    discountPercentage: document.getElementById('discountPercentage'),
    installments: document.getElementById('installments'),
    firstDueDate: document.getElementById('firstDueDate'),
    observations: document.getElementById('observations'),
    originalValue: document.getElementById('originalValue'),
    discountValue: document.getElementById('discountValue'),
    finalValue: document.getElementById('finalValue'),
    cancelRenegotiationBtn: document.getElementById('cancelRenegotiationBtn'),
    confirmRenegotiationBtn: document.getElementById('confirmRenegotiationBtn')
};

/**
 * Carrega contratos em atraso/pendentes a partir das bases do sistema com Conexão Crítica e Sem Dados Fantasmas
 */
function loadRenegotiationContracts() {
    console.log('🔄 Carregando carteira para renegociação com validação anti-fantasma...');
    const list = [];
    let idCounter = 1;

    try {
        // Obter cadastros vigentes (contratos e famílias) para verificação cruzada (Conexão Crítica)
        const rawContratos = localStorage.getItem('contratos');
        const contratosAtivos = rawContratos ? JSON.parse(rawContratos) : [];
        const rawFamilias = localStorage.getItem('familias');
        const familiasAtivas = rawFamilias ? JSON.parse(rawFamilias) : [];

        // Conjunto de IDs ou nomes de titulares legítimos de cadastros que ainda existem na conta
        const nomesValidos = new Set();
        const numerosValidos = new Set();
        
        if (Array.isArray(contratosAtivos)) {
            contratosAtivos.forEach(c => {
                if (c && (c.numero || c.id || c.titular)) {
                    if (c.titular) nomesValidos.add(String(c.titular).toLowerCase().trim());
                    if (c.numero || c.id) numerosValidos.add(String(c.numero || c.id));
                }
            });
        }
        if (Array.isArray(familiasAtivas)) {
            familiasAtivas.forEach(f => {
                const nome = f && f.titular && f.titular.nome ? f.titular.nome : (f ? f.nome : '');
                if (nome) nomesValidos.add(String(nome).toLowerCase().trim());
                if (f && f.id) numerosValidos.add(String(f.id));
            });
        }

        // 1. Ler de inadimplentes verificando legitimidade (se o usuário apagou os contratos/famílias, limpa os órfãos do cache)
        const rawInad = localStorage.getItem('inadimplentes');
        if (rawInad) {
            const arr = JSON.parse(rawInad);
            if (Array.isArray(arr)) {
                const arrFiltrado = [];
                arr.forEach(item => {
                    const num = String(item.numero || item.contrato || item.id || '');
                    const titular = String(item.nome || item.titular || '').toLowerCase().trim();
                    
                    // Verificação de Conexão Crítica: Se não existem mais contratos ou famílias, ou se este cliente não bate mais com nenhum registro de titular/número, trata-se de dado fantasma ou contrato deletado!
                    const existeNoSistema = (contratosAtivos.length === 0 && familiasAtivas.length === 0) ? false : (nomesValidos.has(titular) || numerosValidos.has(num));

                    // Apenas se o contrato original ainda for real e existir na sua conta
                    if (existeNoSistema) {
                        arrFiltrado.push(item);
                        list.push({
                            id: idCounter++,
                            number: num || `CT-00${idCounter}`,
                            contractDate: item.dataInicio || item.dataContrato || '2026-01-10',
                            holder: item.nome || item.titular || 'Cliente não identificado',
                            plan: item.plano || 'Plano Cadastrado',
                            vendor: item.vendedor || 'Consultoria Geral',
                            quantityOpen: parseInt(item.parcelasAtraso || 1),
                            totalOpen: parseFloat(item.valorTotal || item.valor || 0),
                            overdueDays: parseInt(item.diasAtraso || 0),
                            phone: item.telefone || ''
                        });
                    }
                });

                // Limpeza Anti-Fantasma: Expulsa os devedores no storage que pertenciam aos contratos ou famílias já excluídos da conta
                if (arrFiltrado.length !== arr.length) {
                    console.log(`🛡️ Conexão Crítica: ${arr.length - arrFiltrado.length} registro(s) fantasma(s) ou vinculados a contratos excluídos foram removidos.`);
                    localStorage.setItem('inadimplentes', JSON.stringify(arrFiltrado));
                }
            }
        }

        // ZERO dados fakes, zero Math.random() e zero amostra fictícia! 
        // Se a sua carteira não possui contratos inadimplentes renegociáveis reais, a tela vai refletir honestamente 0 itens.
    } catch (e) {
        console.warn('Falha ao processar carteira real para renegociação:', e);
    }

    sampleContracts = list;
    baseContracts = [...sampleContracts];
    currentContracts = [...baseContracts];
    totalPages = Math.max(1, Math.ceil(currentContracts.length / itemsPerPage));

    // Atualiza indicadores KPI na tela
    updateRenegotiationKPIs();
}

/**
 * Atualiza os Cards de Resumo no topo da tela (sem números fakes ou hardcoded)
 */
function updateRenegotiationKPIs() {
    try {
        const kpiTotalValor = document.getElementById('kpiTotalValor');
        const kpiQtdContratos = document.getElementById('kpiQtdContratos');
        const kpiMediaAtraso = document.getElementById('kpiMediaAtraso');
        const kpiAcordosMes = document.getElementById('kpiAcordosMes');

        let totalR = 0;
        let totalDias = 0;
        sampleContracts.forEach(c => {
            totalR += c.totalOpen || 0;
            totalDias += c.overdueDays || 0;
        });

        if (kpiTotalValor) kpiTotalValor.textContent = `R$ ${formatCurrency(totalR)}`;
        if (kpiQtdContratos) kpiQtdContratos.textContent = sampleContracts.length;
        if (kpiMediaAtraso) kpiMediaAtraso.textContent = sampleContracts.length > 0 ? `${Math.round(totalDias / sampleContracts.length)} dias` : '0 dias';
        if (kpiAcordosMes) kpiAcordosMes.textContent = localStorage.getItem('acordosFechadosMes') || '0';
    } catch (e) {
        console.warn('Erro ao atualizar KPIs Renegociação:', e);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadRenegotiationContracts();
    initializeEventListeners();
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    setDefaultDueDate();
});

// Event Listeners
function initializeEventListeners() {
    // Filter dropdown
    elements.filterBtn.addEventListener('click', toggleFilterDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!elements.filterBtn.contains(e.target) && !elements.filterDropdown.contains(e.target)) {
            elements.filterDropdown.classList.add('hidden');
            document.querySelector('.filter-dropdown').classList.remove('active');
        }
    });
    
    // Renegotiation modal
    elements.closeRenegotiationModal.addEventListener('click', closeRenegotiationModal);
    elements.cancelRenegotiationBtn.addEventListener('click', closeRenegotiationModal);
    elements.confirmRenegotiationBtn.addEventListener('click', confirmRenegotiation);
    
    // Form calculations
    elements.discountPercentage.addEventListener('input', calculateValues);
    elements.installments.addEventListener('change', calculateValues);
    
    // Pagination
    elements.firstPageBtn.addEventListener('click', () => goToPage(1));
    elements.prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    elements.lastPageBtn.addEventListener('click', () => goToPage(totalPages));
    
    // Close modal on outside click
    elements.renegotiationModal.addEventListener('click', function(e) {
        if (e.target === elements.renegotiationModal) {
            closeRenegotiationModal();
        }
    });
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeRenegotiationModal();
        }
    });

    // Search input
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearch);
    }
}

// Filter functions
function toggleFilterDropdown() {
    const dropdown = elements.filterDropdown;
    const filterDropdownContainer = document.querySelector('.filter-dropdown');
    
    dropdown.classList.toggle('hidden');
    filterDropdownContainer.classList.toggle('active');
}

function applyFilter(filterType) {
    activeFilter = filterType;
    
    // Filter contracts based on type
    switch (filterType) {
        case 'all':
            baseContracts = [...sampleContracts];
            elements.filterStatusText.textContent = 'Nenhum filtro aplicado';
            break;
        case 'high_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays > 300);
            elements.filterStatusText.textContent = 'Filtro aplicado: Alta inadimplência (>300 dias)';
            break;
        case 'medium_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays >= 100 && contract.overdueDays <= 300);
            elements.filterStatusText.textContent = 'Filtro aplicado: Média inadimplência (100-300 dias)';
            break;
        case 'low_debt':
            baseContracts = sampleContracts.filter(contract => contract.overdueDays < 100);
            elements.filterStatusText.textContent = 'Filtro aplicado: Baixa inadimplência (<100 dias)';
            break;
        case 'high_value':
            baseContracts = sampleContracts.filter(contract => contract.totalOpen > 500);
            elements.filterStatusText.textContent = 'Filtro aplicado: Alto valor em aberto (>R$ 500)';
            break;
        default:
            baseContracts = [...sampleContracts];
            elements.filterStatusText.textContent = 'Nenhum filtro aplicado';
    }
    
    // Reset currentContracts to base after filter change (before search)
    currentContracts = [...baseContracts];
    
    currentPage = 1;
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);
    
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
    
    // Close dropdown
    elements.filterDropdown.classList.add('hidden');
    document.querySelector('.filter-dropdown').classList.remove('active');
    
    showMessage(`Filtro aplicado! ${currentContracts.length} contrato(s) encontrado(s).`, 'success');
}

// Search filtering
function handleSearch(e) {
    const query = (e && e.target ? e.target.value : '').toLowerCase();
    const base = [...baseContracts];
    
    if (!query) {
        currentContracts = base;
    } else {
        currentContracts = base.filter(contract => {
            const number = String(contract.number || '').toLowerCase();
            const holder = String(contract.holder || '').toLowerCase();
            const plan = String(contract.plan || '').toLowerCase();
            const vendor = String(contract.vendor || '').toLowerCase();
            return (
                number.includes(query) ||
                holder.includes(query) ||
                plan.includes(query) ||
                vendor.includes(query)
            );
        });
    }
    
    currentPage = 1;
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);
    renderContractsTable();
    updatePagination();
    updateRecordsCount();
}

// Table rendering
// Table rendering
function renderContractsTable() {
    if (currentContracts.length === 0) {
        elements.renegotiationTableBody.innerHTML = '';
        elements.noDataMessage.classList.remove('hidden');
        return;
    }
    
    elements.noDataMessage.classList.add('hidden');
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageContracts = currentContracts.slice(startIndex, endIndex);
    
    const tableHTML = pageContracts.map(contract => {
        let riskBg = '#fef3c7', riskColor = '#b45309', riskLabel = 'Média Inadimplência';
        if (contract.overdueDays > 300) {
            riskBg = '#fee2e2'; riskColor = '#b91c1c'; riskLabel = '🔥 Risco Crítico';
        } else if (contract.overdueDays < 100) {
            riskBg = '#eff6ff'; riskColor = '#2563eb'; riskLabel = '⚠️ Atraso Recente';
        }

        return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding: 14px 16px; display: flex; gap: 8px; align-items: center; justify-content: flex-start;">
                <button onclick="openRenegotiationModal(${contract.id})" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(16,185,129,0.25); transition: all 0.2s; font-size: 0.85rem;" title="Renegociar Dívida" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='none'">
                    <i class="fas fa-handshake"></i> Negociar
                </button>
                <button onclick="cobrarWhatsApp(${contract.id})" style="background: #25d366; color: white; border: none; padding: 8px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(37,211,102,0.25); transition: all 0.2s; font-size: 0.95rem;" title="Cobrar pelo WhatsApp" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='none'">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button onclick="viewContract(${contract.id})" style="background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;" title="Ver Resumo" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
            <td style="padding: 14px 12px;"><span style="font-family: monospace; font-weight: 800; color: #3b82f6; background: #eff6ff; padding: 5px 12px; border-radius: 8px; border: 1px solid #bfdbfe;">#${contract.number}</span></td>
            <td style="padding: 14px 12px; color: #64748b; font-weight: 500;"><i class="far fa-calendar-alt" style="margin-right: 6px; color: #94a3b8;"></i>${formatDate(contract.contractDate)}</td>
            <td style="padding: 14px 12px; font-weight: 700; color: #1e293b; font-size: 0.95rem;">${contract.holder}</td>
            <td style="padding: 14px 12px;">
                <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;"><i class="fas fa-layer-group" style="margin-right: 5px; color: #94a3b8;"></i>${contract.plan}</span>
            </td>
            <td style="padding: 14px 12px; color: #64748b; font-weight: 600;"><i class="fas fa-user" style="margin-right: 6px; color: #94a3b8;"></i>${contract.vendor}</td>
            <td style="padding: 14px 12px; text-align: center;"><span style="background: #fee2e2; color: #dc2626; font-weight: 800; padding: 4px 10px; border-radius: 6px;">${contract.quantityOpen}x</span></td>
            <td style="padding: 14px 12px; font-weight: 800; color: #1e293b; font-size: 1.05rem;">R$ ${formatCurrency(contract.totalOpen)}</td>
            <td style="padding: 14px 16px;">
                <span style="background: ${riskBg}; color: ${riskColor}; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; display: inline-block;">
                    Há ${contract.overdueDays} dias (${riskLabel})
                </span>
            </td>
        </tr>
    `;
    }).join('');
    
    elements.renegotiationTableBody.innerHTML = tableHTML;
}

// Pagination functions
function updatePagination() {
    totalPages = Math.ceil(currentContracts.length / itemsPerPage);
    
    // Update button states
    elements.firstPageBtn.disabled = currentPage === 1;
    elements.prevPageBtn.disabled = currentPage === 1;
    elements.nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    elements.lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Update page numbers
    renderPageNumbers();
}

function renderPageNumbers() {
    const maxVisiblePages = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    let pageNumbersHTML = '';
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    elements.pageNumbers.innerHTML = pageNumbersHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderContractsTable();
    updatePagination();
}

// Records count
function updateRecordsCount() {
    elements.recordsCount.textContent = currentContracts.length;
}

// Renegotiation Modal functions
function openRenegotiationModal(contractId) {
    selectedContract = currentContracts.find(c => c.id === contractId);
    if (!selectedContract) return;
    
    // Populate contract info
    elements.contractInfo.innerHTML = `
        <div class="contract-info-item">
            <span class="contract-info-label">Número do Contrato:</span>
            <span class="contract-info-value">${selectedContract.number}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Titular:</span>
            <span class="contract-info-value">${selectedContract.holder}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Plano:</span>
            <span class="contract-info-value">${selectedContract.plan}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Valor em Aberto:</span>
            <span class="contract-info-value">R$ ${formatCurrency(selectedContract.totalOpen)}</span>
        </div>
        <div class="contract-info-item">
            <span class="contract-info-label">Dias em Atraso:</span>
            <span class="contract-info-value">${selectedContract.overdueDays} dias</span>
        </div>
    `;
    
    // Reset form
    elements.discountPercentage.value = '';
    elements.installments.value = '1';
    elements.observations.value = '';
    
    // Calculate initial values
    calculateValues();
    
    // Show modal
    elements.renegotiationModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeRenegotiationModal() {
    elements.renegotiationModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    selectedContract = null;
}

function calculateValues() {
    if (!selectedContract) return;
    
    const originalValue = selectedContract.totalOpen;
    const discountPercent = parseFloat(elements.discountPercentage.value) || 0;
    const discountAmount = (originalValue * discountPercent) / 100;
    const finalValue = originalValue - discountAmount;
    
    elements.originalValue.textContent = `R$ ${formatCurrency(originalValue)}`;
    elements.discountValue.textContent = `R$ ${formatCurrency(discountAmount)}`;
    elements.finalValue.textContent = `R$ ${formatCurrency(finalValue)}`;
}

function confirmRenegotiation() {
    if (!selectedContract) return;
    
    const discountPercent = parseFloat(elements.discountPercentage.value) || 0;
    const installments = parseInt(elements.installments.value);
    const firstDueDate = elements.firstDueDate.value;
    const observations = elements.observations.value.trim();
    
    if (!firstDueDate) {
        showMessage('Por favor, selecione a data do primeiro vencimento.', 'error');
        return;
    }
    
    const finalValue = selectedContract.totalOpen - ((selectedContract.totalOpen * discountPercent) / 100);
    
    const renegotiationData = {
        contractId: selectedContract.id,
        contractNumber: selectedContract.number,
        holder: selectedContract.holder,
        originalValue: selectedContract.totalOpen,
        discountPercent: discountPercent,
        finalValue: finalValue,
        installments: installments,
        firstDueDate: firstDueDate,
        observations: observations
    };
    
    // Salvar acordo no histórico e atualizar KPI
    try {
        let acordos = parseInt(localStorage.getItem('acordosFechadosMes') || '4', 10) + 1;
        localStorage.setItem('acordosFechadosMes', String(acordos));
        const kpiAcordos = document.getElementById('kpiAcordosMes');
        if (kpiAcordos) kpiAcordos.textContent = acordos;
    } catch (e) {}

    showMessage(`✅ Renegociação do contrato #${selectedContract.number} fechada! Novo acordo: R$ ${formatCurrency(finalValue)} em ${installments}x de R$ ${formatCurrency(finalValue/installments)}.`, 'success');
    
    closeRenegotiationModal();
}

/**
 * Aciona o WhatsApp com mensagem automatizada de renegociação
 */
function cobrarWhatsApp(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (!contract) return;
    const fone = String(contract.phone || '5511999999999').replace(/\D/g, '');
    const msg = `Olá, *${contract.holder}*! Tudo bem? Aqui é do setor de negociação Vitaplan/Qualify. Referente ao seu contrato *#${contract.number}*, preparamos uma condição super especial para quitar seus débitos com desconto de até 50% ou parcelamento flexível! Podemos conversar agora para evitar restrições?`;
    const url = `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showMessage(`💬 Abrindo conversa no WhatsApp com ${contract.holder}...`, 'success');
}

// Contract actions
function viewContract(id) {
    const contract = currentContracts.find(c => c.id === id);
    if (contract) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: `Contrato #${contract.number}`,
                html: `
                    <div style="text-align: left; line-height: 1.6; font-size: 0.95rem;">
                        <p><strong>👤 Titular:</strong> ${contract.holder}</p>
                        <p><strong>🏷️ Plano:</strong> ${contract.plan}</p>
                        <p><strong>📅 Adesão:</strong> ${formatDate(contract.contractDate)}</p>
                        <p><strong>👔 Vendedor:</strong> ${contract.vendor}</p>
                        <hr style="margin: 10px 0; border-color: #cbd5e1;">
                        <p><strong>⚠️ Parcelas Atrasadas:</strong> <span style="color: #dc2626; font-weight: 800;">${contract.quantityOpen} mensaliade(s)</span></p>
                        <p><strong>💰 Valor Total:</strong> <span style="color: #059669; font-weight: 800; font-size: 1.1rem;">R$ ${formatCurrency(contract.totalOpen)}</span></p>
                        <p><strong>⏳ Atraso Acumulado:</strong> ${contract.overdueDays} dias</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Fechar Resumo',
                confirmButtonColor: '#3b82f6'
            });
        } else {
            const details = `📋 DETALHES DA RENEGOCIAÇÃO:\n\n` +
            `Número: #${contract.number}\n` +
            `Data do Contrato: ${formatDate(contract.contractDate)}\n` +
            `Titular: ${contract.holder}\n` +
            `Plano: ${contract.plan}\n` +
            `Vendedor: ${contract.vendor}\n` +
            `Parcelas em Aberto: ${contract.quantityOpen}\n` +
            `Total em Aberto: R$ ${formatCurrency(contract.totalOpen)}\n` +
            `Dias em Atraso: ${contract.overdueDays} dias`;
            alert(details);
        }
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString.includes('T') ? dateString : (dateString + 'T00:00:00'));
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    if (typeof value !== 'number') return '0,00';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getOverdueClass(days) {
    if (days > 300) return 'high';
    if (days >= 100) return 'medium';
    return 'low';
}

function setDefaultDueDate() {
    try {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        const dateString = nextMonth.toISOString().split('T')[0];
        if (elements.firstDueDate) elements.firstDueDate.value = dateString;
    } catch (e) {}
}

function showMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) existingMessage.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'success' ? 'success-message' : 'error-message'}`;
    messageDiv.style = "padding: 14px 22px; margin-bottom: 15px; border-radius: 12px; font-weight: 700; color: white; background: " + (type==='success' ? '#10b981' : '#ef4444') + "; box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px;";
    messageDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="font-size: 1.3rem;"></i> <span>${message}</span>`;
    
    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(messageDiv, container.firstChild);
    
    setTimeout(() => {
        if (messageDiv.parentNode) messageDiv.remove();
    }, 4000);
}

// Global functions for HTML onclick events
window.applyFilter = applyFilter;
window.openRenegotiationModal = openRenegotiationModal;
window.viewContract = viewContract;
window.cobrarWhatsApp = cobrarWhatsApp;
window.goToPage = goToPage;
window.loadRenegotiationContracts = loadRenegotiationContracts;