/**
 * Sistema de Fallback para CDNs
 * Garante que as bibliotecas essenciais sejam carregadas mesmo se os CDNs principais falharem
 */

class CDNFallbackManager {
    constructor() {
        this.fallbacks = {
            fontawesome: {
                primary: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
                backup: 'https://use.fontawesome.com/releases/v6.0.0/css/all.css',
                local: './assets/css/fontawesome-fallback.css'
            },
            bootstrap: {
                primary: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
                backup: 'https://stackpath.bootstrapcdn.com/bootstrap/5.3.0/css/bootstrap.min.css',
                local: './assets/css/bootstrap-fallback.css'
            },
            chartjs: {
                primary: 'https://cdn.jsdelivr.net/npm/chart.js',
                backup: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
                local: './assets/js/chart-fallback.js'
            }
        };
        
        this.loadedResources = new Set();
        this.failedResources = new Set();
    }

    /**
     * Verifica se um recurso CSS foi carregado corretamente
     */
    checkCSSLoaded(href) {
        return new Promise((resolve) => {
            const link = document.querySelector(`link[href="${href}"]`);
            if (!link) {
                resolve(false);
                return;
            }

            // Verifica se já está carregado usando método mais seguro
            try {
                if (link.sheet && link.sheet.cssRules && link.sheet.cssRules.length > 0) {
                    resolve(true);
                    return;
                }
            } catch (e) {
                // CORS ou outros problemas de segurança - assume que está carregado se não há erro de rede
                if (link.sheet) {
                    resolve(true);
                    return;
                }
            }

            // Aguarda o carregamento
            const timeout = setTimeout(() => {
                // Se chegou até aqui e o sheet existe, provavelmente carregou
                resolve(!!link.sheet);
            }, 5000);

            link.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            link.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    }

    /**
     * Verifica se um script foi carregado corretamente
     */
    checkScriptLoaded(src, globalVar = null) {
        return new Promise((resolve) => {
            const script = document.querySelector(`script[src="${src}"]`);
            
            if (globalVar && window[globalVar]) {
                resolve(true);
                return;
            }

            if (!script) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                resolve(false);
            }, 10000);

            script.onload = () => {
                clearTimeout(timeout);
                // Verifica se a variável global foi definida
                if (globalVar) {
                    const checkGlobal = setInterval(() => {
                        if (window[globalVar]) {
                            clearInterval(checkGlobal);
                            resolve(true);
                        }
                    }, 100);
                    
                    setTimeout(() => {
                        clearInterval(checkGlobal);
                        resolve(false);
                    }, 2000);
                } else {
                    resolve(true);
                }
            };

            script.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    }

    /**
     * Carrega um CSS com fallback
     */
    async loadCSS(resourceName) {
        const config = this.fallbacks[resourceName];
        if (!config) return false;

        // Tenta carregar o CDN principal
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = config.primary;
        document.head.appendChild(link);

        const primaryLoaded = await this.checkCSSLoaded(config.primary);
        
        if (primaryLoaded) {
            this.loadedResources.add(resourceName);
            console.log(`✅ ${resourceName} carregado do CDN principal`);
            return true;
        }

        // Remove o link que falhou
        link.remove();
        this.failedResources.add(config.primary);

        // Tenta o backup
        if (config.backup) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = config.backup;
            document.head.appendChild(link);

            const backupLoaded = await this.checkCSSLoaded(config.backup);
            
            if (backupLoaded) {
                this.loadedResources.add(resourceName);
                console.log(`⚠️ ${resourceName} carregado do CDN backup`);
                return true;
            }
            
            link.remove();
            this.failedResources.add(config.backup);
        }

        // Tenta carregar local
        if (config.local) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = config.local;
            document.head.appendChild(link);

            const localLoaded = await this.checkCSSLoaded(config.local);
            
            if (localLoaded) {
                this.loadedResources.add(resourceName);
                console.log(`🔄 ${resourceName} carregado localmente`);
                return true;
            }
            
            link.remove();
        }

        console.error(`❌ Falha ao carregar ${resourceName}`);
        return false;
    }

