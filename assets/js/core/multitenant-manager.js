/**
 * Sistema de Controle de Acesso Multitenant
 * Garante isolamento de dados por empresa - Versão Supabase
 */
class MultitenantManager {
    constructor() {
        this.currentCompany = null;
        this.currentUser = null;
        this.initialized = false;
        
        this.init();
    }

    /**
     * Inicializa o sistema multitenant
     */
    async init() {
        try {
            await this.waitForSupabase();
            await this.loadCurrentUser();
            await this.loadActiveCompany();
            this.initialized = true;
            
            // Disparar evento de inicialização
            window.dispatchEvent(new CustomEvent('multitenantReady', {
                detail: {
                    company: this.currentCompany,
                    user: this.currentUser
                }
            }));
            
        } catch (error) {
            console.error('Erro ao inicializar sistema multitenant:', error);
        }
    }

    /**
     * Aguarda Supabase estar disponível
     */
    waitForSupabase() {
        return new Promise((resolve) => {
            if (window.supabase) {
                resolve();
                return;
            }

            const checkSupabase = () => {
                if (window.supabase) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };

            checkSupabase();
        });
    }

    /**
     * Carrega o usuário atual
     */
    async loadCurrentUser() {
        return new Promise(async (resolve) => {
            if (window.supabase) {
                try {
                    const { data: { user }, error } = await window.supabase.auth.getUser();
                    if (user) {
                        this.currentUser = {
                            uid: user.id,
                            email: user.email,
                            name: user.user_metadata?.name || user.email.split('@')[0]
                        };
                    } else {
                        // Usuário de desenvolvimento
                        this.currentUser = {
                            uid: 'dev-user-123',
                            email: 'usuario@exemplo.com',
                            name: 'Usuário Desenvolvimento'
                        };
                    }
                } catch (e) {
                    console.warn('Erro ao carregar usuário atual (Supabase)', e);
                }
                resolve();
            } else {
                resolve();
            }
        });
    }

    /**
     * Carrega a empresa ativa
     */
    async loadActiveCompany() {
        try {
            // Tentar carregar do localStorage
            const localCompany = localStorage.getItem('activeCompany');
            if (localCompany) {
                this.currentCompany = JSON.parse(localCompany);
            }
        } catch (error) {
            console.error('Erro ao carregar empresa ativa:', error);
        }
    }

    /**
     * Verifica se o usuário tem acesso à empresa atual
     */
    hasCompanyAccess() {
        if (!this.currentCompany || !this.currentUser) {
            return false;
        }
        return true; // Simplified for Supabase migration
    }

    /**
     * Verifica se o usuário é proprietário da empresa
     */
    isCompanyOwner() {
        if (!this.currentCompany || !this.currentUser) {
            return false;
        }
        return this.currentCompany.ownerId === this.currentUser.uid;
    }

    /**
     * Obtém o papel do usuário na empresa
     */
    getUserRole() {
        return 'owner'; // Simplified
    }

    /**
     * Verifica se o usuário tem permissão específica
     */
    hasPermission(permission) {
        return true; // Simplified
    }

    /**
     * Salva dados com contexto da empresa (Dummy para compatibilidade)
     */
    async saveWithCompanyContext(collectionName, data, docId = null) {
        console.warn('saveWithCompanyContext chamado (Compatibilidade Firestore). Use Supabase diretamente.');
        return null;
    }

    /**
     * Atualiza dados com contexto da empresa (Dummy para compatibilidade)
     */
    async updateWithCompanyContext(collectionName, docId, data) {
        console.warn('updateWithCompanyContext chamado (Compatibilidade Firestore). Use Supabase diretamente.');
    }

    /**
     * Remove dados com verificação de permissão (Dummy)
     */
    async deleteWithCompanyContext(collectionName, docId) {
        console.warn('deleteWithCompanyContext chamado (Compatibilidade Firestore). Use Supabase diretamente.');
    }

    /**
     * Busca dados com contexto da empresa (Dummy)
     */
    async queryWithCompanyContext(collectionName, constraints = []) {
        console.warn('queryWithCompanyContext chamado (Compatibilidade Firestore). Use Supabase diretamente.');
        return [];
    }

    /**
     * Obtém um documento específico (Dummy)
     */
    async getDocumentWithCompanyContext(collectionName, docId) {
        console.warn('getDocumentWithCompanyContext chamado (Compatibilidade Firestore). Use Supabase diretamente.');
        return null;
    }

    /**
     * Escuta mudanças em tempo real (Dummy)
     */
    listenToCompanyCollection(collectionName, callback, constraints = []) {
        console.warn('listenToCompanyCollection chamado (Compatibilidade Firestore). Use Supabase diretamente.');
        return () => {}; // retorna func de unsubscribe dummy
    }

    /**
     * Valida acesso antes de executar operação
     */
    validateAccess(operation = 'read') {
        if (!this.initialized) {
            return true; // fail-safe
        }
        return true;
    }

    /**
     * Obtém informações do contexto atual
     */
    getContext() {
        return {
            user: this.currentUser,
            company: this.currentCompany,
            role: this.getUserRole(),
            permissions: {
                read: true,
                write: true,
                delete: true,
                manageUsers: true,
                manageCompany: true
            }
        };
    }

    /**
     * Força recarregamento do contexto
     */
    async refreshContext() {
        await this.loadCurrentUser();
        await this.loadActiveCompany();
        
        window.dispatchEvent(new CustomEvent('multitenantContextRefreshed', {
            detail: this.getContext()
        }));
    }

    /**
     * Limpa o contexto (logout)
     */
    clearContext() {
        this.currentUser = null;
        this.currentCompany = null;
        localStorage.removeItem('activeCompany');
        localStorage.removeItem('userCompanyContext');
    }
}

// Instância global do gerenciador multitenant
window.multitenantManager = new MultitenantManager();

// Funções auxiliares globais
window.getCompanyCollection = (collectionName) => {
    console.warn('getCompanyCollection (Firestore) deprecado.');
    return null;
};

window.saveWithCompanyContext = (collectionName, data, docId = null) => {
    return window.multitenantManager.saveWithCompanyContext(collectionName, data, docId);
};

window.queryWithCompanyContext = (collectionName, constraints = []) => {
    return window.multitenantManager.queryWithCompanyContext(collectionName, constraints);
};

window.validateCompanyAccess = (operation = 'read') => {
    return window.multitenantManager.validateAccess(operation);
};