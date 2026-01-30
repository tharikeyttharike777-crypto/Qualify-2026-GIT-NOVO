// Gerenciador Central de Autenticação
// Este arquivo deve ser importado em todas as páginas da aplicação
// Firebase sera carregado via CDN e firebase-config.js

// Estado global da autenticação
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.authStateListeners = [];
        this.authListenerSetup = false; // Flag para evitar múltiplos listeners
        this.isRedirecting = false;
        this.firebaseReady = false;
        this.initializeAuthState();
    }

    // Inicializar monitoramento do estado de autenticação
    initializeAuthState() {
        // Aguardar Firebase estar pronto
        if (typeof firebase !== 'undefined' && firebase.auth) {
            this.setupAuthListener();
        } else {
            // Aguardar evento de Firebase pronto
            window.addEventListener('firebaseReady', () => {
                this.setupAuthListener();
            });
        }
    }

    /**
     * Configura o listener de mudanças de autenticação
     */
    setupAuthListener() {
        // Evitar múltiplos listeners - CORREÇÃO CRÍTICA
        if (this.authListenerSetup) {
            console.log('AuthManager: Listener já configurado, ignorando...');
            return;
        }
        this.authListenerSetup = true;

        console.log('AuthManager: Configurando listener de autenticação...');

        // Usar um único listener global com debounce para evitar múltiplas execuções
        let authStateTimeout;
        this.unsubscribeAuth = firebase.auth().onAuthStateChanged((user) => {
            // Limpar timeout anterior se existir
            if (authStateTimeout) {
                clearTimeout(authStateTimeout);
            }

            // Debounce para evitar múltiplas execuções rápidas
            authStateTimeout = setTimeout(() => {
                console.log('AuthManager: Estado de autenticação mudou:', user ? user.email : 'Não autenticado');

                if (user) {
                    this.currentUser = user;
                    this.isAuthenticated = true;
                    this.handleUserLoggedIn(user);
                } else {
                    this.currentUser = null;
                    this.isAuthenticated = false;
                    this.handleUserLoggedOut();
                }

                // Notificar listeners registrados
                this.notifyAuthStateListeners(user);
            }, 100); // Debounce de 100ms
        });
    }

    // Manipular usuário logado
    handleUserLoggedIn(user) {
        console.log('Usuário logado:', user.email);
        try { localStorage.setItem('lastAuthTime', String(Date.now())); } catch (_) { }
        try { sessionStorage.removeItem('authGraceActive'); } catch (_) { }
        // REMOVIDO: gravação de estado de autenticação em localStorage

        // Se estiver na página de login, redirecionar para dashboard
        // Mas apenas se não estiver já redirecionando
        if (this.isLoginPage() && !this.isRedirecting) {
            this.isRedirecting = true;
            console.log('Redirecionando usuário logado para dashboard...');
            // Redirecionar para a página de seleção de empresa (trocar-empresa.html)
            // A página de seleção de empresa fará o redirecionamento final para o index.html
            setTimeout(() => {
                window.location.href = 'pages/trocar-empresa.html';
            }, 800); // Aumentado para 800ms para evitar conflitos
        }

        // Inicializar dados do usuário se necessário
        this.initializeUserData(user);
    }

    // Manipular usuário deslogado
    handleUserLoggedOut() {
        console.log('Usuário deslogado');
        const now = Date.now();
        const lastAuthTime = parseInt(localStorage.getItem('lastAuthTime') || '0', 10);
        const timeSinceAuth = lastAuthTime ? now - lastAuthTime : Infinity;

        // Ativar período de tolerância (grace) maior para evitar falso-logout durante navegação
        const GRACE_MS = 6000;
        const alreadyGrace = sessionStorage.getItem('authGraceActive') === '1';
        if (!alreadyGrace) {
            try { sessionStorage.setItem('authGraceActive', '1'); } catch (_) { }
            setTimeout(async () => {
                const user = (firebase && firebase.auth) ? firebase.auth().currentUser : null;
                if (!user) {
                    // Usuário realmente não autenticado. Limpeza leve (apenas sessão) e redireciono.
                    try { sessionStorage.clear(); } catch (_) { }
                    if (!this.isLoginPage()) this.redirectToLogin();
                } else {
                    // Sessão recuperada, remover flag de graça
                    try { sessionStorage.removeItem('authGraceActive'); } catch (_) { }
                }
            }, GRACE_MS);
        }
    }

    // Verificar se está na página de login
    isLoginPage() {
        const path = window.location.pathname;
        return path.includes('login.html');
    }

    // Verificar se está na página inicial (index)
    isIndexPage() {
        const path = window.location.pathname;
        return path === '/' ||
            path.endsWith('index.html') ||
            path.endsWith('/');
    }

    // Verificar se é uma página protegida
    isProtectedPage() {
        const protectedPages = [
            'index.html',
            'contratos.html',
            'nova-familia.html',
            'dre-gerencial.html',
            'metricas-estrategicas.html',
            'controle-caixas.html',
            'ordens-servico.html',
            'inadimplentes.html',
            'cobrancas.html',
            'vendas.html'
        ];

        return protectedPages.some(page => window.location.pathname.includes(page));
    }

    // Redirecionar para dashboard
    redirectToDashboard() {
        // Evitar múltiplos redirecionamentos
        if (this.isRedirecting) {
            console.log('Redirecionamento já em andamento, ignorando...');
            return;
        }

        this.isRedirecting = true;
        console.log('Redirecionando para dashboard...');

        // Usar setTimeout para evitar conflitos e aguardar mais tempo
        setTimeout(() => {
            try {
                window.location.replace('index.html');
            } catch (error) {
                console.error('Erro no redirecionamento:', error);
                // Fallback
                window.location.href = 'index.html';
            }

            // Reset flag após redirecionamento
            setTimeout(() => {
                this.isRedirecting = false;
            }, 1000);
        }, 600); // Aumentado para 600ms
    }

    // Redirecionar para login
    redirectToLogin() {
        // Verificar se já está na página de login para evitar loop
        if (!this.isLoginPage()) {
            window.location.href = '/login.html';
        }
    }

    // Fazer logout
    async logout() {
        try {
            await firebase.auth().signOut();
            console.log('Logout realizado com sucesso');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw error;
        }
    }

    // SUBSTITUA SEU LOGOUT POR ISTO:
    async fazerLogout() {
        console.log('*** EXECUTANDO LOGOUT COMPLETO E SEGURO ***');
        try {
            await firebase.auth().signOut();
            console.log('Firebase signOut() SUCESSO.');
            // LIMPEZA TOTAL:
            localStorage.clear();
            sessionStorage.clear();
            console.log('*** LocalStorage/SessionStorage COMPLETAMENTE LIMPOS. ***');
            window.location.href = '/login.html'; // Redireciona APÓS limpar
        } catch (error) {
            console.error('*** ERRO CRÍTICO DURANTE LOGOUT:', error);
            alert('Erro crítico ao tentar sair.');
        }
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Obter ID do usuário atual
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Verificar se usuário está logado
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Verificar estado de autenticação (Promise)
    async checkAuthState() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            } else {
                resolve(null);
            }
        });
    }

    // Obter email do usuário atual
    getCurrentUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    // Adicionar listener para mudanças no estado de autenticação
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }

    // Remover listener
    removeAuthStateListener(callback) {
        const index = this.authStateListeners.indexOf(callback);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    // Notificar todos os listeners
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Erro ao executar listener de autenticação:', error);
            }
        });
    }

    // Inicializar dados do usuário (primeira vez)
    async initializeUserData(user) {
        // Esta função pode ser expandida para criar dados iniciais do usuário
        // Por exemplo, criar coleções vazias, configurações padrão, etc.
        console.log('Inicializando dados do usuário:', user.uid);
    }

    // Exibir informações do usuário na interface
    displayUserInfo() {
        console.log('🔍 Procurando elementos para exibir informações do usuário...');

        // Procurar por elementos que devem exibir o nome do usuário
        const userNameElements = [
            document.querySelector('.user-name'),
            document.querySelector('#user-name'),
            document.querySelector('[data-user-name]'),
            document.querySelector('.welcome-message'),
            document.querySelector('#welcome-message')
        ];

        // Procurar por texto "[Nome do Cliente]" para substituir
        const allElements = document.querySelectorAll('*');
        const elementsWithPlaceholder = [];

        allElements.forEach(element => {
            if (element.textContent && element.textContent.includes('[Nome do Cliente]')) {
                elementsWithPlaceholder.push(element);
            }
        });

        console.log(`📝 Encontrados ${elementsWithPlaceholder.length} elementos com placeholder '[Nome do Cliente]'`);

        // Obter nome do usuário APENAS do estado atual (sem localStorage)
        let userName = 'Usuário';
        if (this.currentUser) {
            userName = this.currentUser.displayName || this.currentUser.email || 'Usuário';
        }

        console.log(`👤 Nome do usuário identificado: ${userName}`);

        // Atualizar elementos com placeholder
        elementsWithPlaceholder.forEach(element => {
            const originalText = element.textContent;
            const newText = originalText.replace('[Nome do Cliente]', userName);
            element.textContent = newText;
            console.log(`✅ Texto atualizado: "${originalText}" → "${newText}"`);
        });

        // Atualizar elementos específicos de nome do usuário
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = userName;
                console.log(`✅ Elemento de nome do usuário atualizado: ${userName}`);
            }
        });

        // Atualizar informações do usuário no header
        const userInfo = document.querySelector('.user-info');
        if (userInfo && !userInfo.querySelector('.user-dropdown')) {
            userInfo.innerHTML = `
                <div class="user-dropdown">
                    <button class="user-button" id="user-menu-toggle">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span class="user-name">${userName}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            `;
            console.log('✅ Informações do usuário adicionadas ao header');
        }
    }

    // Adicionar botão de logout
    addLogoutButton() {
        const logoutContainer = document.querySelector('.logout-container');
        if (logoutContainer && !document.getElementById('logout-button')) {
            logoutContainer.innerHTML = `
                <button id="logout-button" class="btn btn-outline-light">
                    <i class="fas fa-sign-out-alt"></i>
                    Sair
                </button>
            `;
            console.log('✅ Botão de logout adicionado');
        }
    }

    // Verificar se usuário tem permissão para acessar página
    async checkPageAccess() {
        // Fonte de verdade: estado do Firebase (aguardando resolução)
        return new Promise(async (resolve) => {
            try {
                // Aguardar resolução do estado de autenticação
                const user = await this.waitForAuth();
                const isProtected = this.isProtectedPage();

                if (isProtected && !user) {
                    console.log('Usuário não autenticado em página protegida, redirecionando...');
                    this.redirectToLogin();
                    resolve(false);
                } else {
                    resolve(true);
                }
            } catch (e) {
                console.warn('Falha ao verificar acesso via Firebase, assumindo não autenticado em páginas protegidas.', e);
                if (this.isProtectedPage()) {
                    this.redirectToLogin();
                    resolve(false);
                } else {
                    resolve(true);
                }
            }
        });
    }

    /**
     * Aguarda o Firebase estar disponível
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // Reduzido para 10 segundos

            const checkFirebase = () => {
                attempts++;

                // Log menos verboso
                if (attempts % 20 === 0) {
                    console.log(`AuthManager - Tentativa ${attempts}: Verificando Firebase...`);
                }

                if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
                    console.log('Firebase carregado com sucesso no AuthManager!');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    const error = new Error('Firebase não carregou após múltiplas tentativas. Verifique se os scripts CDN do Firebase estão incluídos no HTML.');
                    console.error(error.message);
                    reject(error);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };

            // Verificar se Firebase já está disponível
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
                console.log('Firebase já disponível no AuthManager');
                resolve();
                return;
            }

            // Aguardar evento de Firebase pronto
            window.addEventListener('firebaseReady', () => {
                console.log('Evento firebaseReady recebido no AuthManager');
                resolve();
            }, { once: true });

            checkFirebase();
        });
    }

    // Aguardar autenticação ser carregada
    waitForAuth() {
        return new Promise((resolve) => {
            if (this.currentUser !== null) {
                resolve(this.currentUser);
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                    unsubscribe();
                    resolve(user);
                });
            }
        });
    }

    // Mostrar informações do usuário na interface
    displayUserInfo(containerSelector = '.user-info') {
        const container = document.querySelector(containerSelector);
        if (container && this.currentUser) {
            container.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="user-details">
                        <span class="user-name">${this.currentUser.email}</span>
                        <span class="user-status">Online</span>
                    </div>
                </div>
            `;
        }
    }

    // Adicionar botão de logout
    addLogoutButton(containerSelector = '.logout-container') {
        const container = document.querySelector(containerSelector);
        if (container) {
            container.innerHTML = `
                <button id="logout-button" class="btn btn-logout">
                    <i class="fas fa-sign-out-alt"></i>
                    Sair
                </button>
            `;

            const logoutBtn = document.getElementById('logout-button');
            logoutBtn.addEventListener('click', async () => {
                try {
                    await this.logout();
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    alert('Erro ao fazer logout. Tente novamente.');
                }
            });
        }
    }
}

// Criar instância global do gerenciador de autenticação
// Remove duplicate declaration since authManager is already declared at the bottom

// Expor classes no objeto window para uso global
window.AuthManager = AuthManager;

// Criar instância global
const authManager = new AuthManager();
window.authManager = authManager;
// Expor função de logout global padronizada
window.fazerLogout = async function () {
    try {
        await authManager.fazerLogout();
    } catch (e) {
        console.error('Erro ao executar fazerLogout global:', e);
    }
};

// Verificar acesso à página quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar Firebase estar pronto antes de verificar acesso
    if (!authManager.firebaseReady) {
        await new Promise((resolve) => {
            window.addEventListener('firebaseReady', resolve, { once: true });
        });
    }

    await authManager.checkPageAccess();

    // Adicionar informações do usuário se existir container
    authManager.displayUserInfo();

    // Adicionar botão de logout se existir container
    authManager.addLogoutButton();

    // Event listener seguro para o botão de logout
    const logoutButton = document.getElementById('logout-button');

    // VERIFICAÇÃO DE SEGURANÇA (A Correção do Erro 'null'):
    // Se o botão existir na página, adiciona o evento de clique.
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            // Previne qualquer comportamento padrão do link/botão
            event.preventDefault();

            // Chama nossa função de logout limpa
            authManager.fazerLogout();
        });
    } else {
        // Se o botão não for encontrado, avisa no console (útil para debug).
        console.warn('O botão de logout com id="logout-button" não foi encontrado nesta página.');
    }
});

// Expor classe no objeto window para uso global
window.AuthManager = AuthManager;

console.log('Gerenciador de autenticação inicializado!');
