// Lista de Cobrança / Gestão Financeira JavaScript - Integrado em tempo real à Supabase (Woovi & Contratos)

// Global variables
let selectedCobrancas = new Set();
let currentData = [];
let filteredData = [];
let filtersApplied = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    // Aguarda inicialização dos scripts e cliente Supabase
    setTimeout(() => {
        loadData();
    }, 400);
});

function initializePage() {
    console.log('💎 Painel de Gestão Financeira / Lista de Cobranças iniciado');
}

// Carrega dados reais da tabela "cobrancas" no Supabase (onde entram os Pix e Pix Automático da Woovi)
async function loadData() {
    try {
        showLoadingState();

        // Identifica a empresa ativa atual
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let companyId = null;
        try {
            const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
            if (activeCompany && activeCompany.id) {
                companyId = activeCompany.id;
            }
        } catch(e) {
            console.warn('Erro ao ler empresa ativa do localStorage:', e);
        }

        let cobrancasBanco = [];

        // Busca oficial no Supabase
        if (window.supabase) {
            try {
                let query = window.supabase
                    .from('cobrancas')
                    .select('*')
                    .order('id', { ascending: false });

                if (companyId) {
                    query = query.eq('company_id', companyId);
                }

                const { data, error } = await query;
                if (!error && data) {
                    cobrancasBanco = data;
                } else {
                    console.warn('Alerta na consulta do Supabase (cobrancas):', error?.message);
                }
            } catch (supaErr) {
                console.warn('Erro na comunicação com Supabase na tabela cobrancas:', supaErr);
            }
        }

        // Complementa com possíveis cobranças avulsas salvas localmente como fallback
        let cobrancasLocais = [];
        try {
            cobrancasLocais = JSON.parse(localStorage.getItem(`cobrancas_${companyId || 'geral'}`) || '[]');
        } catch (e) {
            cobrancasLocais = [];
        }

        // Mescla garantindo que não há duplicidade por ID
        const mapa = new Map();
        cobrancasBanco.forEach(c => mapa.set(String(c.id || c.subscription_id || Math.random()), c));
        cobrancasLocais.forEach(c => {
            const key = String(c.id || Math.random());
            if (!mapa.has(key)) mapa.set(key, c);
        });

        currentData = Array.from(mapa.values());
        
        // Ordena por vencimento mais recente ou criação
        currentData.sort((a, b) => {
            const dataA = new Date(a.vencimento || a.created_at || 0);
            const dataB = new Date(b.vencimento || b.created_at || 0);
            return dataB - dataA;
        });

        if (currentData.length === 0) {
            showEmptyState('Nenhuma transação financeira ou cobrança Pix registrada ainda.');
        } else {
            hideLoadingState();
            renderTable();
            updateRecordCount();
        }
    } catch (error) {
        console.error('Erro ao carregar dados financeiros:', error);
        showEmptyState('Nenhuma cobrança retornada.');
        updateRecordCount();
    }
}

// Mostra estado de loading
function showLoadingState() {
    const tableBody = document.querySelector('#cobrancaTable tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 35px; color: #555;"><i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #0056b3; margin-right: 10px;"></i> <strong>Carregando transações do caixa...</strong></td></tr>';
    }
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) tableContainer.style.display = 'block';
}

// Esconde estado de loading
function hideLoadingState() {
    // renderTable substituirá o conteúdo do tableBody
}

// Mostra estado vazio
function showEmptyState(message) {
    const tableBody = document.querySelector('#cobrancaTable tbody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-container');

    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #666;"><i class="fas fa-wallet" style="font-size: 3rem; color: #ccc; margin-bottom: 15px; display: block;"></i><p style="font-size: 1.1rem; margin: 0;">${message}</p><p style="font-size: 0.88rem; color: #999; margin-top: 5px;">Cobranças Pix Automático e faturamentos de contrato aparecerão nesta lista.</p></div>`;
    }
    if (tableBody) tableBody.innerHTML = '';
    updateRecordCount();
}

