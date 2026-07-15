// Trocar Empresa - Versão Limpa e Funcional
// Criado do zero para eliminar bugs e loops infinitos

let currentUser = null;
let empresas = [];

// Inicialização da página
document.addEventListener('DOMContentLoaded', function () {
    console.log('Inicializando página Trocar Empresa...');

    // Registra listeners de UI primeiro para garantir que o botão funcione
    try {
        setupEventListeners();
    } catch (uiErr) {
        console.error('Erro ao configurar listeners de UI:', uiErr);
    }

    // Função para configurar o listener de auth, executada quando Firebase estiver pronto
    const configurarAuthListener = () => {
        try {
            // Verificação extra: garante que o App Firebase existe
            if (!window.firebase || !firebase.apps || firebase.apps.length === 0) {
                console.warn('Firebase App ainda não inicializado ao configurar auth listener.');
                return;
            }
            // Tenta obter auth de window.auth ou diretamente de firebase.auth() como fallback
            const authInstance = window.auth || (window.firebase && firebase.auth && firebase.auth());

            if (!authInstance || typeof authInstance.onAuthStateChanged !== 'function') {
                console.warn('Instância Auth não disponível ao configurar auth listener.');
                return;
            }

            // Verificar autenticação - VERSÃO CORRIGIDA SEM VAZAMENTO
            authInstance.onAuthStateChanged(function (user) {
                if (user && user.uid) {
                    // SEMPRE usa o parâmetro user, nunca variáveis globais
                    currentUser = user; // Atualiza a variável global com o usuário CORRETO
                    console.log('*** Usuário autenticado CORRETO:', user.uid, user.email);

                    // Exibir email do usuário
                    const emailEl = document.getElementById('userEmail');
                    if (emailEl) emailEl.textContent = user.email;

                    // Carregar empresas usando o UID do parâmetro
                    carregarEmpresas();
                } else {
                    console.log('*** Usuário não autenticado, limpando dados e redirecionando...');

                    // LIMPEZA TOTAL - EXTERMINANDO VAZAMENTOS
                    currentUser = null;
                    localStorage.clear();
                    sessionStorage.clear();

                    window.location.href = '../login.html';
                }
            });
        } catch (authErr) {
            console.error('Falha ao configurar onAuthStateChanged:', authErr);
        }
    };

    // Se Firebase já estiver pronto, configura imediatamente; caso contrário, aguarda evento
    if (window.auth) {
        configurarAuthListener();
    } else {
        console.warn('Firebase não está pronto ainda; aguardando evento firebaseReady...');
        window.addEventListener('firebaseReady', () => {
            console.log('Evento firebaseReady recebido; configurando auth listener.');
            configurarAuthListener();
        }, { once: true });
    }
});

// Configurar event listeners
function setupEventListeners() {
    // Botão Voltar
    document.getElementById('voltarBtn').addEventListener('click', function () {
        window.history.back();
    });

    // Botão Nova Empresa - ABRIR MODAL
    const novaBtn = document.getElementById('novaEmpresaBtn');
    if (novaBtn) {
        novaBtn.addEventListener('click', function () {
            console.log('Clique em "+ Nova Empresa" detectado; abrindo modal.');
            abrirModal();
        });
    } else {
        console.warn('Botão "Nova Empresa" não encontrado no DOM.');
    }

    // Botão Fechar Modal (X)
    document.getElementById('btn-fechar-modal').addEventListener('click', function () {
        fecharModal();
    });

    // Botão Cancelar Modal
    document.getElementById('btn-cancelar-modal').addEventListener('click', function () {
        fecharModal();
    });

    // Fechar modal clicando fora dele
    document.getElementById('modal-nova-empresa').addEventListener('click', function (e) {
        if (e.target === this) {
            fecharModal();
        }
    });

    // Form Submit - SALVAR EMPRESA
    document.getElementById('form-nova-empresa').addEventListener('submit', function (e) {
        e.preventDefault();
        salvarNovaEmpresa();
    });

    // Formatação automática do CNPJ
    document.getElementById('input-cnpj').addEventListener('input', function (e) {
        formatarCNPJ(e.target);
    });

    // Eve    // Listener para os botões de Acessar e Deletar
    document.getElementById('empresasGrid').addEventListener('click', (event) => {
        // Encontrar o elemento mais próximo que tenha o atributo data-empresa-id
        // Isso garante que o clique no ícone ou no botão funcione
        const targetElement = event.target.closest('[data-id], [data-empresa-id]');
        if (!targetElement) return;

        // Prioriza data-id (usado pelo multitenant-config); mantém compatibilidade com data-empresa-id
        const empresaId = targetElement.getAttribute('data-id') || targetElement.getAttribute('data-empresa-id');

        if (targetElement.classList.contains('btn-acessar-empresa')) {
            acessarEmpresa(empresaId);
        } else if (targetElement.classList.contains('btn-deletar-empresa')) {
            // Deleção agora é tratada centralmente em multitenant-config.js
            // Nada a fazer aqui para evitar duplicidade de handlers
            return;
        }
    });
}

