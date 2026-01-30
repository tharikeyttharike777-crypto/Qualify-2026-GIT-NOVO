/**
 * Configuração do Sistema Multitenant
 * Gerencia isolamento de dados por empresa e controle de acesso
 */

class MultitenantConfig {
    constructor() {
        this.currentUser = null;
        this.activeCompany = null;
        this.userCompanies = [];
        this.initialized = false;
        this.listenerConfigured = false;

        // Configurar tratamento global de erros do Firestore
        this.setupFirestoreErrorHandling();
    }

    /**
      * Configurar tratamento global de erros do Firestore
      */
    setupFirestoreErrorHandling() {
        // Configurar retry automático para conexões perdidas
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const settings = {
                experimentalForceLongPolling: false, // Usar WebSocket quando possível
                experimentalAutoDetectLongPolling: true, // Auto-detectar quando usar polling
                ignoreUndefinedProperties: true,
                // Configurações de retry
                experimentalTabSynchronization: false,
                // Timeout mais longo para conexões instáveis
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            };

            try {
                if (window.db && typeof window.db.settings === 'function') {
                    window.db.settings(settings);
                    console.log('✅ Configurações de conectividade do Firestore aplicadas');
                }
            } catch (error) {
                console.warn('⚠️ Não foi possível aplicar configurações do Firestore:', error.message);
            }
        }

