/**
 * Sistema de Pré-carregamento de Recursos
 * Otimiza o carregamento de CSS e JS para hospedagem
 */

(function() {
    'use strict';

    // Versão atual do cache busting
    const CACHE_VERSION = '20250127003';
    
    // Lista de recursos críticos para pré-carregamento
    const CRITICAL_RESOURCES = {
        css: [
            `../assets/css/styles.css?v=${CACHE_VERSION}`,
            `../assets/css/sidebar-menu.css?v=${CACHE_VERSION}`,
            `../assets/css/user-menu.css?v=${CACHE_VERSION}`,
            `../assets/css/notifications.css?v=${CACHE_VERSION}`,
            `../assets/css/sidebar-fix.css?v=${CACHE_VERSION}`
        ],
        js: [
            `../assets/js/sidebar-menu.js?v=${CACHE_VERSION}`,
            `../assets/js/user-menu.js?v=${CACHE_VERSION}`,
            `../assets/js/header-search.js?v=${CACHE_VERSION}`,
            `../assets/js/notifications.js?v=${CACHE_VERSION}`
        ]
    };

    // CDN fallbacks para recursos externos
    const CDN_FALLBACKS = {
        'bootstrap': {
            css: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
            js: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
        },
        'fontawesome': {
            css: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
        }
    };

    /**
     * Pré-carrega um recurso CSS
     */
    function preloadCSS(href) {
        // Normaliza URL para comparação robusta (ignora caminhos relativos e querystring)
        const toAbs = (url) => {
            try { return new URL(url, document.baseURI).href; } catch { return url; }
        };
        const samePath = (a, b) => {
            try {
                const au = new URL(a, document.baseURI);
                const bu = new URL(b, document.baseURI);
                return au.origin === bu.origin && au.pathname === bu.pathname;
            } catch { return a === b; }
        };

        return new Promise((resolve) => {
            const targetHref = toAbs(href);

            // Verifica se já está carregado (stylesheet ou preload existente)
            const existingLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
            const alreadyLoaded = existingLinks.some(link => samePath(link.href, targetHref));
            if (alreadyLoaded) {
                resolve(href);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = targetHref;
            link.crossOrigin = 'anonymous';

            link.onload = () => {
                // Converte para stylesheet após carregar
                link.rel = 'stylesheet';
                resolve(href);
            };

            link.onerror = (e) => {
                // Aborts/erros de preload podem ocorrer quando o recurso já está presente; tratamos como não-crítico
                console.debug(`Preload CSS abort/erro ignorado: ${href}`, e);
                resolve(href);
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Pré-carrega um recurso JavaScript
     */
    function preloadJS(src) {
        const toAbs = (url) => {
            try { return new URL(url, document.baseURI).href; } catch { return url; }
        };
        const samePath = (a, b) => {
            try {
                const au = new URL(a, document.baseURI);
                const bu = new URL(b, document.baseURI);
                return au.origin === bu.origin && au.pathname === bu.pathname;
            } catch { return a === b; }
        };

        return new Promise((resolve) => {
            const targetSrc = toAbs(src);

            // Verifica se já está carregado
            const existingScripts = Array.from(document.querySelectorAll('script[src]'));
            const alreadyLoaded = existingScripts.some(s => samePath(s.src, targetSrc));
            if (alreadyLoaded) {
                resolve(src);
                return;
            }

            // Cria script tag diretamente com async+defer
            const script = document.createElement('script');
            script.src = targetSrc;
            script.async = true;
            script.defer = true;

            script.onload = () => resolve(src);
            script.onerror = (e) => {
                // Tratar como não-crítico para evitar poluição de logs quando há duplicidade
                console.debug(`Preload JS abort/erro ignorado: ${src}`, e);
                resolve(src);
            };

            document.head.appendChild(script);
        });
    }

    function preconnect(url) {
        try {
            const u = new URL(url, document.baseURI);
            const origin = u.origin;
            if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = origin;
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            }
        } catch (_) {}
    }

    /**
     * Carrega recursos críticos de forma assíncrona
     */
    async function loadCriticalResources() {
        const promises = [];

        // Pré-carrega CSS crítico
        CRITICAL_RESOURCES.css.forEach(css => {
            promises.push(preloadCSS(css));
        });

        // Pré-carrega JS crítico
        CRITICAL_RESOURCES.js.forEach(js => {
            promises.push(preloadJS(js));
        });

        try {
            await Promise.allSettled(promises);
            console.log('✅ Recursos críticos pré-carregados');
        } catch (error) {
            console.error('❌ Erro no pré-carregamento:', error);
        }
    }

    /**
     * Otimiza imagens com lazy loading
     */
    function optimizeImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // Adiciona lazy loading se não tiver
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            // Adiciona decode async para melhor performance
            if (!img.hasAttribute('decoding')) {
                img.setAttribute('decoding', 'async');
            }
        });
    }

    /**
     * Otimiza fontes com preload
     */
    function optimizeFonts() {
        // Pré-carrega Font Awesome se não estiver carregado
        const fontAwesome = document.querySelector('link[href*="font-awesome"]');
        if (!fontAwesome) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = CDN_FALLBACKS.fontawesome.css;
            link.crossOrigin = 'anonymous';
            
            link.onload = () => {
                link.rel = 'stylesheet';
            };
            
            document.head.appendChild(link);
        }
    }

    /**
     * Implementa service worker para cache
     */
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                .then(registration => { try { registration.update(); } catch(_){} })
                .catch(error => {});
        }
    }

    /**
     * Otimiza performance geral
     */
    function optimizePerformance() {
        // Remove recursos não utilizados
        const unusedLinks = document.querySelectorAll('link[rel="stylesheet"]:not([href*="assets"]):not([href*="cdn"]):not([href*="googleapis"])');
        unusedLinks.forEach(link => {
            if (!link.href.includes('bootstrap') && !link.href.includes('font-awesome')) {
                link.remove();
            }
        });

        // Otimiza scripts
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
                // Adiciona defer para scripts não críticos
                if (!script.src.includes('hosting-compatibility') && 
                    !script.src.includes('bootstrap')) {
                    script.setAttribute('defer', '');
                }
            }
        });
    }

    /**
     * Monitora performance e reporta métricas
     */
    function monitorPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                    
                    console.log(`📊 Tempo de carregamento: ${loadTime}ms`);
                    
                    // Reporta métricas se necessário
                    if (loadTime > 3000) {
                        console.warn('⚠️ Carregamento lento detectado');
                    }
                }, 1000);
            });
        }
    }

    /**
     * Define o Favicon globalmente
     */
    function setupFavicon() {
        if (!document.querySelector('link[rel="icon"]')) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = 'https://cdn-icons-png.flaticon.com/512/6819/6819264.png';
            document.head.appendChild(link);
        }
    }

    /**
     * Inicialização principal
     */
    function init() {
        console.log('🚀 Iniciando otimização de recursos...');

        // Executa otimizações imediatamente
        setupFavicon();
        optimizePerformance();
        optimizeFonts();

        preconnect('https://cdn.jsdelivr.net');
        preconnect('https://cdnjs.cloudflare.com');
        preconnect('https://www.gstatic.com');

        // Executa após DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                loadCriticalResources();
                optimizeImages();
                monitorPerformance();
            });
        } else {
            loadCriticalResources();
            optimizeImages();
            monitorPerformance();
        }

        // Setup service worker após carregamento
        window.addEventListener('load', setupServiceWorker);
    }

    // Inicia otimização
    init();

    // Exporta para uso global
    window.ResourcePreloader = {
        preloadCSS,
        preloadJS,
        preconnect,
        loadCriticalResources,
        optimizeImages,
        optimizeFonts
    };

})();
