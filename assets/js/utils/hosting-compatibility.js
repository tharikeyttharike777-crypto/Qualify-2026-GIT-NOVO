/**
 * Script de Compatibilidade para Hospedagem
 * Garante que todos os recursos sejam carregados corretamente
 */

(function() {
    'use strict';

    // Configurações de compatibilidade
    const COMPATIBILITY_CONFIG = {
        maxRetries: 3,
        retryDelay: 1000,
        checkInterval: 100,
        maxCheckTime: 5000
    };

    // Lista de recursos críticos (usando caminhos absolutos)
    const CRITICAL_RESOURCES = [
        '/assets/css/styles.css',
        '/assets/css/sidebar-menu.css',
        '/assets/css/user-menu.css',
        '/assets/css/notifications.css',
        '/assets/js/sidebar-menu.js',
        '/assets/js/user-menu.js',
        '/assets/js/header-search.js',
        '/assets/js/notifications.js'
    ];

    /**
     * Verifica se um recurso CSS foi carregado
     */
    function isCSSLoaded(href) {
        const links = document.getElementsByTagName('link');
        for (let i = 0; i < links.length; i++) {
            if (links[i].href && links[i].href.includes(href)) {
                return links[i].sheet !== null;
            }
        }
        return false;
    }

    /**
     * Verifica se um script JS foi carregado
     */
    function isJSLoaded(src) {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.includes(src)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Carrega um recurso CSS dinamicamente
     */
    function loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            link.onload = () => resolve(href);
            link.onerror = () => reject(new Error(`Falha ao carregar CSS: ${href}`));
            
            document.head.appendChild(link);
        });
    }

    /**
     * Carrega um script JS dinamicamente
     */
    function loadJS(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Mantém ordem de execução
            
            script.onload = () => resolve(src);
            script.onerror = () => reject(new Error(`Falha ao carregar JS: ${src}`));
            
            document.head.appendChild(script);
        });
    }

    /**
     * Verifica e recarrega recursos em falta
     */
    async function checkAndReloadResources() {
        const missingResources = [];

        // Verifica recursos CSS
        const cssResources = CRITICAL_RESOURCES.filter(r => r.endsWith('.css'));
        for (const css of cssResources) {
            if (!isCSSLoaded(css)) {
                missingResources.push({ type: 'css', path: css });
            }
        }

        // Verifica recursos JS
        const jsResources = CRITICAL_RESOURCES.filter(r => r.endsWith('.js'));
        for (const js of jsResources) {
            if (!isJSLoaded(js)) {
                missingResources.push({ type: 'js', path: js });
            }
        }

        // Recarrega recursos em falta
        if (missingResources.length > 0) {
            console.warn('Recursos em falta detectados:', missingResources);
            
            for (const resource of missingResources) {
                try {
                    if (resource.type === 'css') {
                        await loadCSS(resource.path);
                    } else if (resource.type === 'js') {
                        await loadJS(resource.path);
                    }
                    console.log(`Recurso recarregado: ${resource.path}`);
                } catch (error) {
                    console.error(`Erro ao recarregar recurso: ${resource.path}`, error);
                }
            }
        }
    }

    /**
     * Verifica se todos os componentes JavaScript estão funcionando
     */
    function checkJSComponents() {
        const components = [
            'ModernSidebar',
            'UserMenu',
            'NotificationSystem'
        ];

        const missingComponents = components.filter(comp => !window[comp]);
        
        if (missingComponents.length > 0) {
            console.warn('Componentes JS em falta:', missingComponents);
            return false;
        }
        
        return true;
    }

    /**
     * Força reinicialização dos componentes
     */
    function reinitializeComponents() {
        // Reinicializa sidebar se disponível
        if (window.ModernSidebar && typeof window.initSidebar === 'function') {
            try {
                window.initSidebar();
            } catch (error) {
                console.error('Erro ao reinicializar sidebar:', error);
            }
        }

        // Reinicializa sistema de notificações
        if (window.NotificationSystem && !window.notificationSystem) {
            try {
                window.notificationSystem = new window.NotificationSystem();
            } catch (error) {
                console.error('Erro ao reinicializar notificações:', error);
            }
        }

        // Reinicializa menu de usuário
        if (window.UserMenu && !window.userMenu) {
            try {
                window.userMenu = new window.UserMenu();
            } catch (error) {
                console.error('Erro ao reinicializar menu de usuário:', error);
            }
        }
    }

    /**
     * Monitora e corrige problemas de carregamento
     */
    function startCompatibilityMonitor() {
        let checkCount = 0;
        const maxChecks = COMPATIBILITY_CONFIG.maxCheckTime / COMPATIBILITY_CONFIG.checkInterval;

        const monitor = setInterval(async () => {
            checkCount++;

            // Verifica recursos
            await checkAndReloadResources();

            // Verifica componentes JS
            if (!checkJSComponents()) {
                reinitializeComponents();
            }

            // Para o monitor após tempo limite ou quando tudo estiver OK
            if (checkCount >= maxChecks || checkJSComponents()) {
                clearInterval(monitor);
                console.log('Monitor de compatibilidade finalizado');
            }
        }, COMPATIBILITY_CONFIG.checkInterval);
    }

    /**
     * Inicialização principal
     */
    function init() {
        console.log('🔧 Iniciando verificação de compatibilidade para hospedagem...');

        // Aguarda DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(startCompatibilityMonitor, 500);
            });
        } else {
            setTimeout(startCompatibilityMonitor, 500);
        }
    }

    // Inicia imediatamente
    init();

    // Exporta para uso global
    window.HostingCompatibility = {
        checkAndReloadResources,
        reinitializeComponents,
        startCompatibilityMonitor
    };

})();