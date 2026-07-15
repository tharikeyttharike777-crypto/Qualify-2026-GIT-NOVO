/**
 * Sistema de Pesquisa Global - Qualify
 * Funcionalidade de busca por páginas do sistema
 */

class SearchSystem {
    constructor() {
        this.searchInput = document.getElementById('page-search');
        this.searchResults = null;
        this.pages = [
            // Mais usados
            { name: 'Pesquisa Simplificada', url: 'pages/pesquisa-simplificada.html', category: 'Mais usados' },
            { name: 'Dashboard', url: 'pages/dashboard.html', category: 'Mais usados' },
            { name: 'Dashboard Principal', url: 'index.html', category: 'Mais usados' },
            { name: 'Inadimplentes', url: 'pages/inadimplentes.html', category: 'Mais usados' },
            { name: 'DRE Gerencial', url: 'pages/dre-gerencial.html', category: 'Mais usados' },
            { name: 'Métricas Estratégicas', url: 'pages/metricas-estrategicas.html', category: 'Mais usados' },
            { name: 'Controle de Caixas', url: 'pages/controle-caixas.html', category: 'Mais usados' },
            { name: 'Contas a Receber', url: 'pages/contas-receber.html', category: 'Mais usados' },
            { name: 'Vendas', url: 'pages/vendas.html', category: 'Mais usados' },
            
            // Contratos
            { name: 'Contratos', url: 'pages/contratos.html', category: 'Contratos' },
            { name: 'Contratos Ativos', url: 'pages/contratos-ativos.html', category: 'Contratos' },
            { name: 'Mensalidades', url: 'pages/contratos-mensalidades.html', category: 'Contratos' },
            { name: 'Renovações Pendentes', url: 'pages/renovacoes-pendentes.html', category: 'Contratos' },
            { name: 'Renegociação', url: 'pages/renegociacao-cobrancas.html', category: 'Contratos' },
            { name: 'Adimplentes', url: 'pages/contratos-adimplentes.html', category: 'Contratos' },
            { name: 'Cancelados', url: 'pages/cancelados.html', category: 'Contratos' },
            
            // Financeiro
            { name: 'Cobranças', url: 'pages/cobrancas.html', category: 'Financeiro' },
            { name: 'Lista de Cobrança', url: 'pages/lista-cobranca.html', category: 'Financeiro' },
            { name: 'Contas a Pagar', url: 'pages/contas-pagar.html', category: 'Financeiro' },
            // Comissionamento removido
            
            // Pesquisas
            { name: 'Pesquisar Associados', url: 'pages/pesquisar-associados.html', category: 'Pesquisas' },
            { name: 'Pesquisar Famílias', url: 'pages/pesquisar-familias.html', category: 'Pesquisas' },
            { name: 'Pesquisar Pets', url: 'pages/pesquisar-pets.html', category: 'Pesquisas' },
            
            // Relatórios
            { name: 'Resumo do Dia', url: 'pages/resumo-dia.html', category: 'Relatórios' },
            { name: 'Aniversariantes', url: 'pages/aniversariantes.html', category: 'Relatórios' },
            { name: 'Metas', url: 'pages/metas.html', category: 'Relatórios' },
            { name: 'Minhas Movimentações', url: 'pages/minhas-movimentacoes.html', category: 'Relatórios' },
            
            // Serviços
            { name: 'Ordens de Serviço', url: 'pages/ordens-servico.html', category: 'Serviços' },
            
            // Outros
            { name: 'Nova Família', url: 'pages/nova-familia.html', category: 'Cadastros' },
            { name: 'Perfil', url: 'pages/perfil.html', category: 'Configurações' }
        ];
        
        this.init();
    }
    
    init() {
        if (!this.searchInput) return;
        
        this.createSearchResults();
        this.bindEvents();
    }
    
    createSearchResults() {
        // Criar container de resultados
        this.searchResults = document.createElement('div');
        this.searchResults.className = 'search-results';
        this.searchResults.style.display = 'none';
        
        // Inserir após o container de pesquisa
        const searchContainer = this.searchInput.closest('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(this.searchResults);
        }
    }
    
    bindEvents() {
        // Evento de digitação
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Evento de foco
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.trim()) {
                this.showResults();
            }
        });
        
        // Evento de blur (com delay para permitir clique nos resultados)
        this.searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.hideResults();
            }, 200);
        });
        
        // Evento de Enter
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnterKey();
            }
        });
        
        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideResults();
            }
        });
    }
    
    handleSearch(query) {
        if (!query.trim()) {
            this.hideResults();
            return;
        }
        
        const results = this.searchPages(query);
        this.displayResults(results);
        this.showResults();
    }
    
    searchPages(query) {
        const searchTerm = query.toLowerCase().trim();
        
        return this.pages.filter(page => {
            return page.name.toLowerCase().includes(searchTerm) ||
                   page.category.toLowerCase().includes(searchTerm);
        }).slice(0, 8); // Limitar a 8 resultados
    }
    
    displayResults(results) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>Nenhuma página encontrada</p>
                </div>
            `;
            return;
        }
        
        const resultsHTML = results.map(page => `
            <div class="search-result-item" onclick="window.location.href='${page.url}'">
                <div class="search-result-icon">
                    <i class="fas ${this.getPageIcon(page.category)}"></i>
                </div>
                <div class="search-result-content">
                    <div class="search-result-name">${page.name}</div>
                    <div class="search-result-category">${page.category}</div>
                </div>
            </div>
        `).join('');
        
        this.searchResults.innerHTML = resultsHTML;
    }
    
    getPageIcon(category) {
        const icons = {
            'Dashboard': 'fa-chart-line',
            'Contratos': 'fa-file-contract',
            'Financeiro': 'fa-dollar-sign',
            'Pesquisas': 'fa-search',
            'Relatórios': 'fa-chart-bar',
            'Serviços': 'fa-cogs',
            'Configurações': 'fa-cog'
        };
        return icons[category] || 'fa-file';
    }
    
    handleEnterKey() {
        const query = this.searchInput.value.trim();
        if (!query) return;
        
        const results = this.searchPages(query);
        if (results.length > 0) {
            // Navegar para o primeiro resultado
            window.location.href = results[0].url;
        }
    }
    
    showResults() {
        this.searchResults.style.display = 'block';
        // Força o reflow para garantir que a transição funcione
        this.searchResults.offsetHeight;
        this.searchResults.classList.add('show');
    }
    
    hideResults() {
        this.searchResults.classList.remove('show');
        // Aguarda a animação terminar antes de ocultar
        setTimeout(() => {
            if (!this.searchResults.classList.contains('show')) {
                this.searchResults.style.display = 'none';
            }
        }, 300);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new SearchSystem();
});