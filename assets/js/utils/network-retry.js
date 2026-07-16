/**
 * Utilitário para gerenciar reconexões de rede e retry de operações Firestore
 */
class NetworkRetryManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo inicial
        
        this.setupNetworkListeners();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Conexão de rede restaurada');
            this.isOnline = true;
            this.retryFailedOperations();
        });

        window.addEventListener('offline', () => {
            console.warn('Conexão de rede perdida');
            this.isOnline = false;
        });
    }

    async retryOperation(operationId, operation, maxRetries = this.maxRetries) {
        if (!this.isOnline) {
            console.warn('Operação adiada - sem conexão de rede:', operationId);
            return null;
        }

        const attempts = this.retryAttempts.get(operationId) || 0;
        
        if (attempts >= maxRetries) {
            console.error('Máximo de tentativas excedido para:', operationId);
            this.retryAttempts.delete(operationId);
            return null;
        }

        try {
            const result = await operation();
            this.retryAttempts.delete(operationId);
            return result;
        } catch (error) {
            this.retryAttempts.set(operationId, attempts + 1);
            
            if (this.isNetworkError(error)) {
                const delay = this.retryDelay * Math.pow(2, attempts); // Exponential backoff
                console.warn(`Erro de rede em ${operationId}. Tentativa ${attempts + 1}/${maxRetries}. Retry em ${delay}ms`);
                
                setTimeout(() => {
                    this.retryOperation(operationId, operation, maxRetries);
                }, delay);
            } else {
                console.error('Erro não relacionado à rede:', operationId, error);
                this.retryAttempts.delete(operationId);
            }
            
            throw error;
        }
    }

    isNetworkError(error) {
        const networkErrorCodes = [
            'unavailable',
            'deadline-exceeded', 
            'resource-exhausted',
            'aborted',
            'auth/network-request-failed',
            'network-request-failed'
        ];
        
        const networkErrorMessages = [
            'ERR_NETWORK',
            'ERR_ABORTED',
            'ERR_NAME_NOT_RESOLVED',
            'ERR_CONNECTION_REFUSED',
            'network AuthError',
            'timeout',
            'interrupted connection',
            'unreachable host'
        ];

        return networkErrorCodes.includes(error.code) || 
               networkErrorMessages.some(msg => error.message?.includes(msg));
    }

    // Método específico para retry de autenticação Supabase
    async retrySupabaseAuth(email, password, maxRetries = 3) {
        const operationId = `supabase-auth-${email}`;
        
        return this.retryOperation(operationId, async () => {
            if (!window.supabase) {
                throw new Error('Supabase Auth não está disponível');
            }
            
            console.log(`🔄 Tentando autenticação para: ${email}`);
            const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            console.log(`✅ Autenticação bem-sucedida para: ${email}`);
            return data;
        }, maxRetries);
    }

    // Método específico para retry de registro Supabase
    async retrySupabaseRegister(email, password, maxRetries = 3) {
        const operationId = `supabase-register-${email}`;

        return this.retryOperation(operationId, async () => {
            if (!window.supabase) {
                throw new Error('Supabase Auth não está disponível');
            }

            console.log(`🔄 Tentando registro para: ${email}`);
            const { data, error } = await window.supabase.auth.signUp({ email, password });
            if (error) throw error;
            console.log(`✅ Registro bem-sucedido para: ${email}`);
            return data;
        }, maxRetries);
    }

    retryFailedOperations() {
        console.log('Tentando reexecutar operações falhadas após reconexão...');
        // Esta função pode ser expandida para reexecutar operações específicas
        // que falharam devido a problemas de rede
    }

    clearRetryAttempts() {
        this.retryAttempts.clear();
    }
}

// Instância global
window.networkRetryManager = new NetworkRetryManager();

// Interceptar erros de Supabase (Opcional, futuro)
// ...