    /**
     * Carrega um script com fallback
     */
    async loadScript(resourceName, globalVar = null) {
        const config = this.fallbacks[resourceName];
        if (!config) return false;

        // Tenta carregar o CDN principal
        let script = document.createElement('script');
        script.src = config.primary;
        document.head.appendChild(script);

        const primaryLoaded = await this.checkScriptLoaded(config.primary, globalVar);
        
        if (primaryLoaded) {
            this.loadedResources.add(resourceName);
            console.log(`✅ ${resourceName} carregado do CDN principal`);
            return true;
        }

        // Remove o script que falhou
        script.remove();
        this.failedResources.add(config.primary);

        // Tenta o backup
        if (config.backup) {
            script = document.createElement('script');
            script.src = config.backup;
            document.head.appendChild(script);

            const backupLoaded = await this.checkScriptLoaded(config.backup, globalVar);
            
            if (backupLoaded) {
                this.loadedResources.add(resourceName);
                console.log(`⚠️ ${resourceName} carregado do CDN backup`);
                return true;
            }
            
            script.remove();
            this.failedResources.add(config.backup);
        }

        // Tenta carregar local
        if (config.local) {
            script = document.createElement('script');
            script.src = config.local;
            document.head.appendChild(script);

            const localLoaded = await this.checkScriptLoaded(config.local, globalVar);
            
            if (localLoaded) {
                this.loadedResources.add(resourceName);
                console.log(`🔄 ${resourceName} carregado localmente`);
                return true;
            }
            
            script.remove();
        }

        console.error(`❌ Falha ao carregar ${resourceName}`);
        return false;
    }

    /**
     * Verifica e carrega todos os recursos necessários
     */
    async ensureResourcesLoaded() {
        const results = {
            fontawesome: false,
            bootstrap: false,
            chartjs: false
        };

        // Verifica Font Awesome (se necessário)
        const fontAwesomeLinks = document.querySelectorAll('link[href*="font-awesome"]');
        if (fontAwesomeLinks.length > 0) {
            results.fontawesome = await this.loadCSS('fontawesome');
        }

        // Verifica Bootstrap (se necessário)
        const bootstrapLinks = document.querySelectorAll('link[href*="bootstrap"]');
        if (bootstrapLinks.length > 0) {
            results.bootstrap = await this.loadCSS('bootstrap');
        }

        // Verifica Chart.js (se necessário)
        const chartScripts = document.querySelectorAll('script[src*="chart"]');
        if (chartScripts.length > 0 || window.Chart) {
            results.chartjs = await this.loadScript('chartjs', 'Chart');
        }

        return results;
    }

    /**
     * Monitora a conectividade e recarrega recursos se necessário
     */
    startConnectivityMonitoring() {
        // Monitora mudanças na conectividade
        window.addEventListener('online', async () => {
            console.log('🌐 Conectividade restaurada, verificando recursos...');
            
            // Recarrega recursos que falharam
            for (const resource of this.failedResources) {
                if (resource.includes('font-awesome')) {
                    await this.loadCSS('fontawesome');
                } else if (resource.includes('bootstrap')) {
                    await this.loadCSS('bootstrap');
                } else if (resource.includes('chart')) {
                    await this.loadScript('chartjs', 'Chart');
                }
            }
        });

        window.addEventListener('offline', () => {
            console.warn('📡 Conectividade perdida, usando recursos locais');
        });
    }

    /**
     * Relatório de status dos recursos
     */
    getStatusReport() {
        return {
            loaded: Array.from(this.loadedResources),
            failed: Array.from(this.failedResources),
            online: navigator.onLine
        };
    }
}

// Instância global
window.cdnFallback = new CDNFallbackManager();

// Auto-inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cdnFallback.ensureResourcesLoaded();
        window.cdnFallback.startConnectivityMonitoring();
    });
} else {
    window.cdnFallback.ensureResourcesLoaded();
    window.cdnFallback.startConnectivityMonitoring();
}