/**
 * NAVIGATION FIX - Correção de Navegação e Prevenção de Loops
 * Previne redirecionamentos em loop e melhora a experiência de navegação
 */

class NavigationFix {
    constructor() {
        this.isRedirecting = false;
        this.lastRedirect = 0;
        this.redirectCooldown = 2000; // 2 segundos entre redirecionamentos
        this.init();
    }

    init() {
        console.log('NavigationFix: Inicializando correções de navegação...');

        // Prevenir múltiplos redirecionamentos
        this.preventRedirectLoops();

        // Melhorar navegação do histórico
        this.improveHistoryNavigation();

        // Corrigir problemas de back/forward
        this.fixBackForwardNavigation();

        console.log('NavigationFix: Correções aplicadas com sucesso');
    }

    /**
     * Previne loops de redirecionamento
     */
    preventRedirectLoops() {
        // Simplesmente desabilitar esta funcionalidade para evitar erros
        console.log('NavigationFix: Interceptação de navegação desabilitada para compatibilidade');

        // Manter apenas o monitoramento básico
        this.setupBasicMonitoring();
    }

    /**
     * Configurar monitoramento básico sem interceptar location
     */
    setupBasicMonitoring() {
        // Monitorar mudanças de hash
        window.addEventListener('hashchange', () => {
            console.log('NavigationFix: Hash alterado para:', window.location.hash);
        });

        // Monitorar popstate
        window.addEventListener('popstate', (event) => {
            console.log('NavigationFix: Navegação via histórico detectada');
        });
    }

    /**
     * Verifica se pode redirecionar
     */
    canRedirect(url) {
        const now = Date.now();

        // Se já está redirecionando, bloquear
        if (this.isRedirecting) {
            return false;
        }

        // Se o último redirecionamento foi muito recente, bloquear
        if (now - this.lastRedirect < this.redirectCooldown) {
            return false;
        }

        // Se é o mesmo URL atual, bloquear
        if (url === window.location.href || url === window.location.pathname) {
            return false;
        }

        return true;
    }

    /**
     * Marca que um redirecionamento está acontecendo
     */
    markRedirect() {
        this.isRedirecting = true;
        this.lastRedirect = Date.now();

        // Resetar flag após um tempo
        setTimeout(() => {
            this.isRedirecting = false;
        }, 1000);
    }

    /**
     * Melhora a navegação do histórico
     */
    improveHistoryNavigation() {
        // Adicionar estado ao histórico quando necessário
        if (!window.history.state) {
            window.history.replaceState(
                { page: window.location.pathname, timestamp: Date.now() },
                document.title,
                window.location.href
            );
        }

        // Listener para mudanças de estado
        window.addEventListener('popstate', (event) => {
            console.log('NavigationFix: Navegação do histórico detectada');

            // Prevenir loops durante navegação do histórico
            if (this.isRedirecting) {
                event.preventDefault();
                return false;
            }

            // Verificar se o usuário ainda está autenticado
            this.checkAuthOnNavigation();
        });
    }

    /**
     * Corrige problemas de navegação back/forward
     */
    fixBackForwardNavigation() {
        // Detectar navegação via botões do navegador
        let isNavigatingBack = false;

        window.addEventListener('beforeunload', () => {
            // Marcar que uma navegação está acontecendo
            sessionStorage.setItem('navigating', 'true');
        });

        window.addEventListener('pageshow', (event) => {
            // Verificar se voltou via cache (back/forward)
            if (event.persisted || sessionStorage.getItem('navigating')) {
                console.log('NavigationFix: Página carregada via cache/navegação');
                sessionStorage.removeItem('navigating');

                // Verificar autenticação novamente
                setTimeout(() => {
                    this.checkAuthOnNavigation();
                }, 100);
            }
        });
    }

    /**
     * Verifica autenticação durante navegação
     */
    /**
     * Verifica autenticação durante navegação
     */
    checkAuthOnNavigation() {
        // Se Firebase não está pronto, NÃO redirecionar — evitar falso-logout
        const firebaseReady = (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0 && firebase.auth);
        if (!firebaseReady) {
            return;
        }

        // Verificação robusta: aguardar resolução do estado de autenticação
        // em vez de confiar apenas no currentUser síncrono que pode ser null durante a inicialização
        const auth = firebase.auth();

        // Se já temos usuário síncrono, está tudo bem
        if (auth.currentUser) {
            return;
        }

        // Se não temos usuário, verificamos assincronamente antes de redirecionar
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe(); // Limpar listener imediatamente

            const inGrace = sessionStorage.getItem('authGraceActive') === '1';

            if (!user) {
                console.log('NavigationFix: Usuário não autenticado confirmado via onAuthStateChanged');
                if (inGrace) return;

                if (!window.location.pathname.includes('login.html')) {
                    if (this.canRedirect('/login.html')) {
                        console.log('NavigationFix: Redirecionando para login');
                        this.markRedirect();
                        window.location.href = '/login.html';
                    }
                }
            } else {
                console.log('NavigationFix: Usuário autenticado recuperado (falso-negativo evitado)');
            }
        });
    }

    /**
     * Método público para verificar se pode navegar
     */
    static canNavigate(url) {
        if (window.navigationFix) {
            return window.navigationFix.canRedirect(url);
        }
        return true;
    }

    /**
     * Método público para navegação segura
     */
    static safeNavigate(url) {
        if (window.navigationFix && window.navigationFix.canRedirect(url)) {
            window.navigationFix.markRedirect();
            window.location.href = url;
            return true;
        }
        return false;
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navigationFix = new NavigationFix();
    });
} else {
    window.navigationFix = new NavigationFix();
}

// Exportar para uso global
window.NavigationFix = NavigationFix;

// Compatibilidade com módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationFix;
}
