/**
 * Monitor de Conexão para detectar e resolver problemas de rede
 */
class ConnectionMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.connectionQuality = 'unknown';
        this.lastPingTime = null;
        this.pingInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.setupEventListeners();
        // Iniciar monitoramento apenas após a página estar carregada
        if (document.readyState === 'complete') {
            this.startConnectionMonitoring();
        } else {
            window.addEventListener('load', () => this.startConnectionMonitoring(), { once: true });
        }
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Conexão restaurada');
            this.isOnline = true;
            this.reconnectAttempts = 0;
            this.testSupabaseConnection();
        });

        window.addEventListener('offline', () => {
            console.warn('🚫 Conexão perdida');
            this.isOnline = false;
            this.showConnectionStatus('offline');
        });
    }

    startConnectionMonitoring() {
        // Verificar conexão a cada 60 segundos (menos intrusivo)
        this.pingInterval = setInterval(() => {
            this.checkConnectionQuality();
        }, 60000);

        // Verificação inicial
        this.checkConnectionQuality();
    }

    async checkConnectionQuality() {
        if (!this.isOnline) return;

        try {
            const startTime = Date.now();

            // Ping para recurso local estático (evita bloqueios externos)
            const fetchFn = window.fetchWithTimeout || window.fetch;
            await fetchFn('/assets/images/favicon.ico', {
                method: 'HEAD',
                cache: 'no-store',
                timeout: 5000
            });

            const pingTime = Date.now() - startTime;
            this.lastPingTime = pingTime;

            if (pingTime < 500) {
                this.connectionQuality = 'excellent';
            } else if (pingTime < 1000) {
                this.connectionQuality = 'good';
            } else if (pingTime < 2000) {
                this.connectionQuality = 'fair';
            } else {
                this.connectionQuality = 'poor';
            }

            console.log(`📶 Qualidade da conexão: ${this.connectionQuality} (${pingTime}ms)`);

        } catch (error) {
            // Silencia erros não-críticos no ping local; ajusta status sem spam
            if (error && (error.name === 'AbortError' || /aborted/i.test(String(error)))) {
                console.debug('⚠️ Ping abortado pelo timeout (não-crítico)');
            } else {
                console.debug('⚠️ Ping local falhou (não-crítico):', error);
            }
            this.connectionQuality = 'poor';

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
            }
        }
    }

    async testSupabaseConnection() {
        if (!window.supabase) {
            console.warn('Supabase não está disponível para teste de conexão');
            return false;
        }

        try {
            // Tentar uma operação simples do Supabase
            const { data, error } = await window.supabase.auth.getSession();
            if (error) throw error;
            console.log('⚡ Conexão Supabase OK');
            return true;
        } catch (error) {
            console.error('❌ Erro na conexão Supabase:', error);
            return false;
        }
    }

    async attemptReconnection() {
        this.reconnectAttempts++;
        console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        this.showConnectionStatus('reconnecting');
        
        // Aguardar um tempo crescente entre tentativas
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const isConnected = await this.testSupabaseConnection();
        
        if (isConnected) {
            console.log('✅ Reconexão bem-sucedida');
            this.reconnectAttempts = 0;
            this.hideConnectionStatus();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Falha na reconexão após múltiplas tentativas');
            this.showConnectionStatus('failed');
        }
    }

    showConnectionStatus(status) {
        // Remover status anterior
        this.hideConnectionStatus();
        
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            font-size: 14px;
        `;
        
        switch (status) {
            case 'offline':
                statusDiv.style.backgroundColor = '#dc3545';
                statusDiv.textContent = '🚫 Sem conexão';
                break;
            case 'reconnecting':
                statusDiv.style.backgroundColor = '#ffc107';
                statusDiv.style.color = '#000';
                statusDiv.textContent = '🔄 Reconectando...';
                break;
            case 'failed':
                statusDiv.style.backgroundColor = '#dc3545';
                statusDiv.textContent = '❌ Falha na conexão';
                break;
        }
        
        document.body.appendChild(statusDiv);
        
        // Auto-remover após 5 segundos para status de falha
        if (status === 'failed') {
            setTimeout(() => this.hideConnectionStatus(), 5000);
        }
    }

    hideConnectionStatus() {
        const statusDiv = document.getElementById('connection-status');
        if (statusDiv) {
            statusDiv.remove();
        }
    }

    getConnectionInfo() {
        return {
            isOnline: this.isOnline,
            quality: this.connectionQuality,
            lastPing: this.lastPingTime,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    destroy() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.hideConnectionStatus();
    }
}

// Inicializar monitor de conexão
window.connectionMonitor = new ConnectionMonitor();

console.log('📶 Monitor de conexão inicializado');