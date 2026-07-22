// Funcionalidade de pesquisa e logoff para o header

document.addEventListener('DOMContentLoaded', function() {
    // Aguarda um pequeno delay para garantir que todos os elementos estejam carregados
    setTimeout(() => {
        try {
            // Inicializar componentes
            initSearchBar();
            initLogoutButton();
            initHeaderTitleNavigation();
        } catch (error) {
            console.error('Erro ao inicializar header-search:', error);
        }
    }, 50);
});

// Fallback para inicialização imediata se o DOM já estiver carregado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        try {
            initSearchBar();
            initLogoutButton();
            initHeaderTitleNavigation();
        } catch (error) {
            console.error('Erro ao inicializar header-search (fallback):', error);
        }
    }, 50);
}

(function(){
    try {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg){
                if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
                try { reg.update(); } catch(_){}
            }).catch(function(){});
            // Desabilitado reload automático para evitar loops de reinício
        }
    } catch(_){ }
})();

/**
 * Inicializa a barra de pesquisa
 */
function initSearchBar() {
    const searchInput = document.getElementById('page-search');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) return;

    // Evitar múltipla inicialização em páginas que carregam scripts mais de uma vez
    if (searchInput.dataset.searchInitialized === 'true') {
        return;
    }
    searchInput.dataset.searchInitialized = 'true';
    searchResults.dataset.searchInitialized = 'true';

    // Utilitário para resolver URL de forma consistente (raiz do site)
    const navigateTo = (url) => {
        try {
            // Permitir URLs absolutas e manter root-relative
            const target = new URL(url, window.location.origin).toString();
            window.location.href = target;
        } catch (e) {
            // Fallback seguro
            window.location.href = url;
        }
    };
    
    // Lista de páginas disponíveis para pesquisa
    const availablePages = [
        { title: 'Dashboard', url: '/index.html', icon: 'fa-tachometer-alt' },
        // Contratos
        { title: 'Contratos Ativos', url: '/pages/contratos.html', icon: 'fa-file-contract' },
        { title: 'Renegociação', url: '/pages/renegociacao-cobrancas.html', icon: 'fa-handshake' },
        // Financeiro
        { title: 'Gestão Financeira', url: '/pages/lista-cobranca.html', icon: 'fa-money-bill-wave' },
        { title: 'Pesquisar Associados', url: '/pages/pesquisar-associados.html', icon: 'fa-user-friends' },
        { title: 'Pesquisar Famílias', url: '/pages/pesquisar-familias.html', icon: 'fa-users' },
        { title: 'Pesquisar Pets', url: '/pages/pesquisar-pets.html', icon: 'fa-paw' },
        // Relatórios
        { title: 'Aniversariantes', url: '/pages/aniversariantes.html', icon: 'fa-birthday-cake' },
        { title: 'Minhas Movimentações', url: '/pages/minhas-movimentacoes.html', icon: 'fa-chart-line' },
        // Serviços
        { title: 'Ordens de Serviço', url: '/pages/ordens-servico.html', icon: 'fa-tools' },
        // Outros
        { title: 'Nova Família', url: '/pages/nova-familia.html', icon: 'fa-user-plus' },
        { title: 'Perfil', url: '/pages/perfil.html', icon: 'fa-user-circle' }
    ];
    
    // Evento de digitação na pesquisa
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            searchResults.classList.remove('show');
            return;
        }
        
        // Filtrar resultados
        const filteredResults = availablePages.filter(page => 
            page.title.toLowerCase().includes(searchTerm)
        );
        
        // Exibir resultados
        renderSearchResults(filteredResults, navigateTo);
    });
    
    // Evento de foco na pesquisa
    searchInput.addEventListener('focus', function() {
        if (this.value.length >= 2) {
            searchResults.classList.add('show');
        }
    });
    
    // Fechar resultados ao clicar fora
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
    // Navegar com Enter para o primeiro resultado
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.toLowerCase().trim();
            if (!searchTerm) return;
            const filteredResults = availablePages.filter(page => 
                page.title.toLowerCase().includes(searchTerm)
            );
            if (filteredResults.length > 0) {
                navigateTo(filteredResults[0].url);
            }
        }
    });
}