        // Configurar fallback automático para Long Polling em caso de falhas
        this.setupFirestoreFallback();
    }

    /**
     * Configurar fallback automático para Long Polling
     */
    setupFirestoreFallback() {
        // Detectar falhas de conexão WebSocket e forçar Long Polling
        let connectionFailures = 0;
        const maxFailures = 3;

        // Interceptar falhas de conexão
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            return originalFetch.apply(this, args).catch(error => {
                if (error.message.includes('ERR_ABORTED') &&
                    args[0] && args[0].includes('firestore.googleapis.com')) {

                    connectionFailures++;
                    console.log(`🔄 Falha de conexão Firestore detectada (${connectionFailures}/${maxFailures})`);

                    if (connectionFailures >= maxFailures) {
                        console.log('🔄 Forçando Long Polling devido a múltiplas falhas de WebSocket');
                        // Forçar Long Polling
                        if (window.db) {
                            try {
                                window.db.settings({
                                    experimentalForceLongPolling: true,
                                    experimentalAutoDetectLongPolling: false
                                });
                            } catch (settingsError) {
                                console.warn('Não foi possível forçar Long Polling:', settingsError.message);
                            }
                        }
                    }
                }
                throw error;
            });
        };
    }

    /**
     * Configuração inicial do sistema multitenancy
     */
    init(uid) {
        console.log('Inicializando sistema multitenancy para UID:', uid);

        // Verificar se há empresa selecionada no localStorage
        const empresaSelecionadaId = localStorage.getItem('empresaSelecionadaId');
        if (empresaSelecionadaId) {
            console.log('Empresa já selecionada:', empresaSelecionadaId);
            this.setCurrentCompany(empresaSelecionadaId);
            return;
        }

        // Se não há empresa selecionada, buscar empresas disponíveis
        this.loadUserCompanies(uid);
    }

    /**
     * Inicializa o sistema multitenant
     */
    // Método para limpar listeners e estado anterior
    cleanup() {
        console.log('*** 🧹 Limpando estado anterior do multitenant ***');

        // Limpa listeners de Firestore se existirem
        if (this.ownerListener) {
            this.ownerListener();
            this.ownerListener = null;
        }

        if (this.memberListener) {
            this.memberListener();
            this.memberListener = null;
        }

        // Limpa estado
        this.userCompanies = [];
        this.activeCompany = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('*** 🚀 INICIALIZANDO SISTEMA MULTITENANT ***');

            // FORÇA REINICIALIZAÇÃO SE NECESSÁRIO
            if (this.initialized) {
                console.log('*** 🔄 Sistema já inicializado - FORÇANDO REINICIALIZAÇÃO ***');
                this.cleanup();
            }

            // Aguarda Firebase estar disponível
            await this.waitForFirebase();

            // Verifica conectividade (mas não falha se houver problemas em desenvolvimento)
            const isConnected = await this.checkFirebaseConnectivity();
            if (!isConnected && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                console.warn('⚠️ Problemas de conectividade detectados, mas continuando...');
            }

            // Carrega usuário atual
            await this.loadCurrentUser();

            // Carrega empresas do usuário (só se houver usuário autenticado)
            if (this.currentUser) {
                console.log('*** 🏢 USUÁRIO AUTENTICADO - CARREGANDO EMPRESAS IMEDIATAMENTE ***');
                await this.loadUserCompanies();

                // Carrega empresa ativa
                await this.loadActiveCompany();

                console.log('*** ✅ EMPRESAS CARREGADAS:', this.userCompanies.length);
            } else {
                console.log('ℹ️ Usuário não autenticado - pulando carregamento de empresas');
                this.userCompanies = [];
                this.activeCompany = null;
            }

            this.initialized = true;
            console.log('*** ✅ SISTEMA MULTITENANT INICIALIZADO COM SUCESSO ***');

            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema multitenant:', error);

            // Mesmo com erro, marca como inicializado para permitir operações básicas
            this.initialized = true;

            return false;
        }
    }

    /**
     * Aguarda Firebase estar disponível
     */
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 segundos

            const checkFirebase = () => {
                attempts++;

                if (window.firebase && window.auth && window.db) {
                    console.log('✅ Firebase carregado com sucesso');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Firebase não carregou após 10 segundos');
                    reject(new Error('Firebase não carregou - verifique a conexão com a internet'));
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };

            checkFirebase();
        });
    }

    /**
     * Verifica se o Firebase está funcionando corretamente
     */
    async checkFirebaseConnectivity() {
        try {
            console.log('🔍 Verificando conectividade do Firebase...');

            // Evita operações que podem falhar por regras de permissão
            // Verifica se a instância e o usuário estão acessíveis
            if (!window.db || !firebase || !firebase.auth) {
                console.warn('⚠️ Firebase não está completamente inicializado');
                return false;
            }

            const user = firebase.auth().currentUser;
            if (user && user.uid) {
                console.log('✅ Firebase inicializado e usuário autenticado:', user.email);
                return true;
            }

            // Como fallback, apenas confirma que o app está ativo
            if (firebase.apps && firebase.apps.length > 0) {
                console.log('✅ Firebase App ativo (sem usuário autenticado)');
                return true;
            }

            console.warn('⚠️ Firebase App não identificado');
            return false;

        } catch (error) {
            // Tratamos erros de permissão como não-críticos para a conectividade
            const msg = (error && error.message) || '';
            if (msg.includes('Missing or insufficient permissions')) {
                console.info('ℹ️ Firestore retornou permissão insuficiente em verificação — esperado para regras restritivas. Continuando.');
                return true;
            }
            console.warn('⚠️ Problema de conectividade com Firebase:', msg);

            // Em desenvolvimento local, isso é esperado
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('🏠 Ambiente local detectado - continuando em modo de desenvolvimento');
                return true; // Permite continuar em desenvolvimento
            }

            return false;
        }
    }

    /**
     * Salva os dados do usuário no localStorage
     */
    saveUserDataToLocalStorage(user) {
        // REMOVIDO: qualquer salvamento de identidade/autenticação em localStorage.
        // Mantemos apenas atualização de UI e evento para compatibilidade.
        if (user) {
            // Atualiza o sidebar se estiver disponível
            if (window.modernSidebar && typeof window.modernSidebar.renderUserCompanyInfo === 'function') {
                setTimeout(() => {
                    window.modernSidebar.renderUserCompanyInfo();
                }, 100);
            }

            // Dispara evento customizado para notificar outras partes do sistema
            document.dispatchEvent(new CustomEvent('userDataUpdated', {
                detail: { email: user.email, displayName: user.displayName }
            }));
        }
    }

    /**
     * Carrega o usuário atual do Firebase Auth ou AuthGuard
     */
    async loadCurrentUser() {
        // Fonte da Verdade: somente o parâmetro `user` do onAuthStateChanged
        return new Promise((resolve) => {
            if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                window.auth.onAuthStateChanged((user) => {
                    console.log('*** onAuthStateChanged (multitenant) DISPARADO. User UID:', user ? user.uid : 'NULL ***');
                    if (user && user.uid) {
                        this.currentUser = {
                            uid: user.uid,
                            id: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email
                        };
                        console.log('👤 Usuário carregado do Firebase:', this.currentUser.email);
                        resolve(this.currentUser);
                    } else {
                        this.currentUser = null;
                        console.warn('❌ Nenhum usuário autenticado (multitenant)');
                        resolve(null);
                    }
                });
            } else {
                console.error('❌ Firebase Auth indisponível ao carregar usuário');
                resolve(null);
            }
        });
    }

    setupCompanyListener(uid) { // Recebe UID VÁLIDO
        if (!uid) { // PROTEÇÃO EXTRA
            console.error("ERRO CRÍTICO: setupCompanyListener chamado com UID inválido!");
            return;
        }
        console.log("[DIAGNÓSTICO] SETUP COMPANY LISTENER - UID:", uid);
        console.log("🔍 SETUP COMPANY LISTENER - Usuário atual:", this.currentUser);

        // Se houver suporte ao Composite Filter (or), usa-o
        const hasCompositeFilter = !!(firebase && firebase.firestore && firebase.firestore.Filter && typeof firebase.firestore.Filter.or === 'function');
        console.log("🔍 SETUP COMPANY LISTENER - Suporte a Filter.or:", hasCompositeFilter);

        if (hasCompositeFilter) {
            try {
                console.log(`[DIAGNÓSTICO] Executando consulta OR para UID: ${uid}`);
                const queryEmpresas = window.db.collection('empresas').where(
                    firebase.firestore.Filter.or(
                        firebase.firestore.Filter.where('members', 'array-contains', uid),
                        firebase.firestore.Filter.where('ownerId', '==', uid)
                    )
                );

                queryEmpresas.onSnapshot(snapshot => {
                    const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    console.log("🔍 SNAPSHOT FILTER.OR - Empresas encontradas:", companies.length);
                    console.log("🔍 SNAPSHOT FILTER.OR - Dados das empresas:", companies);

                    // Verifica se a renderização automática está desabilitada
                    if (!window.DISABLE_MULTITENANT_AUTO_RENDER) {
                        renderCompanies(companies);
                    } else {
                        console.log("🚫 Renderização automática do multitenant desabilitada nesta página");
                    }
                }, error => {
                    console.error("❌ ERRO no onSnapshot com Filter.or:", error.message);
                    console.error("❌ ERRO código:", error.code);
                    // Fallback para consultas separadas realtime
                    this.setupRealtimeFallback(uid);
                });
                return;
            } catch (error) {
                console.error("❌ Falha ao usar Filter.or:", error);
                // Fallback para consultas separadas realtime
                this.setupRealtimeFallback(uid);
                return;
            }
        }

        // Sem suporte a Filter.or: configura dois listeners e combina resultados
        this.setupRealtimeFallback(uid);
    }

    // Fallback realtime: dois onSnapshot combinados (ownerId e members)
    setupRealtimeFallback(uid) {
        console.log('[DIAGNÓSTICO] FALLBACK REALTIME - Executando para UID:', uid);
        try {
            const ownerQuery = window.db.collection('empresas').where('ownerId', '==', uid);
            const memberQuery = window.db.collection('empresas').where('members', 'array-contains', uid);
            console.log(`[DIAGNÓSTICO] Executando consulta OWNER para UID: ${uid}`);
            console.log(`[DIAGNÓSTICO] Executando consulta MEMBER para UID: ${uid}`);

            let ownerData = {};
            let memberData = {};
            let ownerListenerActive = false;
            let memberListenerActive = false;
            let ownerUnsubscribe = null;
            let memberUnsubscribe = null;

            const combineAndRender = () => {
                const map = new Map();
                [...Object.values(ownerData), ...Object.values(memberData)].forEach(item => {
                    if (item) map.set(item.id, item);
                });
                const companies = Array.from(map.values());
                console.log('🔍 FALLBACK REALTIME - Empresas combinadas:', companies.length);
                console.log('🔍 FALLBACK REALTIME - Dados das empresas:', companies);

                // Verifica se a renderização automática está desabilitada
                if (!window.DISABLE_MULTITENANT_AUTO_RENDER) {
                    renderCompanies(companies);
                } else {
                    console.log("🚫 Renderização automática do multitenant desabilitada nesta página");
                }
            };

            // Função para limpar listeners
            const cleanupListeners = () => {
                if (ownerUnsubscribe) {
                    ownerUnsubscribe();
                    ownerUnsubscribe = null;
                }
                if (memberUnsubscribe) {
                    memberUnsubscribe();
                    memberUnsubscribe = null;
                }
            };

            // Owner Query com tratamento melhorado
            ownerUnsubscribe = ownerQuery.onSnapshot(snapshot => {
                ownerListenerActive = true;
                ownerData = {};
                console.log('🔍 OWNER QUERY - Snapshot recebido com', snapshot.docs.length, 'documentos');
                snapshot.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() };
                    ownerData[doc.id] = data;
                    console.log('🔍 OWNER QUERY - Empresa encontrada:', data.name, 'ID:', data.id, 'OwnerID:', data.ownerId);
                });
                combineAndRender();
            }, error => {
                ownerListenerActive = false;
                console.warn('❌ OWNER QUERY - Erro no onSnapshot para UID', uid, ':', error.message);
                console.warn('❌ OWNER QUERY - Código do erro:', error.code);

                // Se for erro de permissão, tenta fallback com consulta única
                if (error.code === 'permission-denied') {
                    console.log('🔄 OWNER QUERY - Tentando fallback com consulta única...');
                    ownerQuery.get().then(snapshot => {
                        ownerData = {};
                        console.log('🔍 OWNER QUERY FALLBACK - Snapshot recebido com', snapshot.docs.length, 'documentos');
                        snapshot.docs.forEach(doc => {
                            const data = { id: doc.id, ...doc.data() };
                            ownerData[doc.id] = data;
                            console.log('🔍 OWNER QUERY FALLBACK - Empresa encontrada:', data.name, 'ID:', data.id, 'OwnerID:', data.ownerId);
                        });
                        combineAndRender();
                    }).catch(fallbackError => {
                        console.warn('❌ OWNER QUERY FALLBACK - Também falhou:', fallbackError.message);
                        ownerData = {};
                        combineAndRender();
                    });
                } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
                    // Erro de conectividade - tenta reconectar após delay
                    console.log('Erro de conectividade no ownerQuery, tentando reconectar em 5s...');
                    setTimeout(() => {
                        if (!ownerListenerActive) {
                            this.setupRealtimeFallback(uid);
                        }
                    }, 5000);
                }
            });

            // Member Query com tratamento melhorado
            memberUnsubscribe = memberQuery.onSnapshot(snapshot => {
                memberListenerActive = true;
                memberData = {};
                snapshot.docs.forEach(doc => { memberData[doc.id] = { id: doc.id, ...doc.data() }; });
                combineAndRender();
            }, error => {
                memberListenerActive = false;

                // Suprimir log de erro para permission-denied no memberQuery (comportamento esperado)
                if (error.code === 'permission-denied') {
                    console.log('memberQuery: Sem permissão para consultar empresas como membro (comportamento normal)');
                    // Tenta fallback silenciosamente
                    memberQuery.get().then(snapshot => {
                        memberData = {};
                        snapshot.docs.forEach(doc => { memberData[doc.id] = { id: doc.id, ...doc.data() }; });
                        combineAndRender();
                    }).catch(fallbackError => {
                        // Falha silenciosa - continua apenas com ownerData
                        memberData = {};
                        combineAndRender();
                    });
                } else {
                    console.warn('Erro no memberQuery onSnapshot para UID', uid, ':', error.message);

                    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
                        // Erro de conectividade - tenta reconectar após delay
                        console.log('Erro de conectividade no memberQuery, tentando reconectar em 5s...');
                        setTimeout(() => {
                            if (!memberListenerActive) {
                                this.setupRealtimeFallback(uid);
                            }
                        }, 5000);
                    }
                }
            });

            // Salvar referências para limpeza posterior se necessário
            this.ownerUnsubscribe = ownerUnsubscribe;
            this.memberUnsubscribe = memberUnsubscribe;

        } catch (e) {
            console.error('Falha no fallback realtime:', e);
            // Último recurso: consulta única com polling
            fallbackQuery(uid);
        }
    }

    /**
     * Método para atualizar empresas dos listeners separados
     */
    async updateCompaniesFromSnapshot(uid) {
        try {
            if (!uid) return;

            // Executa ambas as consultas e combina os resultados
            const consultaMembers = window.db.collection('empresas')
                .where('members', 'array-contains', uid);

            const consultaOwner = window.db.collection('empresas')
                .where('ownerId', '==', uid);

            const promises = [
                consultaMembers.get(),
                consultaOwner.get()
            ];

            const snapshots = await Promise.all(promises);
            const allDocs = new Map();

            // Combina resultados evitando duplicatas
            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    allDocs.set(doc.id, { id: doc.id, ...doc.data() });
                });
            });

            const companies = Array.from(allDocs.values());
            console.log("[DIAGNÓSTICO] EMPRESAS ATUALIZADAS VIA LISTENERS. Docs:", companies.length);

            // Atualiza lista de empresas
            this.userCompanies = companies;

            // Sincroniza com localStorage
            this.syncCompaniesToLocalStorage();

            console.log('🏢 Empresas atualizadas via listeners combinados:', this.userCompanies.length);

            // Carrega empresa ativa se necessário
            if (!this.activeCompany && this.userCompanies.length > 0) {
                this.loadActiveCompany();
            }

            // Renderiza empresas se estiver na página trocar-empresa
            if (typeof renderCompanies === 'function') {
                // Verifica se a renderização automática está desabilitada
                if (!window.DISABLE_MULTITENANT_AUTO_RENDER) {
                    renderCompanies(companies);
                } else {
                    console.log("🚫 Renderização automática do multitenant desabilitada nesta página");
                }
            }

            // Dispara evento para atualizar UI
            window.dispatchEvent(new CustomEvent('companiesUpdated', {
                detail: { companies: this.userCompanies }
            }));

        } catch (error) {
            console.error("Erro ao atualizar empresas dos listeners:", error);
        }
    }

    /**
     * Carrega empresas do usuário atual (método legado - mantido para compatibilidade)
     */
    async loadUserCompanies(uid) {
        // Resolve UID a partir dos parâmetros, usuário atual ou auth
        const resolvedUid = uid
            || (this.currentUser && this.currentUser.uid)
            || (window.auth && window.auth.currentUser && window.auth.currentUser.uid)
            || null;

        // Se já configurado e o UID atual é o mesmo, não refaz
        if (this.listenerConfigured && resolvedUid) {
            console.log('🏢 Listener de empresas já configurado para UID:', resolvedUid);
            return;
        }

        // Se não temos UID ainda, não marque como configurado; aguarde auth
        if (!resolvedUid) {
            console.warn('Não foi possível configurar listener: UID inválido. Aguarde onAuthStateChanged.');
            // Fallback: aguarda autenticação e configura assim que o usuário estiver disponível
            if (!this.authWaiterAttached && window.auth && typeof window.auth.onAuthStateChanged === 'function') {
                this.authWaiterAttached = true;
                window.auth.onAuthStateChanged((user) => {
                    if (user && user.uid && !this.listenerConfigured) {
                        try {
                            this.currentUser = { uid: user.uid, id: user.uid, email: user.email, displayName: user.displayName || user.email };
                            this.setupCompanyListener(user.uid);
                            this.listenerConfigured = true;
                            console.log('🏢 Listener de empresas configurado após onAuthStateChanged. UID:', user.uid);
                            // Carrega/atualiza empresa ativa se necessário
                            this.loadActiveCompany();
                        } catch (e) {
                            console.error('Falha ao configurar listener após autenticação:', e);
                        }
                    }
                });
            }
            return;
        }

        // Configura listener com UID válido e marca como configurado
        this.setupCompanyListener(resolvedUid);
        this.listenerConfigured = true;
        console.log('🏢 Listener de empresas configurado para UID:', resolvedUid);
    }

    /**
     * Mostra mensagem de fallback para erro de permissão
     */
    showPermissionFallbackMessage() {
        console.log('ℹ️ Modo fallback ativado - usuário pode criar primeira empresa');

        // Não mostrar erro para o usuário, pois isso é normal para novos usuários
        // A interface permitirá criar a primeira empresa normalmente
    }

    /**
     * Mostra mensagem de erro de índice
     */
    showIndexErrorMessage() {
        const message = 'Configuração do banco de dados em andamento. Tente novamente em alguns minutos.';
        console.warn('⚠️', message);

        // Mostrar notificação discreta
        if (typeof this.showNotification === 'function') {
            this.showNotification(message, 'warning');
        }
    }

    /**
     * Mostra mensagem de erro genérico
     */
    showGenericErrorMessage(error) {
        const message = 'Erro temporário ao carregar empresas. Tente recarregar a página.';
        console.error('💥', message, error);

        // Mostrar notificação de erro
        if (typeof this.showNotification === 'function') {
            this.showNotification(message, 'error');
        }
    }

    /**
     * Carrega empresa ativa do localStorage
     */
    async loadActiveCompany() {
        const activeCompanyId = localStorage.getItem('activeCompanyId');

        if (activeCompanyId && this.userCompanies.length > 0) {
            const company = this.userCompanies.find(c => c.id === activeCompanyId);
            if (company) {
                this.activeCompany = company;
                console.log('🏢 Empresa ativa:', company.name);
            }
        }

        // Se não há empresa ativa e há empresas disponíveis, define a primeira
        if (!this.activeCompany && this.userCompanies.length > 0) {
            this.setActiveCompany(this.userCompanies[0]);
        }
    }

    /**
     * Define empresa ativa
     */
    setActiveCompany(company) {
        // PROTEÇÃO CONTRA RECURSÃO INFINITA
        if (this.activeCompany && this.activeCompany.id === company.id) {
            console.log('🔄 Empresa já é a ativa, evitando recursão:', company.name);
            return; // Caso base: se a empresa já é a ativa, não faz nada
        }

        this.activeCompany = company;
        localStorage.setItem('activeCompanyId', company.id);
        console.log('🏢 Empresa ativa definida:', company.name);

        // Dispara eventos de mudança de empresa
        window.dispatchEvent(new CustomEvent('activeCompanyChanged', {
            detail: { company }
        }));
        window.dispatchEvent(new CustomEvent('companyChanged', {
            detail: { companyId: company.id, company }
        }));
    }

    /**
     * Sincroniza empresas com localStorage
     */
    syncCompaniesToLocalStorage() {
        try {
            localStorage.setItem('userCompanies', JSON.stringify(this.userCompanies));
            console.log('💾 Empresas sincronizadas com localStorage:', this.userCompanies.length);
        } catch (error) {
            console.error('❌ Erro ao sincronizar empresas com localStorage:', error);
        }
    }

    /**
     * Cria nova empresa
     */
    async createCompany(companyData) {
        try {
            const uid = (firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid) || (this.currentUser && this.currentUser.uid) || null;
            console.log('Salvando empresa para UID:', uid);
            console.log('🔧 Iniciando criação de empresa:', companyData.name);

            // Verifica se o usuário está autenticado
            if (!this.currentUser) {
                const error = new Error('Usuário não autenticado');
                error.code = 'unauthenticated';
                throw error;
            }

            console.log('👤 Usuário autenticado:', this.currentUser.uid);

            // Valida CNPJ
            if (!this.isValidCNPJ(companyData.cnpj)) {
                const error = new Error('CNPJ inválido');
                error.code = 'invalid-argument';
                throw error;
            }

            console.log('✅ CNPJ válido:', companyData.cnpj);

            // Verifica se CNPJ já existe
            console.log('🔍 Verificando se CNPJ já existe...');
            const exists = await this.checkCNPJExists(companyData.cnpj);
            if (exists) {
                const error = new Error('CNPJ já cadastrado por outra empresa');
                error.code = 'already-exists';
                throw error;
            }

            console.log('✅ CNPJ disponível');

            // Verifica limite de empresas por usuário (exemplo: máximo 5 empresas)
            if (this.userCompanies.length >= 5) {
                const error = new Error('Limite máximo de empresas atingido (5). Faça upgrade do seu plano.');
                error.code = 'quota-exceeded';
                throw error;
            }

            console.log('✅ Limite de empresas OK:', this.userCompanies.length, '/5');

            // Dados da empresa - CORRIGIDO para incluir members obrigatório
            const newCompany = {
                name: companyData.name,
                cnpj: companyData.cnpj,
                city: companyData.city,
                state: companyData.state,
                type: companyData.type,
                responsible: companyData.responsible,
                description: companyData.description || '',
                ownerId: this.currentUser.uid,
                members: [this.currentUser.uid], // OBRIGATÓRIO pelas regras de segurança
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            };

            console.log('💾 Salvando empresa no Firestore...');

            // Salva no Firestore
            const docRef = await window.db.collection('empresas').add(newCompany);

            // Adiciona ID ao objeto
            newCompany.id = docRef.id;

            console.log('✅ Empresa salva no Firestore com ID:', docRef.id);

            // Atualiza lista local
            this.userCompanies.unshift(newCompany);

            // Sincroniza com localStorage
            this.syncCompaniesToLocalStorage();

            // Define como empresa ativa se for a primeira
            if (this.userCompanies.length === 1) {
                console.log('🎯 Definindo como empresa ativa (primeira empresa)');
                this.setActiveCompany(newCompany);
            }

            console.log('✅ Empresa criada com sucesso:', newCompany.name);
            return newCompany;

        } catch (error) {
            console.error('❌ Erro ao criar empresa:', error);

            // Se o erro já tem um código, mantém
            if (error.code) {
                throw error;
            }

            // Analisa erros do Firestore com mais detalhes
            if (error.message) {
                if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
                    console.error('🔒 Erro de permissão detalhado:', {
                        code: error.code,
                        message: error.message,
                        userId: this.currentUser?.uid,
                        timestamp: new Date().toISOString()
                    });

                    const newError = new Error('Erro de permissão: Verifique se você está logado corretamente e tente novamente. Se o problema persistir, entre em contato com o suporte.');
                    newError.code = 'permission-denied';
                    throw newError;

                } else if (error.message.includes('failed-precondition') && error.message.includes('index')) {
                    console.error('🔍 Erro de índice do Firestore:', error.message);

                    const newError = new Error('Sistema em configuração. Aguarde alguns minutos e tente novamente.');
                    newError.code = 'index-missing';
                    throw newError;

                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    const newError = new Error('Erro de conexão. Verifique sua internet e tente novamente.');
                    newError.code = 'network-error';
                    throw newError;

                } else if (error.message.includes('quota') || error.message.includes('resource-exhausted')) {
                    const newError = new Error('Limite de uso temporariamente excedido. Tente novamente em alguns minutos.');
                    newError.code = 'resource-exhausted';
                    throw newError;

                } else if (error.message.includes('unauthenticated')) {
                    const newError = new Error('Sessão expirada. Faça login novamente.');
                    newError.code = 'unauthenticated';
                    throw newError;
                }
            }

            // Erro genérico
            const newError = new Error('Erro interno do sistema. Tente novamente.');
            newError.code = 'internal-error';
            throw newError;
        }
    }

    /**
     * Verifica se CNPJ já existe
     */
    async checkCNPJExists(cnpj) {
        try {
            console.log('🔍 Verificando CNPJ com a consulta:', cnpj);
            console.log('👤 Executando consulta Firestore para UID:', firebase.auth().currentUser?.uid);

            const query = window.db.collection('empresas')
                .where('cnpj', '==', cnpj)
                .limit(1);

            console.log('📋 Consulta Firestore exata: collection("empresas").where("cnpj", "==", "' + cnpj + '").limit(1)');

            const snapshot = await query.get();

            const exists = !snapshot.empty;
            console.log('✅ Resultado da verificação CNPJ:', exists ? 'CNPJ já existe' : 'CNPJ disponível');

            return exists;
        } catch (error) {
            console.error('❌ Erro ao verificar CNPJ:', error.message);
            console.error('🔧 Código do erro:', error.code);
            console.error('🔧 Stack trace:', error.stack);
            return false;
        }
    }

    /**
     * Valida CNPJ
     */
    isValidCNPJ(cnpj) {
        // Verifica se o CNPJ é uma string válida
        if (!cnpj || typeof cnpj !== 'string') {
            return false;
        }

        // Remove caracteres não numéricos
        cnpj = cnpj.replace(/[^\d]/g, '');

        // Verifica se tem 14 dígitos
        if (cnpj.length !== 14) return false;

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1{13}$/.test(cnpj)) return false;

        // Validação dos dígitos verificadores
        let soma = 0;
        let peso = 2;

        // Primeiro dígito verificador
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(cnpj.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }

        let resto = soma % 11;
        let digito1 = resto < 2 ? 0 : 11 - resto;

        if (parseInt(cnpj.charAt(12)) !== digito1) return false;

        // Segundo dígito verificador
        soma = 0;
        peso = 2;

        for (let i = 12; i >= 0; i--) {
            soma += parseInt(cnpj.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }

        resto = soma % 11;
        let digito2 = resto < 2 ? 0 : 11 - resto;

        return parseInt(cnpj.charAt(13)) === digito2;
    }

    /**
     * Verifica se usuário tem acesso à empresa
     */
    hasAccessToCompany(companyId) {
        return this.userCompanies.some(company => company.id === companyId);
    }

    /**
     * Obtém coleção isolada por empresa
     */
    getCompanyCollection(collectionName) {
        if (!this.activeCompany) {
            throw new Error('Nenhuma empresa ativa');
        }

        return window.db.collection('empresas')
            .doc(this.activeCompany.id)
            .collection(collectionName);
    }

    /**
     * Obtém dados da empresa ativa
     */
    getActiveCompany() {
        return this.activeCompany;
    }

    /**
     * Obtém todas as empresas do usuário
     */
    getUserCompanies() {
        return this.userCompanies;
    }

    /**
     * Obtém usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verifica se sistema está inicializado
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Fallback: consultas separadas quando OR falha
     */
    setupFallbackQueries(uid) {
        console.log("🔄 Executando fallback com consultas separadas para UID:", uid);

        // 1. CORREÇÃO DEFINITIVA: Duas consultas separadas (sem OR quebrado)
        const empresasRef = window.db.collection('empresas');

        // Consulta 1: Empresas onde o usuário é membro
        const consultaMembers = empresasRef.where('members', 'array-contains', uid);
        console.log("🔍 Fallback: Preparando consulta por MEMBERS:", {
            collection: 'empresas',
            filter: 'members',
            operator: 'array-contains',
            value: uid
        });

        // Consulta 2: Empresas onde o usuário é owner
        const consultaOwner = empresasRef.where('ownerId', '==', uid);
        console.log("🔍 Fallback: Preparando consulta por OWNER:", {
            collection: 'empresas',
            filter: 'ownerId',
            operator: '==',
            value: uid
        });

        // Combina resultados de ambas as consultas
        const combineResults = () => {
            console.log("🚀 Fallback: Executando consultas paralelas...");

            // Executa consulta por MEMBERS
            const membersPromise = consultaMembers.get().then(snapshot => {
                console.log("✅ Fallback: Consulta por MEMBERS executada com sucesso. Docs encontrados:", snapshot.docs.length);
                console.log(`[DIAGNÓSTICO] Executando consulta MEMBERS para UID: ${uid}`);
                return snapshot;
            }).catch(error => {
                console.error("❌ ERRO GRAVE no fallback (MEMBERS):", error.message);
                console.error("❌ Detalhes do erro (MEMBERS):", error);
                throw error;
            });

            // Executa consulta por OWNER
            const ownerPromise = consultaOwner.get().then(snapshot => {
                console.log("✅ Fallback: Consulta por OWNER executada com sucesso. Docs encontrados:", snapshot.docs.length);
                console.log(`[DIAGNÓSTICO] Executando consulta OWNER para UID: ${uid}`);
                return snapshot;
            }).catch(error => {
                console.error("❌ ERRO GRAVE no fallback (OWNER):", error.message);
                console.error("❌ Detalhes do erro (OWNER):", error);
                throw error;
            });

            Promise.all([membersPromise, ownerPromise]).then(([membersSnapshot, ownerSnapshot]) => {
                const companiesMap = new Map();

                // Adiciona empresas onde é membro
                membersSnapshot.docs.forEach(doc => {
                    companiesMap.set(doc.id, { id: doc.id, ...doc.data() });
                });

                // Adiciona empresas onde é owner (sem duplicar)
                ownerSnapshot.docs.forEach(doc => {
                    companiesMap.set(doc.id, { id: doc.id, ...doc.data() });
                });

                const companies = Array.from(companiesMap.values());
                console.log("LISTA DE EMPRESAS RECEBIDA (Consultas separadas). Docs:", companies.length);

                // Atualiza lista de empresas
                this.userCompanies = companies;

                // Sincroniza com localStorage
                this.syncCompaniesToLocalStorage();

                console.log('🏢 Empresas atualizadas via consultas separadas:', this.userCompanies.length);

                // Carrega empresa ativa se necessário
                if (!this.activeCompany && this.userCompanies.length > 0) {
                    this.loadActiveCompany();
                }

                // Dispara evento para atualizar UI
                window.dispatchEvent(new CustomEvent('companiesUpdated', {
                    detail: { companies: this.userCompanies }
                }));

            }).catch(error => {
                console.error("ERRO nas consultas de empresas (fallback):", error.message);
            });
        };

        // Executa a combinação inicial
        combineResults();

        // Configura polling a cada 30 segundos como backup
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.pollingInterval = setInterval(combineResults, 30000);
    }

    /**
     * Cria empresas simuladas para desenvolvimento
     */

}

