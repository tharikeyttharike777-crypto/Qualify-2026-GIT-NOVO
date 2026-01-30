/**
 * Firestore Error Suppressor
 * Intercepta e suprime erros específicos do Firestore WebSocket
 */

(function() {
    'use strict';

    // Interceptar erros de rede do Firestore
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = function(...args) {
        const message = args.join(' ');
        
        // Filtrar erros específicos do Firestore WebSocket
        if (shouldSuppressError(message)) {
            console.log('🔄 Firestore: Conexão WebSocket interrompida - usando fallback automático');
            return; // Suprimir o erro
        }
        
        // Para outros erros, usar comportamento padrão
        originalConsoleError.apply(console, args);
    };

    console.warn = function(...args) {
        const message = args.join(' ');
        
        // Filtrar warnings específicos do Firestore
        if (shouldSuppressWarning(message)) {
            return; // Suprimir o warning
        }
        
        // Para outros warnings, usar comportamento padrão
        originalConsoleWarn.apply(console, args);
    };

    function shouldSuppressError(message) {
        const firestoreErrorPatterns = [
            'net::ERR_ABORTED',
            'firestore.googleapis.com',
            'Listen/channel',
            'WebSocket connection',
            'Connection failed',
            'Failed to fetch'
        ];

        // Verificar se é um erro do Firestore WebSocket
        const isFirestoreError = firestoreErrorPatterns.some(pattern => 
            message.includes(pattern)
        );

        // Verificar se contém URL do Firestore
        const hasFirestoreUrl = message.includes('firestore.googleapis.com') || 
                               message.includes('google.firestore.v1.Firestore');

        return isFirestoreError && hasFirestoreUrl;
    }

    function shouldSuppressWarning(message) {
        const firestoreWarningPatterns = [
            'Firestore connection lost',
            'WebSocket connection to',
            'Connection to Firestore lost'
        ];

        return firestoreWarningPatterns.some(pattern => 
            message.includes(pattern)
        );
    }

    // Interceptar erros não capturados
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message) {
            const message = event.error.message;
            if (shouldSuppressError(message)) {
                event.preventDefault();
                console.log('🔄 Firestore: Erro de conexão interceptado e suprimido');
                return false;
            }
        }
    });

    // Interceptar promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.message) {
            const message = event.reason.message;
            if (shouldSuppressError(message)) {
                event.preventDefault();
                console.log('🔄 Firestore: Promise rejeitada interceptada e suprimida');
                return false;
            }
        }
    });

    console.log('✅ Firestore Error Suppressor ativado');

})();