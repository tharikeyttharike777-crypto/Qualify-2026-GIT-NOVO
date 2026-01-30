/* ======================================================================
   SCRIPT DE AUTH GUARD (VERSÃO CORRIGIDA - SEM VAZAMENTO DE DADOS)
   ====================================================================== */

// GUARD IMEDIATO: falha-rápida antes de renderizar a UI
// GUARD IMEDIATO: Desativado para evitar conflitos de race condition
(function immediateAuthGuard() {
  console.log('Auth Guard: Aguardando inicialização do Firebase...');
  // A verificação síncrona via localStorage foi removida pois causava loops de redirecionamento
  // quando o localStorage estava limpo mas a sessão do Firebase ainda estava sendo restaurada.
})();

// FUNÇÃO DE LOGOUT SEGURA - EXTERMINANDO VAZAMENTOS
window.logoutUser = function () {
  console.log('*** INICIANDO LOGOUT SEGURO - LIMPEZA TOTAL ***');

  firebase.auth().signOut().then(() => {
    console.log('*** Firebase signOut() CONCLUÍDO ***');

    // LIMPEZA TOTAL - EXTERMINANDO TODOS OS DADOS VAZADOS
    localStorage.clear();
    sessionStorage.clear();

    // Limpa cookies do Firebase se existirem
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log('*** LOGOUT COMPLETO - TODOS OS DADOS LIMPOS ***');
    window.location.href = '/login.html';
  }).catch((error) => {
    console.error('Erro no logout:', error);
    // Mesmo com erro, limpa tudo
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login.html';
  });
};

// Alias global para garantir que qualquer chamada use o logout robusto
window.handleLogout = window.logoutUser;
window.fazerLogout = window.logoutUser; // compatibilidade com chamadas antigas

// onAuthStateChanged CORRETO - USANDO PARÂMETRO USER SEMPRE
firebase.auth().onAuthStateChanged(user => {
  console.log('*** onAuthStateChanged DISPARADO. User UID:', user ? user.uid : 'NULL ***');

  if (user && user.uid) {
    console.log("Auth Guard EXECUTANDO PARA USUÁRIO REAL:", user.uid, user.email);
    console.log("✅ Usuário autenticado:", user.email);
    console.log("UID:", user.uid);

    // SALVA DADOS DO USUÁRIO ATUAL (NÃO VAZADO)
    localStorage.setItem('currentUserUID', user.uid);
    localStorage.setItem('currentUserEmail', user.email || '');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('lastAuthTime', Date.now().toString());

    updateUserNameDisplay(user);

    // SÓ AGORA você tem permissão para carregar os dados
    // Chame suas funções aqui dentro:
    if (typeof loadProjects === 'function') loadProjects(user.uid);
    if (typeof loadFamilies === 'function') loadFamilies(user.uid);
    if (typeof loadDashboard === 'function') loadDashboard(user.uid);

    // Centraliza chamada no módulo multitenant
    if (typeof window.setupCompanyListener === 'function') {
      window.setupCompanyListener(user.uid);
    } else {
      console.warn('setupCompanyListener indisponível no momento; aguardando multitenantReady.');
      window.addEventListener('multitenantReady', () => window.setupCompanyListener && window.setupCompanyListener(user.uid), { once: true });
    }
  } else {
    // 🔴 FALHA: Ninguém logado. Chuta para o login.
    console.warn("Nenhum usuário logado. Redirecionando...");
    
    const isLoginPage = window.location.pathname.includes('login.html');
    const inGrace = sessionStorage.getItem('authGraceActive') === '1';

    if (isLoginPage) {
      console.log('Auth Guard: Já estamos na página de login — sem redirecionar.');
      return;
    }

    if (inGrace) {
      console.log('Auth Guard: Período de graça ativo — evitando redirecionamento prematuro.');
      return;
    }

    try { localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); } catch (_) { }

    console.warn('Auth Guard: Redirecionando para login com replace...');
    try {
      window.location.replace('/login.html');
    } catch (e) {
      window.location.href = '/login.html';
    }
  }
});

// Função para ATUALIZAR NOME
function updateUserNameDisplay(user) {
  const elementoNome = document.getElementById('nome-do-cliente-display'); // Verifique ID
  if (!elementoNome) return;
  elementoNome.textContent = user.displayName || user.email;
  if (!user.displayName) {
    db.collection("users").doc(user.uid).get().then(docSnap => {
      if (docSnap.exists() && docSnap.data().nome) {
        elementoNome.textContent = docSnap.data().nome;
      }
    }).catch(err => console.error("Erro buscando nome no Firestore:", err));
  }
}