// Função de Fallback (COM PROTEÇÃO EXTRA)
async function fallbackQuery(uid) {
    if (!uid) { // PROTEÇÃO EXTRA
        console.error("ERRO CRÍTICO: fallbackQuery chamado com UID inválido!");
        return;
    }
    console.warn("Executando fallback consultas separadas UID VÁLIDO:", uid);
    try {
        console.log(`[DIAGNÓSTICO] Executando consulta OWNER (fallback único) para UID: ${uid}`);
        const ownerQuery = window.db.collection('empresas').where('ownerId', '==', uid);
        const ownerSnapshot = await ownerQuery.get();
        let companies = ownerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[DIAGNÓSTICO] Executando consulta MEMBER (fallback único) para UID: ${uid}`);
        const memberQuery = window.db.collection('empresas').where('members', 'array-contains', uid);
        const memberSnapshot = await memberQuery.get();
        memberSnapshot.docs.forEach(doc => {
            if (!companies.some(c => c.id === doc.id)) { // Evita duplicatas
                companies.push({ id: doc.id, ...doc.data() });
            }
        });
        console.log("Fallback: Empresas carregadas:", companies.length);

        // Verifica se a renderização automática está desabilitada
        if (!window.DISABLE_MULTITENANT_AUTO_RENDER) {
            renderCompanies(companies);
        } else {
            console.log("🚫 Renderização automática do multitenant desabilitada nesta página");
        }
    } catch (error) {
        console.error("ERRO GRAVE NO FALLBACK:", error.message);
    }
}

// FUNÇÃO RENDER COMPANIES (GARANTA A LIMPEZA):
function renderCompanies(companies) {
    console.log('*** Iniciando renderCompanies. Empresas recebidas:', companies); // LOG CRÍTICO 1
    if (!Array.isArray(companies)) {
        console.error("ERRO GRAVE: renderCompanies recebeu algo que NÃO é um array!", companies);
        return;
    }

    const listaContainer = document.getElementById("empresasGrid");
    console.log('*** Procurando contêiner #empresasGrid:', listaContainer); // LOG CRÍTICO 2
    if (!listaContainer) {
        console.error("ERRO GRAVE: Contêiner da lista de empresas NÃO ENCONTRADO!");
        return;
    }

    console.log('*** Limpando contêiner (innerHTML = "")... ***'); // LOG CRÍTICO 3
    listaContainer.innerHTML = '';

    if (companies.length === 0) {
        console.log("*** Nenhuma empresa para renderizar. Exibindo estado vazio. ***");
        listaContainer.innerHTML = '<p>Nenhuma empresa encontrada.</p>';
        return;
    } else {
        companies.forEach(company => {
            console.log(`--- Iniciando HTML para Empresa ID: ${company.id}, Nome: ${company.nome || company.name} ---`); // LOG 1

            // Extraindo dados da empresa
            const nomeEmpresa = company.nome || company.name || "Empresa sem nome";
            const cnpj = company.cnpj || 'N/A';
            const cidade = company.cidade || 'N/A';
            console.log(`--- Dados extraídos: CNPJ=${cnpj}, Cidade=${cidade} ---`); // LOG 2

            // Criando HTML do cartão da empresa
            const cardHTML = `
          <div class="col-md-4 mb-3">
            <div class="card">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <h5 class="card-title">${nomeEmpresa}</h5>
                  <button style="color: red; background: none; border: none; font-size: 1.2em;" 
                          class="btn-deletar-empresa" 
                          data-id="${company.id}" 
                          data-nome="${nomeEmpresa}" 
                          title="Excluir Empresa">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <p class="card-text">CNPJ: ${cnpj}</p>
                <p class="card-text">Cidade: ${cidade}</p>
                <button class="btn btn-primary btn-acessar-empresa" data-id="${company.id}">Acessar</button>
              </div>
            </div>
          </div>
        `;
            console.log(`--- HTML Gerado (Pré-append): ---`); // LOG 3
            console.log(cardHTML); // LOG 4 - MOSTRE O HTML GERADO!

            // Adicionando HTML ao contêiner
            try {
                listaContainer.innerHTML += cardHTML;
                console.log(`--- HTML Adicionado com sucesso ao container para ${company.id} ---`); // LOG 5
            } catch (e) {
                console.error(`*** ERRO GRAVE AO ADICIONAR HTML NO LOOP para ${company.id}:`, e); // LOG DE ERRO
            }

            console.log(`--- Fim do processamento para Empresa ID: ${company.id} ---`); // LOG 6
        });
    }
}

// Instância global
window.multitenantConfig = new MultitenantConfig();

// Event delegation for company actions (access and delete)
document.addEventListener('DOMContentLoaded', () => {
    const companiesGrid = document.getElementById('empresasGrid');

    if (companiesGrid) {
        companiesGrid.addEventListener('click', function (event) {
            // --- Lógica do Botão ACESSAR (EXISTENTE) ---
            const botaoAcessar = event.target.closest('.btn-acessar-empresa');
            if (botaoAcessar) {
                const empresaId = botaoAcessar.dataset.id;
                console.log(`Acessando empresa ID: ${empresaId}`);

                // Salvar empresa selecionada e redirecionar
                localStorage.setItem('empresaSelecionadaId', empresaId);
                window.location.href = '../index.html';
                return;
            }

            // --- LÓGICA DO BOTÃO DELETAR (NOVA!) ---
            const botaoDeletar = event.target.closest('.btn-deletar-empresa');
            if (botaoDeletar) {
                const empresaId = botaoDeletar.dataset.id;
                const nomeEmpresa = botaoDeletar.dataset.nome || "esta empresa";

                // Se não houver data-id, ignore para evitar erros de permissão incorretos
                if (!empresaId) {
                    console.warn('Clique em excluir ignorado: data-id ausente no botão.');
                    return;
                }

                console.log(`Tentando deletar empresa ID: ${empresaId}, Nome: ${nomeEmpresa}`);

                // 1. CONFIRMAÇÃO (Simples com window.confirm)
                const confirmado = window.confirm(`Tem certeza que deseja excluir ${nomeEmpresa}? Esta ação NÃO pode ser desfeita!`);

                if (confirmado) {
                    console.log(`CONFIRMADO: Excluindo empresa ${empresaId}...`);

                    // 2. CHAMA A DELEÇÃO NO FIRESTORE
                    window.db.collection('empresas').doc(empresaId).delete()
                        .then(() => {
                            console.log(`SUCESSO: Empresa ${empresaId} excluída.`);
                            // A UI será atualizada automaticamente pelo onSnapshot! Não precisa fazer nada aqui.
                            // (Opcional: Mostrar um pop-up de sucesso rápido)
                            alert('Empresa deletada com sucesso!');
                        })
                        .catch((error) => {
                            console.error(`ERRO ao excluir empresa ${empresaId}:`, error);
                            // Verifica se o erro é de permissão (as regras devem impedir não-donos)
                            if (error.code === 'permission-denied') {
                                alert('Erro: Você não tem permissão para excluir esta empresa.');
                            } else {
                                alert(`Erro ao excluir a empresa: ${error.message}`);
                            }
                        });
                } else {
                    console.log(`Cancelada a exclusão da empresa ${empresaId}.`);
                }
            }
        });
    }
});

// Alias global para evitar ReferenceError em chamadas externas
window.setupCompanyListener = function (uid) {
    if (window.multitenantConfig && typeof window.multitenantConfig.setupCompanyListener === 'function') {
        window.multitenantConfig.setupCompanyListener(uid);
    } else {
        // Aguarda inicialização do multitenant
        window.addEventListener('multitenantReady', () => {
            try {
                window.multitenantConfig.setupCompanyListener(uid);
            } catch (e) {
                console.error('Falha ao chamar setupCompanyListener após multitenantReady:', e);
            }
        }, { once: true });
    }
};

// Listener para sincronizar mudanças de empresa
window.addEventListener('companyChanged', (event) => {
    const { companyId, company } = event.detail;

    if (window.multitenantConfig && companyId) {
        // Se temos o objeto da empresa, usa ele diretamente
        if (company) {
            window.multitenantConfig.setActiveCompany(company);
        } else {
            // Senão, procura a empresa na lista de empresas do usuário
            const userCompanies = window.multitenantConfig.getUserCompanies();
            const foundCompany = userCompanies.find(c => c.id === companyId);
            if (foundCompany) {
                window.multitenantConfig.setActiveCompany(foundCompany);
            }
        }
        console.log('🔄 Sistema multitenant sincronizado com mudança de empresa');
    }
});

// Inicialização automática quando Firebase estiver pronto
window.addEventListener('firebaseReady', async () => {
    console.log('🔥 firebaseReady recebido, inicializando multitenant...');
    try {
        await window.multitenantConfig.initialize();

        // Dispara evento para sinalizar que o sistema está pronto
        window.dispatchEvent(new CustomEvent('multitenantReady', {
            detail: {
                initialized: true,
                config: window.multitenantConfig
            }
        }));

        console.log('🎉 Evento multitenantReady disparado');
    } catch (error) {
        console.error('❌ Erro na inicialização do multitenant:', error);

        // Mesmo com erro, dispara evento para permitir fallback
        window.dispatchEvent(new CustomEvent('multitenantReady', {
            detail: {
                initialized: false,
                error: error.message,
                config: window.multitenantConfig
            }
        }));
    }
}, { once: true });
