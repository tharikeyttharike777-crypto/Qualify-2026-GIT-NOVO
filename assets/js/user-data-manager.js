/**
 * User Data Manager - Wrapper de compatibilidade para o sistema multitenant
 * Mantém compatibilidade com código existente enquanto usa o novo sistema
 */
class UserDataManager {
    constructor() {
        this.multitenantConfig = null;
        this.listeners = new Map();
        this.init();
    }

    async init() {
        // Aguarda o sistema multitenant estar disponível
        await this.waitForMultitenant();
    }

    async waitForMultitenant() {
        return new Promise((resolve) => {
            const checkMultitenant = () => {
                if (window.multitenantConfig) {
                    this.multitenantConfig = window.multitenantConfig;
                    resolve();
                } else {
                    setTimeout(checkMultitenant, 100);
                }
            };
            checkMultitenant();
        });
    }

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated() {
        if (!this.multitenantConfig) return false;
        return this.multitenantConfig.currentUser !== null;
    }

    /**
     * Obtém dados do usuário para uma coleção específica
     */
    async getUserData(collectionName, options = {}) {
        if (!this.multitenantConfig) {
            throw new Error('Sistema multitenant não disponível');
        }

        try {
            const collection = this.multitenantConfig.getCompanyCollection(collectionName);
            let query = collection;

            // Aplicar filtros se fornecidos
            if (options.filters && Array.isArray(options.filters)) {
                options.filters.forEach(filter => {
                    if (filter.field && filter.operator && filter.value !== undefined) {
                        query = query.where(filter.field, filter.operator, filter.value);
                    }
                });
            }

            // Aplicar ordenação se fornecida
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }

            const snapshot = await query.get();
            const documents = [];
            
            snapshot.forEach((doc) => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return documents;
        } catch (error) {
            console.error(`Erro ao buscar dados de ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Adiciona um documento à coleção da empresa
     */
    async addDocument(collectionName, data) {
        if (!this.multitenantConfig) {
            throw new Error('Sistema multitenant não disponível');
        }

        try {
            const collection = this.multitenantConfig.getCompanyCollection(collectionName);
            const docData = {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await collection.add(docData);
            return docRef;
        } catch (error) {
            console.error(`Erro ao adicionar documento em ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Atualiza um documento na coleção da empresa
     */
    async updateDocument(collectionName, documentId, data) {
        if (!this.multitenantConfig) {
            throw new Error('Sistema multitenant não disponível');
        }

        try {
            const collection = this.multitenantConfig.getCompanyCollection(collectionName);
            const updateData = {
                ...data,
                updatedAt: new Date()
            };

            await collection.doc(documentId).update(updateData);
            return true;
        } catch (error) {
            console.error(`Erro ao atualizar documento em ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Remove um documento da coleção da empresa
     */
    async deleteDocument(collectionName, documentId) {
        if (!this.multitenantConfig) {
            throw new Error('Sistema multitenant não disponível');
        }

        try {
            const collection = this.multitenantConfig.getCompanyCollection(collectionName);
            await collection.doc(documentId).delete();
            return true;
        } catch (error) {
            console.error(`Erro ao remover documento em ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Configura um listener em tempo real para uma coleção
     */
    setupRealtimeListener(collectionName, callback, options = {}) {
        if (!this.multitenantConfig) {
            console.warn('Sistema multitenant não disponível para listener');
            return null;
        }

        try {
            const collection = this.multitenantConfig.getCompanyCollection(collectionName);
            let query = collection;

            // Aplicar filtros se fornecidos
            if (options.filters && Array.isArray(options.filters)) {
                options.filters.forEach(filter => {
                    if (filter.field && filter.operator && filter.value !== undefined) {
                        query = query.where(filter.field, filter.operator, filter.value);
                    }
                });
            }

            // Aplicar ordenação se fornecida
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }

            const listenerId = `${collectionName}_${Date.now()}`;
            const unsubscribe = query.onSnapshot((snapshot) => {
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(documents);
            });

            this.listeners.set(listenerId, unsubscribe);
            return listenerId;
        } catch (error) {
            console.error(`Erro ao configurar listener para ${collectionName}:`, error);
            return null;
        }
    }

    /**
     * Remove um listener em tempo real
     */
    removeListener(listenerId) {
        if (this.listeners.has(listenerId)) {
            const unsubscribe = this.listeners.get(listenerId);
            unsubscribe();
            this.listeners.delete(listenerId);
            return true;
        }
        return false;
    }

    /**
     * Remove todos os listeners
     */
    removeAllListeners() {
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
    }
}

// Criar instância global
window.UserDataManager = UserDataManager;

// Inicializar quando o sistema multitenant estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (!window.userDataManager) {
        window.userDataManager = new UserDataManager();
    }
});