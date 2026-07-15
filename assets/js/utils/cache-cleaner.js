/**
 * Cache Cleaner - Sistema de limpeza automática de cache e localStorage
 * Versão: 20250127003
 */

class CacheCleaner {
    constructor() {
        this.CACHE_VERSION = '20250127003';
        this.STORAGE_KEY = 'app_cache_version';
        this.init();
    }

    init() {
        console.log('🧹 Cache Cleaner iniciado');
        
        const currentVersion = localStorage.getItem(this.STORAGE_KEY);
        
        if (currentVersion !== this.CACHE_VERSION) {
            console.log(`🧹 Versão do cache desatualizada (${currentVersion} → ${this.CACHE_VERSION})`);
            this.performFullCleanup();
        } else {
            console.log('✅ Cache atualizado, executando limpeza leve');
            this.performLightCleanup();
        }
    }

    performFullCleanup() {
        console.log('🧹 Executando limpeza completa do cache...');
        
        try {
            // 1. Limpar localStorage antigo (manter apenas dados essenciais)
            this.cleanOldLocalStorage();
            
            // 2. Limpar sessionStorage
            sessionStorage.clear();
            console.log('✅ SessionStorage limpo');
            
            // 3. Limpar IndexedDB (se existir)
            this.cleanIndexedDB();
            
            // 4. Forçar atualização do Service Worker
            this.updateServiceWorker();
            
            // 5. Atualizar versão do cache
            localStorage.setItem(this.STORAGE_KEY, this.CACHE_VERSION);
            
            console.log('✅ Limpeza completa concluída');
            
        } catch (error) {
            console.error('❌ Erro durante limpeza completa:', error);
        }
    }

    performLightCleanup() {
        console.log('🧹 Executando limpeza leve...');
        
        try {
            // Limpar apenas dados expirados
            this.cleanExpiredData();
            console.log('✅ Limpeza leve concluída');
            
        } catch (error) {
            console.error('❌ Erro durante limpeza leve:', error);
        }
    }

    cleanOldLocalStorage() {
        console.log('🧹 Limpando localStorage antigo...');
        
        // Lista de chaves essenciais que devem ser preservadas
        const essentialKeys = [
            'user_data',
            'auth_token',
            'selected_company',
            'user_preferences',
            'firebase_config',
            this.STORAGE_KEY
        ];
        
        const keysToRemove = [];
        
        // Identificar chaves antigas para remoção
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Remover chaves antigas ou temporárias
            if (key && !essentialKeys.includes(key)) {
                // Remover chaves com versões antigas
                if (key.includes('_v') || key.includes('cache_') || key.includes('temp_')) {
                    keysToRemove.push(key);
                }
                
                // Remover dados de sessões antigas (mais de 7 dias)
                if (key.includes('session_') || key.includes('last_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data && data.timestamp) {
                            const daysDiff = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
                            if (daysDiff > 7) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (e) {
                        // Se não conseguir parsear, remover
                        keysToRemove.push(key);
                    }
                }
            }
        }
        
        // Remover chaves identificadas
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Removido: ${key}`);
        });
        
        console.log(`✅ ${keysToRemove.length} itens removidos do localStorage`);
    }

    cleanExpiredData() {
        console.log('🧹 Limpando dados expirados...');
        
        const keysToCheck = [];
        
        // Coletar todas as chaves
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keysToCheck.push(key);
        }
        
        let removedCount = 0;
        
        keysToCheck.forEach(key => {
            try {
                const value = localStorage.getItem(key);
                if (value) {
                    const data = JSON.parse(value);
                    
                    // Verificar se tem timestamp de expiração
                    if (data && data.expires && Date.now() > data.expires) {
                        localStorage.removeItem(key);
                        removedCount++;
                        console.log(`🗑️ Expirado removido: ${key}`);
                    }
                }
            } catch (e) {
                // Ignorar erros de parsing
            }
        });
        
        console.log(`✅ ${removedCount} itens expirados removidos`);
    }

    async cleanIndexedDB() {
        console.log('🧹 Limpando IndexedDB...');
        
        try {
            if ('indexedDB' in window) {
                // Listar e limpar databases conhecidos
                const dbsToClean = ['firebaseLocalStorageDb', 'firebase-app-check-store'];
                
                for (const dbName of dbsToClean) {
                    try {
                        const deleteReq = indexedDB.deleteDatabase(dbName);
                        await new Promise((resolve, reject) => {
                            deleteReq.onsuccess = () => resolve();
                            deleteReq.onerror = () => reject(deleteReq.error);
                            deleteReq.onblocked = () => {
                                console.log(`⚠️ IndexedDB ${dbName} bloqueado, tentando novamente...`);
                                setTimeout(resolve, 1000);
                            };
                        });
                        console.log(`✅ IndexedDB ${dbName} limpo`);
                    } catch (error) {
                        console.log(`⚠️ Não foi possível limpar ${dbName}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Erro ao limpar IndexedDB:', error.message);
        }
    }

    async updateServiceWorker() {
        console.log('🧹 Atualizando Service Worker...');
        
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                
                for (const registration of registrations) {
                    await registration.update();
                    console.log('✅ Service Worker atualizado');
                }
            }
        } catch (error) {
            console.log('⚠️ Erro ao atualizar Service Worker:', error.message);
        }
    }

    // Método para limpeza manual
    manualCleanup() {
        console.log('🧹 Limpeza manual solicitada');
        localStorage.removeItem(this.STORAGE_KEY);
        this.performFullCleanup();
    }

    // Método para verificar status do cache
    getCacheStatus() {
        return {
            version: this.CACHE_VERSION,
            currentVersion: localStorage.getItem(this.STORAGE_KEY),
            isUpdated: localStorage.getItem(this.STORAGE_KEY) === this.CACHE_VERSION,
            localStorageSize: this.getLocalStorageSize(),
            sessionStorageSize: this.getSessionStorageSize()
        };
    }

    getLocalStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return Math.round(total / 1024) + ' KB';
    }

    getSessionStorageSize() {
        let total = 0;
        for (let key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key)) {
                total += sessionStorage[key].length + key.length;
            }
        }
        return Math.round(total / 1024) + ' KB';
    }
}

// Inicializar automaticamente
const cacheCleaner = new CacheCleaner();

// Expor globalmente para uso manual
window.CacheCleaner = CacheCleaner;
window.cacheCleaner = cacheCleaner;

console.log('🧹 Cache Cleaner carregado e ativo');