/**
 * LOGIN SYSTEM - Supabase Version
 * Gerencia autenticação com email/senha e Google Auth usando Supabase
 */

class LoginSystem {
    constructor() {
        console.log('🚀 LoginSystem (Supabase) constructor chamado');
        this.isInitialized = false;
        this.isProcessingAuth = false;
        this.init();
    }

    async init() {
        try {
            console.log('🔧 Inicializando sistema de login (Supabase)...');
            this.bindEvents();

            // Verifica se usuário já está logado
            await this.checkExistingAuth();

            this.isInitialized = true;
            console.log('✅ Sistema de login inicializado!');
        } catch (error) {
            console.error('❌ Erro na inicialização do login:', error);
            this.showMessage('Erro ao carregar sistema de login: ' + error.message, 'error');
        }
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

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

        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        this.attachPasswordToggle('password', 'toggleLoginPassword');
        this.attachPasswordToggle('registerPassword', 'toggleRegisterPassword');
    }

    attachPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (!input || !toggle) return;

        toggle.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.classList.toggle('fa-eye', !isPassword);
            toggle.classList.toggle('fa-eye-slash', isPassword);
        });
    }

    async checkExistingAuth() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session?.user) {
            this.saveUserSession(session.user);
            this.redirectToDashboard();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const loginBtn = document.getElementById('loginBtn');

        if (!email || !password) {
            this.showMessage('Por favor, preencha todos os campos', 'error');
            return;
        }

        this.setButtonLoading(loginBtn, true, 'Entrando...');

        try {
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.saveUserSession(data.user);
            this.showMessage('Login realizado com sucesso!', 'success');
            this.redirectToDashboard();
        } catch (error) {
            console.error('Erro no login:', error);
            this.showMessage(this.formatAuthError(error), 'error');
        } finally {
            this.setButtonLoading(loginBtn, false, 'Entrar');
        }
    }

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

        this.setButtonLoading(registerBtn, true, 'Criando conta...');

        try {
            const { data, error } = await window.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (error) throw error;

            this.showMessage('Conta criada com sucesso! Verifique seu email se necessário.', 'success');
            if (data.session) {
                this.saveUserSession(data.user);
                this.redirectToDashboard();
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            this.showMessage(this.formatAuthError(error), 'error');
        } finally {
            this.setButtonLoading(registerBtn, false, 'Criar Conta');
        }
    }

    async handleGoogleLogin() {
        try {
            const { error } = await window.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/pages/trocar-empresa.html'
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Erro no login com Google:', error);
            this.showMessage('Erro ao conectar com Google', 'error');
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('email')?.value;
        if (!email) {
            this.showMessage('Digite seu email para recuperar a senha', 'error');
            return;
        }

        try {
            const { error } = await window.supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            this.showMessage('Email de recuperação enviado!', 'success');
        } catch (error) {
            this.showMessage('Erro ao enviar recuperação', 'error');
        }
    }

    saveUserSession(user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUserUID', user.id);
        localStorage.setItem('currentUserEmail', user.email);
        localStorage.setItem('userDisplayName', user.user_metadata?.full_name || user.email.split('@')[0]);
    }

    redirectToDashboard() {
        setTimeout(() => {
            window.location.replace('pages/trocar-empresa.html');
        }, 500);
    }

    showRegisterForm() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('registerContainer').style.display = 'block';
        document.getElementById('registerContainer').classList.add('show');
    }

    showLoginForm() {
        document.getElementById('registerContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('loginContainer').classList.add('show');
    }

    setButtonLoading(button, isLoading, text) {
        if (!button) return;
        button.disabled = isLoading;
        button.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin"></i> ${text}` : button.getAttribute('data-original-text') || button.textContent;
        if (!isLoading) button.removeAttribute('data-original-text');
        else if (!button.getAttribute('data-original-text')) button.setAttribute('data-original-text', button.textContent);
    }

    showMessage(message, type = 'info') {
        const alertClass = type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info';
        const msgDiv = document.createElement('div');
        msgDiv.className = `alert alert-${alertClass}`;
        msgDiv.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:15px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn 0.3s ease-out;background:white;border-left:5px solid ' + (type === 'error' ? '#dc3545' : (type === 'success' ? '#28a745' : '#17a2b8'));
        msgDiv.innerHTML = `<strong>${type.toUpperCase()}:</strong> ${message}`;
        document.body.appendChild(msgDiv);
        setTimeout(() => {
            msgDiv.style.opacity = '0';
            msgDiv.style.transition = '0.5s';
            setTimeout(() => msgDiv.remove(), 500);
        }, 5000);
    }

    formatAuthError(error) {
        const map = {
            'Invalid login credentials': 'Email ou senha inválidos.',
            'User already registered': 'Este email já está cadastrado.',
            'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.'
        };
        return map[error.message] || error.message;
    }
}

// Inicializa o sistema
document.addEventListener('DOMContentLoaded', () => {
    window.loginSystem = new LoginSystem();
});
