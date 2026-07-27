
/**
 * SIDEBAR MODERNO - JavaScript
 * Sistema de navegação lateral moderno e responsivo
 */

// Blindagem do Sistema de Menu Oficial Contra Sobrescritas Legadas
window.initializeSidebar = function() {
    console.log('🛡️ ModernSidebar assumiu controle de navegação - Neutralizando script inline antigo.');
};

class ModernSidebar {
    constructor() {
        this.sidebar = null;
        this.overlay = null;
        this.menuToggle = null;
        this.sidebarClose = null;
        this.isOpen = false;
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }
    
    /**
     * Inicializa o sidebar moderno
     */
    init() {
        // Aguarda o DOM estar completamente carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initSidebar());
        } else {
            this.initSidebar();
        }
    }
    
    /**
     * Inicializa o sidebar após o DOM estar pronto
     */
    initSidebar() {
        // Primeiro obtém os elementos
        if (!this.getElements()) {
            console.warn('❌ Falha ao inicializar o sidebar: elementos nao encontrados - funcionalidade desabilitada');
            return;
        }
        
        // Reconstrói todo o conteúdo do menu com configuração unificada
        this.rebuildSidebarMenu();
        // Garante que a estrutura mínima esteja completa caso alguma página personalize partes
        this.ensureCoreGroups();
        // Padroniza itens do submenu "Famílias" em todas as páginas
        this.normalizeFamilySubmenu();
        // Garante que o grupo "Mais usados" tenha os atalhos padrão
        this.normalizeCommonMenu();

        // Depois de ajustar DOM, vinculamos eventos
        this.bindEvents();
        this.handleResize();
        this.setActiveMenuItem();
        // Reaplica o item ativo após scripts inline de páginas que manipulam o sidebar
        // (algumas páginas limpam 'active' indevidamente). Estas chamadas garantem o estado correto.
        setTimeout(() => this.setActiveMenuItem(), 200);
        setTimeout(() => this.setActiveMenuItem(), 600);
        this.renderUserCompanyInfo();
        
        // Adiciona listener para mudanças no localStorage
        this.setupStorageListener();

        // Adiciona listener de autenticação para atualizar o email do usuário em tempo real
        this.setupAuthListener();
        
        console.log('✅ ModernSidebar inicializado com sucesso');
    }
    
    /**
     * Obtém os elementos do DOM
     */
    getElements() {
        // Prioriza o ID padronizado 'menu-toggle'
        this.menuToggle = document.getElementById('menu-toggle');
        
        // Fallbacks para IDs alternativos (caso ainda existam)
        if (!this.menuToggle) {
            this.menuToggle = document.getElementById('menuToggle') || 
                             document.getElementById('hamburger-btn') ||
                             document.querySelector('.menu-toggle') ||
                             document.querySelector('.hamburger-menu');
        }
        
        // Elementos do sidebar
        this.sidebar = document.getElementById('sidebar') || 
                      document.querySelector('.sidebar, .modern-sidebar');
        // Se ausente, cria estrutura mínima
        if (!this.sidebar) {
            try {
                this.createSidebarSkeleton();
                this.sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar, .modern-sidebar');
            } catch (e) {
                console.warn('❌ Falha ao criar estrutura mínima do sidebar:', e);
            }
        }
        
        // Overlay
        this.overlay = document.getElementById('sidebar-overlay') || 
                      document.getElementById('sidebarOverlay') ||
                      document.querySelector('.sidebar-overlay');
        if (!this.overlay) {
            this.overlay = this.ensureOverlay();
        }
        
        // Botão de fechar
        this.sidebarClose = document.getElementById('sidebar-close') || 
                           document.getElementById('sidebarClose') ||
                           document.querySelector('.sidebar-close');
        
        // Validação dos elementos essenciais
        if (!this.sidebar) {
            console.warn('❌ Sidebar nao encontrado! Verifique se existe um elemento com id="sidebar" - funcionalidade desabilitada');
            return false;
        }
        
        if (!this.menuToggle) {
            console.warn('❌ Botao do menu nao encontrado! Verifique se existe um elemento com id="menu-toggle" - funcionalidade desabilitada');
            return false;
        }
        
        console.log('✅ Elementos do sidebar encontrados:', {
            sidebar: !!this.sidebar,
            overlay: !!this.overlay,
            menuToggle: !!this.menuToggle,
            sidebarClose: !!this.sidebarClose
        });
        
        return true;
    }

    /**
     * Cria uma estrutura mínima de sidebar quando ausente na página
     */
    createSidebarSkeleton() {
        const body = document.body;
        if (!body) return;
        const nav = document.createElement('nav');
        nav.id = 'sidebar';
        nav.className = 'sidebar';

        const header = document.createElement('div');
        header.className = 'sidebar-header';
        const h3 = document.createElement('h3');
        h3.textContent = 'Menu';
        const closeBtn = document.createElement('button');
        closeBtn.id = 'sidebar-close';
        closeBtn.className = 'sidebar-close';
        closeBtn.textContent = '×';
        header.appendChild(h3);
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.className = 'sidebar-content';
        const ul = document.createElement('ul');
        ul.className = 'sidebar-menu';
        content.appendChild(ul);

        nav.appendChild(header);
        nav.appendChild(content);

        const headerEl = document.querySelector('header.header');
        if (headerEl && headerEl.parentNode) {
            headerEl.parentNode.insertBefore(nav, headerEl.nextSibling);
        } else {
            body.insertBefore(nav, body.firstChild);
        }
    }

    /**
     * Garante que o overlay exista; cria se estiver ausente
     */
    ensureOverlay() {
        let ov = document.getElementById('sidebar-overlay') || document.querySelector('.sidebar-overlay');
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = 'sidebar-overlay';
        ov.className = 'sidebar-overlay';
        document.body.appendChild(ov);
        return ov;
    }

    /**
     * Remove completamente qualquer grupo "Mais usados" que exista na página HTML estática.
     */
    normalizeCommonMenu() {
        try {
            const sidebar = this.sidebar;
            if (!sidebar) return;
            const menuItems = sidebar.querySelectorAll('.menu-item.has-submenu');
            menuItems.forEach(item => {
                const textEl = item.querySelector('.menu-text');
                const text = (textEl ? textEl.textContent.trim().toLowerCase() : '');
                if (text === 'mais usados' || text.includes('usados')) {
                    item.remove();
                }
            });
        } catch (e) {
            console.warn('Falha ao remover Mais usados:', e);
        }
    }

    /**
     * Garante que os grupos principais (Contratos, Financeiro, Famílias) existam sem duplicações.
     */
    ensureCoreGroups() {
        // A função rebuildSidebarMenu já constrói a árvore oficial completa e padronizada.
    }

    /**
     * Reconstrói a lista do menu lateral de forma padronizada em todas as páginas
     */
    rebuildSidebarMenu() {
        try {
            const sidebar = this.sidebar;
            if (!sidebar) return;

            let menuList = sidebar.querySelector('.sidebar-menu');
            if (!menuList) {
                const content = sidebar.querySelector('.sidebar-content') || document.createElement('div');
                if (!content.classList.contains('sidebar-content')) content.className = 'sidebar-content';
                menuList = document.createElement('ul');
                menuList.className = 'sidebar-menu';
                content.appendChild(menuList);
                if (!content.parentElement) sidebar.appendChild(content);
            }

            // Limpa conteúdo atual para manter o menu lateral estritamente oficial e idêntico em todas as telas
            while (menuList.firstChild) menuList.removeChild(menuList.firstChild);

            const isRoot = !window.location.pathname.includes('/pages/') && !window.location.pathname.includes('pages');
            const getPath = (file) => isRoot ? `pages/${file}` : `${file}`;

            const createGroup = (title, iconClass, links) => {
                const li = document.createElement('li');
                li.className = 'menu-item has-submenu';
                const a = document.createElement('a');
                a.href = '#';
                a.className = 'menu-link';
                const icon = document.createElement('i');
                icon.className = iconClass;
                const span = document.createElement('span');
                span.className = 'menu-text';
                span.textContent = title;
                const arrow = document.createElement('i');
                arrow.className = 'arrow-icon';
                // O CSS do .arrow-icon::before já desenha o ícone corretamente. Não colocamos texto aqui para evitar o bug de DUAS setas!
                arrow.textContent = '';
                a.appendChild(icon); a.appendChild(span); a.appendChild(arrow);
                
                const submenu = document.createElement('ul');
                submenu.className = 'submenu';
                submenu.style.maxHeight = '0px';
                submenu.style.opacity = '0';
                submenu.style.visibility = 'hidden';

                links.forEach(l => {
                    const liSub = document.createElement('li');
                    const link = document.createElement('a');
                    const href = getPath(l.href);
                    link.setAttribute('href', href);
                    link.textContent = l.label;
                    // O item ativo e a expansão são calculados estritamente na setActiveMenuItem para evitar marcação errada de múltiplos itens!
                    liSub.appendChild(link);
                    submenu.appendChild(liSub);
                });
                li.appendChild(a);
                li.appendChild(submenu);
                menuList.appendChild(li);
            };

            // 1. Grupo Oficial: Contratos
            createGroup('Contratos', 'icon-contract', [
                { href: 'contratos.html', label: 'Todos os Contratos' },
                { href: 'inadimplentes.html', label: 'Inadimplentes' },
                { href: 'renegociacao-cobrancas.html', label: 'Renegociação' }
            ]);

            // 2. Grupo Oficial: Financeiro
            createGroup('Financeiro', 'icon-money', [
                { href: 'lista-cobranca.html', label: 'Gestão Financeira' }
            ]);

            // 3. Grupo Oficial: Famílias
            createGroup('Famílias', 'icon-family', [
                { href: 'nova-familia.html', label: 'Nova família' },
                { href: 'pesquisar-familias.html', label: 'Pesquisar famílias' },
                { href: 'pesquisar-associados.html', label: 'Pesquisar associados' },
                { href: 'pesquisar-pets.html', label: 'Pesquisar Pets' },
                { href: 'aniversariantes.html', label: 'Aniversariantes' }
            ]);

            // 4. Grupo Oficial: Planos
            createGroup('Planos', 'icon-plan', [
                { href: 'novo-plano.html', label: 'Novo plano' },
                { href: 'pesquisa-planos.html', label: 'Pesquisa de Planos' },
                { href: 'produtos-plano.html', label: 'Produtos' }
            ]);

            // Reaplica eventos para novos elementos
            this.bindSubmenuEvents();
            this.bindNavigationLinks();

            console.log('✅ Sidebar reconstruído com perfeição sem setas duplas e sem falsos positivos.');
        } catch (e) {
            console.warn('Falha ao reconstruir menu lateral:', e);
        }
    }

    /**
     * Normalização desativada para não conflitar nem alterar o menu oficial gerado dinamicamente
     */
    normalizeFamilySubmenu() {
        // Desativado: o menu principal em rebuildSidebarMenu já é a autoridade máxima do sistema.
    }
    
    /**
     * Configura listener para mudanças no localStorage
     */
    setupStorageListener() {
        // Listener para mudanças no localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'userDisplayName' || 
                e.key === 'userEmail' || 
                e.key === 'currentUserEmail' || 
                e.key === 'activeCompany' ||
                e.key === 'activeCompanyId' ||
                e.key === 'empresaSelecionadaId' ||
                e.key === 'empresaSelecionadaNome' ||
                e.key === 'userCompanies') {
                console.log('🔄 Dados do usuário/empresa alterados no localStorage, atualizando sidebar...');
                setTimeout(() => {
                    this.renderUserCompanyInfo();
                }, 100);
            }
        });

        // Listener customizado para mudanças na mesma aba
        document.addEventListener('userDataUpdated', () => {
            
            setTimeout(() => {
                this.renderUserCompanyInfo();
            }, 100);
        });

        // Listener customizado de mudança de empresa
        window.addEventListener('companyChanged', () => {
            console.log('🏢 companyChanged recebido, atualizando exibição de empresa');
            setTimeout(() => {
                this.renderUserCompanyInfo();
            }, 50);
        });
        
        console.log('✅ Listeners de storage configurados');
    }

    /**
     * Configura listener do Supabase Auth para manter o email do usuário sincronizado
     */
    setupAuthListener() {
        try {
            if (!window.supabase) {
                console.warn('⚠️ Supabase indisponível no sidebar.');
                return;
            }

            window.supabase.auth.onAuthStateChange((event, session) => {
                const user = session?.user;
                try {
                    if (user && user.email) {
                        localStorage.setItem('currentUserEmail', user.email);
                    } else {
                        localStorage.removeItem('currentUserEmail');
                    }
                } catch (e) {
                    console.warn('Falha ao sincronizar currentUserEmail no localStorage:', e);
                }
                // Re-renderiza informações no sidebar
                this.renderUserCompanyInfo();
            });
            console.log('✅ Listener de Auth configurado no sidebar');
        } catch (err) {
            console.warn('Falha ao configurar listener de Auth no sidebar:', err);
        }
    }
    
    /**
     * Vincula os eventos
     */
    bindEvents() {
        // Toggle do menu - Protegido por delegação de evento
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('#menu-toggle, #menuToggle, .hamburger-menu, .menu-toggle');
            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Clique no menu detectado por delegação oficial');
                this.toggle();
            }
        }, true);
        
        // Blindagem DOM Anti-IIFE: Bloqueia métodos cloneNode e replaceChild para impedir que scripts inline legados removam os listeners dos botões e links
        const protectElement = (el) => {
            if (!el) return;
            try {
                el.cloneNode = function() { return this; };
                if (el.parentNode && !el.parentNode._isProtected) {
                    const origReplace = el.parentNode.replaceChild;
                    el.parentNode.replaceChild = function(newChild, oldChild) {
                        if (oldChild === el || (newChild && newChild === oldChild) || (oldChild && (oldChild.id === 'menu-toggle' || oldChild.id === 'menuToggle'))) {
                            console.warn('🛡️ ModernSidebar interceptou e impediu replaceChild/clonagem de elemento do menu!');
                            return oldChild;
                        }
                        return origReplace.call(this, newChild, oldChild);
                    };
                    el.parentNode._isProtected = true;
                }
            } catch(e) {}
        };
        protectElement(this.menuToggle);
        protectElement(document.getElementById('menu-toggle'));
        protectElement(document.getElementById('menuToggle'));
        if (this.sidebar) {
            this.sidebar.querySelectorAll('.menu-link, .menu-item a, .submenu a').forEach(protectElement);
        }
        
        // Fechar sidebar
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('❌ Botao de fechar clicado');
                this.close();
            });
            console.log('✅ Evento de fechar vinculado');
        }
        
        // Fechar ao clicar no overlay
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                console.log('🔄 Overlay clicado - fechando menu');
                this.close();
            });
            console.log('✅ Evento do overlay vinculado');
        }
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                console.log('⌨️ ESC pressionado - fechando menu');
                this.close();
            }
        });
        
        // Redimensionamento da janela
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Links de navegação
        this.bindNavigationLinks();
        
        // Submenus expansíveis
        this.bindSubmenuEvents();
    }
    
    /**
     * Vincula eventos aos links de navegação
     */
    bindNavigationLinks() {
        // Seleciona todos os links de navegação, incluindo os dos submenus
        const navLinks = document.querySelectorAll('.nav-link, .submenu a, .menu-link[href]:not([href="#"])');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Só previne o comportamento padrão se for um link de submenu (acordeão)
                const isSubmenuToggle = link.closest('.menu-item.has-submenu') && link.classList.contains('menu-link');
                
                if (!isSubmenuToggle) {
                    // Remove classe ativa de todos os links
                    const allNavLinks = document.querySelectorAll('.nav-link, .submenu a');
                    allNavLinks.forEach(l => l.classList.remove('active'));
                    
                    // Adiciona classe ativa ao link clicado
                    link.classList.add('active');
                    
                    // Fecha o sidebar em mobile após um pequeno delay
                    if (this.isMobile) {
                        setTimeout(() => {
                            this.close();
                        }, 150);
                    }
                    
                    console.log('🔗 Navegando para:', link.href);
                }
            });
        });
        
        console.log(`✅ Eventos de navegação vinculados a ${navLinks.length} links`);
    }
    
    /**
     * Vincula eventos aos submenus expansíveis
     */
    bindSubmenuEvents() {
        // Seleciona todos os links de menu que têm submenus
        const submenuToggles = document.querySelectorAll('.menu-item.has-submenu > .menu-link, .menu-item.has-submenu > a, .menu-item.has-submenu .arrow-icon');

        const toggleSubmenu = (menuItem) => {
            const submenu = menuItem.querySelector('.submenu');
            if (!submenu) return;

            // Fecha outros submenus
            document.querySelectorAll('.menu-item.has-submenu').forEach(item => {
                if (item !== menuItem) {
                    item.classList.remove('expanded');
                    const sm = item.querySelector('.submenu');
                    if (sm) sm.style.maxHeight = '0px';
                    item.setAttribute('aria-expanded', 'false');
                }
            });

            // Alterna o atual
            const willExpand = !menuItem.classList.contains('expanded');
            menuItem.classList.toggle('expanded');
            menuItem.setAttribute('aria-expanded', willExpand ? 'true' : 'false');

            if (willExpand) {
                // Usa scrollHeight para garantir abertura
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                submenu.style.opacity = '1';
                submenu.style.visibility = 'visible';
            } else {
                submenu.style.maxHeight = '0px';
                submenu.style.opacity = '0';
                submenu.style.visibility = 'hidden';
            }

            console.log(`🔄 Submenu ${willExpand ? 'expandido' : 'contraído'}`);
        };

        let boundCount = 0;
        submenuToggles.forEach(el => {
            if (el.dataset.bound === 'true') return; // evita duplicar listeners
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const menuItem = el.closest('.menu-item.has-submenu');
                if (menuItem) toggleSubmenu(menuItem);
            });
            el.dataset.bound = 'true';
            boundCount++;
        });

        console.log(`✅ Eventos de submenu vinculados a ${boundCount} itens (total existentes: ${submenuToggles.length})`);
    }
    
    /**
     * Abre o sidebar
     */
    open() {
        if (!this.sidebar) return;
        
        this.sidebar.classList.add('open', 'menu-aberto');
        document.body.classList.add('sidebar-open');
        if (this.overlay) {
            this.overlay.classList.add('active');
        }
        this.isOpen = true;
        
        // Previne scroll do body apenas no mobile
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        }
        
        // Foco no primeiro link
        const firstLink = this.sidebar.querySelector('.menu-link, .nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 300);
        }
        
        console.log('Sidebar aberto');
    }
    
    /**
     * Fecha o sidebar
     */
    close() {
        if (!this.sidebar) return;
        
        this.sidebar.classList.remove('open', 'menu-aberto');
        document.body.classList.remove('sidebar-open');
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
        this.isOpen = false;
        
        // Restaura scroll do body
        document.body.style.overflow = '';
        
        console.log('Sidebar fechado');
    }
    
    /**
     * Alterna o estado do sidebar
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Manipula redimensionamento da janela
     */
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        // Se mudou de mobile para desktop, fecha o sidebar
        if (wasMobile && !this.isMobile && this.isOpen) {
            this.close();
        }
        
        // Se mudou de desktop para mobile, fecha o sidebar
        if (!wasMobile && this.isMobile && this.isOpen) {
            this.close();
        }
    }
    
    /**
     * Define o item ativo do menu baseado na URL atual
     */
    setActiveMenuItem() {
        try {
            const currentPath = (window.location.pathname || '').toLowerCase();
            // Nome do arquivo atual (ex.: 'inadimplentes.html')
            const currentFile = currentPath.split('/').pop() || 'index.html';

            // Limpa estado ativo anterior
            // Considera qualquer link dentro do sidebar que realmente navegue (possui href)
            const allLinks = document.querySelectorAll('#sidebar a[href]');
            allLinks.forEach(l => l.classList.remove('active'));

            // Procura link cujo href (nome do arquivo) corresponde ao atual
            let matchedLink = null;
            allLinks.forEach(link => {
                const hrefRaw = (link.getAttribute('href') || '').toLowerCase();
                // Normaliza removendo query/hash e pegando apenas o arquivo
                const hrefClean = hrefRaw.split('#')[0].split('?')[0];
                const hrefFile = hrefClean.split('/').pop();
                if (hrefFile && hrefFile === currentFile) {
                    matchedLink = link;
                }
            });

            if (matchedLink) {
                matchedLink.classList.add('active');
                const parentMenuItem = matchedLink.closest('.menu-item.has-submenu');
                const submenu = matchedLink.closest('.submenu');
                if (parentMenuItem) {
                    parentMenuItem.classList.add('expanded');
                    parentMenuItem.setAttribute('aria-expanded', 'true');
                }
                if (submenu) {
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    submenu.style.opacity = '1';
                    submenu.style.visibility = 'visible';
                }
            } else {
                // Fallback: se não encontrar, não força dashboard; mantém estado padrão
                console.warn('Sidebar: nenhum link corresponde à página atual:', currentFile);
            }
        } catch (e) {
            console.warn('Falha ao definir item ativo do menu:', e);
        }
    }

    /**
     * Atualiza os elementos existentes do sidebar com usuário e empresa
     */
    renderUserCompanyInfo() {
        try {
            const data = this.getUserCompanyData();
            // Garante bloco de empresa no header
            const headerRight = document.querySelector('.header .header-right');
            let headerEmpresaDisplay = document.getElementById('headerEmpresaDisplay');
            if (!headerEmpresaDisplay && headerRight) {
                const companyInfo = document.createElement('div');
                companyInfo.className = 'company-info';
                companyInfo.innerHTML = '<i class="fas fa-building"></i> <span id="headerEmpresaDisplay">Nenhuma empresa selec...</span>';
                // insere antes do bloco de usuário, quando existir
                const userMenuContainer = headerRight.querySelector('.user-menu-container');
                if (userMenuContainer) {
                    headerRight.insertBefore(companyInfo, userMenuContainer);
                } else {
                    headerRight.insertBefore(companyInfo, headerRight.firstChild);
                }
                headerEmpresaDisplay = companyInfo.querySelector('#headerEmpresaDisplay');
            }

            // Removido: indicador/toggle de tema

            // Garante bloco de e-mail do usuário no header com botão de visibilidade
            let headerUserEmailDisplay = document.getElementById('headerUserEmailDisplay');
            let toggleEmailVisibilityBtn = document.getElementById('toggleEmailVisibility');
            if (!headerUserEmailDisplay && headerRight) {
                const emailInfo = document.createElement('div');
                emailInfo.className = 'user-email-info';
                emailInfo.innerHTML = '<i class="fas fa-envelope"></i> <span id="headerUserEmailDisplay">Carregando e-mail...</span> <button id="toggleEmailVisibility" class="email-visibility-btn" title="Ocultar e-mail"><i class="fas fa-eye"></i></button>';
                const userMenuContainer = headerRight.querySelector('.user-menu-container');
                if (userMenuContainer) {
                    headerRight.insertBefore(emailInfo, userMenuContainer);
                } else {
                    headerRight.appendChild(emailInfo);
                }
                headerUserEmailDisplay = emailInfo.querySelector('#headerUserEmailDisplay');
                toggleEmailVisibilityBtn = emailInfo.querySelector('#toggleEmailVisibility');
            }
            // Atualiza o texto no bloco já existente: "Usuário: <span id='userDisplaySidebar'>..."
            const userEl = document.getElementById('userDisplaySidebar');
            if (userEl) {
                userEl.textContent = data.userEmail || 'Nenhum usuário';
            }

            // Atualiza o texto do bloco já existente de empresa, se disponível
            const companyEl = document.getElementById('empresaDisplaySidebar');
            if (companyEl) {
                companyEl.textContent = data.companyName || 'Nenhuma empresa ativa';
            }

            // Atualiza o header com nome truncado (25 chars)
            if (headerEmpresaDisplay) {
                const name = data.companyName || 'Nenhuma empresa ativa';
                const displayName = name && name.length > 25 ? (name.substring(0,25) + '...') : name;
                headerEmpresaDisplay.textContent = displayName;
                headerEmpresaDisplay.title = name;
            }

            // Atualiza exibição do e-mail do usuário com visibilidade
            if (headerUserEmailDisplay) {
                const email = data.userEmail || '';
                const hidden = localStorage.getItem('userEmailHidden') === 'true';
                headerUserEmailDisplay.textContent = email ? (hidden ? this.maskEmail(email) : email) : 'Usuário sem e-mail';
                headerUserEmailDisplay.title = email || '';
            }

            // Atualiza ícone e vincula toggle uma única vez
            if (toggleEmailVisibilityBtn) {
                const hidden = localStorage.getItem('userEmailHidden') === 'true';
                const icon = toggleEmailVisibilityBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye', !hidden);
                    icon.classList.toggle('fa-eye-slash', hidden);
                }
                toggleEmailVisibilityBtn.title = hidden ? 'Mostrar e-mail' : 'Ocultar e-mail';

                if (!toggleEmailVisibilityBtn.dataset.bound) {
                    toggleEmailVisibilityBtn.addEventListener('click', () => {
                        const current = localStorage.getItem('userEmailHidden') === 'true';
                        localStorage.setItem('userEmailHidden', (!current).toString());
                        // Re-render para refletir mudança
                        this.renderUserCompanyInfo();
                    });
                    toggleEmailVisibilityBtn.dataset.bound = 'true';
                }
            }
        } catch (err) {
            console.warn('Falha ao atualizar informações no sidebar:', err);
        }
    }

    getUserCompanyData() {
        // Recupera o email do usuário do localStorage
        const userEmail = localStorage.getItem('currentUserEmail') || localStorage.getItem('userEmail') || null;
        
        const userName = localStorage.getItem('userDisplayName') || 
                        localStorage.getItem('userEmail') || 
                        (userEmail ? userEmail.split('@')[0] : null) || 
                        'Usuário';
        
        let company = null;
        try {
            // Preferência: objeto completo salvo em 'activeCompany'
            const activeCompanyStr = localStorage.getItem('activeCompany');
            const configCompanyStr = localStorage.getItem('configCompany');
            if (activeCompanyStr) company = JSON.parse(activeCompanyStr);
            else if (configCompanyStr) company = JSON.parse(configCompanyStr);

            // Fallback: IDs e nome salvos separadamente
            if (!company || !company.id) {
                const activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                const storedName = localStorage.getItem('empresaSelecionadaNome');
                if (activeCompanyId) {
                    let resolvedName = storedName || null;
                    if (!resolvedName) {
                        const companies = JSON.parse(localStorage.getItem('userCompanies') || '[]');
                        const found = companies.find(c => c.id === activeCompanyId);
                        resolvedName = found ? (found.name || found.razaoSocial || null) : null;
                    }
                    company = {
                        id: activeCompanyId,
                        name: resolvedName || null
                    };
                }
            }
        } catch (e) {
            console.warn('Não foi possível ler dados da empresa ativa:', e);
        }
        
        let cnpjFmt = '';
        if (company && company.cnpj) {
            cnpjFmt = this.formatCnpj(company.cnpj);
        }
        
        return {
            userName,
            userEmail,
            companyName: company?.name || null,
            companyCnpj: cnpjFmt || null,
            city: company?.city || null,
            state: company?.state || null
        };
    }

    buildUserCompanyHtml(data) {
        // Não cria HTML adicional; usamos os elementos já existentes no index.html
        return '';
    }

    formatCnpj(value) {
        const digits = String(value || '').replace(/\D/g, '');
        if (digits.length !== 14) return value || '';
        return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    // Mascara e-mail substituindo letras e números por '*', preservando '@' e '.'
    maskEmail(email) {
        try {
            return (email || '').split('').map(ch => (ch === '@' || ch === '.' ? ch : '*')).join('');
        } catch (_) {
            return '********';
        }
    }

    // Removido: não injetamos estilos extras; usamos o layout existente
    
    /**
     * Adiciona animações aos elementos
     */
    addAnimations() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach((link, index) => {
            link.style.animationDelay = `${index * 0.05}s`;
            link.classList.add('slide-in');
        });
    }
    
    /**
     * Obtém o estado atual do sidebar
     */
    getState() {
        return {
            isOpen: this.isOpen,
            isMobile: this.isMobile
        };
    }
}

