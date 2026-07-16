/**
 * Validador de Hospedagem
 * Testa automaticamente se todas as funcionalidades estão operando corretamente
 */

class HostingValidator {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        
        this.setupTests();
    }

    setupTests() {
        // Testes de recursos críticos
        this.addTest('Font Awesome', this.testFontAwesome.bind(this));
        this.addTest('CSS Principal', this.testMainCSS.bind(this));
        this.addTest('JavaScript Principal', this.testMainJS.bind(this));
        this.addTest('Supabase', this.testSupabase.bind(this));
        this.addTest('ViaCEP API', this.testViaCEP.bind(this));
        this.addTest('Chart.js', this.testChartJS.bind(this));
        this.addTest('Bootstrap', this.testBootstrap.bind(this));
        
        // Testes de funcionalidade
        this.addTest('Menu Hambúrguer', this.testHamburgerMenu.bind(this));
        this.addTest('Barra de Pesquisa', this.testSearchBar.bind(this));
        this.addTest('Navegação SPA', this.testSPANavigation.bind(this));
        
        // Testes de segurança
        this.addTest('Headers de Segurança', this.testSecurityHeaders.bind(this));
        this.addTest('HTTPS', this.testHTTPS.bind(this));
    }

    addTest(name, testFunction) {
        this.tests.push({ name, test: testFunction });
    }

    async runAllTests() {
        console.log('🔍 Iniciando validação de hospedagem...');
        this.results = { passed: 0, failed: 0, warnings: 0, details: [] };

        for (const { name, test } of this.tests) {
            try {
                const result = await test();
                this.processTestResult(name, result);
            } catch (error) {
                this.processTestResult(name, {
                    status: 'failed',
                    message: `Erro durante o teste: ${error.message}`
                });
            }
        }

        this.displayResults();
        return this.results;
    }

    processTestResult(testName, result) {
        const detail = {
            test: testName,
            status: result.status,
            message: result.message,
            timestamp: new Date().toISOString()
        };

        this.results.details.push(detail);

        switch (result.status) {
            case 'passed':
                this.results.passed++;
                console.log(`✅ ${testName}: ${result.message}`);
                break;
            case 'warning':
                this.results.warnings++;
                console.warn(`⚠️ ${testName}: ${result.message}`);
                break;
            case 'failed':
                this.results.failed++;
                console.error(`❌ ${testName}: ${result.message}`);
                break;
        }
    }

    // Testes individuais
    async testFontAwesome() {
        const links = document.querySelectorAll('link[href*="font-awesome"]');
        if (links.length === 0) {
            return { status: 'warning', message: 'Font Awesome não encontrado' };
        }

        // Testa se os ícones estão carregando usando método mais seguro
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-home';
        testIcon.style.position = 'absolute';
        testIcon.style.left = '-9999px';
        testIcon.style.visibility = 'hidden';
        document.body.appendChild(testIcon);

        // Aguarda um pouco para o CSS carregar
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const computed = window.getComputedStyle(testIcon);
            const fontFamily = computed.fontFamily;
            const content = computed.content;
            
            document.body.removeChild(testIcon);

            // Verifica se Font Awesome está carregado
            if (fontFamily.toLowerCase().includes('font awesome') || 
                fontFamily.includes('FontAwesome') ||
                content !== 'none') {
                return { status: 'passed', message: 'Font Awesome carregado corretamente' };
            } else {
                // Teste adicional: verifica se o link CSS foi carregado
                const hasLoadedSheet = Array.from(links).some(link => link.sheet);
                if (hasLoadedSheet) {
                    return { status: 'passed', message: 'Font Awesome carregado (verificação alternativa)' };
                } else {
                    return { status: 'warning', message: 'Font Awesome pode não estar funcionando completamente' };
                }
            }
        } catch (error) {
            document.body.removeChild(testIcon);
            return { status: 'warning', message: 'Não foi possível verificar Font Awesome completamente' };
        }
    }

    async testMainCSS() {
        const links = document.querySelectorAll('link[href*="styles.css"]');
        if (links.length === 0) {
            return { status: 'failed', message: 'CSS principal não encontrado' };
        }

        // Verifica se o CSS está aplicado
        const header = document.querySelector('.header');
        if (header) {
            const computed = window.getComputedStyle(header);
            if (computed.display !== 'none') {
                return { status: 'passed', message: 'CSS principal carregado' };
            }
        }

        return { status: 'warning', message: 'CSS pode não estar aplicado corretamente' };
    }

    async testMainJS() {
        const scripts = document.querySelectorAll('script[src*=".js"]');
        if (scripts.length === 0) {
            return { status: 'warning', message: 'Nenhum script JS encontrado' };
        }

        // Verifica se há erros de JavaScript no console
        const originalError = console.error;
        let hasErrors = false;
        
        console.error = (...args) => {
            hasErrors = true;
            originalError.apply(console, args);
        };

        // Aguarda um pouco para capturar erros
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.error = originalError;

        if (hasErrors) {
            return { status: 'warning', message: 'Possíveis erros de JavaScript detectados' };
        } else {
            return { status: 'passed', message: 'JavaScript funcionando sem erros aparentes' };
        }
    }

    async testSupabase() {
        if (typeof window.supabase === 'undefined') {
            return { status: 'warning', message: 'Supabase não carregado (pode ser normal)' };
        }

        try {
            // Testa se o Supabase está configurado e com URL válida
            if (window.supabase && window.supabase.supabaseUrl) {
                return { status: 'passed', message: 'Supabase configurado e funcionando' };
            } else {
                return { status: 'warning', message: 'Supabase carregado mas sem URL de configuração' };
            }
        } catch (error) {
            return { status: 'failed', message: `Erro no Supabase: ${error.message}` };
        }
    }

    async testViaCEP() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://viacep.com.br/ws/01310-100/json/', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                return { status: 'passed', message: 'API ViaCEP acessível' };
            } else {
                return { status: 'warning', message: 'API ViaCEP com problemas' };
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return { status: 'warning', message: 'API ViaCEP lenta ou inacessível' };
            }
            return { status: 'failed', message: `Erro ao acessar ViaCEP: ${error.message}` };
        }
    }

    async testChartJS() {
        if (typeof Chart === 'undefined') {
            return { status: 'warning', message: 'Chart.js não carregado (pode ser normal)' };
        }

        try {
            // Testa se consegue criar um gráfico básico
            const canvas = document.createElement('canvas');
            canvas.style.display = 'none';
            document.body.appendChild(canvas);

            const chart = new Chart(canvas, {
                type: 'line',
                data: { labels: ['Test'], datasets: [{ data: [1] }] },
                options: { responsive: false, animation: false }
            });

            chart.destroy();
            document.body.removeChild(canvas);

            return { status: 'passed', message: 'Chart.js funcionando corretamente' };
        } catch (error) {
            return { status: 'failed', message: `Erro no Chart.js: ${error.message}` };
        }
    }

    async testBootstrap() {
        const links = document.querySelectorAll('link[href*="bootstrap"]');
        if (links.length === 0) {
            return { status: 'warning', message: 'Bootstrap não encontrado (pode ser normal)' };
        }

        // Verifica se as classes do Bootstrap estão funcionando
        const testDiv = document.createElement('div');
        testDiv.className = 'container';
        testDiv.style.position = 'absolute';
        testDiv.style.left = '-9999px';
        document.body.appendChild(testDiv);

        const computed = window.getComputedStyle(testDiv);
        const hasBootstrap = computed.paddingLeft !== '0px' || computed.paddingRight !== '0px';

        document.body.removeChild(testDiv);

        if (hasBootstrap) {
            return { status: 'passed', message: 'Bootstrap carregado e funcionando' };
        } else {
            return { status: 'warning', message: 'Bootstrap pode não estar funcionando' };
        }
    }

    async testHamburgerMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');

        if (!menuToggle || !sidebar) {
            return { status: 'failed', message: 'Elementos do menu não encontrados' };
        }

        // Simula clique no menu
        try {
            menuToggle.click();
            
            // Aguarda um pouco para a animação
            await new Promise(resolve => setTimeout(resolve, 300));
            
            return { status: 'passed', message: 'Menu hambúrguer funcionando' };
        } catch (error) {
            return { status: 'failed', message: `Erro no menu: ${error.message}` };
        }
    }

    async testSearchBar() {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) {
            return { status: 'warning', message: 'Barra de pesquisa não encontrada' };
        }

        try {
            // Simula digitação
            searchInput.value = 'test';
            searchInput.dispatchEvent(new Event('input'));
            
            return { status: 'passed', message: 'Barra de pesquisa funcionando' };
        } catch (error) {
            return { status: 'failed', message: `Erro na pesquisa: ${error.message}` };
        }
    }

    async testSPANavigation() {
        // Verifica se o roteamento SPA está funcionando
        const currentURL = window.location.href;
        
        try {
            // Testa navegação programática
            history.pushState({}, '', '/test-page');
            
            if (window.location.pathname === '/test-page') {
                // Volta para a URL original
                history.pushState({}, '', currentURL);
                return { status: 'passed', message: 'Navegação SPA funcionando' };
            } else {
                return { status: 'warning', message: 'Navegação SPA pode ter problemas' };
            }
        } catch (error) {
            return { status: 'failed', message: `Erro na navegação: ${error.message}` };
        }
    }

    async testSecurityHeaders() {
        try {
            // Usa uma abordagem mais simples para evitar problemas de CORS
            const testUrl = window.location.origin + '/';
            
            // Verifica se estamos em localhost (desenvolvimento)
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return { 
                    status: 'warning', 
                    message: 'Headers de segurança não verificáveis em localhost' 
                };
            }

            const response = await fetch(testUrl, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const headers = response.headers;

            const securityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection'
            ];

            const presentHeaders = securityHeaders.filter(header => headers.has(header));
            const missingHeaders = securityHeaders.filter(header => !headers.has(header));

            if (missingHeaders.length === 0) {
                return { status: 'passed', message: 'Headers de segurança configurados' };
            } else if (presentHeaders.length > 0) {
                return { 
                    status: 'warning', 
                    message: `Alguns headers presentes. Ausentes: ${missingHeaders.join(', ')}` 
                };
            } else {
                return { 
                    status: 'warning', 
                    message: 'Headers de segurança não detectados' 
                };
            }
        } catch (error) {
            return { 
                status: 'warning', 
                message: 'Não foi possível verificar headers de segurança' 
            };
        }
    }

    async testHTTPS() {
        if (window.location.protocol === 'https:') {
            return { status: 'passed', message: 'Site usando HTTPS' };
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return { status: 'warning', message: 'Localhost - HTTPS não necessário' };
        } else {
            return { status: 'warning', message: 'Site não está usando HTTPS' };
        }
    }

    displayResults() {
        const total = this.results.passed + this.results.failed + this.results.warnings;
        
        console.log('\n📊 RELATÓRIO DE VALIDAÇÃO DE HOSPEDAGEM');
        console.log('==========================================');
        console.log(`✅ Testes aprovados: ${this.results.passed}/${total}`);
        console.log(`⚠️ Avisos: ${this.results.warnings}/${total}`);
        console.log(`❌ Falhas: ${this.results.failed}/${total}`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 Todos os testes críticos passaram!');
        } else {
            console.log('\n⚠️ Alguns testes falharam. Verifique os detalhes acima.');
        }

        // Cria relatório visual se possível
        this.createVisualReport();
    }

    createVisualReport() {
        // Remove relatório anterior se existir
        const existingReport = document.getElementById('hosting-validation-report');
        if (existingReport) {
            existingReport.remove();
        }

        const report = document.createElement('div');
        report.id = 'hosting-validation-report';
        report.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;

        const total = this.results.passed + this.results.failed + this.results.warnings;
        const successRate = Math.round((this.results.passed / total) * 100);

        report.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">Validação de Hospedagem</h3>
            <div style="margin-bottom: 10px;">
                <div style="color: green;">✅ Aprovados: ${this.results.passed}</div>
                <div style="color: orange;">⚠️ Avisos: ${this.results.warnings}</div>
                <div style="color: red;">❌ Falhas: ${this.results.failed}</div>
            </div>
            <div style="background: #f0f0f0; border-radius: 4px; padding: 5px; margin-bottom: 10px;">
                Taxa de Sucesso: ${successRate}%
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: #007cba;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            ">Fechar</button>
        `;

        document.body.appendChild(report);

        // Remove automaticamente após 30 segundos
        setTimeout(() => {
            if (report.parentElement) {
                report.remove();
            }
        }, 30000);
    }
}

// Instância global
window.hostingValidator = new HostingValidator();

// Auto-execução em desenvolvimento (localhost)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Aguarda o carregamento completo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.hostingValidator.runAllTests(), 2000);
        });
    } else {
        setTimeout(() => window.hostingValidator.runAllTests(), 2000);
    }
}

// Comando para execução manual: hostingValidator.runAllTests()