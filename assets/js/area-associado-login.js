/**
 * Área do Associado - Login Manager
 * Sistema Qualify - Portal do Cliente
 */

(function() {
    'use strict';

    /**
     * Classe principal para gerenciar o login do associado
     */
    function AssociadoLoginManager() {
        this.form = null;
        this.cpfInput = null;
        this.contratoInput = null;
        this.submitBtn = null;
        this.loadingOverlay = null;
        this.errorState = null;
        this.mainContent = null;
        
        this.init();
    }

    /**
     * Inicializa o gerenciador de login
     */
    AssociadoLoginManager.prototype.init = function() {
        this.setupElements();
        this.bindEvents();
        this.setupMasks();
        this.hideLoading();
        this.loadRememberedData();
    };

    /**
     * Configura os elementos DOM
     */
    AssociadoLoginManager.prototype.setupElements = function() {
        this.form = document.getElementById('loginForm');
        this.cpfInput = document.getElementById('cpf');
        this.submitBtn = this.form?.querySelector('button[type="submit"]');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorState = document.getElementById('errorState');
        this.mainContent = document.getElementById('mainContent');
            
        if (!this.form || !this.cpfInput) {
            console.error('AssociadoLoginManager: Elementos essenciais não encontrados');
            this.showError();
            return;
        }
    };

    /**
     * Vincula eventos aos elementos
     */
    AssociadoLoginManager.prototype.bindEvents = function() {
        if (!this.form) return;

        // Submit do formulário
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Validação em tempo real
        this.cpfInput.addEventListener('input', () => {
            this.validateCPF();
        });

        this.cpfInput.addEventListener('blur', () => {
            this.validateCPF();
        });

        // Enter key on CPF submits
        this.cpfInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    };

    /**
     * Configura máscaras de input
     */
    AssociadoLoginManager.prototype.setupMasks = function() {
        if (!this.cpfInput) return;

        // Máscara para CPF
        this.cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            
            e.target.value = value;
        });
    };

    /**
     * Manipula o processo de login
     */
    AssociadoLoginManager.prototype.handleLogin = function() {
        if (!this.validateForm()) {
            return;
        }

        const cpf = this.cpfInput.value.replace(/\D/g, '');

        this.showLoading();
        this.setButtonLoading(true);

        // Simula autenticação
        this.authenticateUser(cpf)
            .then((userData) => {
                this.saveRememberedData();
                this.showSuccess('Login realizado com sucesso!');
                
                // Redireciona conforme empresa ativa e persiste dados
                setTimeout(() => {
                    try {
                        localStorage.setItem('areaAssociadoData', JSON.stringify(userData));
                    } catch (e) {
                        console.warn('Falha ao salvar dados do associado:', e);
                    }

                    let target = 'trocar-empresa.html';
                    try {
                        const activeCompanyStr = localStorage.getItem('activeCompany');
                        const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
                        if (activeCompany && activeCompany.id) {
                            target = 'area-associado.html';
                        }
                    } catch (e) {
                        // mantém target como troca de empresa
                    }

                    window.location.href = target;
                }, 1500);
            })
            .catch((error) => {
                this.hideLoading();
                this.setButtonLoading(false);
                this.showError(error.message);
                this.markFieldsInvalid();
            });
    };

    /**
     * Simula autenticação do usuário
     */
    AssociadoLoginManager.prototype.authenticateUser = function(cpf) {
        return new Promise((resolve, reject) => {
            // Simula delay de rede
            setTimeout(() => {
                try {
                    // Primeiro, tenta autenticar usando associados cadastrados via Nova Família
                    const associadosStr = localStorage.getItem('associados');
                    const associados = associadosStr ? JSON.parse(associadosStr) : [];
                    const match = associados.find(a => String(a.cpf || '').replace(/\D/g, '') === cpf);
                    if (match) {
                        // Monta dados mínimos esperados pela Área do Associado
                        const userData = {
                            cpf: match.cpf || '',
                            email: match.email || '',
                            phone: match.telefone || '',
                            nome: match.nome || ''
                        };
                        resolve(userData);
                        return;
                    }
                } catch (e) {
                    console.warn('Falha ao consultar associados no localStorage:', e);
                }

                // Fallback para usuários mockados (mantém suporte de testes)
                const mockUsers = [
                    {
                        cpf: '12345678901',
                        contrato: '2024001',
                        nome: 'João Silva Santos',
                        email: 'joao.silva@email.com',
                        telefone: '(11) 99999-9999',
                        plano: 'Plano Família Premium',
                        valorMensalidade: 299.90,
                        vencimento: '2024-02-15',
                        status: 'Ativo',
                        dependentes: [
                            { nome: 'Maria Silva Santos', parentesco: 'Cônjuge' },
                            { nome: 'Pedro Silva Santos', parentesco: 'Filho' }
                        ]
                    },
                    {
                        cpf: '98765432100',
                        contrato: '2024002',
                        nome: 'Maria Oliveira Costa',
                        email: 'maria.oliveira@email.com',
                        telefone: '(11) 88888-8888',
                        plano: 'Plano Individual',
                        valorMensalidade: 149.90,
                        vencimento: '2024-02-20',
                        status: 'Ativo',
                        dependentes: []
                    }
                ];

                const user = mockUsers.find(u => u.cpf === cpf);
                if (user) {
                    const userData = {
                        cpf: user.cpf,
                        email: user.email,
                        phone: user.telefone,
                        nome: user.nome
                    };
                    resolve(userData);
                } else {
                    reject(new Error('CPF inválido. Verifique seus dados e tente novamente.'));
                }
            }, 2000);
        });
    };

    /**
     * Valida o formulário completo
     */
    AssociadoLoginManager.prototype.validateForm = function() {
        const cpfDigits = this.cpfInput.value.replace(/\D/g, '');
        const cpfValid = this.isValidCPF(cpfDigits) || this.isKnownCPF(cpfDigits);
        this.setFieldValid(this.cpfInput, cpfValid);
        return cpfValid;
    };

    /**
     * Valida o CPF
     */
    AssociadoLoginManager.prototype.validateCPF = function() {
        const cpf = this.cpfInput.value.replace(/\D/g, '');
        const isValid = this.isValidCPF(cpf) || this.isKnownCPF(cpf);
        
        if (cpf.length === 0) {
            this.setFieldValid(this.cpfInput, true);
            return false;
        }
        
        this.setFieldValid(this.cpfInput, isValid);
        return isValid;
    };

    /**
     * Verifica se o CPF está cadastrado (mesmo que inválido matematicamente)
     */
    AssociadoLoginManager.prototype.isKnownCPF = function(cpfDigits) {
        if (!cpfDigits || cpfDigits.length !== 11) return false;
        try {
            const associadosStr = localStorage.getItem('associados');
            const associados = associadosStr ? JSON.parse(associadosStr) : [];
            return associados.some(a => String(a.cpf || '').replace(/\D/g, '') === cpfDigits);
        } catch (e) {
            console.warn('Falha ao consultar associados no localStorage:', e);
            return false;
        }
    };

    /**
     * Verifica se o CPF é válido
     */
    AssociadoLoginManager.prototype.isValidCPF = function(cpf) {
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(10))) return false;

        return true;
    };

    /**
     * Define o estado de validade de um campo
     */
    AssociadoLoginManager.prototype.setFieldValid = function(field, isValid) {
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
    };

    /**
     * Marca todos os campos como inválidos
     */
    AssociadoLoginManager.prototype.markFieldsInvalid = function() {
        this.setFieldValid(this.cpfInput, false);
    };

    /**
     * Salva dados lembrados
     */
    AssociadoLoginManager.prototype.saveRememberedData = function() {
        const rememberCheckbox = document.getElementById('rememberMe');
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem('associado_remembered_cpf', this.cpfInput.value);
        }
    };

    /**
     * Carrega dados lembrados
     */
    AssociadoLoginManager.prototype.loadRememberedData = function() {
        const rememberedCPF = localStorage.getItem('associado_remembered_cpf');
        
        if (rememberedCPF) {
            this.cpfInput.value = rememberedCPF;
            const rememberCheckbox = document.getElementById('rememberMe');
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    };

    /**
     * Mostra estado de carregamento
     */
    AssociadoLoginManager.prototype.showLoading = function() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    };

    /**
     * Esconde estado de carregamento
     */
    AssociadoLoginManager.prototype.hideLoading = function() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    };

    /**
     * Define estado de carregamento do botão
     */
    AssociadoLoginManager.prototype.setButtonLoading = function(loading) {
        if (!this.submitBtn) return;
        
        if (loading) {
            this.submitBtn.classList.add('loading');
            this.submitBtn.disabled = true;
        } else {
            this.submitBtn.classList.remove('loading');
            this.submitBtn.disabled = false;
        }
    };

    /**
     * Mostra estado de erro
     */
    AssociadoLoginManager.prototype.showError = function(message = 'Ocorreu um erro inesperado') {
        this.showNotification(message, 'error');
    };

    /**
     * Mostra mensagem de sucesso
     */
    AssociadoLoginManager.prototype.showSuccess = function(message) {
        this.showNotification(message, 'success');
    };

    /**
     * Mostra notificação toast
     */
    AssociadoLoginManager.prototype.showNotification = function(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header');
        const icon = toastHeader.querySelector('i');
        
        // Define ícone e cor baseado no tipo
        const config = {
            success: { icon: 'fas fa-check-circle text-success', title: 'Sucesso' },
            error: { icon: 'fas fa-exclamation-circle text-danger', title: 'Erro' },
            info: { icon: 'fas fa-info-circle text-primary', title: 'Informação' }
        };
        
        const currentConfig = config[type] || config.info;
        
        icon.className = currentConfig.icon + ' me-2';
        toastHeader.querySelector('strong').textContent = currentConfig.title;
        toastBody.textContent = message;
        
        // Mostra o toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    };

    // Funções globais para eventos
    window.showHelp = function() {
        const helpMessage = `
            Para acessar sua área do associado, você precisa:
            
            1. Inserir seu CPF (apenas números)
            2. Clicar em "Entrar"
            
            Se você tiver dificuldades, entre em contato conosco pelo telefone ou WhatsApp.
        `;
        
        if (window.associadoLoginManager) {
            window.associadoLoginManager.showNotification(helpMessage, 'info');
        }
    };

    window.showForgotPassword = function() {
        const forgotMessage = `
            Para recuperar seus dados de acesso:
            
            1. Entre em contato conosco
            2. Tenha em mãos um documento com foto
            3. Informe seu nome completo e CPF
            
            Nossos canais de atendimento:
            • Telefone: (11) 9999-9999
            • WhatsApp: (11) 9999-9999
            • Email: suporte@empresa.com
        `;
        
        if (window.associadoLoginManager) {
            window.associadoLoginManager.showNotification(forgotMessage, 'info');
        }
    };

    // Inicialização
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            try {
                window.associadoLoginManager = new AssociadoLoginManager();
            } catch (error) {
                console.error('Erro ao inicializar AssociadoLoginManager:', error);
            }
        }, 100);
    });

    // Fallback para inicialização imediata
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            if (!window.associadoLoginManager) {
                try {
                    window.associadoLoginManager = new AssociadoLoginManager();
                } catch (error) {
                    console.error('Erro ao inicializar AssociadoLoginManager (fallback):', error);
                }
            }
        }, 100);
    }

})();