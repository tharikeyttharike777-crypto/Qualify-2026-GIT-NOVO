/**
 * Correção ROBUSTA para erro net::ERR_ABORTED no Firebase Firestore
 * 
 * Este arquivo corrige o erro net::ERR_ABORTED causado por consultas onSnapshot
 * que não possuem o filtro de permissão necessário para as regras de segurança do Firebase.
 *
 * Problema: Consultas onSnapshot na coleção 'empresas'/'companies' sem filtro de membros
 * Solução: Intercepta TODAS as chamadas onSnapshot e aplica filtro quando necessário
 */

(function() {
    'use strict';
    
    console.log('🔧 Carregando correção ROBUSTA para onSnapshot...');
    
    let isIntercepted = false;
    
    // Aguarda Firebase estar disponível
    function waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase && window.db) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 50);
                }
            };
            checkFirebase();
        });
    }
    
    // Função para obter usuário atual de qualquer fonte
    function getCurrentUser() {
        // Tenta Firebase Auth primeiro
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            return window.firebase.auth().currentUser;
        }
        
        // Tenta AuthGuard
        if (window.authGuard && window.authGuard.getCurrentUser()) {
            return window.authGuard.getCurrentUser();
        }
        
        // Tenta MultitenantConfig
        if (window.multitenantConfig && window.multitenantConfig.getCurrentUser()) {
            return window.multitenantConfig.getCurrentUser();
        }
        
        return null;
    }
    
    // Função para verificar se uma query é para coleção de empresas
    function isCompaniesQuery(query) {
        try {
            // Múltiplas formas de verificar o path da query
            const paths = [
                query._delegate?._query?.path?.segments,
                query._query?.path?.segments,
                query.path?.segments,
                query._path?.segments
            ].filter(Boolean);
            
            for (const pathSegments of paths) {
                if (Array.isArray(pathSegments)) {
                    const hasCompanies = pathSegments.some(segment => 
                        segment === 'empresas' || 
                        segment === 'companies'
                    );
                    if (hasCompanies) return true;
                }
            }
            
            // Verifica também no toString da query
            const queryString = query.toString ? query.toString() : '';
            return queryString.includes('empresas') || queryString.includes('companies');
            
        } catch (error) {
            console.warn('⚠️ Erro ao verificar path da query:', error);
            return false;
        }
    }
    
    // Função para verificar se a query já tem filtro de membros
    function hasSecurityFilter(query) {
        try {
            const filters = [
                query._delegate?._query?.filters,
                query._query?.filters,
                query.filters
            ].filter(Boolean);
            
            for (const filterArray of filters) {
                if (Array.isArray(filterArray)) {
                    const hasMembersFilter = filterArray.some(filter => {
                        const fieldPath = filter.field?.canonicalString || 
                                        filter.field?.segments?.join('.') ||
                                        '';
                        return fieldPath.includes('members');
                    });
                    if (hasMembersFilter) return true;
                }
            }
            
            return false;
        } catch (error) {
            console.warn('⚠️ Erro ao verificar filtros da query:', error);
            return false;
        }
    }
    
    // Intercepta chamadas onSnapshot de forma mais abrangente
    async function interceptOnSnapshot() {
        await waitForFirebase();
        
        if (isIntercepted) {
            console.log('🔒 onSnapshot já interceptado');
            return;
        }
        
        console.log('🔒 Interceptando TODAS as chamadas onSnapshot...');
        
        try {
            // Intercepta no prototype do Query
            if (window.firebase && window.firebase.firestore && window.firebase.firestore.Query) {
                const originalOnSnapshot = window.firebase.firestore.Query.prototype.onSnapshot;
                
                window.firebase.firestore.Query.prototype.onSnapshot = function(observer, errorCallback, completedCallback) {
                    const query = this;
                    
                    console.log('🔍 onSnapshot chamado, verificando query...');
                    
                    // Verifica se é uma consulta para empresas
                    if (isCompaniesQuery(query)) {
                        console.log('🏢 Query para empresas detectada');
                        
                        // Verifica se já tem filtro de segurança
                        if (!hasSecurityFilter(query)) {
                            const currentUser = getCurrentUser();
                            if (currentUser && currentUser.uid) {
                                console.log('🔒 Aplicando filtro de segurança automático');
                                
                                try {
                                    // Aplica o filtro de segurança
                                    const filteredQuery = query.where('members', 'array-contains', currentUser.uid);
                                    console.log('✅ Filtro aplicado com sucesso');
                                    return originalOnSnapshot.call(filteredQuery, observer, errorCallback, completedCallback);
                                } catch (filterError) {
                                    console.error('❌ Erro ao aplicar filtro:', filterError);
                                    // Se falhar, tenta continuar com query original
                                }
                            } else {
                                console.warn('⚠️ Usuário não encontrado para aplicar filtro');
                            }
                        } else {
                            console.log('✅ Query já possui filtro de segurança');
                        }
                    }
                    
                    // Para outras consultas ou se falhou, usa o comportamento original
                    return originalOnSnapshot.call(query, observer, errorCallback, completedCallback);
                };
                
                console.log('✅ Interceptação no Query.prototype configurada');
            }
            
            // Intercepta também no db.collection se disponível
            if (window.db && window.db.collection) {
                const originalCollection = window.db.collection;
                
                window.db.collection = function(collectionPath) {
                    const collection = originalCollection.call(this, collectionPath);
                    
                    // Se é coleção de empresas, intercepta onSnapshot
                    if (collectionPath === 'empresas' || collectionPath === 'companies') {
                        const originalOnSnapshot = collection.onSnapshot;
                        
                        collection.onSnapshot = function(observer, errorCallback, completedCallback) {
                            console.log('🔒 onSnapshot direto na coleção empresas interceptado');
                            
                            const currentUser = getCurrentUser();
                            if (currentUser && currentUser.uid) {
                                console.log('🔒 Aplicando filtro de segurança na coleção');
                                const filteredQuery = collection.where('members', 'array-contains', currentUser.uid);
                                return filteredQuery.onSnapshot(observer, errorCallback, completedCallback);
                            }
                            
                            return originalOnSnapshot.call(this, observer, errorCallback, completedCallback);
                        };
                    }
                    
                    return collection;
                };
                
                console.log('✅ Interceptação no db.collection configurada');
            }
            
            isIntercepted = true;
            console.log('✅ Interceptação ROBUSTA de onSnapshot configurada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao configurar interceptação:', error);
        }
    }
    
    // Inicializa imediatamente e também quando DOM estiver pronto
    interceptOnSnapshot();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptOnSnapshot);
    }
    
    // Também tenta interceptar após um delay para garantir
    setTimeout(interceptOnSnapshot, 1000);
    
})();