/**
 * Utilitários para navegação
 */
class NavigationUtils {
    /**
     * Navega para uma página com animação
     */
    static navigateTo(url, delay = 0) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    }
    
    /**
     * Adiciona efeito de loading aos links
     */
    static addLoadingEffect(link) {
        const originalText = link.textContent;
        link.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        
        setTimeout(() => {
            link.innerHTML = originalText;
        }, 1000);
    }
    
    /**
     * Destaca um item do menu temporariamente
     */
    static highlightMenuItem(selector, duration = 2000) {
        const item = document.querySelector(selector);
        if (item) {
            item.classList.add('highlight');
            setTimeout(() => {
                item.classList.remove('highlight');
            }, duration);
        }
    }
}

/**
 * EncodingFixer: Correções automáticas de codificação (UTF-8) e fontes
 * - Garante meta charset UTF-8
 * - Injeta fallback de fonte compatível com acentos
 * - Corrige textos quebrados comuns (Ã, Â, â, �)
 */
const EncodingFixer = {
    apply() {
        try {
            this.ensureUTF8Meta();
            this.ensureFontFallback();
            this.fixTextNodes();
            this.fixAttributeText();
            this.fixKnownCorruptions();
            this.fixSpecificUIElements();
            this.observeMutations();
            console.log('✅ EncodingFixer aplicado (UTF-8 e fontes)');
        } catch (e) {
            console.warn('EncodingFixer: falha ao aplicar correções:', e);
        }
    },
    ensureUTF8Meta() {
        let meta = document.querySelector('meta[charset]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('charset', 'UTF-8');
            document.head.prepend(meta);
        } else {
            const val = (meta.getAttribute('charset') || '').toUpperCase();
            if (val !== 'UTF-8') meta.setAttribute('charset', 'UTF-8');
        }
        if (!document.querySelector('meta[http-equiv="Content-Type"]')) {
            const m = document.createElement('meta');
            m.setAttribute('http-equiv', 'Content-Type');
            m.setAttribute('content', 'text/html; charset=UTF-8');
            document.head.appendChild(m);
        }
        const html = document.documentElement;
        if (!html.getAttribute('lang')) html.setAttribute('lang', 'pt-BR');
    },
    ensureFontFallback() {
        if (document.getElementById('encoding-font-fix-styles')) return;
        const style = document.createElement('style');
        style.id = 'encoding-font-fix-styles';
        style.textContent = `
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial, Helvetica, sans-serif; }
        `;
        document.head.appendChild(style);
    },
    needsFix(s) { return /[ÃÂâ�]/.test(s); },

    // Utilitário central para correções pontuais
    fixString(s) {
        if (!s) return s;
        let out = s;
        const replacements = [
            // termos frequentes
            ['gest�o','gestão'], ['Gest�o','Gestão'],
            ['p�ginas','páginas'], ['P�ginas','Páginas'],
            ['Informa��es','Informações'], ['Informa�ões','Informações'],
            ['Configura��es','Configurações'], ['Configura��o','Configuração'],
            ['Usu�rio','Usuário'], ['usu�rio','usuário'],
            ['documenta��o','documentação'], ['sess�o','sessão'],
            ['Renova��es','Renovações'], ['Renova��o','Renovação'],
            ['Renegocia��o','Renegociação'],
            ['movimenta��es','movimentações'], ['cobran�a','cobrança'],
            ['Fam�lias','Famílias'], ['Pesquisar fam�lias','Pesquisar famílias'],
            ['M�tricas Estrat�gicas','Métricas Estratégicas'],
            ['endere�o','endereço'], ['bot�o','botão'],
            ['N�','Nº'], ['N�mero','Número'],
            ['obrigat�rio','obrigatório'], ['Obrigat�rio','Obrigatório'],
            ['A��es','Ações'], ['Situa��o','Situação'],
            ['Esp�cie','Espécie'], ['Ra�a','Raça'], ['G�nero','Gênero'],
            ['Observa��es','Observações'], ['profiss�o','profissão'],
            ['benef�cio','benefício'],
            ['Hist�rico','Histórico'], ['hist�rico','histórico'],
            ['Usu�rio da altera��o','Usuário da alteração'],
            ['Data/hora da altera��o','Data/hora da alteração'],
            ['contra�do','contraído'], ['n�o','não'], ['v�lido','válido'],
            ['C�o','Cão'], ['F�mea','Fêmea'], ['P�ssaro','Pássaro'],
            ['In�cio','Início'], ['in�cio','início'],
            ['M�e','Mãe'], ['Irm�o/Irm�','Irmão/Irmã'],
            // Variações com '?' provenientes de perdas de bytes
            ['Renova??es pendentes','Renovações pendentes'],
            ['Renegocia??o','Renegociação'],
            ['movimenta??es','movimentações'],
            ['cobran?a','cobrança'],
            ['Fam?lias','Famílias'],
            ['Pesquisar fam?lias','Pesquisar famílias'],
            ['dispositivos m?veis','dispositivos móveis']
        ];
        replacements.forEach(([from, to]) => {
            if (out.includes(from)) out = out.split(from).join(to);
        });
        return out;
    },
    decodeLatin1ToUtf8(s) {
        try {
            const bytes = new Uint8Array([...s].map(c => c.charCodeAt(0)));
            const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            if (decoded && decoded !== s && !decoded.includes('�')) return decoded;
        } catch (e) {}
        try {
            const decoded2 = decodeURIComponent(escape(s));
            if (decoded2 && decoded2 !== s && !decoded2.includes('�')) return decoded2;
        } catch (e) {}
        const map = {
            'Ã¡':'á','Ã¢':'â','Ã£':'ã','Ãª':'ê','Ã©':'é','Ã¨':'è','Ã­':'í','Ã³':'ó','Ãº':'ú','Ã§':'ç',
            'ÃÁ':'Á','ÃÂ':'Â','ÃÃ':'Ã','ÃÊ':'Ê','ÃÉ':'É','ÃÍ':'Í','ÃÓ':'Ó','ÃÚ':'Ú','ÃÇ':'Ç',
            'Â':'',
            'â€“':'–','â€”':'—','â€œ':'“','â€\u009d':'”','â€˜':'‘','â€™':'’','â€¢':'•','â€¦':'…','â€‹':''
        };
        let out = s;
        let changed = false;
        for (const [k, v] of Object.entries(map)) {
            if (out.includes(k)) { out = out.split(k).join(v); changed = true; }
        }
        return changed ? out : s;
    },
    fixTextNodes() {
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const t = node.nodeValue || '';
            if (t && this.needsFix(t)) {
                const fixed = this.decodeLatin1ToUtf8(t);
                if (fixed !== t) node.nodeValue = fixed;
            }
        });
    },
    fixAttributeText() {
        const elements = document.querySelectorAll('[title], [placeholder], [aria-label]');
        elements.forEach(el => {
            ['title','placeholder','aria-label'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val && this.needsFix(val)) {
                    const fixed = this.decodeLatin1ToUtf8(val);
                    if (fixed !== val) el.setAttribute(attr, fixed);
                }
            });
        });
    },
    fixKnownCorruptions() {
        // Usa fixString para normalizações pontuais recorrentes
        // Corrige nós de texto
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const t = node.nodeValue || '';
            const fixed = this.fixString(t);
            if (fixed !== t) node.nodeValue = fixed;
        });
        // Corrige atributos comuns
        document.querySelectorAll('[title], [placeholder], [aria-label]').forEach(el => {
            ['title','placeholder','aria-label'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) {
                    const fixed = this.fixString(val);
                    if (fixed !== val) el.setAttribute(attr, fixed);
                }
            });
        });
    },
    observeMutations() {
        if (this._observerInitialized) return;
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.type === 'characterData') {
                    const t = m.target.nodeValue || '';
                    const fixed = this.decodeLatin1ToUtf8(this.fixString(t));
                    if (fixed !== t) m.target.nodeValue = fixed;
                }
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const t = node.nodeValue || '';
                            const fixed = this.decodeLatin1ToUtf8(this.fixString(t));
                            if (fixed !== t) node.nodeValue = fixed;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Corrige atributos comuns no novo elemento
                            ['title','placeholder','aria-label'].forEach(attr => {
                                const val = node.getAttribute && node.getAttribute(attr);
                                if (val) {
                                    const fixed = this.decodeLatin1ToUtf8(this.fixString(val));
                                    if (fixed !== val) node.setAttribute(attr, fixed);
                                }
                            });
                            // Corrige todos os nós de texto descendentes
                            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
                            const nodes = [];
                            while (walker.nextNode()) nodes.push(walker.currentNode);
                            nodes.forEach(n => {
                                const t = n.nodeValue || '';
                                const fixed = this.decodeLatin1ToUtf8(this.fixString(t));
                                if (fixed !== t) n.nodeValue = fixed;
                            });
                        }
                    });
                }
                if (m.type === 'attributes') {
                    const el = m.target;
                    const val = el.getAttribute(m.attributeName);
                    if (val) {
                        const fixed = this.decodeLatin1ToUtf8(this.fixString(val));
                        if (fixed !== val) el.setAttribute(m.attributeName, fixed);
                    }
                }
            });
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        this._observerInitialized = true;
        console.log('🔎 EncodingFixer: MutationObserver ativo para correções dinâmicas');
    },
    fixSpecificUIElements() {
        // Corrige ícones de seta em menus
        document.querySelectorAll('.arrow-icon').forEach(el => {
            if (el.textContent.trim() === '?' || el.textContent.trim() === '') {
                el.textContent = '▼';
            }
        });
        // Corrige logo-text se estiver corrompido
        const logoText = document.querySelector('.logo-text');
        if (logoText) {
            const t = logoText.textContent || '';
            const fixed = t.replace('gest�o','gestão');
            if (fixed !== t) logoText.textContent = fixed;
        }
    }
};

