/**
 * Menu de Usuário - Sistema Qualify
 * Controla todas as funcionalidades do dropdown menu do usuário
 */

(function () {
    'use strict';

    function UserMenu() {
        

        try {
            this.menuContainer = document.querySelector('.user-menu-container');
            this.menuTrigger = document.getElementById('userMenuTrigger');
            this.dropdown = document.querySelector('.user-dropdown');
            this.overlay = null;
            this.logoutModal = null;

            console.log('Elementos encontrados:', {
                menuContainer: this.menuContainer,
                menuTrigger: this.menuTrigger,
                dropdown: this.dropdown
            });

            this.isOpen = false;
            this.isNavigating = false;
            this.currentFocusIndex = -1;
            this.focusableElements = [];

            if (!this.validateElements()) {
                console.warn('UserMenu: Elementos necessários não encontrados, inicialização parcial');
                return;
            }

            // Garante que o conteúdo do dropdown tenha os itens padronizados
            this.buildStandardDropdown();

            console.log('Criando overlay...');
            this.createOverlay();
            console.log('Criando modal de logout...');
            this.createLogoutModal();
            console.log('Vinculando eventos...');
            this.bindEvents();
            console.log('Configurando acessibilidade...');
            this.setupAccessibility();

            
        } catch (error) {
            console.error('Erro no construtor UserMenu:', error);
            throw error;
        }
    }

    /**
     * Valida se os elementos necessários estão presentes
     */
    UserMenu.prototype.validateElements = function () {
        console.log('Validando elementos do menu...');

        this.menuTrigger = document.getElementById('userMenuTrigger');
        console.log('Menu trigger encontrado:', this.menuTrigger);

        if (!this.menuTrigger) {
            console.warn('Trigger do menu não encontrado, tentando alternativas...');

            const alternatives = [
                '.user-menu-trigger',
                '[data-user-menu]',
                '.user-avatar',
                '.header-user'
            ];

            for (const selector of alternatives) {
                this.menuTrigger = document.querySelector(selector);
                if (this.menuTrigger) {
                    console.log('Trigger alternativo encontrado:', selector);
                    break;
                }
            }
        }

        this.dropdown = document.querySelector('.user-dropdown');
        if (!this.dropdown) {
            console.warn('Dropdown não encontrado, tentando alternativas...');
            this.dropdown = document.querySelector('[data-user-dropdown]') ||
                document.querySelector('.dropdown-menu');
        }

        const isValid = this.menuTrigger && this.dropdown;
        console.log('Validação concluída:', {
            trigger: !!this.menuTrigger,
            dropdown: !!this.dropdown,
            valid: isValid
        });

        return isValid;
    };

    /**
     * Monta itens padronizados do menu de usuário
     * Padroniza: Perfil, Trocar empresa, Configurações, Minha conta, Área do associado, Catálogo, Sair
     */
    UserMenu.prototype.buildStandardDropdown = function () {
        try {
            if (!this.dropdown) return;
            const content = this.dropdown.querySelector('.dropdown-content') || this.dropdown;
            if (!content) return;

            // HTML padronizado conforme index.html
            const html = `
                <a href="perfil.html" class="dropdown-item" role="menuitem" data-action="profile">
                    <i class="fas fa-user"></i>
                    <span>Perfil</span>
                </a>
                <a href="trocar-empresa.html" class="dropdown-item" role="menuitem" data-action="switch-company">
                    <i class="fas fa-building"></i>
                    <span>Trocar de Empresa</span>
                </a>
                <a href="minha-conta.html" class="dropdown-item" role="menuitem" data-action="account">
                    <i class="fas fa-wallet"></i>
                    <span>Minha Conta</span>
                </a>
                <a href="configuracoes-bancarias.html" class="dropdown-item" role="menuitem" data-action="banking">
                    <i class="fas fa-university"></i>
                    <span>Integrações Bancárias</span>
                </a>
                <a href="area-associado-login.html" class="dropdown-item" role="menuitem" data-action="associate-area" target="_blank">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Área do Associado</span>
                </a>
                <a href="catalogo-planos.html" class="dropdown-item" role="menuitem" data-action="catalog">
                    <i class="fas fa-book"></i>
                    <span>Catálogo de Planos</span>
                </a>
                <div class="dropdown-separator"></div>
                <a href="#" class="dropdown-item logout-item" role="menuitem" data-action="logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </a>
            `;

            // Reescreve se houver item de configurações antigo ou se não estiver padronizado
            const hasOldSettings = !!content.querySelector('[data-action="settings"]');
            const alreadyStandard = content.innerHTML &&
                content.innerHTML.includes('data-action="switch-company"') &&
                content.innerHTML.includes('fa-external-link-alt') &&
                content.innerHTML.includes('fa-book') &&
                !content.innerHTML.includes('data-action="settings"');

            if (!alreadyStandard || hasOldSettings) {
                content.innerHTML = html;
            }

            // Segurança: remove qualquer item de "Configurações" remanescente em marcação estática
            content.querySelectorAll('[data-action="settings"]').forEach(el => el.remove());
        } catch (err) {
            console.warn('Falha ao padronizar dropdown do usuário:', err);
        }
    };

    /**
     * Vincula eventos aos elementos
     */
    UserMenu.prototype.bindEvents = function () {
        console.log('Vinculando eventos...');

        // Verificar se os elementos necessários existem
        if (!this.menuTrigger) {
            console.warn('MenuTrigger não encontrado, não é possível vincular eventos');
            return;
        }

        // Evento de clique no trigger
        this.menuTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clique no trigger do menu');
            this.toggle();
        });

        // Evento de teclado no trigger
        this.menuTrigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
                this.focusFirstItem();
            }
        });

        // Eventos nos itens do menu (apenas se dropdown existir)
        if (this.dropdown) {
            const menuItems = this.dropdown.querySelectorAll('a, button, [tabindex]');
            menuItems.forEach((item, index) => {
                item.addEventListener('click', (e) => {
                    console.log('Clique no item do menu:', item);
                    this.handleItemClick(item);
                });

                item.addEventListener('keydown', (e) => {
                    this.handleItemKeydown(e, index);
                });
            });
        }

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.menuContainer || !this.menuContainer.contains(e.target)) {
                this.close();
            }
        });

        // Eventos de teclado globais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                if (this.menuTrigger) {
                    this.menuTrigger.focus();
                }
            }
        });
    };

    /**
     * Configura acessibilidade
     */
    UserMenu.prototype.setupAccessibility = function () {
        if (this.menuTrigger) {
            this.menuTrigger.setAttribute('aria-haspopup', 'true');
            this.menuTrigger.setAttribute('aria-expanded', 'false');
        }

        if (this.dropdown) {
            this.dropdown.setAttribute('role', 'menu');
            this.dropdown.setAttribute('aria-hidden', 'true');

            const items = this.dropdown.querySelectorAll('a, button');
            items.forEach(item => {
                item.setAttribute('role', 'menuitem');
                item.setAttribute('tabindex', '-1');
            });
        }

        this.updateFocusableElements();
    };

    /**
     * Atualiza elementos focáveis
     */
    UserMenu.prototype.updateFocusableElements = function () {
        if (this.dropdown) {
            this.focusableElements = Array.from(
                this.dropdown.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')
            );
        } else {
            this.focusableElements = [];
        }
    };

    /**
     * Cria overlay para fechar menu
     */
    UserMenu.prototype.createOverlay = function () {
        this.overlay = document.createElement('div');
        this.overlay.className = 'user-menu-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 999;
            display: none;
        `;

        this.overlay.addEventListener('click', () => {
            this.close();
        });

        document.body.appendChild(this.overlay);
    };

    /**
     * Cria modal de logout
     */
    UserMenu.prototype.createLogoutModal = function () {
        this.logoutModal = document.createElement('div');
        this.logoutModal.className = 'logout-modal-overlay';
        this.logoutModal.innerHTML = `
            <div class="logout-modal">
                <h3>Confirmar Logout</h3>
                <p>Tem certeza de que deseja sair do sistema?</p>
                <div class="modal-buttons">
                    <button id="cancelLogout" class="btn-secondary">Cancelar</button>
                    <button id="confirmLogout" class="btn-primary">Sair</button>
                </div>
            </div>
        `;

        // Adicionar ao DOM primeiro
        document.body.appendChild(this.logoutModal);

        // Depois configurar os eventos
        const cancelBtn = document.getElementById('cancelLogout');
        const confirmBtn = document.getElementById('confirmLogout');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideLogoutModal();
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.performLogout();
            });
        }

        // Fechar modal com ESC ou clique fora
        this.logoutModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLogoutModal();
            }
        });

        this.logoutModal.addEventListener('click', (e) => {
            if (e.target === this.logoutModal) {
                this.hideLogoutModal();
            }
        });
    };

    /**
     * Abre o menu
     */
    UserMenu.prototype.open = function () {
        if (this.isOpen) return;

        console.log('Abrindo menu do usuário');
        this.isOpen = true;

        if (this.dropdown) {
            this.dropdown.style.display = 'block';
            this.dropdown.setAttribute('aria-hidden', 'false');
        }

        if (this.overlay) {
            this.overlay.style.display = 'block';
        }

        if (this.menuTrigger) {
            this.menuTrigger.setAttribute('aria-expanded', 'true');
            this.menuTrigger.classList.add('active');
        }

        // Animação de entrada
        setTimeout(() => {
            if (this.dropdown) {
                this.dropdown.classList.add('show');
            }
        }, 10);

        this.updateFocusableElements();
    };

    /**
     * Fecha o menu
     */
    UserMenu.prototype.close = function () {
        if (!this.isOpen) return;

        console.log('Fechando menu do usuário');
        this.isOpen = false;

        if (this.dropdown) {
            this.dropdown.classList.remove('show');
            this.dropdown.setAttribute('aria-hidden', 'true');
        }

        if (this.overlay) {
            this.overlay.style.display = 'none';
        }

        if (this.menuTrigger) {
            this.menuTrigger.setAttribute('aria-expanded', 'false');
            this.menuTrigger.classList.remove('active');
        }

        // Esconder após animação
        setTimeout(() => {
            if (this.dropdown && !this.isOpen) {
                this.dropdown.style.display = 'none';
            }
        }, 300);

        this.currentFocusIndex = -1;
    };

    /**
     * Alterna estado do menu
     */
    UserMenu.prototype.toggle = function () {
        console.log('Toggle menu - Estado atual:', this.isOpen);
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    };

    /**
     * Foca no primeiro item
     */
    UserMenu.prototype.focusFirstItem = function () {
        if (this.focusableElements.length > 0) {
            this.currentFocusIndex = 0;
            this.focusCurrentItem();
        }
    };

    /**
     * Foca no item atual
     */
    UserMenu.prototype.focusCurrentItem = function () {
        if (this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableElements.length) {
            const currentItem = this.focusableElements[this.currentFocusIndex];

            // Remove foco anterior
            this.focusableElements.forEach(item => {
                item.setAttribute('tabindex', '-1');
                item.classList.remove('focused');
            });

            // Adiciona foco atual
            currentItem.setAttribute('tabindex', '0');
            currentItem.classList.add('focused');
            currentItem.focus();
        }
    };

    /**
     * Foca no próximo item
     */
    UserMenu.prototype.focusNextItem = function () {
        if (this.focusableElements.length === 0) return;

        this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
        this.focusCurrentItem();
    };

    /**
     * Foca no item anterior
     */
    UserMenu.prototype.focusPreviousItem = function () {
        if (this.focusableElements.length === 0) return;

        this.currentFocusIndex = this.currentFocusIndex <= 0
            ? this.focusableElements.length - 1
            : this.currentFocusIndex - 1;
        this.focusCurrentItem();
    };

    /**
     * Manipula eventos de teclado nos itens
     */
    UserMenu.prototype.handleItemKeydown = function (e, index) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.focusNextItem();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.focusPreviousItem();
                break;
            case 'Home':
                e.preventDefault();
                this.currentFocusIndex = 0;
                this.focusCurrentItem();
                break;
            case 'End':
                e.preventDefault();
                this.currentFocusIndex = this.focusableElements.length - 1;
                this.focusCurrentItem();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.handleItemClick(this.focusableElements[this.currentFocusIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                if (this.menuTrigger) {
                    this.menuTrigger.focus();
                }
                break;
        }
    };

    /**
     * Manipula clique nos itens do menu
     */
    UserMenu.prototype.handleItemClick = function (item) {
        if (this.isNavigating) return;

        const action = item.getAttribute('data-action');
        const href = item.getAttribute('href');

        console.log('Ação do item:', action, 'href:', href);

        if (action) {
            this.isNavigating = true;

            switch (action) {
                case 'profile':
                    this.navigateToProfile();
                    break;
                case 'account':
                    this.navigateToAccount();
                    break;
                case 'switch-company':
                    this.switchCompany();
                    break;
                case 'settings':
                    this.navigateToSettings();
                    break;
                case 'associate-area':
                    this.navigateToAssociateArea();
                    break;
                case 'catalog':
                    this.navigateToCatalog();
                    break;
                case 'banking':
                    this.navigateToBanking();
                    break;
                case 'logout':
                    // Efetuar logout imediatamente sem modal
                    try {
                        if (typeof window.handleLogout === 'function') {
                            window.handleLogout();
                        } else {
                            // Fallback absoluto
                            (async function () {
                                try { if (window.supabase) { await window.supabase.auth.signOut(); } } catch (e) { }
                                try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
                                const base = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                                window.location.href = base;
                            })();
                        }
                    } catch (err) {
                        console.error('Erro ao realizar logout:', err);
                        const base = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                        window.location.href = base;
                    }
                    break;
                default:
                    console.warn('Ação não reconhecida:', action);
                    this.isNavigating = false;
            }

            // Reset flag após navegação
            setTimeout(() => {
                this.isNavigating = false;
            }, 1000);
        } else if (href && href !== '#') {
            window.location.href = href;
        }

        this.close();
    };

    /**
     * Mostra modal de logout
     */
    UserMenu.prototype.showLogoutModal = function () {
        console.log('Mostrando modal de logout');
        if (this.logoutModal) {
            this.logoutModal.style.display = 'flex';
            document.getElementById('confirmLogout').focus();
        }
    };

    /**
     * Esconde modal de logout
     */
    UserMenu.prototype.hideLogoutModal = function () {
        console.log('Escondendo modal de logout');
        if (this.logoutModal) {
            this.logoutModal.style.display = 'none';
        }
    };

    /**
     * Executa logout
     */
    UserMenu.prototype.performLogout = function () {
        console.log('Executando logout...');
        this.hideLogoutModal();

        try {
            // Chama função global de logout se disponível
            if (typeof window.handleLogout === 'function') {
                window.handleLogout();
            } else {
                // Fallback para logout básico
                this.clearUserSession();
                this.completeLogout();
            }
        } catch (error) {
            console.error('Erro durante logout:', error);
            // Força logout mesmo com erro
            this.clearUserSession();
            window.location.href = 'login.html';
        }
    };

    /**
     * Limpa dados de sessão do usuário
     */
    UserMenu.prototype.clearUserSession = function () {
        console.log('Limpando sessão do usuário');

        // Limpar localStorage
        const keysToRemove = [
            'empresaSelecionadaId',
            'user',
            'userToken',
            'activeCompanyId',
            'userCompanies',
            'selectedCompany',
            'currentUser',
            'authToken',
            'firebaseUser'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Limpar sessionStorage
        sessionStorage.clear();

        // Limpar cookies
        document.cookie.split(";").forEach(function (c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    };

    /**
     * Função global de logout seguro
     */
    async function handleLogout() {
        console.log('*** INICIANDO LOGOUT COMPLETO E SEGURO ***');
        try {
            // Supabase signOut
            if (window.supabase && window.supabase.auth) {
                await window.supabase.auth.signOut();
                console.log('Supabase signOut() SUCESSO.');
            }
            // Limpeza total de storages e caches
            try { localStorage.clear(); } catch (e) { }
            try { sessionStorage.clear(); } catch (e) { }
            // Limpar caches (Service Worker)
            try {
                if (window.caches && caches.keys) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                }
            } catch (e) { console.warn('Falha ao limpar caches', e); }
            console.log('*** Logout completo. Redirecionando... ***');
            const base = window.location.pathname.includes('/pages/') ? '../login.html' : '/login.html';
            window.location.href = base;
        } catch (error) {
            console.error('*** ERRO CRÍTICO DURANTE LOGOUT:', error);
            const base = window.location.pathname.includes('/pages/') ? '../login.html' : '/login.html';
            window.location.href = base;
        }
    }

    // Expor globalmente
    window.handleLogout = handleLogout;
    UserMenu.prototype.performLogout = handleLogout;

    /**
     * Completa o processo de logout
     */
    UserMenu.prototype.completeLogout = function () {
        this.hideLogoutModal();
        this.showLogoutSuccess();

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    };

    /**
     * Mostra mensagem de sucesso do logout
     */
    UserMenu.prototype.showLogoutSuccess = function () {
        const toast = document.createElement('div');
        toast.className = 'logout-success-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-check-circle"></i>
                <span>Logout realizado com sucesso!</span>
            </div>
        `;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    };

    // Métodos de navegação
    UserMenu.prototype.navigateToProfile = function () {
        const path = window.location.pathname.includes('/pages/') ? 'perfil.html' : 'pages/perfil.html';
        window.location.href = path;
    };

    UserMenu.prototype.navigateToAccount = function () {
        const path = window.location.pathname.includes('/pages/') ? 'minha-conta.html' : 'pages/minha-conta.html';
        window.location.href = path;
    };

    UserMenu.prototype.switchCompany = function () {
        const path = window.location.pathname.includes('/pages/') ? 'trocar-empresa.html' : 'pages/trocar-empresa.html';
        window.location.href = path;
    };

    UserMenu.prototype.navigateToSettings = function () {
        if (!window.ConfiguracoesModal) {
            this.loadConfiguracoesModal();
        } else {
            const modal = new window.ConfiguracoesModal();
            modal.show();
        }
    };

    UserMenu.prototype.loadConfiguracoesModal = function () {
        const basePath = window.location.pathname.includes('/pages/') ? '../assets/' : 'assets/';

        if (!document.querySelector('link[href*="configuracoes-modal.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = basePath + 'css/configuracoes-modal.css';
            document.head.appendChild(cssLink);
        }

        const script = document.createElement('script');
        script.src = basePath + 'js/configuracoes-modal.js';
        script.onload = () => {
            if (window.ConfiguracoesModal) {
                const modal = new window.ConfiguracoesModal();
                modal.show();
            }
        };
        script.onerror = () => {
            console.error('Erro ao carregar script de configurações');
            alert('Erro ao carregar configurações. Tente novamente.');
        };
        document.head.appendChild(script);
    };

    UserMenu.prototype.navigateToAssociateArea = function () {
        const path = window.location.pathname.includes('/pages/') ? 'area-associado-login.html' : 'pages/area-associado-login.html';
        window.location.href = path;
    };

    UserMenu.prototype.navigateToCatalog = function () {
        const path = window.location.pathname.includes('/pages/') ? 'catalogo-planos.html' : 'pages/catalogo-planos.html';
        window.location.href = path;
    };

    UserMenu.prototype.navigateToBanking = function () {
        const path = window.location.pathname.includes('/pages/') ? 'configuracoes-bancarias.html' : 'pages/configuracoes-bancarias.html';
        window.location.href = path;
    };

    // Inicialização
    document.addEventListener('DOMContentLoaded', function () {
        

        setTimeout(() => {
            
            try {
                window.userMenu = new UserMenu();
                
                // Adicionar chamada para atualizar o display após a inicialização
                window.userMenu.updateDisplay();
                // Listener universal para qualquer botão/link de logout presente na página
                document.addEventListener('click', function (e) {
                    const target = e.target.closest('#logoutBtn, .logout-item, #logout-button, #logout-btn, #logout-btn-header');
                    if (!target) return;
                    e.preventDefault();
                    try {
                        if (typeof window.handleLogout === 'function') {
                            window.handleLogout();
                        } else if (typeof window.fazerLogout === 'function') {
                            window.fazerLogout();
                        } else {
                            (async function () {
                                try { if (window.supabase) { await window.supabase.auth.signOut(); } } catch (e) { }
                                try { localStorage.clear(); sessionStorage.clear(); } catch (e) { }
                                const base = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                                window.location.href = base;
                            })();
                        }
                    } catch (err) {
                        const base = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                        window.location.href = base;
                    }
                }, { once: true });
            } catch (error) {
                console.error('Erro ao inicializar UserMenu:', error);
            }
        }, 100);
    });

    // Fallback para inicialização imediata
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            if (!window.userMenu) {
                try {
                    window.userMenu = new UserMenu();
                } catch (error) {
                    console.error('Erro ao inicializar UserMenu (fallback):', error);
                }
            }
        }, 50);
    }

    // Adicionar método para atualizar apenas elementos do header (empresa)
    UserMenu.prototype.updateDisplay = function () {
        const empresaNome = localStorage.getItem('empresaSelecionadaNome') || 'Nenhuma empresa ativa';

        // Header (Top Bar)
        const headerEmpresaDisplay = document.getElementById('headerEmpresaDisplay');
        if (headerEmpresaDisplay) {
            headerEmpresaDisplay.textContent = empresaNome;
        }
    };

    // Inicializar o display quando o Supabase estiver pronto
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user && window.userMenu) {
                window.userMenu.updateDisplay();
            }
        });
    }

    // Adicionar listener para o evento de seleção de empresa
    window.addEventListener('storage', (event) => {
        if (event.key === 'empresaSelecionadaNome' && window.userMenu) {
            window.userMenu.updateDisplay();
        }
    });

    // Exporta para uso global
    window.UserMenu = UserMenu;

})();
