// ============================================================================
// HARD RESET - LIMPEZA COMPLETA DO SISTEMA
// ============================================================================
// Este script limpa TUDO: cache, storage, service workers, IndexedDB, etc.
// Use com cuidado! Vai deslogar o usuário e limpar todos os dados locais.
// ============================================================================

(async function HardResetSystem() {
    'use strict';

    console.log('%c🔥 HARD RESET INICIADO 🔥', 'background: #ff0000; color: #fff; font-size: 20px; padding: 10px;');

    const results = {
        localStorage: false,
        sessionStorage: false,
        cookies: false,
        indexedDB: false,
        cacheAPI: false,
        serviceWorkers: false
    };

    // ========================================
    // 1. LIMPAR LOCALSTORAGE
    // ========================================
    try {
        const itemCount = localStorage.length;
        localStorage.clear();
        console.log(`✅ localStorage limpo (${itemCount} itens removidos)`);
        results.localStorage = true;
    } catch (e) {
        console.error('❌ Erro ao limpar localStorage:', e);
    }

    // ========================================
    // 2. LIMPAR SESSIONSTORAGE
    // ========================================
    try {
        const itemCount = sessionStorage.length;
        sessionStorage.clear();
        console.log(`✅ sessionStorage limpo (${itemCount} itens removidos)`);
        results.sessionStorage = true;
    } catch (e) {
        console.error('❌ Erro ao limpar sessionStorage:', e);
    }

    // ========================================
    // 3. LIMPAR COOKIES
    // ========================================
    try {
        const cookies = document.cookie.split(';');
        let cookieCount = 0;

        for (let cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

            // Deletar cookie em todos os domínios possíveis
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + location.hostname;
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + location.hostname;
            cookieCount++;
        }

        console.log(`✅ Cookies limpos (${cookieCount} cookies removidos)`);
        results.cookies = true;
    } catch (e) {
        console.error('❌ Erro ao limpar cookies:', e);
    }

    // ========================================
    // 4. LIMPAR INDEXEDDB
    // ========================================
    try {
        if (window.indexedDB) {
            const databases = await indexedDB.databases();
            let dbCount = 0;

            for (const db of databases) {
                if (db.name) {
                    await indexedDB.deleteDatabase(db.name);
                    dbCount++;
                    console.log(`   🗑️ IndexedDB deletado: ${db.name}`);
                }
            }

            console.log(`✅ IndexedDB limpo (${dbCount} databases removidos)`);
            results.indexedDB = true;
        }
    } catch (e) {
        console.error('❌ Erro ao limpar IndexedDB:', e);
    }

    // ========================================
    // 5. LIMPAR CACHE API
    // ========================================
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            let cacheCount = 0;

            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                cacheCount++;
                console.log(`   🗑️ Cache deletado: ${cacheName}`);
            }

            console.log(`✅ Cache API limpo (${cacheCount} caches removidos)`);
            results.cacheAPI = true;
        }
    } catch (e) {
        console.error('❌ Erro ao limpar Cache API:', e);
    }

    // ========================================
    // 6. DESREGISTRAR SERVICE WORKERS
    // ========================================
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            let swCount = 0;

            for (const registration of registrations) {
                await registration.unregister();
                swCount++;
                console.log(`   🗑️ Service Worker desregistrado: ${registration.scope}`);
            }

            console.log(`✅ Service Workers removidos (${swCount} workers)`);
            results.serviceWorkers = true;
        }
    } catch (e) {
        console.error('❌ Erro ao remover Service Workers:', e);
    }

    // ========================================
    // 7. LIMPAR FIREBASE AUTH (LOGOUT)
    // ========================================
    try {
        if (window.firebase && firebase.auth) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                await firebase.auth().signOut();
                console.log('✅ Firebase Auth: Usuário deslogado');
            }
        }
    } catch (e) {
        console.warn('⚠️ Firebase Auth não disponível ou já deslogado');
    }

    // ========================================
    // RELATÓRIO FINAL
    // ========================================
    console.log('\n%c📊 RELATÓRIO DO HARD RESET', 'background: #4CAF50; color: #fff; font-size: 16px; padding: 8px;');
    console.table(results);

    const allSuccess = Object.values(results).every(v => v === true);

    if (allSuccess) {
        console.log('%c✅ HARD RESET CONCLUÍDO COM SUCESSO!', 'background: #4CAF50; color: #fff; font-size: 18px; padding: 10px;');
        console.log('%c⚠️ Recarregando página em 3 segundos...', 'background: #ff9800; color: #fff; font-size: 14px; padding: 8px;');

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    } else {
        console.error('%c⚠️ HARD RESET PARCIAL - Alguns itens falharam', 'background: #ff9800; color: #fff; font-size: 16px; padding: 8px;');
    }

    return results;
})();

// ============================================================================
// FUNÇÃO GLOBAL PARA CHAMAR O RESET
// ============================================================================
window.executeHardReset = async function () {
    const confirmed = confirm(
        '⚠️ ATENÇÃO: HARD RESET DO SISTEMA\n\n' +
        'Isso vai limpar TUDO:\n' +
        '• Todos os dados salvos (localStorage)\n' +
        '• Sessão atual (sessionStorage)\n' +
        '• Cookies\n' +
        '• Cache do navegador\n' +
        '• Service Workers\n' +
        '• IndexedDB\n' +
        '• Você será DESLOGADO\n\n' +
        'Tem certeza que deseja continuar?'
    );

    if (!confirmed) {
        console.log('❌ Hard Reset cancelado pelo usuário');
        return;
    }

    // Recarregar o script para executar novamente
    location.reload();
};

console.log('%c💡 Para executar manualmente, use: executeHardReset()', 'background: #2196F3; color: #fff; padding: 4px 8px;');
