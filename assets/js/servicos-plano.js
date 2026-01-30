/**
 * Serviços do Plano - Gerenciador
 * Sistema de gerenciamento de serviços associados a um plano
 */

class ServicosPlano {
    constructor() {
        this.planId = null;
        this.services = [];
        this.currentEditingService = null;
        this.init();
    }

    init() {
        this.getPlanIdFromUrl();
        this.setupEventListeners();
        this.loadPlanInfo();
        this.loadServices();
        console.log('Serviços do Plano inicializado');
    }

    getPlanIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        this.planId = urlParams.get('planId');
        
        if (!this.planId) {
            this.showAlert('ID do plano não encontrado', 'error');
            setTimeout(() => {
                window.location.href = 'pesquisa-planos.html';
            }, 2000);
        }
    }

    setupEventListeners() {
        // Botão salvar serviço
        const saveBtn = document.getElementById('save-service-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveService());
        }

        // Máscara de dinheiro
        const moneyInputs = document.querySelectorAll('.money-mask');
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatMoney(e.target);
            });
        });

        // Reset form when modal closes
        const modal = document.getElementById('addServiceModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetForm();
            });
        }
    }

    formatMoney(input) {
        let value = input.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        input.value = value;
    }

    loadPlanInfo() {
        // Simular carregamento das informações do plano
        const planInfo = {
            1: { name: 'Vitaplan Nacional' },
            2: { name: 'Plano Básico' },
            3: { name: 'Plano Premium' }
        };

        const plan = planInfo[this.planId];
        if (plan) {
            document.getElementById('plan-name').textContent = plan.name;
            document.title = `Serviços do ${plan.name} - PROGEM 10.0`;
        }
    }

    loadServices() {
        // Simular dados de serviços
        this.services = [
            {
                id: 1,
                name: 'Consulta Médica',
                category: 'saude',
                description: 'Consulta médica geral com clínico geral',
                price: 'R$ 150,00',
                discount: 20,
                status: 'ativo'
            },
            {
                id: 2,
                name: 'Exames Laboratoriais',
                category: 'laboratorio',
                description: 'Exames de sangue, urina e fezes',
                price: 'R$ 80,00',
                discount: 15,
                status: 'ativo'
            },
            {
                id: 3,
                name: 'Consulta Odontológica',
                category: 'odontologia',
                description: 'Consulta com dentista especializado',
                price: 'R$ 120,00',
                discount: 25,
                status: 'inativo'
            }
        ];

        this.renderServices();
    }

    renderServices() {
        const grid = document.getElementById('services-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Card para adicionar novo serviço
        const addCard = this.createAddServiceCard();
        grid.appendChild(addCard);

        // Cards dos serviços existentes
        this.services.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            grid.appendChild(serviceCard);
        });
    }

    createAddServiceCard() {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        col.innerHTML = `
            <div class="card service-card add-service-card h-100" data-bs-toggle="modal" data-bs-target="#addServiceModal">
                <div class="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
                    <i class="fas fa-plus fa-3x text-primary mb-3"></i>
                    <h5 class="card-title text-primary">Adicionar Serviço</h5>
                    <p class="card-text text-muted">Clique para adicionar um novo serviço ao plano</p>
                </div>
            </div>
        `;

        return col;
    }

    createServiceCard(service) {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4';
        
        const categoryColors = {
            'saude': 'bg-success',
            'odontologia': 'bg-info',
            'laboratorio': 'bg-warning',
            'emergencia': 'bg-danger',
            'especialidades': 'bg-primary',
            'outros': 'bg-secondary'
        };

        const categoryIcons = {
            'saude': 'fa-user-md',
            'odontologia': 'fa-tooth',
            'laboratorio': 'fa-flask',
            'emergencia': 'fa-ambulance',
            'especialidades': 'fa-stethoscope',
            'outros': 'fa-cogs'
        };

        const colorClass = categoryColors[service.category] || 'bg-secondary';
        const iconClass = categoryIcons[service.category] || 'fa-cogs';

        col.innerHTML = `
            <div class="card service-card h-100 position-relative">
                <span class="service-status badge ${service.status === 'ativo' ? 'bg-success' : 'bg-secondary'}">
                    ${service.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="service-icon ${colorClass} me-3">
                            <i class="fas ${iconClass}"></i>
                        </div>
                        <div>
                            <h6 class="card-title mb-1">${service.name}</h6>
                            <small class="text-muted text-capitalize">${service.category}</small>
                        </div>
                    </div>
                    
                    <p class="card-text text-muted small mb-3">${service.description}</p>
                    
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <strong class="text-primary">${service.price}</strong>
                            ${service.discount > 0 ? `<br><small class="text-success">${service.discount}% desconto</small>` : ''}
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill" onclick="servicosPlano.editService(${service.id})">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="servicosPlano.deleteService(${service.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    saveService() {
        const form = document.getElementById('service-form');
        const formData = new FormData(form);
        
        const serviceData = {
            name: document.getElementById('service-name').value,
            category: document.getElementById('service-category').value,
            description: document.getElementById('service-description').value,
            price: document.getElementById('service-price').value,
            discount: parseInt(document.getElementById('service-discount').value) || 0,
            status: document.getElementById('service-status').value
        };

        // Validação básica
        if (!serviceData.name.trim()) {
            this.showAlert('Nome do serviço é obrigatório', 'error');
            return;
        }

        if (this.currentEditingService) {
            // Editar serviço existente
            const index = this.services.findIndex(s => s.id === this.currentEditingService);
            if (index !== -1) {
                this.services[index] = { ...this.services[index], ...serviceData };
                this.showAlert('Serviço atualizado com sucesso!', 'success');
            }
        } else {
            // Adicionar novo serviço
            const newService = {
                id: Date.now(),
                ...serviceData
            };
            this.services.push(newService);
            this.showAlert('Serviço adicionado com sucesso!', 'success');
        }

        // Fechar modal e atualizar lista
        const modal = bootstrap.Modal.getInstance(document.getElementById('addServiceModal'));
        modal.hide();
        
        this.renderServices();
        this.resetForm();
    }

    editService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        this.currentEditingService = serviceId;

        // Preencher formulário
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-category').value = service.category;
        document.getElementById('service-description').value = service.description;
        document.getElementById('service-price').value = service.price.replace('R$ ', '');
        document.getElementById('service-discount').value = service.discount;
        document.getElementById('service-status').value = service.status;

        // Alterar título do modal
        document.querySelector('#addServiceModal .modal-title').innerHTML = `
            <i class="fas fa-edit me-2"></i>
            Editar Serviço
        `;

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('addServiceModal'));
        modal.show();
    }

    deleteService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        if (confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
            this.services = this.services.filter(s => s.id !== serviceId);
            this.renderServices();
            this.showAlert('Serviço excluído com sucesso!', 'success');
        }
    }

    resetForm() {
        document.getElementById('service-form').reset();
        this.currentEditingService = null;
        
        // Restaurar título do modal
        document.querySelector('#addServiceModal .modal-title').innerHTML = `
            <i class="fas fa-plus me-2"></i>
            Adicionar Serviço
        `;
    }

    showAlert(message, type = 'info') {
        // Remover alertas existentes
        const existingAlerts = document.querySelectorAll('.alert-custom');
        existingAlerts.forEach(alert => alert.remove());
        
        // Criar novo alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show alert-custom`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Inicializar quando o DOM estiver carregado
let servicosPlano;
document.addEventListener('DOMContentLoaded', () => {
    servicosPlano = new ServicosPlano();
});