/**
 * Renderiza os resultados da pesquisa
 */
function renderSearchResults(results, navigateTo) {
    const searchResults = document.getElementById('search-results');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
        searchResults.classList.add('show');
        return;
    }
    
    let html = '';
    
    results.forEach(page => {
        html += `
            <div class="search-result-item" data-url="${page.url}">
                <div class="search-result-icon">
                    <i class="fas ${page.icon}"></i>
                </div>
                <div class="search-result-title">${page.title}</div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
    searchResults.classList.add('show');

    // Delegar clique para navegação robusta
    Array.from(searchResults.querySelectorAll('.search-result-item')).forEach(item => {
        item.addEventListener('click', () => {
            const url = item.getAttribute('data-url');
            navigateTo(url);
        });
    });
    
    // Adicionar estilos inline para os resultados
    const style = document.createElement('style');
    style.textContent = `
        .search-result-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        
        .search-result-item:hover {
            background-color: #f7fafc;
        }
        
        .search-result-icon {
            width: 24px;
            text-align: center;
            margin-right: 0.75rem;
            color: #667eea;
        }
        
        .search-result-title {
            font-size: 0.9rem;
            color: #2d3748;
        }
        
        .search-no-results {
            padding: 1rem;
            text-align: center;
            color: #718096;
            font-size: 0.9rem;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Inicializa o botão de logout
 */
function initLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnHeader = document.getElementById('logout-btn-header');
    
    // Função comum para logout
    const handleLogoutClick = async function() {
        // Usar função global padronizada com limpeza total (priorizar handleLogout)
        if (typeof window.handleLogout === 'function') {
            await window.handleLogout();
            return;
        }

        // Compatibilidade: usar fazerLogout se disponível
        if (typeof window.fazerLogout === 'function') {
            await window.fazerLogout();
            return;
        }

        // Fallback absoluto caso não esteja disponível
        try {
            if (typeof window.supabase !== 'undefined') {
                await window.supabase.auth.signOut();
            }
        } catch (e) {}
        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {}
        redirectToLogin();
    };
    
    // Adicionar event listeners para ambos os botões
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogoutClick);
    }
    
    if (logoutBtnHeader) {
        logoutBtnHeader.addEventListener('click', handleLogoutClick);
    }
}

/**
 * Limpa dados da sessão do usuário
 */
function clearUserSession() {
    // Mantido para compatibilidade, mas padronizamos via fazerLogout
    try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('Sessão do usuário limpa (total).');
    } catch (error) {
        console.error('Erro ao limpar sessão:', error);
    }
}

/**
 * Redireciona para a página de login
 */
function redirectToLogin() {
    window.location.href = '/login.html';
}

/**
 * Torna o título/área de logo do header clicável e acessível
 * Navega rapidamente para a página principal (index.html)
 */
function initHeaderTitleNavigation() {
    try {
        const logo = document.querySelector('.header .logo') || document.querySelector('.logo');
        if (!logo) return;

        // Acessibilidade e foco
        logo.setAttribute('role', 'link');
        logo.setAttribute('tabindex', '0');
        logo.setAttribute('aria-label', 'Ir para a página principal');

        // Resolver caminho relativo conforme a página atual
        const homePath = '/index.html';

        // Click com leve animação de pulso
        const handleNavigate = () => {
            try {
                logo.classList.add('title-pulse');
            } catch (e) {}
            setTimeout(() => {
                try {
                    const target = new URL(homePath, window.location.origin).toString();
                    window.location.href = target;
                } catch {
                    window.location.href = homePath;
                }
            }, 120);
        };

        // Delegar eventos
        logo.addEventListener('click', handleNavigate);
        logo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigate();
            }
        });
    } catch (error) {
        console.warn('Falha ao inicializar navegação pelo título do header:', error);
    }
}
