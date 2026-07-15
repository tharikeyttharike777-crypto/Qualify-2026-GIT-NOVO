/**
 * Administração de Planos - Sistema Qualify
 * Gerenciador principal para CRUD de planos
 */

class AdminPlanos {
    constructor() {
        this.plans = [];
        this.currentEditingId = null;
        this.filteredPlans = [];
        
        this.init();
    }

    init() {
        this.loadPlans();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // Busca
        const searchInput = document.getElementById('searchPlans');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPlans();
            });
        }

        // Filtros
        const categoryFilter = document.getElementById('filterCategory');
        const statusFilter = document.getElementById('filterStatus');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterPlans());
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterPlans());
        }

        // Form submission
        const planForm = document.getElementById('planForm');
        if (planForm) {
            planForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePlan();
            });
        }
    }

    loadPlans() {
        // Simular carregamento de dados
        this.showLoading(true);
        
        setTimeout(() => {
            // Dados de exemplo - em produção, viria de uma API
            this.plans = [
                {
                    id: 1,
                    title: "Plano Saúde Essencial",
                    category: "saude",
                    price: 89.90,
                    type: "Individual",
                    status: "active",
                    description: "Plano básico com cobertura essencial para consultas e exames.",
                    features: ["Consultas médicas", "Exames básicos", "Urgência e emergência"],
                    icon: "fas fa-heartbeat",
                    badge: "popular",
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-15')
                },
                {
                    id: 2,
                    title: "Plano Psicologia Premium",
                    category: "psicologia",
                    price: 129.90,
                    type: "Individual",
                    status: "active",
                    description: "Cobertura completa para tratamentos psicológicos e psiquiátricos.",
                    features: ["Consultas psicológicas", "Consultas psiquiátricas", "Terapia em grupo", "Atendimento online"],
                    icon: "fas fa-brain",
                    badge: "premium",
                    createdAt: new Date('2024-01-20'),
                    updatedAt: new Date('2024-01-20')
                },
                {
                    id: 3,
                    title: "Plano Odonto Familiar",
                    category: "odonto",
                    price: 199.90,
                    type: "Familiar",
                    status: "active",
                    description: "Cobertura odontológica completa para toda a família.",
                    features: ["Consultas odontológicas", "Limpeza e prevenção", "Tratamentos básicos", "Ortodontia"],
                    icon: "fas fa-tooth",
                    badge: "",
                    createdAt: new Date('2024-02-01'),
                    updatedAt: new Date('2024-02-01')
                },
                {
                    id: 4,
                    title: "Plano Saúde Empresarial",
                    category: "saude",
                    price: 299.90,
                    type: "Empresarial",
                    status: "inactive",
                    description: "Solução completa de saúde para empresas.",
                    features: ["Cobertura nacional", "Rede credenciada ampla", "Medicina ocupacional", "Gestão online"],
                    icon: "fas fa-user-md",
                    badge: "",
                    createdAt: new Date('2024-02-10'),
                    updatedAt: new Date('2024-02-10')
                }
            ];
            
            this.filteredPlans = [...this.plans];
            this.renderPlans();
            this.updateStats();
            this.showLoading(false);
        }, 1000);
    }

    filterPlans() {
        const searchTerm = document.getElementById('searchPlans')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('filterCategory')?.value || 'all';
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';

        this.filteredPlans = this.plans.filter(plan => {
            const matchesSearch = plan.title.toLowerCase().includes(searchTerm) ||
                                plan.description.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || plan.category === categoryFilter;
            const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        this.renderPlans();
    }

    renderPlans() {
        const container = document.getElementById('plansContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;

        if (this.filteredPlans.length === 0) {
            container.innerHTML = '';
            emptyState?.classList.remove('d-none');
            return;
        }

        emptyState?.classList.add('d-none');
        
        container.innerHTML = this.filteredPlans.map(plan => this.createPlanCard(plan)).join('');
    }

    createPlanCard(plan) {
        const statusClass = plan.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = plan.status === 'active' ? 'Ativo' : 'Inativo';
        const badgeHtml = plan.badge ? `<span class="badge bg-warning text-dark">${this.getBadgeText(plan.badge)}</span>` : '';
        
        return `
            <div class="plan-card">
                <div class="card-body p-4">
                    <div class="row align-items-center">
                        <div class="col-md-1 text-center">
                            <i class="${plan.icon} fa-2x text-primary"></i>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center mb-2">
                                <h5 class="mb-0 me-2">${plan.title}</h5>
                                ${badgeHtml}
                            </div>
                            <p class="text-muted mb-1">${plan.description}</p>
                            <small class="text-muted">
                                <i class="fas fa-tag me-1"></i>${this.getCategoryText(plan.category)} • 
                                <i class="fas fa-users me-1"></i>${plan.type}
                            </small>
                        </div>
                        <div class="col-md-2">
                            <h4 class="text-primary mb-0">R$ ${this.formatPrice(plan.price)}</h4>
                            <small class="text-muted">por mês</small>
                        </div>
                        <div class="col-md-2">
                            <span class="plan-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted d-block">Criado em:</small>
                            <small class="text-muted">${this.formatDate(plan.createdAt)}</small>
                        </div>
                        <div class="col-md-1 text-end">
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="adminPlanos.viewPlan(${plan.id})">
                                        <i class="fas fa-eye me-2"></i>Visualizar
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="adminPlanos.editPlan(${plan.id})">
                                        <i class="fas fa-edit me-2"></i>Editar
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="adminPlanos.toggleStatus(${plan.id})">
                                        <i class="fas fa-toggle-${plan.status === 'active' ? 'off' : 'on'} me-2"></i>
                                        ${plan.status === 'active' ? 'Desativar' : 'Ativar'}
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="adminPlanos.deletePlan(${plan.id})">
                                        <i class="fas fa-trash me-2"></i>Excluir
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Features -->
                    <div class="row mt-3">
                        <div class="col-12">
                            <div class="d-flex flex-wrap gap-1">
                                ${plan.features.map(feature => 
                                    `<span class="badge bg-light text-dark border">
                                        <i class="fas fa-check text-success me-1"></i>${feature}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showCreateModal() {
        this.currentEditingId = null;
        document.getElementById('planModalTitle').textContent = 'Novo Plano';
        this.clearForm();
        
        const modal = new bootstrap.Modal(document.getElementById('planModal'));
        modal.show();
    }

    editPlan(id) {
        const plan = this.plans.find(p => p.id === id);
        if (!plan) return;

        this.currentEditingId = id;
        document.getElementById('planModalTitle').textContent = 'Editar Plano';
        
        // Preencher formulário
        document.getElementById('planTitle').value = plan.title;
        document.getElementById('planCategory').value = plan.category;
        document.getElementById('planPrice').value = plan.price;
        document.getElementById('planType').value = plan.type;
        document.getElementById('planStatus').value = plan.status;
        document.getElementById('planDescription').value = plan.description;
        document.getElementById('planIcon').value = plan.icon;
        document.getElementById('planBadge').value = plan.badge || '';

        // Preencher features
        this.clearFeatures();
        plan.features.forEach(feature => {
            this.addFeatureToList(feature);
        });

        const modal = new bootstrap.Modal(document.getElementById('planModal'));
        modal.show();
    }

    viewPlan(id) {
        const plan = this.plans.find(p => p.id === id);
        if (!plan) return;

        // Criar modal de visualização
        const modalHtml = `
            <div class="modal fade" id="viewPlanModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="${plan.icon} me-2"></i>${plan.title}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Informações Básicas</h6>
                                    <p><strong>Categoria:</strong> ${this.getCategoryText(plan.category)}</p>
                                    <p><strong>Tipo:</strong> ${plan.type}</p>
                                    <p><strong>Preço:</strong> R$ ${this.formatPrice(plan.price)}/mês</p>
                                    <p><strong>Status:</strong> 
                                        <span class="plan-status ${plan.status === 'active' ? 'status-active' : 'status-inactive'}">
                                            ${plan.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Datas</h6>
                                    <p><strong>Criado em:</strong> ${this.formatDate(plan.createdAt)}</p>
                                    <p><strong>Atualizado em:</strong> ${this.formatDate(plan.updatedAt)}</p>
                                </div>
                            </div>
                            
                            <h6>Descrição</h6>
                            <p>${plan.description}</p>
                            
                            <h6>Características</h6>
                            <div class="d-flex flex-wrap gap-2">
                                ${plan.features.map(feature => 
                                    `<span class="badge bg-primary">
                                        <i class="fas fa-check me-1"></i>${feature}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            <button type="button" class="btn btn-primary" onclick="adminPlanos.editPlan(${plan.id})" data-bs-dismiss="modal">
                                <i class="fas fa-edit me-2"></i>Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior se existir
        const existingModal = document.getElementById('viewPlanModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Adicionar novo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('viewPlanModal'));
        modal.show();

        // Remover modal após fechar
        document.getElementById('viewPlanModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    savePlan() {
        const form = document.getElementById('planForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const planData = {
            title: document.getElementById('planTitle').value,
            category: document.getElementById('planCategory').value,
            price: parseFloat(document.getElementById('planPrice').value),
            type: document.getElementById('planType').value,
            status: document.getElementById('planStatus').value,
            description: document.getElementById('planDescription').value,
            icon: document.getElementById('planIcon').value,
            badge: document.getElementById('planBadge').value,
            features: this.getFormFeatures()
        };

        if (this.currentEditingId) {
            // Editar plano existente
            const planIndex = this.plans.findIndex(p => p.id === this.currentEditingId);
            if (planIndex !== -1) {
                this.plans[planIndex] = {
                    ...this.plans[planIndex],
                    ...planData,
                    updatedAt: new Date()
                };
                this.showNotification('Plano atualizado com sucesso!', 'success');
            }
        } else {
            // Criar novo plano
            const newPlan = {
                id: Math.max(...this.plans.map(p => p.id), 0) + 1,
                ...planData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.plans.push(newPlan);
            this.showNotification('Plano criado com sucesso!', 'success');
        }

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('planModal'));
        modal.hide();

        // Atualizar interface
        this.filterPlans();
        this.updateStats();
    }

    toggleStatus(id) {
        const plan = this.plans.find(p => p.id === id);
        if (!plan) return;

        plan.status = plan.status === 'active' ? 'inactive' : 'active';
        plan.updatedAt = new Date();

        this.showNotification(
            `Plano ${plan.status === 'active' ? 'ativado' : 'desativado'} com sucesso!`, 
            'success'
        );

        this.filterPlans();
        this.updateStats();
    }

    deletePlan(id) {
        const plan = this.plans.find(p => p.id === id);
        if (!plan) return;

        if (confirm(`Tem certeza que deseja excluir o plano "${plan.title}"?`)) {
            this.plans = this.plans.filter(p => p.id !== id);
            this.showNotification('Plano excluído com sucesso!', 'success');
            this.filterPlans();
            this.updateStats();
        }
    }

    addFeature(button) {
        const input = button.parentElement.querySelector('input');
        const feature = input.value.trim();
        
        if (feature) {
            this.addFeatureToList(feature);
            input.value = '';
        }
    }

    addFeatureToList(feature) {
        const featuresList = document.getElementById('featuresList');
        const featureElement = document.createElement('div');
        featureElement.className = 'feature-item';
        featureElement.innerHTML = `
            <span class="flex-grow-1">${feature}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        featuresList.appendChild(featureElement);
    }

    getFormFeatures() {
        const featureItems = document.querySelectorAll('#featuresList .feature-item span');
        return Array.from(featureItems).map(item => item.textContent);
    }

    clearFeatures() {
        document.getElementById('featuresList').innerHTML = '';
    }

    clearForm() {
        document.getElementById('planForm').reset();
        this.clearFeatures();
    }

    updateStats() {
        const totalPlans = this.plans.length;
        const activePlans = this.plans.filter(p => p.status === 'active').length;
        const inactivePlans = totalPlans - activePlans;
        const avgPrice = totalPlans > 0 ? 
            this.plans.reduce((sum, p) => sum + p.price, 0) / totalPlans : 0;

        document.getElementById('totalPlans').textContent = totalPlans;
        document.getElementById('activePlans').textContent = activePlans;
        document.getElementById('inactivePlans').textContent = inactivePlans;
        document.getElementById('avgPrice').textContent = `R$ ${this.formatPrice(avgPrice)}`;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const plansContainer = document.getElementById('plansContainer');
        
        if (show) {
            loadingState?.classList.remove('d-none');
            plansContainer?.classList.add('d-none');
        } else {
            loadingState?.classList.add('d-none');
            plansContainer?.classList.remove('d-none');
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastBody = toast.querySelector('.toast-body');
        const toastIcon = toast.querySelector('.toast-header i');
        
        toastBody.textContent = message;
        
        // Atualizar ícone baseado no tipo
        toastIcon.className = `fas me-2 ${this.getNotificationIcon(type)}`;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle text-success',
            error: 'fa-exclamation-circle text-danger',
            warning: 'fa-exclamation-triangle text-warning',
            info: 'fa-info-circle text-primary'
        };
        return icons[type] || icons.info;
    }

    getCategoryText(category) {
        const categories = {
            saude: 'Saúde',
            psicologia: 'Psicologia',
            odonto: 'Odontologia'
        };
        return categories[category] || category;
    }

    getBadgeText(badge) {
        const badges = {
            popular: 'Popular',
            new: 'Novo',
            premium: 'Premium'
        };
        return badges[badge] || badge;
    }

    formatPrice(price) {
        return price.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('pt-BR');
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.adminPlanos = new AdminPlanos();
});

// Exportar para uso global
window.AdminPlanos = AdminPlanos;