/**
 * Catálogo de Planos - Gerenciador Principal
 * Responsável por toda a funcionalidade do catálogo de planos
 */

class CatalogoPlanos {
    constructor() {
        this.plans = [];
        this.filteredPlans = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isLoading = true;
        
        this.init();
    }

    /**
     * Inicialização da classe
     */
    async init() {
        try {
            this.setupElements();
            await this.loadPlans();
            this.setupEventListeners();
            this.renderPlans();
            this.hideLoading();
            this.handleDeepLink();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError();
        }
    }


    getActiveCompanyId() {
        try {
            const activeCompanyStr = localStorage.getItem('activeCompany');
            const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
            return activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
        } catch (e) {
            return localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
        }
    }

    /**
     * Configuração dos elementos DOM
     */
    setupElements() {
        this.elements = {
            // Loading e Estados
            loadingOverlay: document.getElementById('loadingOverlay'),
            plansLoading: document.getElementById('plansLoading'),
            plansGrid: document.getElementById('plansGrid'),
            emptyState: document.getElementById('emptyState'),
            
            // Filtros e Busca
            searchPlans: document.getElementById('searchPlans'),
            filterButtons: document.querySelectorAll('.btn-filter'),
            
            // Modal
            planDetailsModal: document.getElementById('planDetailsModal'),
            planDetailsContent: document.getElementById('planDetailsContent'),
            contractPlanBtn: document.getElementById('contractPlanBtn'),
            
            // Toast
            notificationToast: document.getElementById('notificationToast')
        };
    }

    /**
     * Carrega os dados dos planos (simulado)
     */
    async loadPlans() {
        await this.delay(300);
        let loadedFromSupabase = false;

        // 1) Supabase (se disponível)
        if (window.supabase) {
            try {
                const companyId = this.getActiveCompanyId();
                const { data, error } = await window.supabase
                    .from('planos')
                    .select('*')
                    .eq('company_id', companyId);
                if (!error && data && data.length > 0) {
                    this.plans = data.map(p => ({
                        id: p.id,
                        title: p.name || 'Plano',
                        category: 'geral',
                        type: (parseInt(p.maxPeople, 10) || 1) > 1 ? 'Familiar' : 'Individual',
                        price: this.parseMoney(p.monthlyValue) || 0,
                        period: 'mensal',
                        description: p.description || '',
                        features: Array.isArray(p.services)
                            ? p.services.map(s => s.name || s.titulo || 'Serviço incluso')
                            : [],
                        badge: null,
                        icon: 'fas fa-briefcase-medical'
                    }));
                    loadedFromSupabase = true;
                }
            } catch (err) {
                console.warn('Falha ao carregar planos do Supabase:', err);
            }
        }

        // 2) Fallback: localStorage
        if (!loadedFromSupabase) {
            try {
                const saved = localStorage.getItem('planos');
                if (saved) {
                    const rawPlans = JSON.parse(saved) || [];
                    this.plans = rawPlans.map(p => ({
                        id: p.id,
                        title: p.name || 'Plano',
                        category: 'geral',
                        type: (parseInt(p.maxPeople, 10) || 1) > 1 ? 'Familiar' : 'Individual',
                        price: this.parseMoney(p.monthlyValue) || 0,
                        period: 'mensal',
                        description: p.description || '',
                        features: Array.isArray(p.services)
                            ? p.services.map(s => s.name || s.titulo || 'Serviço incluso')
                            : [],
                        badge: null,
                        icon: 'fas fa-briefcase-medical'
                    }));
                } else {
                    this.plans = [];
                }
            } catch (e) {
                console.warn('Falha ao carregar planos do localStorage:', e);
                this.plans = [];
            }
        }

        this.filteredPlans = [...this.plans];
    }

