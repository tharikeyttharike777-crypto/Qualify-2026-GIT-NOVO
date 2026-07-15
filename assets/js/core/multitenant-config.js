/**
 * Configuração do Sistema Multitenant (SUPABASE)
 * Gerencia isolamento de dados por empresa e controle de acesso
 */

class MultitenantConfig {
    constructor() {
        this.currentUser = null;
        this.activeCompany = null;
        this.userCompanies = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('*** 🚀 INICIALIZANDO SISTEMA MULTITENANT (SUPABASE) ***');

            // Aguardar Supabase estar disponível no window
            if (!window.supabase) {
                await new Promise(resolve => {
                    let attempts = 0;
                    const check = () => {
                        if (window.supabase || attempts > 50) resolve();
                        else { attempts++; setTimeout(check, 100); }
                    };
                    check();
                });
            }

            if (!window.supabase) {
                console.error('Supabase não disponível no MultitenantConfig');
                return false;
            }

            // Carregar Sessão Usuário
            const { data: { session } } = await window.supabase.auth.getSession();
            this.currentUser = session?.user || null;

            if (this.currentUser) {
                await this.loadUserCompanies();
                await this.loadActiveCompany();
            } else {
                console.log('ℹ️ Usuário não autenticado');
            }

            this.initialized = true;
            console.log('*** ✅ SISTEMA MULTITENANT INICIALIZADO ***');

            window.dispatchEvent(new CustomEvent('multitenantReady', {
                detail: { initialized: true, config: this }
            }));

            return true;
        } catch (error) {
            console.error('❌ Erro fatal ao inicializar sistema multitenant:', error);
            this.initialized = true;
            return false;
        }
    }

    /**
     * Carrega empresas vinculadas ao usuário
     */
    async loadUserCompanies() {
        if (!this.currentUser) return;
        const uid = this.currentUser.id;

        try {
            // No Supabase, buscamos empresas onde o usuário é owner ou está na lista de membros
            // O ideal seria usar uma tabela de junção, mas mantemos o JSONB 'members' para compatibilidade
            const { data, error } = await window.supabase
                .from('empresas')
                .select('*');

            if (error) throw error;

            // Filtro manual (simulando permissões se o RLS não estiver estrito)
            this.userCompanies = data.filter(c =>
                c.owner_id === uid ||
                (Array.isArray(c.members) && c.members.includes(uid))
            );

            console.log(`🏢 ${this.userCompanies.length} empresas carregadas`);
            this.syncCompaniesToLocalStorage();

            window.dispatchEvent(new CustomEvent('companiesUpdated', {
                detail: { companies: this.userCompanies }
            }));
        } catch (e) {
            console.error('Erro ao carregar empresas:', e);
        }
    }

    /**
     * Define/Carrega a empresa ativa
     */
    async loadActiveCompany() {
        const empresaId = localStorage.getItem('empresaSelecionadaId');

        if (empresaId && this.userCompanies.length > 0) {
            const found = this.userCompanies.find(c => String(c.id) === String(empresaId));
            if (found) {
                this.activeCompany = found;
                console.log('🏢 Empresa ativa:', this.activeCompany.nome);
                return;
            }
        }

        // Fallback: primeira empresa disponível
        if (this.userCompanies.length > 0) {
            this.activeCompany = this.userCompanies[0];
            localStorage.setItem('empresaSelecionadaId', this.activeCompany.id);
            console.log('🏢 Definida empresa padrão:', this.activeCompany.nome);
        }
    }

    setActiveCompany(company) {
        if (!company) return;
        this.activeCompany = company;
        localStorage.setItem('empresaSelecionadaId', company.id);

        window.dispatchEvent(new CustomEvent('companyChanged', {
            detail: { companyId: company.id, company }
        }));
    }

    syncCompaniesToLocalStorage() {
        localStorage.setItem('userCompanies', JSON.stringify(this.userCompanies));
    }

    /**
     * CORE: getCompanyCollection
     * Retorna um objeto que simula a API do Firestore para compatibilidade.
     */
    getCompanyCollection(collectionName) {
        if (!this.activeCompany) throw new Error('Nenhuma empresa ativa selecionada');
        const companyId = this.activeCompany.id;

        return {
            _query: window.supabase.from(collectionName).select('*').eq('company_id', companyId),

            where: function (field, op, value) {
                const map = { '==': 'eq', '!=': 'neq', '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte', 'array-contains': 'contains' };
                const method = map[op] || 'eq';
                this._query = this._query[method](field, value);
                return this;
            },

            orderBy: function (field, direction = 'asc') {
                this._query = this._query.order(field, { ascending: direction === 'asc' });
                return this;
            },

            limit: function (n) {
                this._query = this._query.limit(n);
                return this;
            },

            get: async function () {
                const { data, error } = await this._query;
                if (error) throw error;
                return {
                    docs: data.map(d => ({ id: d.id, data: () => d })),
                    forEach: function (cb) { this.docs.forEach(cb); },
                    empty: data.length === 0,
                    size: data.length
                };
            },

            onSnapshot: function (callback) {
                const channelId = `realtime_${collectionName}_${Math.random().toString(36).substr(2, 9)}`;
                const channel = window.supabase.channel(channelId)
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: collectionName,
                        filter: `company_id=eq.${companyId}`
                    }, async () => {
                        const { data, error } = await this._query;
                        if (!error) {
                            callback({
                                docs: data.map(d => ({ id: d.id, data: () => d })),
                                forEach: function (cb) { this.docs.forEach(cb); },
                                empty: data.length === 0,
                                size: data.length
                            });
                        }
                    })
                    .subscribe();
                return () => { window.supabase.removeChannel(channel); };
            },

            doc: (docId) => {
                return {
                    get: async () => {
                        const { data, error } = await window.supabase.from(collectionName)
                            .select('*').eq('id', docId).eq('company_id', companyId).single();
                        if (error && error.code !== 'PGRST116') throw error;
                        return { exists: !!data, id: docId, data: () => data };
                    },
                    update: async (data) => {
                        const { error } = await window.supabase.from(collectionName)
                            .update(data).eq('id', docId).eq('company_id', companyId);
                        if (error) throw error;
                    },
                    set: async (data, options) => {
                        const { error } = await window.supabase.from(collectionName)
                            .upsert({ ...data, id: docId, company_id: companyId });
                        if (error) throw error;
                    },
                    delete: async () => {
                        const { error } = await window.supabase.from(collectionName)
                            .delete().eq('id', docId).eq('company_id', companyId);
                        if (error) throw error;
                    }
                };
            },

            add: async (data) => {
                const { data: inserted, error } = await window.supabase.from(collectionName)
                    .insert({ ...data, company_id: companyId }).select().single();
                if (error) throw error;
                return { id: inserted.id };
            }
        };
    }

    // Getters
    getActiveCompany() { return this.activeCompany; }
    getUserCompanies() { return this.userCompanies; }
    getCurrentUser() { return this.currentUser; }
    isInitialized() { return this.initialized; }

    // Stubs para compatibilidade com código que chama métodos que não existem mais
    setupFirestoreErrorHandling() { }
    setupFirestoreFallback() { }
    init() { this.initialize(); }
    cleanup() { }
}

// Inicialização Global
window.multitenantConfig = new MultitenantConfig();

// Iniciar quando o Supabase estiver pronto ou no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.multitenantConfig.initialize();
});

console.log('✅ MultitenantConfig Supabase carregado.');
