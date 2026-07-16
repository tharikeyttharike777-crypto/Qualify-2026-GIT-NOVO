// Trocar Empresa - Supabase Version
let currentUser = null;
let empresas = [];

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Inicializando página Trocar Empresa (Supabase)...');
    setupEventListeners();
    await initAuth();
});

async function initAuth() {
    if (!window.supabase) {
        console.error('Supabase não carregado');
        return;
    }
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        const emailEl = document.getElementById('userEmail');
        if (emailEl) emailEl.textContent = currentUser.email;
        carregarEmpresas();
    } else {
        window.location.href = '../login.html';
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = '../login.html';
        }
    });
}

function setupEventListeners() {
    document.getElementById('voltarBtn').addEventListener('click', () => window.history.back());
    const novaBtn = document.getElementById('novaEmpresaBtn');
    if (novaBtn) novaBtn.addEventListener('click', abrirModal);
    
    document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
    document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModal);
    document.getElementById('modal-nova-empresa').addEventListener('click', function (e) {
        if (e.target === this) fecharModal();
    });
    document.getElementById('form-nova-empresa').addEventListener('submit', function (e) {
        e.preventDefault();
        salvarNovaEmpresa();
    });
    document.getElementById('input-cnpj').addEventListener('input', function (e) {
        formatarCNPJ(e.target);
    });
    document.getElementById('empresasGrid').addEventListener('click', (event) => {
        const targetElement = event.target.closest('[data-id], [data-empresa-id]');
        if (!targetElement) return;
        const empresaId = targetElement.getAttribute('data-id') || targetElement.getAttribute('data-empresa-id');
        if (targetElement.classList.contains('btn-acessar-empresa')) {
            acessarEmpresa(empresaId);
        }
    });
}

async function carregarEmpresas() {
    if (!currentUser) return;
    mostrarLoading(true);
    try {
        const userId = currentUser.id;
        const { data, error } = await window.supabase
            .from('empresas')
            .select('*');
            
        if (error) throw error;
        
        empresas = (data || []).filter(emp => emp.owner_id === userId || (emp.members && emp.members.includes(userId)));
        
        empresas = empresas.map(emp => ({
            ...emp,
            tipo: emp.owner_id === userId ? 'owner' : 'membro'
        }));
        
        exibirEmpresas();
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        mostrarErro('Erro ao carregar empresas. Verifique se a tabela existe.');
    } finally {
        mostrarLoading(false);
    }
}

function exibirEmpresas() {
    const grid = document.getElementById('empresasGrid');
    const nenhumaEmpresa = document.getElementById('nenhumaEmpresa');
    grid.innerHTML = '';
    if (empresas.length === 0) {
        nenhumaEmpresa.style.display = 'block';
        return;
    }
    nenhumaEmpresa.style.display = 'none';
    empresas.forEach(empresa => {
        grid.appendChild(criarCardEmpresa(empresa));
    });
}

function criarCardEmpresa(empresa) {
    const card = document.createElement('div');
    card.className = 'empresa-card';
    const isAtiva = localStorage.getItem('activeCompanyId') === empresa.id;
    if (isAtiva) card.classList.add('ativa');

    card.innerHTML = `
        <div class="empresa-info">
            <h3>${empresa.name || 'Nome não informado'}</h3>
            <p class="empresa-cnpj">${empresa.cnpj || 'CNPJ não informado'}</p>
            <p class="empresa-cidade">${empresa.city || ''} ${empresa.uf || ''}</p>
            <span class="empresa-tipo">${empresa.tipo === 'owner' ? 'Proprietário' : 'Membro'}</span>
            ${isAtiva ? '<span class="empresa-ativa">ATIVA</span>' : ''}
        </div>
        <div class="empresa-actions">
            <button class="btn-acessar-empresa" data-id="${empresa.id}">Acessar</button>
            ${empresa.tipo === 'owner' ? '<button class="btn-deletar-empresa" onclick="deletarEmpresa(\'' + empresa.id + '\')" title="Excluir Empresa"><i class="fas fa-trash-alt"></i></button>' : ''}
        </div>
    `;
    return card;
}

async function deletarEmpresa(empresaId) {
    if (!confirm('Tem certeza que deseja deletar esta empresa? Esta ação é irreversível.')) return;
    mostrarLoading(true);
    try {
        const { error } = await window.supabase.from('empresas').delete().eq('id', empresaId);
        if (error) throw error;
        alert('Empresa deletada com sucesso!');
        carregarEmpresas();
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        alert('Erro ao deletar empresa.');
    } finally {
        mostrarLoading(false);
    }
}

