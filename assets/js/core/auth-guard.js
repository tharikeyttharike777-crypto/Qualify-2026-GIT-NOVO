/* ======================================================================
   SCRIPT DE AUTH GUARD (VERSÃO SUPABASE - TOTALMENTE RELACIONAL)
   ====================================================================== */

// GUARD IMEDIATO
(function immediateAuthGuard() {
  console.log('Auth Guard: Aguardando inicialização do Supabase...');
})();

// FUNÇÃO DE LOGOUT SEGURA - SUPABASE
window.logoutUser = async function () {
  console.log('*** INICIANDO LOGOUT SEGURO - SUPABASE ***');

  try {
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;

    console.log('*** Supabase signOut() CONCLUÍDO ***');

    // LIMPEZA TOTAL
    localStorage.clear();
    sessionStorage.clear();

    // Limpa cookies 
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    console.log('*** LOGOUT COMPLETO - TODOS OS DADOS LIMPOS ***');
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Erro no logout Supabase:', error);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login.html';
  }
};

window.handleLogout = window.logoutUser;
window.fazerLogout = window.logoutUser;

// ESCUTADOR DE ESTADO DE AUTENTICAÇÃO (Supabase)
window.supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user;
  console.log('*** onAuthStateChange DISPARADO. Event:', event, 'User UID:', user ? user.id : 'NULL ***');

  if (user) {
    console.log("Auth Guard EXECUTANDO PARA USUÁRIO SUPABASE:", user.id, user.email);

    // SALVA DADOS DO USUÁRIO
    localStorage.setItem('currentUserUID', user.id);
    localStorage.setItem('currentUserEmail', user.email || '');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('lastAuthTime', Date.now().toString());

    updateUserNameDisplay(user);

    // Carregar dados dependentes
    if (typeof loadProjects === 'function') loadProjects(user.id);
    if (typeof loadFamilies === 'function') loadFamilies(user.id);
    if (typeof loadDashboard === 'function') loadDashboard(user.id);

    // Lógica Multitenant (Empresas)
    if (typeof window.setupCompanyListener === 'function') {
      window.setupCompanyListener(user.id);
    } else {
      console.warn('setupCompanyListener indisponível no momento; aguardando multitenantReady.');
      window.addEventListener('multitenantReady', () => window.setupCompanyListener && window.setupCompanyListener(user.id), { once: true });
    }
  } else if (event === 'SIGNED_OUT' || !user) {
    console.warn("Nenhum usuário logado ou SIGNED_OUT. Redirecionando...");

    const isLoginPage = window.location.pathname.includes('login.html');
    if (isLoginPage) return;

    try { localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); } catch (_) { }

    window.location.replace('/login.html');
  }
});

// Função para ATUALIZAR NOME (Supabase Profile)
async function updateUserNameDisplay(user) {
  const elementoNome = document.getElementById('nome-do-cliente-display');
  if (!elementoNome) return;

  // Tenta pegar do metadata do user (Supabase Auth armazena lá se configurado)
  const metaNome = user.user_metadata?.full_name || user.user_metadata?.nome;
  if (metaNome) {
    elementoNome.textContent = metaNome;
    return;
  }

  // Fallback: Busca na tabela de perfis (se existir no futuro) ou usa email
  elementoNome.textContent = user.email;
}

// Função para CARREGAR EMPRESAS (Supabase)
async function setupCompanyListener(uid) {
  if (!uid) return;
  console.log("Configurando busca de empresas para UID Supabase:", uid);

  try {
    // No Supabase relacional, as empresas estão na tabela 'empresas'
    // Se a tabela ainda não existir, o maybeSingle ou select vai falhar graciosamente
    const { data: companies, error } = await window.supabase
      .from('empresas')
      .select('*')
      .or(`owner_id.eq.${uid},members.cs.{${uid}}`); // members é JSONB ou Array? Ajustar conforme schema

    if (error) {
      console.warn('Erro ao buscar empresas (pode ser que a tabela empresas não exista ainda):', error);
      // Fallback para empresas estáticas ou vazias enquanto o schema corporativo é consolidado
      renderCompanies([]);
      return;
    }

    renderCompanies(companies || []);
  } catch (error) {
    console.error("Falha ao buscar empresas no Supabase:", error);
    renderCompanies([]);
  }
}

// Stub para renderização (Lógica real no multitenant-config.js)
function renderCompanies(companies) {
  if (window.DISABLE_MULTITENANT_AUTO_RENDER) return;

  if (window.multitenantConfig && typeof window.multitenantConfig.renderCompanies === 'function') {
    return window.multitenantConfig.renderCompanies(companies);
  }

  const listaContainer = document.getElementById('empresasGrid');
  if (!listaContainer) return;

  if (companies.length === 0) {
    listaContainer.innerHTML = '<p class="text-muted">Nenhuma empresa encontrada ou disponível.</p>';
  } else {
    listaContainer.innerHTML = '';
    companies.forEach(company => {
      const nomeEmpresa = company.nome || "Empresa sem nome";
      const cardHTML = `
        <div class="col-md-4 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body">
              <h5 class="card-title fw-bold">${nomeEmpresa}</h5>
              <p class="card-text text-muted mb-4">Acesso permitido para sua conta.</p>
              <button class="btn btn-primary w-100 btn-acessar-empresa" data-id="${company.id}">Acessar Dashboard</button>
            </div>
          </div>
        </div>
      `;
      listaContainer.innerHTML += cardHTML;
    });
  }
}

