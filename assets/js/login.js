/**
 * LOGIN SYSTEM - Sistema de Login Completo
 * Gerencia autenticação com email/senha e Google Auth
 * Inclui registro de novos usuários
 */

// VACINA ANTI-SERVICE WORKER (Auto-Remoção)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
        for(let reg of regs) {
            console.log('💀 Auto-removendo Service Worker:', reg);
            reg.unregister();
        }
    });
}

class LoginSystem {
    constructor() {
        console.log('🚀 LoginSystem constructor chamado');
        this.isInitialized = false;
        this.googleProvider = null;
        this.isProcessingAuth = false; // Flag para evitar loops
        this.init();
    }

    /**
     * Inicializa o sistema de login
     */
    async init() {
        try {
            console.log('🔧 Inicializando sistema de login...');
            
            // Vincula eventos IMEDIATAMENTE (independente do estado do Firebase)
            // Evita submissão padrão por GET e exposição de credenciais na URL
            console.log('🔧 Vinculando eventos (pré-Firebase)...');
            this.bindEvents();

            // Aguarda Firebase estar disponível (em paralelo)
            console.log('⏳ Aguardando Firebase...');
            await this.waitForFirebase();
            console.log('✅ Firebase pronto!');
            
            // Configura Google Auth Provider
            console.log('🔧 Configurando Google Provider...');
            this.setupGoogleProvider();
            
            // (Opcional) revalidar eventos se necessário
            console.log('🔧 Eventos vinculados. Prosseguindo...');
            
            // Verifica se usuário já está logado
            console.log('🔧 Verificando autenticação existente...');
            this.checkExistingAuth();
            
            this.isInitialized = true;
            console.log('✅ Sistema de login inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro detalhado na inicialização do login:', error);
            console.error('Stack trace:', error.stack);
            this.showMessage('Erro ao carregar sistema de login: ' + error.message, 'error');
        }
    }

    /**
     * Aguarda Firebase estar disponível
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            // Se Firebase já está disponível
            if (typeof firebase !== 'undefined' && firebase.auth && typeof firebase.auth === 'function') {
                console.log('Firebase já disponível no login');
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 150; // 15 segundos
            
            const checkFirebase = () => {
                attempts++;
                console.log(`Login - Tentativa ${attempts}: Verificando Firebase...`);
                
                if (typeof firebase !== 'undefined' && firebase.auth && typeof firebase.auth === 'function') {
                    console.log('Firebase carregado com sucesso no login!');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    const error = new Error('Firebase não foi carregado após 15 segundos no sistema de login');
                    console.error(error.message);
                    reject(error);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            // Aguardar evento de Firebase pronto
            window.addEventListener('firebaseReady', () => {
                console.log('Evento firebaseReady recebido no login');
                resolve();
            }, { once: true });
            
            // Iniciar verificação
            checkFirebase();
        });
    }

    /**
     * Configura Google Auth Provider
     */
    setupGoogleProvider() {
        try {
            if (!firebase || !firebase.auth || typeof firebase.auth !== 'function') {
                throw new Error('Firebase Auth não está disponível para configurar Google Provider');
            }
            
            if (!firebase.auth.GoogleAuthProvider) {
                throw new Error('GoogleAuthProvider não está disponível');
            }
            
            this.googleProvider = new firebase.auth.GoogleAuthProvider();
            this.googleProvider.addScope('email');
            this.googleProvider.addScope('profile');
            console.log('Google Auth Provider configurado com sucesso');
        } catch (error) {
            console.error('Erro ao configurar Google Provider:', error);
            throw error;
        }
    }

