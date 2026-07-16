/**
 * Validador de Segurança
 * Implementa validações e proteções de segurança para a aplicação
 */
class SecurityValidator {
    constructor() {
        this.initialized = false;
        this.securityRules = new Map();
        this.blockedIPs = new Set();
        this.rateLimiter = new Map();
        this.init();
    }

    /**
     * Inicializa o validador de segurança
     */
    init() {
        if (this.initialized) return;
        
        console.log('Inicializando validador de segurança...');
        
        // Configurar validações de entrada
        this.setupInputValidation();
        
        // Implementar proteção CSRF
        this.setupCSRFProtection();
        
        // Configurar rate limiting
        this.setupRateLimiting();
        
        // Implementar validação de sessão
        this.setupSessionValidation();
        
        // Configurar Content Security Policy
        this.setupCSP();
        
        this.initialized = true;
        console.log('Validador de segurança inicializado com sucesso!');
    }

    /**
     * Configura validações de entrada
     */
    setupInputValidation() {
        // Padrões de validação
        this.validationPatterns = {
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            phone: /^[\+]?[1-9][\d]{0,15}$/,
            cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
            cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            name: /^[a-zA-ZÀ-ÿ\s]{2,50}$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            numeric: /^\d+$/
        };

        // Lista de palavras proibidas
        this.forbiddenWords = [
            'script', 'javascript', 'vbscript', 'onload', 'onerror', 'onclick',
            'eval', 'expression', 'alert', 'confirm', 'prompt', 'document.cookie',
            'window.location', 'iframe', 'object', 'embed', 'form', 'input'
        ];
    }

    /**
     * Valida entrada de dados
     */
    validateInput(value, type, options = {}) {
        if (!value || typeof value !== 'string') {
            return { valid: false, error: 'Valor inválido ou vazio' };
        }

        // Sanitizar entrada
        const sanitized = this.sanitizeInput(value);
        
        // Verificar comprimento
        if (options.minLength && sanitized.length < options.minLength) {
            return { valid: false, error: `Mínimo de ${options.minLength} caracteres` };
        }
        
        if (options.maxLength && sanitized.length > options.maxLength) {
            return { valid: false, error: `Máximo de ${options.maxLength} caracteres` };
        }

        // Verificar padrão
        if (this.validationPatterns[type] && !this.validationPatterns[type].test(sanitized)) {
            return { valid: false, error: `Formato inválido para ${type}` };
        }

        // Verificar palavras proibidas
        if (this.containsForbiddenWords(sanitized)) {
            return { valid: false, error: 'Conteúdo não permitido detectado' };
        }

        return { valid: true, value: sanitized };
    }

    /**
     * Sanitiza entrada de dados
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>\"']/g, '') // Remove caracteres perigosos
            .replace(/javascript:/gi, '') // Remove javascript:
            .replace(/vbscript:/gi, '') // Remove vbscript:
            .replace(/on\w+=/gi, '') // Remove event handlers
            .replace(/script/gi, '') // Remove script tags
            .slice(0, 1000); // Limita tamanho
    }

    /**
     * Verifica palavras proibidas
     */
    containsForbiddenWords(text) {
        const lowerText = text.toLowerCase();
        return this.forbiddenWords.some(word => lowerText.includes(word));
    }

    /**
     * Configura proteção CSRF
     */
    setupCSRFProtection() {
        // Gerar token CSRF
        this.csrfToken = this.generateCSRFToken();
        
        // Armazenar no sessionStorage
        sessionStorage.setItem('csrfToken', this.csrfToken);
        
        // Adicionar meta tag
        let csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (!csrfMeta) {
            csrfMeta = document.createElement('meta');
            csrfMeta.name = 'csrf-token';
            csrfMeta.content = this.csrfToken;
            document.head.appendChild(csrfMeta);
        }
    }