// Carregar empresas do usuário
async function carregarEmpresas() {
    if (!currentUser) {
        console.error('Usuário não autenticado');
        return;
    }

    console.log('Iniciando carregamento de empresas...');
    mostrarLoading(true);

    try {
        const userId = currentUser.uid;
        console.log('Buscando empresas para userId:', userId);

        // Consulta 1: Empresas onde o usuário é owner
        const empresasOwner = await buscarEmpresasOwner(userId);
        console.log('Empresas como owner:', empresasOwner.length);

        // Consulta 2: Empresas onde o usuário é membro
        const empresasMembro = await buscarEmpresasMembro(userId);
        console.log('Empresas como membro:', empresasMembro.length);

        // Combinar resultados e remover duplicatas
        const todasEmpresas = [...empresasOwner, ...empresasMembro];
        empresas = removerDuplicatas(todasEmpresas);

        console.log('Total de empresas encontradas:', empresas.length);

        // Exibir empresas
        exibirEmpresas();

    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        mostrarErro('Erro ao carregar empresas. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Buscar empresas onde o usuário é owner
async function buscarEmpresasOwner(userId) {
    try {
        console.log('Buscando empresas como owner...');
        const snapshot = await window.db
            .collection('empresas')
            .where('ownerId', '==', userId)
            .get();

        const empresas = [];
        snapshot.forEach(doc => {
            empresas.push({
                id: doc.id,
                ...doc.data(),
                tipo: 'owner'
            });
        });

        return empresas;
    } catch (error) {
        console.error('Erro ao buscar empresas como owner:', error);
        return [];
    }
}

// Buscar empresas onde o usuário é membro
async function buscarEmpresasMembro(userId) {
    try {
        console.log('Buscando empresas como membro...');
        const snapshot = await window.db
            .collection('empresas')
            .where('members', 'array-contains', userId)
            .get();

        const empresas = [];
        snapshot.forEach(doc => {
            empresas.push({
                id: doc.id,
                ...doc.data(),
                tipo: 'membro'
            });
        });

        return empresas;
    } catch (error) {
        console.error('Erro ao buscar empresas como membro:', error);
        return [];
    }
}

// Remover duplicatas do array de empresas
function removerDuplicatas(empresas) {
    const empresasUnicas = [];
    const idsVistos = new Set();

    empresas.forEach(empresa => {
        if (!idsVistos.has(empresa.id)) {
            idsVistos.add(empresa.id);
            empresasUnicas.push(empresa);
        }
    });

    return empresasUnicas;
}

// Exibir empresas na tela
function exibirEmpresas() {
    const grid = document.getElementById('empresasGrid');
    const nenhumaEmpresa = document.getElementById('nenhumaEmpresa');

    // Limpar grid
    grid.innerHTML = '';

    if (empresas.length === 0) {
        // Nenhuma empresa encontrada
        nenhumaEmpresa.style.display = 'block';
        return;
    }

    // Ocultar mensagem de nenhuma empresa
    nenhumaEmpresa.style.display = 'none';

    // Criar cards das empresas
    empresas.forEach(empresa => {
        const card = criarCardEmpresa(empresa);
        grid.appendChild(card);
    });
}

// Criar card de empresa
function criarCardEmpresa(empresa) {
    const card = document.createElement('div');
    card.className = 'empresa-card';

    const isAtiva = localStorage.getItem('activeCompanyId') === empresa.id;
    if (isAtiva) {
        card.classList.add('ativa');
    }

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
            ${empresa.tipo === 'owner' ? `<button class="btn-deletar-empresa" data-id="${empresa.id}" data-nome="${empresa.name || 'Esta empresa'}" title="Excluir Empresa"><i class="fas fa-trash-alt"></i></button>` : ''}
        </div>
    `;

    return card;
}

// Deletar empresa
async function deletarEmpresa(empresaId) {
    if (!confirm('Tem certeza que deseja deletar esta empresa? Esta ação é irreversível.')) {
        return;
    }

    mostrarLoading(true);
    try {
        await firebase.firestore().collection('empresas').doc(empresaId).delete();
        alert('Empresa deletada com sucesso!');
        // Recarregar a lista de empresas
        carregarEmpresas();
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        alert('Erro ao deletar empresa. Verifique suas permissões ou tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Acessar empresa
function acessarEmpresa(empresaId) {
    console.log('Acessando empresa:', empresaId);

    try {
        // Encontrar os dados da empresa selecionada
        const empresaSelecionada = empresas.find(emp => emp.id === empresaId);

        if (empresaSelecionada) {
            // Salvar empresa selecionada no localStorage (ID e Nome)
            localStorage.setItem('empresaSelecionadaId', empresaId);
            localStorage.setItem('empresaSelecionadaNome', empresaSelecionada.name || 'Empresa sem nome');
            localStorage.setItem('activeCompanyId', empresaId); // Para compatibilidade com outros scripts

            // Persistir objeto completo para páginas que esperam 'activeCompany'
            const activeCompanyObj = {
                id: empresaSelecionada.id,
                name: empresaSelecionada.name || 'Empresa sem nome',
                cnpj: empresaSelecionada.cnpj || null,
                city: empresaSelecionada.city || null,
                state: empresaSelecionada.state || empresaSelecionada.uf || null,
                tipo: empresaSelecionada.tipo || null
            };
            try {
                localStorage.setItem('activeCompany', JSON.stringify(activeCompanyObj));
            } catch (e) {
                console.warn('Falha ao salvar activeCompany como JSON:', e);
            }

            // Disparar eventos para atualização imediata
            window.dispatchEvent(new CustomEvent('activeCompanyChanged', { detail: { company: activeCompanyObj } }));
            window.dispatchEvent(new CustomEvent('companyChanged', { detail: { companyId: empresaSelecionada.id, company: activeCompanyObj } }));

            console.log('Empresa selecionada salva:', activeCompanyObj);
        } else {
            console.error('Empresa não encontrada na lista:', empresaId);
        }

        // Redirecionar para index.html
        window.location.href = '../index.html';

    } catch (error) {
        console.error('Erro ao acessar empresa:', error);
        alert('Erro ao acessar empresa. Tente novamente.');
    }
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loading');
    const empresasSection = document.querySelector('.empresas-section');

    if (mostrar) {
        loading.style.display = 'block';
        empresasSection.style.display = 'none';
    } else {
        loading.style.display = 'none';
        empresasSection.style.display = 'block';
    }
}

// Mostrar erro
function mostrarErro(mensagem) {
    const grid = document.getElementById('empresasGrid');
    grid.innerHTML = `
        <div class="erro-container">
            <p class="erro-mensagem">${mensagem}</p>
            <button class="btn-tentar-novamente" onclick="carregarEmpresas()">Tentar Novamente</button>
        </div>
    `;
}

// ========== FUNCIONALIDADES DO MODAL ==========

// Abrir modal
function abrirModal() {
    const modal = document.getElementById('modal-nova-empresa');
    modal.style.display = 'flex';
    console.log('Modal Nova Empresa exibido.');

    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('input-nome-empresa').focus();
    }, 100);
}

// Fechar modal
function fecharModal() {
    const modal = document.getElementById('modal-nova-empresa');
    modal.style.display = 'none';

    // Limpar formulário
    document.getElementById('form-nova-empresa').reset();
}

// Salvar nova empresa no Firestore - VERSÃO CORRIGIDA SEM VAZAMENTO
async function salvarNovaEmpresa() {
    console.log('*** INICIANDO SALVAMENTO SEGURO DE NOVA EMPRESA ***');

    // 1. PEGA O USUÁRIO ATUAL E CORRETO DIRETAMENTE DO FIREBASE!
    // 1. TENTA PEGAR PROVEDOR DE AUTH
    const authProvider = window.auth || (window.firebase && firebase.auth && firebase.auth());

    // 2. TENTA PEGAR O USUÁRIO DE MÚLTIPLAS FONTES
    const user = (authProvider && authProvider.currentUser) || currentUser || null;
    if (!user || !user.uid) {
        console.error("ERRO FATAL AO SALVAR: Usuário não autenticado!");
        alert("ERRO: Você não está logado. Faça login novamente.");
        return;
    }
    const uid = user.uid; // O UID CORRETO!

    console.log(`*** Iniciando salvamento para UID CORRETO: ${uid} ***`);

    // Pegar valores dos inputs
    const nomeEmpresa = document.getElementById('input-nome-empresa').value.trim();
    const cnpj = document.getElementById('input-cnpj').value.trim();
    const cidade = document.getElementById('input-cidade').value.trim();

    // Validações básicas
    if (!nomeEmpresa) {
        alert('Por favor, informe o nome da empresa.');
        document.getElementById('input-nome-empresa').focus();
        return;
    }

    if (!cnpj) {
        alert('Por favor, informe o CNPJ da empresa.');
        document.getElementById('input-cnpj').focus();
        return;
    }

    if (!cidade) {
        alert('Por favor, informe a cidade da empresa.');
        document.getElementById('input-cidade').focus();
        return;
    }

    // Desabilitar botão de salvar durante o processo
    const btnSalvar = document.getElementById('btn-salvar-empresa');
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
        // 2. Cria o objeto CORRETO com UID VÁLIDO
        const novaEmpresaData = {
            // Alinha com campos usados na UI (name, city)
            name: nomeEmpresa,
            cnpj: cnpj,
            city: cidade,
            ownerId: uid,
            members: [uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('*** Dados da nova empresa com UID CORRETO:', novaEmpresaData);

        // 3. Salvar no Firestore com try...catch
        const docRef = await window.db
            .collection('empresas')
            .add(novaEmpresaData);

        console.log("Empresa salva com SUCESSO! ID:", docRef.id);
        alert("Empresa criada com sucesso!");
        fecharModal();

        // Recarregar lista de empresas
        carregarEmpresas();

    } catch (error) {
        console.error("ERRO GRAVE AO SALVAR EMPRESA:", error.code, error.message);
        // O erro 'Missing permissions' que o usuário viu VAI APARECER AQUI
        // se o 'uid' (vamo) for diferente do 'request.auth.uid' (batata)
        alert("Falha ao salvar a empresa: " + error.message);
    } finally {
        // Reabilitar botão
        btnSalvar.disabled = false;
        btnSalvar.textContent = textoOriginal;
    }
}

// Formatação automática do CNPJ
function formatarCNPJ(input) {
    let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito

    // Limita a 14 dígitos
    if (valor.length > 14) {
        valor = valor.substring(0, 14);
    }

    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (valor.length <= 2) {
        valor = valor;
    } else if (valor.length <= 5) {
        valor = valor.replace(/(\d{2})(\d+)/, '$1.$2');
    } else if (valor.length <= 8) {
        valor = valor.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    } else if (valor.length <= 12) {
        valor = valor.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    } else {
        valor = valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, '$1.$2.$3/$4-$5');
    }

    input.value = valor;
}