    /**
     * Vincula eventos dos formulários
     */
    bindEvents() {
        console.log('🔗 Vinculando eventos...');
        
        // Formulário de login
        const loginForm = document.getElementById('loginForm');
        console.log('📋 Login form encontrado:', loginForm);
        
        if (loginForm) {
            console.log('✅ Adicionando event listener ao formulário de login');
            loginForm.addEventListener('submit', (e) => {
                console.log('📝 Evento submit disparado!');
                this.handleLogin(e);
            });
        } else {
            console.error('❌ Formulário de login não encontrado!');
        }

        // Toggle de visibilidade de senha (login)
        this.attachPasswordToggle('password', 'toggleLoginPassword');

        // Formulário de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Toggle de visibilidade de senha (registro)
        this.attachPasswordToggle('registerPassword', 'toggleRegisterPassword');

        // Botão Google Login
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Botão Google Register
        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Links para alternar entre login e registro
        const showRegisterLink = document.getElementById('showRegister');
        const showLoginLink = document.getElementById('showLogin');
        
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegisterForm();
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }

        // Botão de esqueci a senha
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        }
    }

    /**
     * Adiciona toggle de visibilidade de senha a um input/ícone
     */
    attachPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (!input || !toggle) {
            return;
        }
        const switchType = () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            // Atualiza ícone: olho/olho cortado
            if (isPassword) {
                toggle.classList.remove('fa-eye');
                toggle.classList.add('fa-eye-slash');
            } else {
                toggle.classList.remove('fa-eye-slash');
                toggle.classList.add('fa-eye');
            }
        };
        toggle.addEventListener('click', switchType);
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchType();
            }
        });
    }

    /**
     * Verifica se usuário já está autenticado
     */
    checkExistingAuth() {
        try {
            // Verificar se Firebase Auth está disponível
            if (!firebase || !firebase.auth || typeof firebase.auth !== 'function') {
                console.warn('Firebase Auth não está disponível para verificar autenticação existente');
                return;
            }
            
            const auth = firebase.auth();
            if (!auth) {
                console.warn('Instância do Firebase Auth não disponível');
                return;
            }
            
            // Verificar se já está processando autenticação para evitar loops
            if (this.isProcessingAuth) {
                console.log('Já processando autenticação, ignorando...');
                return;
            }
            
            // Adicionar listener para mudanças de estado de autenticação - APENAS UMA VEZ
            auth.onAuthStateChanged((user) => {
                // Evitar processamento múltiplo
                if (this.isProcessingAuth) {
                    console.log('Processamento de auth já em andamento, ignorando...');
                    return;
                }
                
                this.isProcessingAuth = true;
                
                // Delay maior para evitar loops
                setTimeout(() => {
                    if (user && user.emailVerified !== false) {
                        console.log('Usuário autenticado detectado:', user.email);
                        // Só redirecionar se estiver na página de login E não estiver já redirecionando
                        if (window.location.pathname.includes('login.html')) {
                            console.log('Redirecionando usuário autenticado para dashboard...');
                            this.validateAndRedirect(user);
                        }
                    } else {
                        console.log('Nenhum usuário autenticado encontrado');
                        // Não fazer nada se já estiver na página de login
                    }
                    
                    // Reset flag após processamento com delay maior
                    setTimeout(() => {
                        this.isProcessingAuth = false;
                    }, 2000); // Aumentado para 2 segundos
                }, 1000); // Aumentado para 1 segundo
            });
            
        } catch (error) {
            console.error('Erro ao verificar autenticação existente:', error);
            this.isProcessingAuth = false;
        }
    }

    /**
     * Valida usuário e redireciona apenas se válido
     */
    async validateAndRedirect(user) {
        try {
            // Verificação rápida sem forçar refresh do token
            if (user && user.uid) {
                console.log('Usuário válido detectado, redirecionamento imediato');
                this.redirectToDashboard();
            } else {
                console.log('Usuário inválido, mantendo na página de login');
                this.signOut();
            }
        } catch (error) {
            console.error('Erro na validação do usuário:', error);
            this.signOut();
        }
    }

    /**
     * Garante que está na página de login
     */
    ensureLoginPage() {
        // Se não estiver na página de login, não fazer nada
        if (window.location.pathname.includes('index.html')) {
            console.log('Usuário não autenticado, redirecionando para login');
            window.location.replace('/login.html');
        }
    }

    /**
     * Faz logout do usuário
     */
    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('Usuário deslogado');
            // Limpar dados locais
            localStorage.clear();
            sessionStorage.clear();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }

    /**
     * Manipula login com email/senha
     */
    async handleLogin(e) {
        console.log('🔥 handleLogin chamado!');
        e.preventDefault();
        
        const emailElement = document.getElementById('email');
        const passwordElement = document.getElementById('password');
        const loginBtn = document.getElementById('loginBtn');
        
        console.log('📧 Email element:', emailElement);
        console.log('🔒 Password element:', passwordElement);
        console.log('🔘 Login button:', loginBtn);
        
        const email = emailElement?.value;
        const password = passwordElement?.value;

        // Bloqueio seguro: se Firebase não estiver pronto, não tentar autenticar
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.apps || firebase.apps.length === 0) {
            console.warn('Firebase não está pronto. Impedindo submissão padrão e informando usuário.');
            this.showMessage('Sistema de autenticação não carregou ainda. Aguarde alguns segundos e tente novamente.', 'error');
            return;
        }
        
        console.log('📧 Email value:', email);
        console.log('🔒 Password value:', password ? '***' : 'vazio');
        
        if (!email || !password) {
            console.log('❌ Campos vazios detectados');
            this.showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        this.setButtonLoading(loginBtn, true, 'Entrando...');
        this.hideMessages();

        try {
            // Garante que o login fique salvo no navegador mesmo se fechar a aba
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch((error) => {
                    console.error("Erro na persistência:", error);
                });

            // RETRY AUTOMÁTICO PARA RESOLVER PROBLEMAS DE REDE
            const userCredential = await this.retryAuthOperation(
                () => firebase.auth().signInWithEmailAndPassword(email, password),
                'login'
            );
            const user = userCredential.user;
            
            console.log('Login realizado com sucesso:', user.email);
            
            // Salva dados da sessão
            this.saveUserSession(user);
            
            this.showMessage('Login realizado com sucesso!', 'success');
            
            // Redirecionamento imediato sem delay
            this.redirectToDashboard();
            
        } catch (error) {
            console.error('Erro no login:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(loginBtn, false, 'Entrar');
        }
    }

    /**
     * Manipula registro de novo usuário
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const registerBtn = document.getElementById('registerBtn');
        
        if (!name || !email || !password || !confirmPassword) {
            this.showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('As senhas não coincidem', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        this.setButtonLoading(registerBtn, true, 'Criando conta...');
        this.hideMessages();

        try {
            // RETRY AUTOMÁTICO PARA RESOLVER PROBLEMAS DE REDE
            const userCredential = await this.retryAuthOperation(
                () => firebase.auth().createUserWithEmailAndPassword(email, password),
                'registro'
            );
            const user = userCredential.user;
            
            // Atualiza perfil com nome
            await user.updateProfile({
                displayName: name
            });
            
            console.log('Registro realizado com sucesso:', user.email);
            
            // Salva dados da sessão
            this.saveUserSession(user);
            
            this.showMessage('Conta criada com sucesso! Redirecionando...', 'success');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);
            
        } catch (error) {
            console.error('Erro no registro:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(registerBtn, false, 'Criar Conta');
        }
    }

    /**
     * Manipula login com Google
     */
    async handleGoogleLogin() {
        const googleBtn = document.getElementById('googleLoginBtn');
        
        this.setButtonLoading(googleBtn, true, 'Conectando com Google...');
        this.hideMessages();

        try {
            const result = await firebase.auth().signInWithPopup(this.googleProvider);
            const user = result.user;
            
            console.log('Login com Google realizado:', user.email);
            
            // Salva dados da sessão
            this.saveUserSession(user);
            
            this.showMessage('Login com Google realizado! Redirecionando...', 'success');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1500);
            
        } catch (error) {
            console.error('Erro no login com Google:', error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                this.showMessage('Login cancelado pelo usuário', 'error');
            } else {
                this.handleAuthError(error);
            }
        } finally {
            this.setButtonLoading(googleBtn, false, 'Continuar com Google');
        }
    }

    /**
     * Manipula esqueci a senha
     */
    async handleForgotPassword() {
        const email = document.getElementById('email')?.value;
        
        if (!email) {
            this.showMessage('Por favor, digite seu email primeiro', 'error');
            return;
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            this.showMessage('Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        } catch (error) {
            console.error('Erro ao enviar email de recuperação:', error);
            this.handleAuthError(error);
        }
    }

    /**
     * Salva dados da sessão do usuário
     */
    saveUserSession(user) {
        try {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userEmail', user.email || '');
            localStorage.setItem('userId', user.uid || '');
            localStorage.setItem('userDisplayName', user.displayName || user.email?.split('@')[0] || 'Usuário');
            localStorage.setItem('authToken', 'authenticated');
            localStorage.setItem('lastLogin', new Date().toISOString());
            
            console.log('Sessão salva para:', user.email);
        } catch (error) {
            console.error('Erro ao salvar sessão:', error);
        }
    }

    /**
     * Redireciona para seleção de empresa (FLUXO CORRIGIDO)
     */
    redirectToDashboard() {
        // Evitar redirecionamentos múltiplos
        if (this.isProcessingAuth) {
            console.log('Redirecionamento já em processamento, ignorando...');
            return;
        }
        
        console.log('Redirecionando para seleção de empresa...');
        
        // Marcar como processando
        this.isProcessingAuth = true;
        
        // CORREÇÃO CRÍTICA: Sempre redirecionar para seleção de empresa após login
        // Limpar empresa selecionada para forçar nova seleção
        localStorage.removeItem('activeCompanyId');
        
        // Redirecionamento com delay para evitar conflitos
        setTimeout(() => {
            window.location.replace('pages/trocar-empresa.html');
        }, 300);
    }

    /**
     * Retry automático para operações de autenticação
     */
    async retryAuthOperation(operation, operationType = 'auth', maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Tentativa ${attempt} de ${maxRetries} para ${operationType}...`);
                
                // Adicionar delay progressivo entre tentativas
                if (attempt > 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000); // Max 5s
                    console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                const result = await operation();
                console.log(`${operationType} bem-sucedido na tentativa ${attempt}`);
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`Tentativa ${attempt} falhou:`, error.code, error.message);
                
                // Se não é erro de rede, não tenta novamente
                if (!this.isNetworkError(error)) {
                    throw error;
                }
                
                // Se é a última tentativa, lança o erro
                if (attempt === maxRetries) {
                    console.error(`Todas as ${maxRetries} tentativas falharam para ${operationType}`);
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Verifica se é um erro de rede que pode ser resolvido com retry
     */
    isNetworkError(error) {
        const networkErrorCodes = [
            'auth/network-request-failed',
            'auth/timeout',
            'auth/too-many-requests'
        ];
        
        return networkErrorCodes.includes(error.code) || 
               (error.message && (
                   error.message.includes('network') ||
                   error.message.includes('timeout') ||
                   error.message.includes('connection')
               ));
    }

    /**
     * Trata erros de autenticação do Firebase
     */
    handleAuthError(error) {
        console.error('Erro de autenticação:', error);
        
        let message = 'Erro desconhecido. Tente novamente.';
        
        // Mapear códigos de erro para mensagens amigáveis - MELHORADO
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'E-mail não encontrado. Verifique se o e-mail está correto ou registre-se.';
                break;
            case 'auth/wrong-password':
                message = 'Senha incorreta. Verifique sua senha e tente novamente.';
                break;
            case 'auth/invalid-email':
                message = 'E-mail inválido. Verifique o formato do e-mail.';
                break;
            case 'auth/user-disabled':
                message = 'Esta conta foi desabilitada. Entre em contato com o suporte.';
                break;
            case 'auth/too-many-requests':
                message = 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
                break;
            case 'auth/email-already-in-use':
                message = 'Este e-mail já está em uso. Tente fazer login ou use outro e-mail.';
                break;
            case 'auth/weak-password':
                message = 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.';
                break;
            case 'auth/network-request-failed':
                message = 'Erro de conexão. Verifique sua internet e tente novamente.';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Login cancelado. Tente novamente se desejar fazer login com Google.';
                break;
            case 'auth/popup-blocked':
                message = 'Pop-up bloqueado pelo navegador. Permita pop-ups para este site.';
                break;
            case 'auth/cancelled-popup-request':
                message = 'Solicitação de login cancelada. Tente novamente.';
                break;
            case 'auth/invalid-credential':
                message = 'Credenciais inválidas. Verifique seu e-mail e senha.';
                break;
            case 'auth/operation-not-allowed':
                message = 'Método de login não permitido. Entre em contato com o suporte.';
                break;
            case 'auth/requires-recent-login':
                message = 'Esta operação requer login recente. Faça login novamente.';
                break;
            default:
                // Tentar extrair mensagem mais específica do erro
                if (error.message) {
                    if (error.message.includes('network')) {
                        message = 'Erro de conexão. Verifique sua internet.';
                    } else if (error.message.includes('timeout')) {
                        message = 'Tempo limite excedido. Tente novamente.';
                    } else {
                        message = `Erro: ${error.message}`;
                    }
                }
                break;
        }
        
        this.showMessage(message, 'error');
        return message;
    }

    /**
     * Exibe mensagem para o usuário - MELHORADO
     */
    showMessage(message, type = 'info') {
        // Limpar mensagens anteriores
        this.hideMessages();
        
        const messageContainer = document.createElement('div');
        messageContainer.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Adicionar ícone baseado no tipo
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle" style="color: #dc3545; margin-right: 8px;"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle" style="color: #17a2b8; margin-right: 8px;"></i>';
        }
        
        messageContainer.innerHTML = `
            ${icon}
            <span>${message}</span>
            <button type="button" class="close" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer; margin-left: 10px;">&times;</button>
        `;
        
        // Adicionar evento de fechar
        const closeBtn = messageContainer.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            messageContainer.remove();
        });
        
        document.body.appendChild(messageContainer);
        
        // Auto-remover após 5 segundos (exceto erros que ficam mais tempo)
        const timeout = type === 'error' ? 8000 : 5000;
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => messageContainer.remove(), 300);
            }
        }, timeout);
        
        // Adicionar CSS de animação se não existir
        if (!document.querySelector('#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Esconde todas as mensagens
     */
    hideMessages() {
        const errorElement = document.getElementById('errorMessage');
        const successElement = document.getElementById('successMessage');
        
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    /**
     * Define estado de loading do botão
     */
    setButtonLoading(button, isLoading, loadingText = 'Carregando...') {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        } else {
            button.disabled = false;
            // Restaura texto original baseado no ID do botão
            if (button.id === 'loginBtn') {
                button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            } else if (button.id === 'registerBtn') {
                button.innerHTML = '<i class="fas fa-user-plus"></i> Criar Conta';
            } else if (button.id === 'googleLoginBtn') {
                button.innerHTML = '<i class="fab fa-google"></i> Continuar com Google';
            }
        }
    }

    /**
     * Mostra formulário de registro
     */
    showRegisterForm() {
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');
        
        if (loginContainer) loginContainer.style.display = 'none';
        if (registerContainer) registerContainer.style.display = 'block';
        
        this.hideMessages();
    }

    /**
     * Mostra formulário de login
     */
    showLoginForm() {
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');
        
        if (loginContainer) loginContainer.style.display = 'block';
        if (registerContainer) registerContainer.style.display = 'none';
        
        this.hideMessages();
    }
}

// Inicialização automática
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loginSystem = new LoginSystem();
    });
} else {
    window.loginSystem = new LoginSystem();
}

// Exporta para uso global
window.LoginSystem = LoginSystem;

// Exporta para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginSystem;
}
