/**
 * Modal de Seleção de Empresa para Configurações
 * Gerencia a seleção de empresa antes de acessar as configurações
 */
class ConfiguracoesModal {
    constructor() {
        this.companies = [];
        this.selectedCompanyId = null;
        this.modal = null;
        this.modalElement = null;
        
        this.init();
    }

    /**
     * Inicializa o modal
     */
    init() {
        this.createModal();
        this.loadCompanies();
        this.setupEventListeners();
    }

    /**
     * Cria o modal HTML
     */
    createModal() {
        // Remove modal existente se houver
        const existingModal = document.getElementById('configuracoesModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Cria o modal
        const modalHTML = `
            <div class="modal fade" id="configuracoesModal" tabindex="-1" aria-labelledby="configuracoesModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="configuracoesModalLabel">
                                <i class="fas fa-cog"></i>
                                Selecione a empresa para configurar
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="loadingCompanies" class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Carregando empresas...</span>
                                </div>
                                <p class="mt-2 text-muted">Carregando suas empresas...</p>
                            </div>
                            
                            <div id="companiesSelection" style="display: none;">
                                <p class="text-muted mb-3">
                                    <i class="fas fa-info-circle"></i>
                                    Selecione qual empresa você deseja configurar:
                                </p>
                                <div id="companiesList" class="companies-radio-list">
                                    <!-- Lista de empresas será inserida aqui -->
                                </div>
                            </div>
                            
                            <div id="noCompanies" class="text-center py-4" style="display: none;">
                                <i class="fas fa-building-slash text-muted" style="font-size: 3rem;"></i>
                                <h6 class="mt-3">Nenhuma empresa encontrada</h6>
                                <p class="text-muted">Você precisa ter pelo menos uma empresa cadastrada para acessar as configurações.</p>
                                <button type="button" class="btn btn-primary" onclick="window.location.href='pages/trocar-empresa.html'">
                                    <i class="fas fa-plus"></i>
                                    Adicionar Empresa
                                </button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                                Cancelar
                            </button>
                            <button type="button" class="btn btn-primary" id="continueConfigBtn" disabled>
                                <i class="fas fa-arrow-right"></i>
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adiciona o modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Referências aos elementos
        this.modalElement = document.getElementById('configuracoesModal');
        this.modal = new bootstrap.Modal(this.modalElement);
    }

    /**
     * Carrega as empresas do usuário
     */
    async loadCompanies() {
        try {
            // Simula delay de carregamento
            await this.delay(1000);
            
            // Busca empresas do localStorage ou usa dados simulados
            const savedCompanies = localStorage.getItem('userCompanies');
            
            if (savedCompanies) {
                this.companies = JSON.parse(savedCompanies);
            } else {
                // Dados simulados das empresas
                this.companies = [
                    {
                        id: 1,
                        name: 'Tech Solutions LTDA',
                        cnpj: '12.345.678/0001-90',
                        city: 'São Paulo',
                        state: 'SP',
                        type: 'LTDA',
                        responsible: 'Maria Santos',
                        isActive: true
                    },
                    {
                        id: 2,
                        name: 'Comércio Digital ME',
                        cnpj: '98.765.432/0001-10',
                        city: 'Rio de Janeiro',
                        state: 'RJ',
                        type: 'ME',
                        responsible: 'Carlos Oliveira',
                        isActive: false
                    },
                    {
                        id: 3,
                        name: 'Consultoria Empresarial SA',
                        cnpj: '11.222.333/0001-44',
                        city: 'Belo Horizonte',
                        state: 'MG',
                        type: 'SA',
                        responsible: 'Ana Costa',
                        isActive: false
                    }
                ];
            }

            this.renderCompanies();
            
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showNoCompanies();
        }
    }

    /**
     * Renderiza a lista de empresas
     */
    renderCompanies() {
        const loadingElement = document.getElementById('loadingCompanies');
        const selectionElement = document.getElementById('companiesSelection');
        const noCompaniesElement = document.getElementById('noCompanies');
        const companiesListElement = document.getElementById('companiesList');

        // Esconde loading
        loadingElement.style.display = 'none';

        if (!this.companies || this.companies.length === 0) {
            this.showNoCompanies();
            return;
        }

        // Mostra seleção
        selectionElement.style.display = 'block';
        noCompaniesElement.style.display = 'none';

        // Limpa lista
        companiesListElement.innerHTML = '';

        // Cria radio buttons para cada empresa
        this.companies.forEach((company, index) => {
            const companyItem = document.createElement('div');
            companyItem.className = 'company-radio-item';
            
            const isChecked = company.isActive ? 'checked' : '';
            if (company.isActive) {
                this.selectedCompanyId = company.id;
                this.updateContinueButton();
            }

            companyItem.innerHTML = `
                <div class="form-check company-option">
                    <input class="form-check-input" type="radio" name="selectedCompany" 
                           id="company_${company.id}" value="${company.id}" ${isChecked}>
                    <label class="form-check-label company-label" for="company_${company.id}">
                        <div class="company-card-mini">
                            <div class="company-icon">
                                <i class="fas fa-building"></i>
                            </div>
                            <div class="company-details">
                                <div class="company-name">${company.name}</div>
                                <div class="company-info">
                                    <span class="cnpj">CNPJ: ${this.formatCnpj(company.cnpj)}</span>
                                    <span class="location">${company.city}/${company.state}</span>
                                    ${company.isActive ? '<span class="active-badge">Ativa</span>' : ''}
                                </div>
                                <div class="company-meta">
                                    <span class="type">${company.type}</span>
                                    <span class="responsible">Resp.: ${company.responsible}</span>
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            `;

            companiesListElement.appendChild(companyItem);
        });
    }

    /**
     * Mostra estado sem empresas
     */
    showNoCompanies() {
        const loadingElement = document.getElementById('loadingCompanies');
        const selectionElement = document.getElementById('companiesSelection');
        const noCompaniesElement = document.getElementById('noCompanies');

        loadingElement.style.display = 'none';
        selectionElement.style.display = 'none';
        noCompaniesElement.style.display = 'block';
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Event listener para mudança de seleção
        document.addEventListener('change', (e) => {
            if (e.target.name === 'selectedCompany') {
                this.selectedCompanyId = parseInt(e.target.value);
                this.updateContinueButton();
            }
        });

        // Event listener para botão continuar
        document.addEventListener('click', (e) => {
            if (e.target.id === 'continueConfigBtn') {
                this.continueToSettings();
            }
        });
    }

    /**
     * Atualiza estado do botão continuar
     */
    updateContinueButton() {
        const continueBtn = document.getElementById('continueConfigBtn');
        if (continueBtn) {
            continueBtn.disabled = !this.selectedCompanyId;
        }
    }

    /**
     * Continua para as configurações
     */
    continueToSettings() {
        if (!this.selectedCompanyId) return;

        const selectedCompany = this.companies.find(c => c.id === this.selectedCompanyId);
        if (!selectedCompany) return;

        // Salva empresa selecionada para configuração
        localStorage.setItem('configCompany', JSON.stringify(selectedCompany));
        
        // Fecha modal
        this.modal.hide();
        
        // Redireciona para página de configurações
        window.location.href = `pages/configuracoes.html?empresa=${this.selectedCompanyId}`;
    }

    /**
     * Mostra o modal
     */
    show() {
        if (this.modal) {
            this.modal.show();
        }
    }

    /**
     * Esconde o modal
     */
    hide() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Formata CNPJ
     */
    formatCnpj(cnpj) {
        if (!cnpj || typeof cnpj !== 'string') {
            return '';
        }
        const cleanCnpj = cnpj.replace(/\D/g, '');
        return cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    /**
     * Utilitário para delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instância global do modal
let configuracoesModal;

// Função global para abrir modal de configurações
window.openConfiguracoesModal = function() {
    if (!configuracoesModal) {
        configuracoesModal = new ConfiguracoesModal();
    }
    configuracoesModal.show();
};

// Inicializa quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Cria instância do modal mas não mostra
    if (!configuracoesModal) {
        configuracoesModal = new ConfiguracoesModal();
    }
});