/**
 * Inicialização quando o DOM estiver carregado
 */
document.addEventListener('DOMContentLoaded', function() {
    // Corrige codificação e fontes antes de inicializar componentes
    try { EncodingFixer.apply(); } catch(e) {}
    // Aplica tema salvo globalmente
    try { document.documentElement.setAttribute('data-theme', 'light'); } catch(e) {}
    // Aguarda um pequeno delay para garantir que todos os elementos estejam carregados
    setTimeout(() => {
        // Remove globalmente o item "Comissionamento" do menu, se existir
        try {
            const comLinks = document.querySelectorAll('a[href="comissionamento.html"]');
            comLinks.forEach(link => {
                const item = link.closest('li, .menu-item') || link.parentElement;
                if (item && item.remove) item.remove();
                else link.style.display = 'none';
            });
            // Remove também o item "Ordens de serviço" (variações de caminho)
            const osLinks = document.querySelectorAll('a[href="ordens-servico.html"], a[href="pages/ordens-servico.html"]');
            osLinks.forEach(link => {
                const item = link.closest('li, .menu-item') || link.parentElement;
                if (item && item.remove) item.remove();
                else link.style.display = 'none';
            });
        } catch (e) {
            console.warn('Falha ao ocultar item Comissionamento:', e);
        }
        try {
            window.modernSidebar = new ModernSidebar();
        } catch (error) {
            console.error('Erro ao inicializar ModernSidebar:', error);
        }
    }, 100);
    
    // Adiciona estilos CSS para animações se não existirem
    if (!document.querySelector('#sidebar-animations')) {
        const style = document.createElement('style');
        style.id = 'sidebar-animations';
        style.textContent = `
            .nav-link.active {
                background: rgba(102, 126, 234, 0.1) !important;
                color: #667eea !important;
                border-right: 3px solid #667eea;
            }
            
            .nav-link.highlight {
                background: rgba(102, 126, 234, 0.2) !important;
                transform: translateX(5px);
            }
            
            .slide-in {
                animation: slideInLeft 0.3s ease forwards;
            }
            
            @keyframes slideInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .modern-sidebar {
                scrollbar-width: thin;
                scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
            }
            
            .modern-sidebar::-webkit-scrollbar {
                width: 6px;
            }
            
            .modern-sidebar::-webkit-scrollbar-track {
                background: transparent;
            }
            
            .modern-sidebar::-webkit-scrollbar-thumb {
                background: rgba(102, 126, 234, 0.3);
                border-radius: 3px;
            }
            
            .modern-sidebar::-webkit-scrollbar-thumb:hover {
                background: rgba(102, 126, 234, 0.5);
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('Sistema de navegação moderno carregado com sucesso!');
});

// Fallback para inicialização imediata se o DOM já estiver carregado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Fallback para correções caso DOM já esteja pronto
    try { EncodingFixer.apply(); } catch(e) {}
    setTimeout(() => {
        if (!window.modernSidebar) {
            try {
                window.modernSidebar = new ModernSidebar();
            } catch (error) {
                console.error('Erro ao inicializar ModernSidebar (fallback):', error);
            }
        }
    }, 100);
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModernSidebar, NavigationUtils };
}