    /**
     * Gera token CSRF
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Valida token CSRF
     */
    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrfToken');
        return token && storedToken && token === storedToken;
    }

    /**
     * Configura rate limiting
     */
    setupRateLimiting() {
        this.rateLimits = {
            login: { max: 5, window: 300000 }, // 5 tentativas em 5 minutos
            register: { max: 3, window: 600000 }, // 3 tentativas em 10 minutos
            api: { max: 100, window: 60000 }, // 100 requests por minuto
            general: { max: 1000, window: 3600000 } // 1000 requests por hora
        };
    }

    /**
     * Verifica rate limiting
     */
    checkRateLimit(action, identifier = 'default') {
        const key = `${action}_${identifier}`;
        const limit = this.rateLimits[action] || this.rateLimits.general;
        const now = Date.now();
        
        if (!this.rateLimiter.has(key)) {
            this.rateLimiter.set(key, { count: 1, firstRequest: now });
            return { allowed: true, remaining: limit.max - 1 };
        }
        
        const data = this.rateLimiter.get(key);
        
        // Reset se passou da janela de tempo
        if (now - data.firstRequest > limit.window) {
            this.rateLimiter.set(key, { count: 1, firstRequest: now });
            return { allowed: true, remaining: limit.max - 1 };
        }
        
        // Verificar se excedeu o limite
        if (data.count >= limit.max) {
            return { 
                allowed: false, 
                remaining: 0,
                resetTime: data.firstRequest + limit.window
            };
        }
        
        // Incrementar contador
        data.count++;
        return { allowed: true, remaining: limit.max - data.count };
    }

    /**
     * Configura validação de sessão
     */
    setupSessionValidation() {
        // Verificar integridade da sessão a cada 5 minutos
        setInterval(() => {
            this.validateSession();
        }, 300000);
    }

    /**
     * Valida sessão atual
     */
    async validateSession() {
        try {
            const grace = sessionStorage.getItem('authGraceActive') === '1';
            let user = null;
            if (typeof window.supabase !== 'undefined') {
                const { data: { session } } = await window.supabase.auth.getSession();
                user = session?.user;
            }
            if (grace || (user && user.id)) return true;

            const userEmail = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');
            const lastAuthTime = localStorage.getItem('lastAuthTime');

            if (!userEmail || !userId || !lastAuthTime) {
                console.warn('Sessão inválida detectada');
                this.clearSession();
                return false;
            }

            const sessionAge = Date.now() - parseInt(lastAuthTime);
            if (sessionAge > 86400000) { // 24 horas
                console.warn('Sessão expirada');
                this.clearSession();
                return false;
            }
            return true;
        } catch (e) {
            console.warn('Falha ao validar sessão:', e?.message || e);
            return true; // não bloquear em caso de erro
        }
    }

    /**
     * Limpa sessão
     */
    clearSession() {
        try { sessionStorage.clear(); } catch(_){}
        // Não redirecionar imediatamente; permitir que o AuthManager gerencie
        try { sessionStorage.setItem('securityPendingLogin', '1'); } catch(_){ }
    }

    /**
     * Configura Content Security Policy
     */
    setupCSP() {
        // Verificar se CSP já está configurado
        const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingCSP) return;
        
        // Criar meta tag CSP
        const cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        cspMeta.content = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com",
            "frame-src 'self' https://accounts.google.com"
        ].join('; ');
        
        document.head.appendChild(cspMeta);
    }

    /**
     * Valida formulário
     */
    validateForm(formData, rules) {
        const errors = {};
        let isValid = true;
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];
            const validation = this.validateInput(value, rule.type, rule.options);
            
            if (!validation.valid) {
                errors[field] = validation.error;
                isValid = false;
            }
        }
        
        return { isValid, errors };
    }

    /**
     * Registra tentativa de segurança
     */
    logSecurityEvent(event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.warn('Evento de segurança:', logEntry);
        
        // Em produção, enviar para servidor de logs
        // this.sendSecurityLog(logEntry);
    }

    /**
     * Destrói o validador
     */
    destroy() {
        this.securityRules.clear();
        this.blockedIPs.clear();
        this.rateLimiter.clear();
        this.initialized = false;
        console.log('Validador de segurança destruído');
    }
}

// Inicializar automaticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.securityValidator = new SecurityValidator();
    });
} else {
    window.securityValidator = new SecurityValidator();
}

// Limpar rate limiter periodicamente
setInterval(() => {
    if (window.securityValidator) {
        const now = Date.now();
        for (const [key, data] of window.securityValidator.rateLimiter.entries()) {
            // Remover entradas antigas (mais de 1 hora)
            if (now - data.firstRequest > 3600000) {
                window.securityValidator.rateLimiter.delete(key);
            }
        }
    }
}, 600000); // A cada 10 minutos