function setupEventListeners() {
    // Navigation Tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Botões de ação principais
    const filterBtn = document.getElementById('filterBtn');
    const createBtn = document.getElementById('createBtn');
    const removeBtn = document.getElementById('removeBtn');
    const editBtn = document.getElementById('editBtn');

    if (filterBtn) filterBtn.addEventListener('click', toggleFiltersBar);
    if (createBtn) createBtn.addEventListener('click', handleCreate);
    if (removeBtn) removeBtn.addEventListener('click', handleRemove);
    if (editBtn) editBtn.addEventListener('click', handleEdit);

    // Checkbox selecionar todos
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.addEventListener('change', handleSelectAll);

    // Filtros
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const filterText = document.getElementById('filterText');

    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    if (filterText) filterText.addEventListener('keyup', function(e){
        if (e.key === 'Enter') applyFilters();
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`${tabName}-content`);
    if (targetContent) targetContent.classList.add('active');
}

// Renderiza a tabela de Cobranças
function renderTable() {
    const tableBody = document.getElementById('cobrancaTableBody');
    const emptyState = document.getElementById('emptyState');
    const dataToRender = filtersApplied ? filteredData : currentData;

    if (!tableBody) return;

    if (!dataToRender || dataToRender.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        const container = document.querySelector('.table-container');
        if (container) container.style.display = 'none';
        updateRecordCount();
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    const container = document.querySelector('.table-container');
    if (container) container.style.display = 'block';

    tableBody.innerHTML = dataToRender.map(cobranca => {
        const rowId = cobranca.id || cobranca.subscription_id || Math.random();
        
        // 1. Titular / Pagador
        const titular = cobranca.pagador_nome || cobranca.titular || cobranca.cliente_nome || cobranca.cliente || '<span style="color:#999; font-style:italic;">Cliente não identificado</span>';
        
        // 2. Documento CPF/CNPJ
        const documento = cobranca.pagador_documento || cobranca.cpf_cnpj || cobranca.cpf || '-';
        
        // 3. Modalidade / Tipo de Cobrança
        let modalidade = '<span style="background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:600;"><i class="fas fa-receipt"></i> Cobrança Avulsa</span>';
        const tipoStr = String(cobranca.tipo || cobranca.billing_type || '').toLowerCase();
        if (tipoStr.includes('pix_automatico') || tipoStr.includes('pix_automatic') || tipoStr.includes('recurring')) {
            modalidade = `<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700; border: 1px solid #bbf7d0;"><i class="fas fa-sync-alt" style="color:#16a34a; margin-right:3px;"></i> Pix Automático</span>`;
        } else if (tipoStr.includes('pix') || cobranca.qrcode) {
            modalidade = `<span style="background:#dbeafe; color:#1e40af; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:600;"><i class="fas fa-bolt" style="color:#2563eb; margin-right:3px;"></i> Pix Instantâneo</span>`;
        }
        
        // 4. Data de Vencimento
        const vencimentoFormatado = formatDate(cobranca.vencimento || cobranca.nextDueDate);

        // 5. Valor (R$)
        let valorNum = cobranca.valor !== undefined ? cobranca.valor : cobranca.valorParcela;
        let valorStr = 'R$ 0,00';
        if (typeof valorNum === 'string') {
            valorNum = valorNum.replace('R$', '').replace(/\s+/g, '').replace(',', '.');
        }
        if (!isNaN(parseFloat(valorNum))) {
            valorStr = `R$ ${parseFloat(valorNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (cobranca.valorParcela) {
            valorStr = cobranca.valorParcela;
        }

        // 6. Status da Cobrança com Badges modernos e explicativos
        const stat = String(cobranca.status || cobranca.statusCobranca || 'PENDING').toUpperCase();
        let statusBadge = `<span style="background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.78rem; display:inline-block;"><i class="fas fa-clock" style="margin-right:4px;"></i> Pendente</span>`;
        
        if (stat === 'PAID' || stat === 'PAGO' || stat === 'CONFIRMED' || stat === 'RECEIVED') {
            statusBadge = `<span style="background: #d4edda; color: #155724; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; border: 1px solid #c3e6cb; display:inline-block;"><i class="fas fa-check-circle" style="color:#28a745; margin-right:4px;"></i> Pago / Confirmado</span>`;
        } else if (stat === 'PENDING_AUTHORIZATION' || stat.includes('AGUARDANDO') || stat === 'PENDENTE DE AUTORIZAÇÃO') {
            statusBadge = `<span style="background: #fef9c3; color: #854d0e; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; border: 1px solid #fde047; display:inline-block;" title="O cliente precisa aprovar no aplicativo do banco"><i class="fas fa-user-clock" style="color:#ca8a04; margin-right:4px;"></i> Aguardando Autorização (App)</span>`;
        } else if (stat === 'OVERDUE' || stat === 'VENCIDO') {
            statusBadge = `<span style="background: #f8d7da; color: #721c24; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; display:inline-block;"><i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i> Vencido</span>`;
        } else if (stat === 'CANCELLED' || stat === 'CANCELADO' || stat === 'REMOVED') {
            statusBadge = `<span style="background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.78rem; display:inline-block;"><i class="fas fa-ban" style="margin-right:4px;"></i> Cancelado</span>`;
        }

        // 7. Descrição / Origem
        const origem = cobranca.descricao || cobranca.observacao || 'Mensalidade do Contrato';
        
        // 8. Link ou Ação (exibindo link Pix Woovi)
        const urlPagamento = cobranca.link_pagamento || cobranca.invoice_url;
        const acoesHtml = urlPagamento
            ? `<a href="${urlPagamento}" target="_blank" title="Abrir Ficha de Pagamento Pix / Woovi" style="padding: 6px 12px; background: #0056b3; color: white; border-radius: 6px; text-decoration: none; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 4px rgba(0,86,179,0.2); transition: background 0.2s;"><i class="fas fa-external-link-alt"></i> Ver Pix</a>`
            : `<span style="color: #bbb; font-size: 0.8rem;">Sem link</span>`;

        return `
            <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                <td class="checkbox-col" style="padding: 12px; text-align: center;">
                    <input type="checkbox" value="${rowId}" onchange="handleRowSelect('${rowId}', this.checked)">
                </td>
                <td style="padding: 12px; font-weight: 600; color: #1e293b;">${titular}</td>
                <td style="padding: 12px; font-family: monospace; color: #475569; font-size: 0.92rem;">${documento}</td>
                <td style="padding: 12px;">${modalidade}</td>
                <td style="padding: 12px; color: #475569;"><i class="far fa-calendar-alt" style="margin-right: 5px; color: #64748b;"></i> ${vencimentoFormatado}</td>
                <td style="padding: 12px; font-size: 1.05rem; color: #0056b3;"><strong>${valorStr}</strong></td>
                <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px; color: #64748b; font-size: 0.88rem;">${origem}</td>
                <td style="padding: 12px; text-align: center;">${acoesHtml}</td>
            </tr>
        `;
    }).join('');

    updateSelectAllCheckbox();
    updateRecordCount();
}

function handleRowSelect(id, isSelected) {
    if (isSelected) {
        selectedCobrancas.add(String(id));
    } else {
        selectedCobrancas.delete(String(id));
    }
    updateSelectAllCheckbox();
    updateActionButtons();
}

function handleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const rowCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]');
    
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        const id = String(checkbox.value);
        if (selectAllCheckbox.checked) {
            selectedCobrancas.add(id);
        } else {
            selectedCobrancas.delete(id);
        }
    });
    
    updateActionButtons();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (!selectAllCheckbox) return;
    const totalRows = (filtersApplied ? filteredData : currentData).length;
    const selectedRows = selectedCobrancas.size;
    
    if (selectedRows === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedRows === totalRows && totalRows > 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
}

function updateActionButtons() {
    const removeBtn = document.getElementById('removeBtn');
    const editBtn = document.getElementById('editBtn');
    const hasSelection = selectedCobrancas.size > 0;
    
    if (removeBtn) removeBtn.disabled = !hasSelection;
    if (editBtn) editBtn.disabled = selectedCobrancas.size !== 1;
}

function updateRecordCount() {
    const count = (filtersApplied ? filteredData : currentData).length || 0;
    const recordCountEl = document.getElementById('recordCount');
    if (recordCountEl) recordCountEl.textContent = count;
}

// Manipuladores de Ações
function toggleFiltersBar() {
    const bar = document.getElementById('filtersBar');
    if (!bar) return;
    const isVisible = bar.style.display !== 'none';
    bar.style.display = isVisible ? 'none' : 'block';
}

function applyFilters() {
    const text = (document.getElementById('filterText')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filterStatus')?.value || '';
    const vIni = document.getElementById('filterVencInicio')?.value || '';
    const vFim = document.getElementById('filterVencFim')?.value || '';

    filteredData = currentData.filter(item => {
        const titular = String(item.pagador_nome || item.titular || item.cliente_nome || '').toLowerCase();
        const doc = String(item.pagador_documento || item.cpf || '').toLowerCase();
        const desc = String(item.descricao || item.observacao || '').toLowerCase();
        
        const textoOk = !text || titular.includes(text) || doc.includes(text) || desc.includes(text);

        const itemStatus = String(item.status || item.statusCobranca || '').toUpperCase();
        let statusOk = true;
        if (status) {
            if (status === 'Pendente') statusOk = itemStatus.includes('PENDING') || itemStatus === 'PENDENTE';
            else if (status === 'Pago') statusOk = itemStatus === 'PAID' || itemStatus === 'PAGO' || itemStatus === 'CONFIRMED';
            else if (status === 'Vencido') statusOk = itemStatus === 'OVERDUE' || itemStatus === 'VENCIDO';
        }

        const dv = item.vencimento ? new Date(item.vencimento) : (item.nextDueDate ? new Date(item.nextDueDate) : null);
        const dvIniOk = !vIni || (dv && dv >= new Date(vIni));
        const dvFimOk = !vFim || (dv && dv <= new Date(vFim));

        return textoOk && statusOk && dvIniOk && dvFimOk;
    });

    filtersApplied = true;
    const stEl = document.querySelector('.filter-status span');
    if (stEl) stEl.textContent = 'Filtros aplicados';
    renderTable();
}

function clearFilters() {
    if (document.getElementById('filterText')) document.getElementById('filterText').value = '';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterDataInicio')) document.getElementById('filterDataInicio').value = '';
    if (document.getElementById('filterDataFim')) document.getElementById('filterDataFim').value = '';
    if (document.getElementById('filterVencInicio')) document.getElementById('filterVencInicio').value = '';
    if (document.getElementById('filterVencFim')) document.getElementById('filterVencFim').value = '';

    filtersApplied = false;
    filteredData = [];
    const stEl = document.querySelector('.filter-status span');
    if (stEl) stEl.textContent = 'Nenhum filtro aplicado';
    renderTable();
}

function handleCreate() {
    const title = document.getElementById('modalTitle');
    if (title) title.textContent = 'Nova Cobrança Manual';
    const form = document.getElementById('cobrancaForm');
    if (form) form.reset();
    const idField = document.getElementById('cobrancaId');
    if (idField) idField.value = '';
    openCobrancaModal();
}

function handleEdit() {
    if (selectedCobrancas.size !== 1) {
        showToast('Selecione exatamente uma cobrança para editar', 'warning');
        return;
    }
    
    const cobrancaId = Array.from(selectedCobrancas)[0];
    const cobranca = currentData.find(c => String(c.id || c.subscription_id) === String(cobrancaId));
    if (!cobranca) return;

    const title = document.getElementById('modalTitle');
    if (title) title.textContent = 'Editar Cobrança';
    
    document.getElementById('cobrancaId').value = cobranca.id || cobranca.subscription_id || '';
    document.getElementById('cobrancaCliente').value = cobranca.pagador_nome || cobranca.titular || '';
    
    let v = cobranca.valor !== undefined ? cobranca.valor : cobranca.valorParcela;
    if (typeof v === 'string') v = v.replace('R$', '').replace(',', '.').trim();
    document.getElementById('cobrancaValor').value = parseFloat(v || 0);
    
    const venc = cobranca.vencimento || cobranca.nextDueDate;
    document.getElementById('cobrancaVencimento').value = venc ? new Date(venc).toISOString().split('T')[0] : '';
    document.getElementById('cobrancaDescricao').value = cobranca.descricao || cobranca.observacao || '';
    
    openCobrancaModal();
}

async function handleRemove() {
    if (selectedCobrancas.size === 0) return;

    const confirma = confirm(`Deseja realmente remover as ${selectedCobrancas.size} cobrança(s) selecionada(s)?`);
    if (!confirma) return;

    showLoadingState();

    try {
        const ids = Array.from(selectedCobrancas);
        for (const id of ids) {
            // Remove do Supabase se existir
            if (window.supabase) {
                await window.supabase.from('cobrancas').delete().eq('id', id);
            }
            // Remove do array em memória
            const index = currentData.findIndex(c => String(c.id || c.subscription_id) === String(id));
            if (index !== -1) currentData.splice(index, 1);
        }

        // Atualiza localStorage por garantia
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let compId = 'geral';
        try { const ac = JSON.parse(activeCompanyStr); if (ac && ac.id) compId = ac.id; } catch(e){}
        localStorage.setItem(`cobrancas_${compId}`, JSON.stringify(currentData));

        selectedCobrancas.clear();
        showToast('Cobrança(s) excluída(s) com sucesso!', 'success');
        renderTable();
        updateRecordCount();
        updateActionButtons();
    } catch (err) {
        console.error('Erro ao remover cobranças:', err);
        showToast('Erro ao remover cobranças.', 'error');
        renderTable();
    }
}

function openCobrancaModal() {
    const m = document.getElementById('cobrancaModal');
    if (m) m.classList.add('active');
}

function closeCobrancaModal() {
    const m = document.getElementById('cobrancaModal');
    if (m) m.classList.remove('active');
}

window.closeCobrancaModal = closeCobrancaModal;
window.saveCobranca = saveCobranca;

async function saveCobranca() {
    const id = document.getElementById('cobrancaId')?.value;
    const cliente = document.getElementById('cobrancaCliente')?.value;
    const valor = document.getElementById('cobrancaValor')?.value;
    const vencimento = document.getElementById('cobrancaVencimento')?.value;
    const descricao = document.getElementById('cobrancaDescricao')?.value;

    if (!cliente || !valor || !vencimento) {
        showToast('Preencha todos os campos obrigatórios (*)', 'warning');
        return;
    }

    const activeCompanyStr = localStorage.getItem('activeCompany');
    let compId = 'geral';
    try {
        const ac = JSON.parse(activeCompanyStr);
        if (ac && ac.id) compId = ac.id;
    } catch(e){}

    const novaCobranca = {
        id: id ? (isNaN(id) ? id : parseInt(id)) : Date.now(),
        company_id: compId !== 'geral' ? compId : null,
        pagador_nome: cliente,
        pagador_documento: '-',
        tipo: 'pix',
        billing_type: 'PIX',
        valor: parseFloat(valor),
        vencimento: vencimento,
        status: 'PENDING',
        status_display: 'Pendente',
        descricao: descricao || 'Cobrança manual de gestão financeira',
        created_at: new Date().toISOString()
    };

    try {
        showLoadingState();

        // Salva oficialmente no banco de dados Supabase
        if (window.supabase) {
            const { error } = await window.supabase.from('cobrancas').upsert([novaCobranca]);
            if (error) {
                console.warn('Nota: Erro ao gravar no Supabase:', error?.message);
            }
        }

        if (id) {
            const index = currentData.findIndex(c => String(c.id) === String(id));
            if (index !== -1) currentData[index] = { ...currentData[index], ...novaCobranca };
        } else {
            currentData.unshift(novaCobranca);
        }

        // Salva cópia local para garantia e cache
        localStorage.setItem(`cobrancas_${compId}`, JSON.stringify(currentData));

        closeCobrancaModal();
        renderTable();
        updateRecordCount();
        showToast(id ? 'Cobrança atualizada com sucesso!' : 'Cobrança criada e gravada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar cobrança:', error);
        showToast('Erro ao salvar cobrança', 'error');
        renderTable();
    }
}

function formatDate(dateString) {
    if (!dateString || dateString === '-') return '-';
    try {
        // Formata YYYY-MM-DD ou ISO para PT-BR
        const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
        const partes = cleanDate.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        const date = new Date(dateString);
        return !isNaN(date) ? date.toLocaleDateString('pt-BR') : dateString;
    } catch (e) {
        return dateString;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '14px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3500);
}

window.handleRowSelect = handleRowSelect;

console.log('✅ Sistema de Cobranças da Gestão Financeira carregado e integrado com sucesso!');