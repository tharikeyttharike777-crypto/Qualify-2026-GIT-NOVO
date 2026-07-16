// Gerenciador Central de Autenticação com Supabase
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authStateListeners = [];
        this.authListenerSetup = false;
        this.isRedirecting = false;
        this.supabaseReady = false;
        this.initializeAuthState();
    }

    async initializeAuthState() {
        // Aguardar Supabase estar pronto
        const ready = await this.waitForSupabase();
        if (ready) {
            this.setupAuthListener();
        }
    }

    async waitForSupabase(timeoutMs = 5000) {
        return new Promise((resolve) => {
            if (window.supabase) {
                this.supabaseReady = true;
                resolve(true);
                return;
            }
            let elapsed = 0;
            const interval = 100;
            const check = () => {
                if (window.supabase) {
                    this.supabaseReady = true;
                    resolve(true);
                } else if (elapsed >= timeoutMs) {
                    console.error('Supabase não carregou no AuthManager');
                    resolve(false);
                } else {
                    elapsed += interval;
                    setTimeout(check, interval);
                }
            };
            check();
        });
    }

    setupAuthListener() {
        if (this.authListenerSetup) return;
        this.authListenerSetup = true;

        console.log('AuthManager: Configurando listener Supabase Auth...');

        window.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthManager: Evento de autenticação:', event);
            const user = session?.user || null;

            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                this.handleUserLoggedIn(user);
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                this.handleUserLoggedOut();
            }

            this.notifyAuthStateListeners(user);
        });
    }

    handleUserLoggedIn(user) {
        
        try { localStorage.setItem('lastAuthTime', String(Date.now())); } catch (_) { }

        if (this.isLoginPage() && !this.isRedirecting) {
            this.isRedirecting = true;
            console.log('Redirecionando usuário para dashboard...');
            setTimeout(() => {
                window.location.href = 'pages/trocar-empresa.html';
            }, 500);
        }
    }

    handleUserLoggedOut() {
        console.log('Usuário deslogado');
        if (this.isProtectedPage() && !this.isLoginPage()) {
            this.redirectToLogin();
        }
    }

    isLoginPage() {
        return window.location.pathname.includes('login.html');
    }

    isProtectedPage() {
        const publicPages = ['login.html', 'register.html', 'recuperar.html'];
        const isPublic = publicPages.some(page => window.location.pathname.includes(page));
        return !isPublic;
    }

    redirectToLogin() {
        if (!this.isLoginPage()) {
            // Ajustar path se estiver em subpasta
            const prefix = window.location.pathname.includes('/pages/') ? '../' : './';
            window.location.href = prefix + 'login.html';
        }
    }

    async logout() {
        try {
            await window.supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            this.redirectToLogin();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    async fazerLogout() {
        return this.logout();
    }

    getCurrentUser() { return this.currentUser; }
    getCurrentUserId() { return this.currentUser?.id || null; }
    isUserAuthenticated() { return this.isAuthenticated; }

    async checkAuthState() {
        if (!window.supabase) await this.waitForSupabase();
        const { data: { session } } = await window.supabase.auth.getSession();
        return session?.user || null;
    }

    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }

    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(cb => { try { cb(user); } catch (e) { } });
    }

    displayUserInfo() {
        const userName = this.currentUser?.email || 'Usuário';
        document.querySelectorAll('.user-name').forEach(el => el.textContent = userName);
    }

    addLogoutButton() { } // Mantido para compatibilidade
    async checkPageAccess() {
        const user = await this.checkAuthState();
        if (this.isProtectedPage() && !user) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }
}

// Inicialização
window.AuthManager = AuthManager;
const authManager = new AuthManager();
window.authManager = authManager;

window.fazerLogout = () => authManager.fazerLogout();

document.addEventListener('DOMContentLoaded', async () => {
    await authManager.checkPageAccess();
    authManager.displayUserInfo();
});

console.log('Gerenciador de autenticação Supabase inicializado!');
