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
     * Cria um card de plano de alto padrão
     */
    createPlanCard(plan) {
        const badgeHtml = plan.type === 'Familiar' ? 
            `<div class="plan-badge popular">Mais Popular</div>` : `<div class="plan-badge">Individual</div>`;
        
        return `
            <div class="col-lg-4 col-md-6 col-sm-12">
                <div class="plan-card" data-plan-id="${plan.id}">
                    <div class="plan-card-header">
                        ${badgeHtml}
                        <div class="plan-logo">
                            <i class="${plan.icon || 'fas fa-shield-alt'}"></i>
                        </div>
                        <h3 class="plan-title">${plan.title}</h3>
                        <p class="plan-category">${plan.type} • Cobertura Nacional</p>
                    </div>
                    <div class="plan-card-body">
                        <div>
                            <div class="plan-price-box">
                                <span class="price-value">R$ ${this.formatPrice(plan.price)}</span>
                                <span class="price-period">/mês</span>
                            </div>
                            <p class="plan-description">${plan.description || 'Assistência completa para você e seus beneficiários com garantia de qualidade QUALIFY.'}</p>
                            
                            <ul class="plan-features">
                                <li><i class="fas fa-check-circle"></i> Acesso ilimitado ao portal digital</li>
                                <li><i class="fas fa-check-circle"></i> Carteirinha virtual instantânea</li>
                                ${plan.features.length > 0 ? plan.features.slice(0,3).map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('') : '<li><i class="fas fa-check-circle"></i> Cobertura em rede conveniada</li>'}
                            </ul>
                        </div>
                    </div>
                    <div class="plan-card-footer">
                        <button class="btn-details" onclick="catalogoPlanos.showPlanDetails('${plan.id}')">
                            <i class="fas fa-search-plus"></i> Ver Detalhes
                        </button>
                        <button class="btn-contract" onclick="catalogoPlanos.contractPlan('${plan.id}')">
                            <i class="fas fa-check-circle"></i> Selecionar e Contratar
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
        // Handled via inline onclick via catalogoPlanos
    }

    /**
     * Abre detalhes automaticamente quando há planId na URL
     */
    handleDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const planIdParam = params.get('planId');
        if (!planIdParam) return;
        this.showPlanDetails(planIdParam);
    }

    /**
     * Mostra detalhes do plano no modal de forma riquíssima e explicativa
     */
    showPlanDetails(planId) {
        const plan = this.plans.find(p => String(p.id) === String(planId)) || this.plans[0];
        if (!plan) return;
        
        const content = `
            <div class="row g-4">
                <div class="col-md-5 text-center" style="background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center;">
                    <div style="width: 80px; height: 80px; background: #eff6ff; color: #2563eb; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 15px;">
                        <i class="${plan.icon || 'fas fa-shield-alt'}"></i>
                    </div>
                    <h3 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-bottom: 5px;">${plan.title}</h3>
                    <span style="background: #dcfce7; color: #166534; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-block; margin: 0 auto 15px;">Plano ${plan.type} Ativo</span>
                    
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 15px;">
                        <span style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Investimento Mensal</span>
                        <div style="font-size: 2rem; font-weight: 900; color: #1e293b;">R$ ${this.formatPrice(plan.price)}</div>
                        <span style="font-size: 0.8rem; color: #94a3b8;">Sem taxas abusivas de adesão</span>
                    </div>
                </div>
                <div class="col-md-7">
                    <h5 style="font-weight: 800; color: #0f172a; margin-bottom: 10px;"><i class="fas fa-file-alt" style="color: #3b82f6; margin-right: 8px;"></i> Sobre esta Cobertura</h5>
                    <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px;">${plan.description || 'Este plano foi desenvolvido para entregar o máximo de comodidade, segurança e tranquilidade financeira. Conte com a gestão unificada QUALIFY para todos os seus beneficiários.'}</p>
                    
                    <h5 style="font-weight: 800; color: #0f172a; margin-bottom: 12px;"><i class="fas fa-list-check" style="color: #10b981; margin-right: 8px;"></i> Benefícios & Garantias Inclusas</h5>
                    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 10px;">
                        <li style="background: white; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; color: #334155;"><i class="fas fa-check text-success me-2"></i> Carteira Digital & Emissão Instantânea de Contratos</li>
                        <li style="background: white; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; color: #334155;"><i class="fas fa-check text-success me-2"></i> Cobranças Automáticas integradas com PIX via QR Code</li>
                        ${plan.features.map(f => `<li style="background: white; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; color: #334155;"><i class="fas fa-check text-success me-2"></i> ${f}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        if (this.elements.planDetailsContent) this.elements.planDetailsContent.innerHTML = content;
        if (this.elements.contractPlanBtn) {
            this.elements.contractPlanBtn.dataset.planId = planId;
            this.elements.contractPlanBtn.onclick = () => {
                window.location.href = `nova-familia.html?plano=${encodeURIComponent(plan.title)}&valor=${encodeURIComponent(plan.price)}`;
            };
        }
        
        if (this.elements.planDetailsModal) {
            const modal = new bootstrap.Modal(this.elements.planDetailsModal);
            modal.show();
        }
    }

    /**
     * Inicia processo de contratação redirecionando para Nova Família com os dados do plano preenchidos
     */
    contractPlan(planId) {
        const plan = this.plans.find(p => String(p.id) === String(planId)) || this.plans[0];
        if (!plan) return;
        
        if (window.Swal) {
            Swal.fire({
                title: `Contratar ${plan.title}?`,
                text: `Você será redirecionado para o cadastro de Nova Família já com este plano pré-selecionado!`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sim, avançar!',
                cancelButtonText: 'Agora não'
            }).then((res) => {
                if (res.isConfirmed) {
                    window.location.href = `nova-familia.html?plano=${encodeURIComponent(plan.title)}&valor=${encodeURIComponent(plan.price)}`;
                }
            });
        } else {
            window.location.href = `nova-familia.html?plano=${encodeURIComponent(plan.title)}&valor=${encodeURIComponent(plan.price)}`;
        }
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