// Função para CARREGAR EMPRESAS
function setupCompanyListener(uid) {
  if (!uid) { // Proteção
    console.error("ERRO FATAL: setupCompanyListener chamado sem UID!");
    return;
  }
  console.log("Configurando listener v8 para UID VÁLIDO:", uid);
  try {
    // CONSULTA Filter.or CORRETA (v8 compat):
    const consultaCorreta = window.db.collection('empresas')
      .where(
        firebase.firestore.Filter.or(
          firebase.firestore.Filter.where('members', 'array-contains', uid),
          firebase.firestore.Filter.where('ownerId', '==', uid)
        )
      );
    consultaCorreta.onSnapshot(snapshot => {
      console.log("Snapshot v8 recebido. Docs:", snapshot.docs.length);
      const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCompanies(companies); // Chama renderização
    }, error => {
      console.error("ERRO GRAVE NO 'onSnapshot' (v8):", error.message);
      fallbackQuery(uid); // Tenta fallback
    });
  } catch (error) {
    console.error("Falha ao construir 'Filter.or' (v8):", error);
    fallbackQuery(uid); // Tenta fallback
  }
}

// Função FALLBACK
async function fallbackQuery(uid) {
  if (!uid) { console.error("ERRO FATAL: fallbackQuery chamado sem UID!"); return; }
  console.warn("Executando fallback consultas separadas UID VÁLIDO:", uid);
  try {
    const ownerQuery = window.db.collection('empresas').where('ownerId', '==', uid);
    const ownerSnapshot = await ownerQuery.get();
    let companies = ownerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const memberQuery = window.db.collection('empresas').where('members', 'array-contains', uid);
    const memberSnapshot = await memberQuery.get();
    memberSnapshot.docs.forEach(doc => {
      if (!companies.some(c => c.id === doc.id)) {
        companies.push({ id: doc.id, ...doc.data() });
      }
    });
    console.log("Fallback: Empresas carregadas:", companies.length);
    renderCompanies(companies);
  } catch (error) {
    console.error("ERRO GRAVE NO FALLBACK:", error.message);
    // SE DER 'Missing permissions' AQUI, AS REGRAS ESTÃO ERRADAS!
  }
}

// Função RENDER (COM LIMPEZA E LÓGICA CONDICIONAL)
// Nota: A implementação completa está no multitenant-config.js
// Esta é apenas uma função stub para compatibilidade
function renderCompanies(companies) {
  // Check for global disable flag to prevent conflicts
  if (window.DISABLE_MULTITENANT_AUTO_RENDER) {
    console.log('🚫 renderCompanies (auth-guard) ignorado: DISABLE_MULTITENANT_AUTO_RENDER está ativo.');
    return;
  }

  console.log('*** renderCompanies (auth-guard stub) chamado com:', companies.length, 'empresas');

  // Se a função principal do multitenant-config.js estiver disponível, use-a
  if (window.multitenantConfig && typeof window.multitenantConfig.renderCompanies === 'function') {
    return window.multitenantConfig.renderCompanies(companies);
  }

  // Fallback básico se a função principal não estiver disponível
  const blocoNenhumaEmpresa = document.getElementById('bloco-nenhuma-empresa');
  const blocoSuasEmpresas = document.getElementById('bloco-suas-empresas');
  const listaContainer = document.getElementById('empresasGrid');
  if (!listaContainer) {
    console.error("ERRO FATAL RENDER: Container empresasGrid não encontrado!");
    return;
  }

  if (companies.length === 0) {
    console.log("*** LÓGICA: Nenhuma empresa. EXIBINDO mensagem vazia.");
    if (blocoNenhumaEmpresa) blocoNenhumaEmpresa.style.display = 'block';
    if (blocoSuasEmpresas) blocoSuasEmpresas.style.display = 'none';
    listaContainer.innerHTML = '<p>Nenhuma empresa encontrada.</p>';
  } else {
    console.log(`*** LÓGICA: ${companies.length} empresa(s). EXIBINDO lista.`);
    if (blocoNenhumaEmpresa) blocoNenhumaEmpresa.style.display = 'none';
    if (blocoSuasEmpresas) blocoSuasEmpresas.style.display = 'block';
    listaContainer.innerHTML = '';

    companies.forEach(company => {
      const nomeEmpresa = company.nome || company.name || "Empresa sem nome";
      const cnpj = company.cnpj || 'N/A';
      const cidade = company.cidade || 'N/A';

      const cardHTML = `
        <div class="col-md-4 mb-3">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">${nomeEmpresa}</h5>
              <p class="card-text">CNPJ: ${cnpj}</p>
              <p class="card-text">Cidade: ${cidade}</p>
              <button class="btn btn-primary btn-acessar-empresa" data-id="${company.id}">Acessar</button>
            </div>
          </div>
        </div>
      `;
      listaContainer.innerHTML += cardHTML;
    });
  }
}