    /**
     * Configuração dos event listeners
     */
    setupEventListeners() {
        // Busca
        this.elements.searchPlans.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterPlans();
        });

        // Filtros de categoria
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.currentFilter = e.target.dataset.category;
                this.filterPlans();
            });
        });

        // Modal de contratação
        this.elements.contractPlanBtn.addEventListener('click', () => {
            this.contractSelectedPlan();
        });
    }

    /**
     * Define o filtro ativo
     */
    setActiveFilter(activeBtn) {
        this.elements.filterButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    /**
     * Filtra os planos baseado na categoria e busca
     */
    filterPlans() {
        this.filteredPlans = this.plans.filter(plan => {
            const matchesCategory = this.currentFilter === 'all' || plan.category === this.currentFilter;
            const matchesSearch = plan.title.toLowerCase().includes(this.searchTerm) ||
                                plan.description.toLowerCase().includes(this.searchTerm) ||
                                plan.type.toLowerCase().includes(this.searchTerm);
            
            return matchesCategory && matchesSearch;
        });
        
        this.renderPlans();
    }

    /**
     * Renderiza os planos na tela
     */
    renderPlans() {
        const grid = this.elements.plansGrid;
        const emptyState = this.elements.emptyState;
        
        if (this.filteredPlans.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('d-none');
            return;
        }
        
        emptyState.classList.add('d-none');
        
        grid.innerHTML = this.filteredPlans.map(plan => this.createPlanCard(plan)).join('');
        
        // Adiciona event listeners aos botões dos cards
        this.setupCardEventListeners();
    }

    /**
     * Cria um card de plano
     */
    createPlanCard(plan) {
        const badgeHtml = plan.badge ? 
            `<div class="plan-badge ${plan.badge === 'popular' ? 'popular' : plan.badge === 'new' ? 'new' : ''}">${plan.badge}</div>` : '';
        
        return `
            <div class="col-lg-4 col-md-6 col-sm-12">
                <div class="plan-card" data-plan-id="${plan.id}">
                    <div class="plan-card-header">
                        ${badgeHtml}
                        <div class="plan-logo">
                            <i class="${plan.icon}"></i>
                        </div>
                        <h3 class="plan-title">${plan.title}</h3>
                        <p class="plan-category">${plan.type}</p>
                    </div>
                    <div class="plan-card-body">
                        <p class="plan-description">${plan.description}</p>
                        
                        <ul class="plan-features">
                            ${plan.features.map(feature => 
                                `<li><i class="fas fa-check"></i>${feature}</li>`
                            ).join('')}
                        </ul>
                        
                        <div class="plan-price">
                            <div class="price-label">Mensalidade</div>
                            <span class="price-value">R$ ${this.formatPrice(plan.price)}</span>
                            <span class="price-period">/${plan.period}</span>
                        </div>
                    </div>
                    <div class="plan-card-footer">
                        <button class="btn btn-details" onclick="catalogoPlanos.showPlanDetails(${plan.id})">
                            <i class="fas fa-info-circle me-2"></i>Ver Detalhes
                        </button>
                        <button class="btn btn-contract" onclick="catalogoPlanos.contractPlan(${plan.id})">
                            <i class="fas fa-shopping-cart me-2"></i>Contratar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configura event listeners dos cards
     */
    setupCardEventListeners() {
        // Os event listeners são configurados via onclick nos botões
        // para evitar problemas com elementos dinâmicos
    }

    /**
     * Abre detalhes automaticamente quando há planId na URL
     */
    handleDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const planIdParam = params.get('planId');
        if (!planIdParam) return;
        const planId = parseInt(planIdParam, 10);
        if (!isNaN(planId)) {
            this.showPlanDetails(planId);
        }
    }

    /**
     * Mostra detalhes do plano no modal
     */
    showPlanDetails(planId) {
        const plan = this.plans.find(p => p.id === planId);
        if (!plan) return;
        
        const content = `
            <div class="row">
                <div class="col-md-4 text-center">
                    <div class="plan-logo-large">
                        <i class="${plan.icon}" style="font-size: 4rem; color: #667eea;"></i>
                    </div>
                    <h4 class="mt-3">${plan.title}</h4>
                    <p class="text-muted">${plan.type}</p>
                </div>
                <div class="col-md-8">
                    <h5>Descrição</h5>
                    <p>${plan.description}</p>
                    
                    <h5>Benefícios Inclusos</h5>
                    <ul class="list-unstyled">
                        ${plan.features.map(feature => 
                            `<li class="mb-2"><i class="fas fa-check text-success me-2"></i>${feature}</li>`
                        ).join('')}
                    </ul>
                    
                    <div class="price-info mt-4 p-3 bg-light rounded">
                        <h5 class="mb-2">Investimento</h5>
                        <div class="d-flex align-items-center">
                            <span class="h3 text-primary mb-0">R$ ${this.formatPrice(plan.price)}</span>
                            <span class="text-muted ms-2">/${plan.period}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.planDetailsContent.innerHTML = content;
        this.elements.contractPlanBtn.dataset.planId = planId;
        
        const modal = new bootstrap.Modal(this.elements.planDetailsModal);
        modal.show();
    }

    /**
     * Inicia processo de contratação
     */
    contractPlan(planId) {
        const plan = this.plans.find(p => p.id === planId);
        if (!plan) return;
        
        this.showNotification(`Redirecionando para contratação do plano "${plan.title}"...`, 'info');
        
        setTimeout(() => {
            // Simula redirecionamento para checkout
            const checkoutUrl = `/checkout/plano-${planId}`;
            this.showNotification(`Redirecionamento para: ${checkoutUrl}`, 'success');
            
            // Em produção, seria:
            // window.location.href = checkoutUrl;
        }, 1500);
    }

    /**
     * Contrata o plano selecionado no modal
     */
    contractSelectedPlan() {
        const planId = parseInt(this.elements.contractPlanBtn.dataset.planId);
        if (planId) {
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(this.elements.planDetailsModal);
            modal.hide();
            
            // Inicia contratação
            this.contractPlan(planId);
        }
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters() {
        // Reset busca
        this.elements.searchPlans.value = '';
        this.searchTerm = '';
        
        // Reset filtro de categoria
        this.currentFilter = 'all';
        this.setActiveFilter(document.querySelector('[data-category="all"]'));
        
        // Refiltra
        this.filterPlans();
        
        this.showNotification('Filtros limpos!', 'success');
    }

    /**
     * Utilitários
     */
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    parseMoney(value) {
        if (value == null) return null;
        const str = String(value).trim();
        const clean = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? null : num;
    }

    formatPrice(price) {
        return price.toFixed(2).replace('.', ',');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
        this.elements.plansLoading.classList.add('d-none');
        this.isLoading = false;
    }
    
    showError() {
        this.elements.loadingOverlay.style.display = 'none';
        this.elements.plansLoading.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
                <h4 class="mt-3">Erro ao carregar planos</h4>
                <p class="text-muted">Tente recarregar a página.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Recarregar
                </button>
            </div>
        `;
    }
    
    showNotification(message, type = 'info') {
        const toast = this.elements.notificationToast;
        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header i');
        
        // Define ícone e cor baseado no tipo
        const config = {
            success: { icon: 'fas fa-check-circle text-success', class: 'bg-success' },
            error: { icon: 'fas fa-exclamation-circle text-danger', class: 'bg-danger' },
            warning: { icon: 'fas fa-exclamation-triangle text-warning', class: 'bg-warning' },
            info: { icon: 'fas fa-info-circle text-primary', class: 'bg-primary' }
        };
        
        const typeConfig = config[type] || config.info;
        
        toastHeader.className = typeConfig.icon;
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Instância global
let catalogoPlanos;

// Funções globais para serem chamadas pelos elementos HTML
function showHelp() {
    catalogoPlanos.showNotification('Central de Ajuda será aberta em breve!', 'info');
}

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '../index.html';
    }
}

function clearFilters() {
    catalogoPlanos.clearFilters();
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    catalogoPlanos = new CatalogoPlanos();
});