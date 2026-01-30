/**
 * Active Company Display Manager
 * Gerencia a exibição da empresa ativa no header de todas as páginas
 */

class ActiveCompanyDisplay {
    constructor() {
        this.activeCompanyElement = null;
        this.init();
    }

    init() {
        // Aguarda o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Encontra os elementos onde exibir a empresa ativa
        this.headerEmpresaElement = document.getElementById('headerEmpresaDisplay');
        this.sidebarEmpresaElement = document.getElementById('empresaDisplaySidebar');
        
        if (this.headerEmpresaElement || this.sidebarEmpresaElement) {
            this.loadActiveCompany();
            
            // Escuta mudanças na empresa ativa
            this.setupCompanyChangeListener();
        } else {
            console.warn('Elementos de exibição da empresa não encontrados no DOM');
        }
    }

    async loadActiveCompany() {
        try {
            // Primeiro, tenta buscar o nome da empresa diretamente do localStorage
            let companyName = localStorage.getItem('empresaSelecionadaNome');
            
            if (!companyName) {
                // Se não encontrou o nome, tenta buscar pelo ID
                const activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                
                if (activeCompanyId) {
                    // Busca os dados da empresa ativa
                    const companies = JSON.parse(localStorage.getItem('userCompanies') || '[]');
                    const activeCompany = companies.find(company => company.id === activeCompanyId);

                    if (activeCompany) {
                        companyName = activeCompany.name || activeCompany.razaoSocial || 'Empresa sem nome';
                        // Salva o nome para próximas consultas
                        localStorage.setItem('empresaSelecionadaNome', companyName);
                    }
                }
            }

            if (companyName) {
                this.displayCompany(companyName);
            } else {
                this.displayNoCompany();
            }

        } catch (error) {
            console.error('❌ Erro ao carregar empresa ativa:', error);
            this.displayError();
        }
    }

    displayCompany(companyName) {
        // Exibe o nome da empresa (limitado a 25 caracteres no header)
        const displayName = companyName.length > 25 
            ? companyName.substring(0, 25) + '...' 
            : companyName;
        
        // Atualiza o header
        if (this.headerEmpresaElement) {
            this.headerEmpresaElement.textContent = displayName;
            this.headerEmpresaElement.title = companyName; // Tooltip com nome completo
        }
        
        // Atualiza o sidebar (sem limitação de caracteres)
        if (this.sidebarEmpresaElement) {
            this.sidebarEmpresaElement.textContent = companyName;
        }
        
        console.log('🏢 Empresa ativa exibida:', companyName);
    }

    displayNoCompany() {
        const noCompanyText = 'Nenhuma empresa ativa';
        
        if (this.headerEmpresaElement) {
            this.headerEmpresaElement.textContent = noCompanyText;
        }
        
        if (this.sidebarEmpresaElement) {
            this.sidebarEmpresaElement.textContent = noCompanyText;
        }
        
        console.warn('⚠️ Nenhuma empresa ativa encontrada');
    }

    displayError() {
        const errorText = 'Erro ao carregar empresa';
        
        if (this.headerEmpresaElement) {
            this.headerEmpresaElement.textContent = errorText;
        }
        
        if (this.sidebarEmpresaElement) {
            this.sidebarEmpresaElement.textContent = errorText;
        }
    }

    setupCompanyChangeListener() {
        // Escuta mudanças no localStorage para atualizar a empresa ativa
        window.addEventListener('storage', (event) => {
            if (event.key === 'activeCompanyId' || 
                event.key === 'empresaSelecionadaId' || 
                event.key === 'empresaSelecionadaNome' || 
                event.key === 'userCompanies') {
                this.loadActiveCompany();
            }
        });

        // Escuta eventos customizados de mudança de empresa
        window.addEventListener('companyChanged', () => {
            this.loadActiveCompany();
        });
    }

    // Método público para atualizar a empresa ativa
    updateActiveCompany(companyId, companyName = null) {
        localStorage.setItem('activeCompanyId', companyId);
        localStorage.setItem('empresaSelecionadaId', companyId);
        
        if (companyName) {
            localStorage.setItem('empresaSelecionadaNome', companyName);
        }
        
        this.loadActiveCompany();
        
        // Dispara evento para outras partes da aplicação
        window.dispatchEvent(new CustomEvent('companyChanged', {
            detail: { companyId, companyName }
        }));
    }

    // Método público para obter a empresa ativa
    getActiveCompany() {
        const activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
        if (!activeCompanyId) return null;

        const companies = JSON.parse(localStorage.getItem('userCompanies') || '[]');
        return companies.find(company => company.id === activeCompanyId);
    }
}

// Inicializa o gerenciador de exibição da empresa ativa
const activeCompanyDisplay = new ActiveCompanyDisplay();

// Exporta para uso global
window.ActiveCompanyDisplay = ActiveCompanyDisplay;
window.activeCompanyDisplay = activeCompanyDisplay;