function acessarEmpresa(empresaId) {
    try {
        const empresaSelecionada = empresas.find(emp => emp.id === empresaId);
        if (empresaSelecionada) {
            localStorage.setItem('empresaSelecionadaId', empresaId);
            localStorage.setItem('empresaSelecionadaNome', empresaSelecionada.name || 'Empresa sem nome');
            localStorage.setItem('activeCompanyId', empresaId);

            const activeCompanyObj = {
                id: empresaSelecionada.id,
                name: empresaSelecionada.name || 'Empresa sem nome',
                cnpj: empresaSelecionada.cnpj || null,
                city: empresaSelecionada.city || null,
                state: empresaSelecionada.state || empresaSelecionada.uf || null,
                tipo: empresaSelecionada.tipo || null
            };
            localStorage.setItem('activeCompany', JSON.stringify(activeCompanyObj));
            
            window.dispatchEvent(new CustomEvent('activeCompanyChanged', { detail: { company: activeCompanyObj } }));
        }
        window.location.href = '../index.html';
    } catch (error) {
        alert('Erro ao acessar empresa. Tente novamente.');
    }
}

function mostrarLoading(mostrar) {
    document.getElementById('loading').style.display = mostrar ? 'block' : 'none';
    document.querySelector('.empresas-section').style.display = mostrar ? 'none' : 'block';
}

function mostrarErro(mensagem) {
    document.getElementById('empresasGrid').innerHTML = `
        <div class="erro-container">
            <p class="erro-mensagem">${mensagem}</p>
            <button class="btn-tentar-novamente" onclick="carregarEmpresas()">Tentar Novamente</button>
        </div>
    `;
}

function abrirModal() {
    document.getElementById('modal-nova-empresa').style.display = 'flex';
    setTimeout(() => document.getElementById('input-nome-empresa').focus(), 100);
}

function fecharModal() {
    document.getElementById('modal-nova-empresa').style.display = 'none';
    document.getElementById('form-nova-empresa').reset();
}

async function salvarNovaEmpresa() {
    if (!currentUser) {
        alert("ERRO: Você não está logado. Faça login novamente.");
        return;
    }
    
    const btnSalvar = document.getElementById('btn-salvar-empresa');
    const nomeEmpresa = document.getElementById('input-nome-empresa').value.trim();
    const cnpj = document.getElementById('input-cnpj').value.trim();
    const cidade = document.getElementById('input-cidade').value.trim();

    if (!nomeEmpresa || !cnpj || !cidade) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
        const novaEmpresaData = {
            name: nomeEmpresa,
            cnpj: cnpj,
            city: cidade,
            owner_id: currentUser.id,
            members: [currentUser.id]
        };

        const { data, error } = await window.supabase
            .from('empresas')
            .insert([novaEmpresaData])
            .select();

        if (error) throw error;
        
        // Acessa automaticamente a nova empresa
        if (data && data.length > 0) {
            const newCompanyId = data[0].id;
            localStorage.setItem('empresaSelecionadaId', newCompanyId);
            localStorage.setItem('companyId', newCompanyId);
            localStorage.setItem('activeCompanyId', newCompanyId);
            
            const activeCompanyObj = {
                id: newCompanyId,
                name: nomeEmpresa,
                cnpj: cnpj,
                city: cidade
            };
            localStorage.setItem('activeCompany', JSON.stringify(activeCompanyObj));
        }
        
        alert("Empresa criada com sucesso!");
        window.location.href = '../index.html';
    } catch (error) {
        console.error("ERRO AO SALVAR EMPRESA:", error);
        alert("Falha ao salvar a empresa: " + (error.message || "Erro desconhecido"));
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Empresa';
    }
}

function formatarCNPJ(input) {
    let valor = input.value.replace(/\\D/g, '');
    if (valor.length > 14) valor = valor.substring(0, 14);
    if (valor.length <= 2) { }
    else if (valor.length <= 5) valor = valor.replace(/(\\d{2})(\\d+)/, '$1.$2');
    else if (valor.length <= 8) valor = valor.replace(/(\\d{2})(\\d{3})(\\d+)/, '$1.$2.$3');
    else if (valor.length <= 12) valor = valor.replace(/(\\d{2})(\\d{3})(\\d{3})(\\d+)/, '$1.$2.$3/$4');
    else valor = valor.replace(/(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d+)/, '$1.$2.$3/$4-$5');
    input.value = valor;
}