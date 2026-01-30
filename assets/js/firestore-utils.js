/**
 * Firestore Utilities
 * Utilitários para operações com Firestore
 * Depende de: firebase-config.js, multitenant-config.js
 */

class FirestoreUtils {
    constructor() {
        this.db = window.db;
        this.multitenantConfig = window.multitenantConfig;
        
        if (!this.db) {
            console.error('FirestoreUtils: Firebase database não está disponível');
            return;
        }
        
        if (!this.multitenantConfig) {
            console.warn('FirestoreUtils: MultitenantConfig não está disponível. Algumas funcionalidades podem não funcionar.');
        }
        
        console.log('FirestoreUtils inicializado com sucesso');
    }

    /**
     * Obtém uma coleção da empresa ativa
     * @param {string} collectionName - Nome da coleção
     * @returns {firebase.firestore.CollectionReference}
     */
    getCompanyCollection(collectionName) {
        if (this.multitenantConfig && this.multitenantConfig.getCompanyCollection) {
            return this.multitenantConfig.getCompanyCollection(collectionName);
        }
        
        // Fallback para coleção global se multitenant não estiver disponível
        return this.db.collection(collectionName);
    }

    /**
     * Busca documentos de uma coleção
     * @param {string} collectionName - Nome da coleção
     * @param {Array} constraints - Constraints para a query (where, orderBy, limit, etc.)
     * @returns {Promise<firebase.firestore.QuerySnapshot>}
     */
    async getDocuments(collectionName, constraints = []) {
        try {
            let query = this.getCompanyCollection(collectionName);
            
            // Aplica constraints se fornecidas
            constraints.forEach(constraint => {
                if (constraint.type === 'where') {
                    query = query.where(constraint.field, constraint.operator, constraint.value);
                } else if (constraint.type === 'orderBy') {
                    query = query.orderBy(constraint.field, constraint.direction || 'asc');
                } else if (constraint.type === 'limit') {
                    query = query.limit(constraint.value);
                }
            });
            
            const snapshot = await query.get();
            return snapshot;
        } catch (error) {
            console.error(`Erro ao buscar documentos da coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Busca um documento específico
     * @param {string} collectionName - Nome da coleção
     * @param {string} docId - ID do documento
     * @returns {Promise<firebase.firestore.DocumentSnapshot>}
     */
    async getDocument(collectionName, docId) {
        try {
            const docRef = this.getCompanyCollection(collectionName).doc(docId);
            const doc = await docRef.get();
            return doc;
        } catch (error) {
            console.error(`Erro ao buscar documento ${docId} da coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Adiciona um novo documento
     * @param {string} collectionName - Nome da coleção
     * @param {Object} data - Dados do documento
     * @returns {Promise<firebase.firestore.DocumentReference>}
     */
    async addDocument(collectionName, data) {
        try {
            const docRef = await this.getCompanyCollection(collectionName).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef;
        } catch (error) {
            console.error(`Erro ao adicionar documento na coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Atualiza um documento existente
     * @param {string} collectionName - Nome da coleção
     * @param {string} docId - ID do documento
     * @param {Object} data - Dados para atualizar
     * @returns {Promise<void>}
     */
    async updateDocument(collectionName, docId, data) {
        try {
            const docRef = this.getCompanyCollection(collectionName).doc(docId);
            await docRef.update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error(`Erro ao atualizar documento ${docId} da coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Remove um documento
     * @param {string} collectionName - Nome da coleção
     * @param {string} docId - ID do documento
     * @returns {Promise<void>}
     */
    async deleteDocument(collectionName, docId) {
        try {
            const docRef = this.getCompanyCollection(collectionName).doc(docId);
            await docRef.delete();
        } catch (error) {
            console.error(`Erro ao deletar documento ${docId} da coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Escuta mudanças em uma coleção
     * @param {string} collectionName - Nome da coleção
     * @param {Function} callback - Função de callback para mudanças
     * @param {Array} constraints - Constraints para a query
     * @returns {Function} Função para cancelar o listener
     */
    listenToCollection(collectionName, callback, constraints = []) {
        try {
            let query = this.getCompanyCollection(collectionName);
            
            // Aplica constraints se fornecidas
            constraints.forEach(constraint => {
                if (constraint.type === 'where') {
                    query = query.where(constraint.field, constraint.operator, constraint.value);
                } else if (constraint.type === 'orderBy') {
                    query = query.orderBy(constraint.field, constraint.direction || 'asc');
                } else if (constraint.type === 'limit') {
                    query = query.limit(constraint.value);
                }
            });
            
            return query.onSnapshot(callback, (error) => {
                console.error(`Erro no listener da coleção ${collectionName}:`, error);
            });
        } catch (error) {
            console.error(`Erro ao configurar listener para coleção ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Executa uma transação
     * @param {Function} updateFunction - Função que executa as operações da transação
     * @returns {Promise<any>}
     */
    async runTransaction(updateFunction) {
        try {
            return await this.db.runTransaction(updateFunction);
        } catch (error) {
            console.error('Erro ao executar transação:', error);
            throw error;
        }
    }

    /**
     * Executa operações em batch
     * @param {Array} operations - Array de operações {type: 'set'|'update'|'delete', ref: DocumentReference, data?: Object}
     * @returns {Promise<void>}
     */
    async executeBatch(operations) {
        try {
            const batch = this.db.batch();
            
            operations.forEach(operation => {
                switch (operation.type) {
                    case 'set':
                        batch.set(operation.ref, operation.data);
                        break;
                    case 'update':
                        batch.update(operation.ref, operation.data);
                        break;
                    case 'delete':
                        batch.delete(operation.ref);
                        break;
                    default:
                        console.warn(`Tipo de operação desconhecido: ${operation.type}`);
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error('Erro ao executar batch:', error);
            throw error;
        }
    }
}

// Disponibilizar globalmente
window.FirestoreUtils = FirestoreUtils;

// Criar instância global se as dependências estiverem disponíveis
if (window.db) {
    window.firestoreUtils = new FirestoreUtils();
    console.log('Instância global do FirestoreUtils criada');
} else {
    console.log('Aguardando Firebase para criar instância do FirestoreUtils');
    
    // Aguardar Firebase estar disponível
    const checkFirebase = setInterval(() => {
        if (window.db) {
            window.firestoreUtils = new FirestoreUtils();
            console.log('Instância global do FirestoreUtils criada após aguardar Firebase');
            clearInterval(checkFirebase);
        }
    }, 100);
}