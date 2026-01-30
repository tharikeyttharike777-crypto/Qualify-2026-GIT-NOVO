/**
 * Sistema de Controle de Acesso Multitenant
 * Garante isolamento de dados por empresa
 */
class MultitenantManager {
    constructor() {
        this.currentCompany = null;
        this.currentUser = null;
        this.db = null;
        this.initialized = false;
        
        this.init();
    }

    /**
     * Inicializa o sistema multitenant
     */
    async init() {
        try {
            await this.waitForFirebase();
            this.db = window.db;
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
     * Aguarda Firebase estar disponível
     */
    waitForFirebase() {
        return new Promise((resolve) => {
            if (window.firebase && window.db && window.auth) {
                resolve();
                return;
            }

            const checkFirebase = () => {
                if (window.firebase && window.db && window.auth) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };

            window.addEventListener('firebaseReady', () => {
                resolve();
            });

            checkFirebase();
        });
    }

    /**
     * Carrega o usuário atual
     */
    async loadCurrentUser() {
        return new Promise((resolve) => {
            if (window.auth) {
                window.auth.onAuthStateChanged((user) => {
                    if (user) {
                        this.currentUser = {
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0]
                        };
                    } else {
                        // Usuário de desenvolvimento
                        this.currentUser = {
                            uid: 'dev-user-123',
                            email: 'usuario@exemplo.com',
                            name: 'Usuário Desenvolvimento'
                        };
                    }
                    resolve();
                });
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
            // Primeiro, tentar carregar do localStorage
            const localCompany = localStorage.getItem('activeCompany');
            if (localCompany) {
                this.currentCompany = JSON.parse(localCompany);
            }

            // Verificar no Firestore se há empresa ativa definida
            if (this.currentUser && this.db) {
                const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.activeCompanyId) {
                        const companyDoc = await this.db.collection('companies').doc(userData.activeCompanyId).get();
                        if (companyDoc.exists) {
                            this.currentCompany = {
                                id: companyDoc.id,
                                ...companyDoc.data()
                            };
                            
                            // Atualizar localStorage
                            localStorage.setItem('activeCompany', JSON.stringify(this.currentCompany));
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Erro ao carregar empresa ativa:', error);
        }
    }

    /**
     * Obtém a referência da coleção isolada por empresa
     */
    getCompanyCollection(collectionName) {
        if (!this.currentCompany) {
            throw new Error('Nenhuma empresa ativa. Selecione uma empresa primeiro.');
        }

        if (!this.hasCompanyAccess()) {
            throw new Error('Acesso negado à empresa atual.');
        }

        return this.db.collection(`companies/${this.currentCompany.id}/${collectionName}`);
    }

    /**
     * Verifica se o usuário tem acesso à empresa atual
     */
    hasCompanyAccess() {
        if (!this.currentCompany || !this.currentUser) {
            return false;
        }

        // Verificar se o usuário está na lista de membros
        return this.currentCompany.members && 
               this.currentCompany.members.includes(this.currentUser.uid);
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
        if (!this.currentCompany || !this.currentUser) {
            return null;
        }

        return this.currentCompany.userRoles?.[this.currentUser.uid] || 'member';
    }

    /**
     * Verifica se o usuário tem permissão específica
     */
    hasPermission(permission) {
        const role = this.getUserRole();
        
        const permissions = {
            owner: ['read', 'write', 'delete', 'manage_users', 'manage_company'],
            admin: ['read', 'write', 'delete', 'manage_users'],
            manager: ['read', 'write', 'delete'],
            member: ['read', 'write'],
            viewer: ['read']
        };

        return permissions[role]?.includes(permission) || false;
    }

    /**
     * Adiciona filtros de empresa a uma query
     */
    addCompanyFilter(query) {
        if (!this.currentCompany) {
            throw new Error('Nenhuma empresa ativa');
        }

        // Para coleções isoladas, não é necessário filtro adicional
        // pois já estamos na subcoleção da empresa
        return query;
    }

    /**
     * Salva dados com contexto da empresa
     */
    async saveWithCompanyContext(collectionName, data, docId = null) {
        if (!this.hasPermission('write')) {
            throw new Error('Permissão insuficiente para salvar dados');
        }

        const collection = this.getCompanyCollection(collectionName);
        
        const dataWithContext = {
            ...data,
            companyId: this.currentCompany.id,
            createdBy: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (docId) {
            await collection.doc(docId).set(dataWithContext, { merge: true });
            return docId;
        } else {
            const docRef = await collection.add(dataWithContext);
            return docRef.id;
        }
    }

    /**
     * Atualiza dados com contexto da empresa
     */
    async updateWithCompanyContext(collectionName, docId, data) {
        if (!this.hasPermission('write')) {
            throw new Error('Permissão insuficiente para atualizar dados');
        }

        const collection = this.getCompanyCollection(collectionName);
        
        const updateData = {
            ...data,
            updatedBy: this.currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await collection.doc(docId).update(updateData);
    }

    /**
     * Remove dados com verificação de permissão
     */
    async deleteWithCompanyContext(collectionName, docId) {
        if (!this.hasPermission('delete')) {
            throw new Error('Permissão insuficiente para deletar dados');
        }

        const collection = this.getCompanyCollection(collectionName);
        await collection.doc(docId).delete();
    }

    /**
     * Busca dados com contexto da empresa
     */
    async queryWithCompanyContext(collectionName, constraints = []) {
        if (!this.hasPermission('read')) {
            throw new Error('Permissão insuficiente para ler dados');
        }

        let query = this.getCompanyCollection(collectionName);
        
        // Aplicar constraints
        constraints.forEach(constraint => {
            if (constraint.type === 'where') {
                query = query.where(constraint.field, constraint.operator, constraint.value);
            } else if (constraint.type === 'orderBy') {
                query = query.orderBy(constraint.field, constraint.direction);
            } else if (constraint.type === 'limit') {
                query = query.limit(constraint.value);
            }
        });

        const snapshot = await query.get();
        const results = [];
        
        snapshot.forEach(doc => {
            results.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return results;
    }

    /**
     * Obtém um documento específico
     */
    async getDocumentWithCompanyContext(collectionName, docId) {
        if (!this.hasPermission('read')) {
            throw new Error('Permissão insuficiente para ler dados');
        }

        const collection = this.getCompanyCollection(collectionName);
        const doc = await collection.doc(docId).get();
        
        if (!doc.exists) {
            return null;
        }

        return {
            id: doc.id,
            ...doc.data()
        };
    }

    /**
     * Escuta mudanças em tempo real com contexto da empresa
     */
    listenToCompanyCollection(collectionName, callback, constraints = []) {
        if (!this.hasPermission('read')) {
            throw new Error('Permissão insuficiente para ler dados');
        }

        let query = this.getCompanyCollection(collectionName);
        
        // Aplicar constraints
        constraints.forEach(constraint => {
            if (constraint.type === 'where') {
                query = query.where(constraint.field, constraint.operator, constraint.value);
            } else if (constraint.type === 'orderBy') {
                query = query.orderBy(constraint.field, constraint.direction);
            } else if (constraint.type === 'limit') {
                query = query.limit(constraint.value);
            }
        });

        return query.onSnapshot(snapshot => {
            const results = [];
            snapshot.forEach(doc => {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(results);
        });
    }

    /**
     * Valida acesso antes de executar operação
     */
    validateAccess(operation = 'read') {
        if (!this.initialized) {
            throw new Error('Sistema multitenant não inicializado');
        }

        if (!this.currentUser) {
            throw new Error('Usuário não autenticado');
        }

        if (!this.currentCompany) {
            throw new Error('Nenhuma empresa selecionada');
        }

        if (!this.hasCompanyAccess()) {
            throw new Error('Acesso negado à empresa atual');
        }

        if (!this.hasPermission(operation)) {
            throw new Error(`Permissão insuficiente para: ${operation}`);
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
                read: this.hasPermission('read'),
                write: this.hasPermission('write'),
                delete: this.hasPermission('delete'),
                manageUsers: this.hasPermission('manage_users'),
                manageCompany: this.hasPermission('manage_company')
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
    return window.multitenantManager.getCompanyCollection(collectionName);
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