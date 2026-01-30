/**
 * Gerenciador de Empresas com Firebase
 * Sistema Multitenant - Isolamento de dados por empresa
 */
class CompanyManagerFirebase {
    constructor() {
        this.companies = [];
        this.selectedCompany = null;
        this.currentUser = null;
        this.db = null;
        this.auth = null;
        
        this.init();
    }

    /**
     * Inicializa o gerenciador
     */
    async init() {
        try {
            await this.waitForFirebase();
            await this.initializeFirebase();
            await this.loadCurrentUser();
            this.loadUserName();
            await this.loadUserCompanies();
            this.setupEventListeners();
            this.setupFormValidation();
        } catch (error) {
            console.error('Erro ao inicializar CompanyManagerFirebase:', error);
            this.showNotification('Erro ao carregar sistema. Tente recarregar a página.', 'error');
        }
    }

    /**
     * Aguarda o Firebase estar disponível
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            if (window.firebase && window.db && window.auth) {
                resolve();
                return;
            }

            const checkFirebase = () => {
                if (window.firebase && window.db && window.auth) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };

            // Escutar evento de Firebase pronto
            window.addEventListener('firebaseReady', () => {
                resolve();
            });

            checkFirebase();
        });
    }

    /**
     * Inicializa conexões Firebase
     */
    async initializeFirebase() {
        this.db = window.db;
        this.auth = window.auth;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase não foi inicializado corretamente');
        }
    }

    /**
     * Carrega o usuário atual
     */
    async loadCurrentUser() {
        return new Promise((resolve) => {
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0]
                    };
                } else {
                    // Se não há usuário autenticado, usar dados simulados para desenvolvimento
                    this.currentUser = {
                        uid: 'dev-user-123',
                        email: 'usuario@exemplo.com',
                        name: 'Usuário Desenvolvimento'
                    };
                }
                resolve();
            });
        });
    }

    /**
     * Carrega o nome do usuário
     */
    loadUserName() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name || 'Usuário';
        }
    }

    /**
     * Carrega as empresas do usuário atual
     */
    async loadUserCompanies() {
        try {
            this.showLoading(true);
            
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }

            // Buscar empresas onde o usuário é proprietário ou tem acesso
            const companiesRef = this.db.collection('companies');
            const userCompaniesQuery = companiesRef.where('members', 'array-contains', this.currentUser.uid);
            
            const snapshot = await userCompaniesQuery.get();
            
            this.companies = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                this.companies.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate()
                });
            });

            // Ordenar por data de criação (mais recentes primeiro)
            this.companies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            this.renderCompanies();
            
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            this.showNotification('Erro ao carregar empresas. Tente novamente.', 'error');
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Renderiza a lista de empresas
     */
    renderCompanies() {
        const container = document.getElementById('empresasGrid');
        const companiesContainer = document.getElementById('companiesContainer');
        const emptyState = document.getElementById('emptyState');

        if (!this.companies || this.companies.length === 0) {
            this.showEmptyState();
            return;
        }

        // Limpa o container
        container.innerHTML = '';

        // Cria os cards das empresas
        this.companies.forEach(company => {
            const card = this.createCompanyCard(company);
            container.appendChild(card);
        });

        // Mostra o container de empresas
        companiesContainer.style.display = 'block';
        emptyState.style.display = 'none';
    }

    /**
     * Cria um card de empresa
     */
    createCompanyCard(company) {
        const card = document.createElement('div');
        card.className = `company-card ${company.isActive ? 'active' : ''}`;
        card.setAttribute('data-company-id', company.id);

        // Verificar se o usuário é proprietário
        const isOwner = company.ownerId === this.currentUser.uid;
        const userRole = company.userRoles?.[this.currentUser.uid] || 'member';

        card.innerHTML = `
            <div class="card-header">
                <div class="company-status">
                    ${company.isActive ? '<span class="status-badge active">Ativa</span>' : ''}
                    ${isOwner ? '<span class="status-badge owner">Proprietário</span>' : `<span class="status-badge member">${userRole}</span>`}
                </div>
                <button class="btn-access" onclick="companyManagerFirebase.selectCompany('${company.id}')">
                    <i class="fas fa-sign-in-alt"></i>
                    Acessar
                </button>
            </div>
            
            <div class="card-body">
                <div class="company-logo">
                    ${company.logo ? 
                        `<img src="${company.logo}" alt="Logo ${company.name}">` : 
                        `<i class="fas fa-building"></i>`
                    }
                </div>
                
                <div class="company-info">
                    <h3 class="company-name">${company.name}</h3>
                    
                    <div class="company-details">
                        <div class="detail-item">
                            <i class="fas fa-id-card"></i>
                            <span><strong>CNPJ:</strong> ${this.formatCnpj(company.cnpj)}</span>
                        </div>
                        
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span><strong>Localização:</strong> ${company.city}/${company.state}</span>
                        </div>
                        
                        <div class="detail-item">
                            <i class="fas fa-building-columns"></i>
                            <span><strong>Tipo:</strong> ${company.type}</span>
                        </div>
                        
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <span><strong>Responsável:</strong> ${company.responsible}</span>
                        </div>
                        
                        ${company.description ? `
                            <div class="detail-item description">
                                <i class="fas fa-info-circle"></i>
                                <span>${company.description}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Seleciona uma empresa
     */
    selectCompany(companyId) {
        const company = this.companies.find(c => c.id === companyId);
        if (!company) return;

        this.selectedCompany = company;
        
        // Atualiza o modal de confirmação
        document.getElementById('selectedCompanyName').textContent = company.name;
        document.getElementById('selectedCompanyCnpj').textContent = `CNPJ: ${this.formatCnpj(company.cnpj)}`;
        
        // Mostra o modal de confirmação
        const modal = new bootstrap.Modal(document.getElementById('switchCompanyModal'));
        modal.show();
    }

    /**
     * Confirma a troca de empresa
     */
    async confirmSwitch() {
        if (!this.selectedCompany) return;

        try {
            this.showLoading(true, 'Trocando empresa...');
            
            // Verificar se o usuário tem acesso à empresa
            if (!this.selectedCompany.members.includes(this.currentUser.uid)) {
                throw new Error('Acesso negado a esta empresa');
            }
            
            // Atualizar contexto da empresa ativa no Firestore
            await this.setActiveCompanyInFirestore(this.selectedCompany.id);
            
            // Salvar no localStorage para acesso rápido
            localStorage.setItem('activeCompany', JSON.stringify(this.selectedCompany));
            localStorage.setItem('activeCompanyId', this.selectedCompany.id);
            localStorage.setItem('lastCompanySwitch', new Date().toISOString());
            localStorage.setItem('userCompanyContext', JSON.stringify({
                companyId: this.selectedCompany.id,
                userId: this.currentUser.uid,
                timestamp: new Date().toISOString()
            }));
            
            // Disparar evento unificado de mudança de empresa
            window.dispatchEvent(new CustomEvent('companyChanged', {
                detail: { companyId: this.selectedCompany.id, company: this.selectedCompany }
            }));
            
            this.showNotification(`Empresa trocada com sucesso! Redirecionando...`, 'success');
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
            
        } catch (error) {
            console.error('Erro ao trocar empresa:', error);
            this.showNotification('Erro ao trocar empresa. Tente novamente.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Define a empresa ativa no Firestore
     */
    async setActiveCompanyInFirestore(companyId) {
        try {
            const userRef = this.db.collection('users').doc(this.currentUser.uid);
            await userRef.set({
                activeCompanyId: companyId,
                lastCompanySwitch: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Erro ao definir empresa ativa:', error);
            throw error;
        }
    }

    /**
     * Salva uma nova empresa
     */
    async saveNewCompany() {
        const form = document.getElementById('newCompanyForm');
        if (!form || !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            this.showLoading(true, 'Salvando empresa...');

            const formData = new FormData(form);
            const companyData = {
                name: formData.get('companyName') || document.getElementById('companyName').value,
                cnpj: formData.get('companyCnpj') || document.getElementById('companyCnpj').value,
                city: formData.get('companyCity') || document.getElementById('companyCity').value,
                state: formData.get('companyState') || document.getElementById('companyState').value,
                type: formData.get('companyType') || document.getElementById('companyType').value,
                responsible: formData.get('companyResponsible') || document.getElementById('companyResponsible').value,
                description: formData.get('companyDescription') || document.getElementById('companyDescription').value,
                
                // Dados de controle multitenant
                ownerId: this.currentUser.uid,
                members: [this.currentUser.uid],
                userRoles: {
                    [this.currentUser.uid]: 'owner'
                },
                isActive: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Configurações de isolamento
                dataIsolation: {
                    enabled: true,
                    level: 'strict'
                }
            };

            // Validar CNPJ único
            const existingCompany = await this.checkCnpjExists(companyData.cnpj);
            if (existingCompany) {
                throw new Error('CNPJ já cadastrado por outra empresa');
            }

            // Salvar no Firestore
            const docRef = await this.db.collection('companies').add(companyData);
            
            // Criar estrutura de dados isolada para a empresa
            await this.createCompanyDataStructure(docRef.id);
            
            this.showNotification('Empresa criada com sucesso!', 'success');
            
            // Fechar modal e recarregar lista
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCompanyModal'));
            modal.hide();
            
            form.reset();
            await this.loadUserCompanies();
            
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            this.showNotification(error.message || 'Erro ao salvar empresa. Tente novamente.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Verifica se CNPJ já existe
     */
    async checkCnpjExists(cnpj) {
        try {
            const snapshot = await this.db.collection('companies')
                .where('cnpj', '==', cnpj)
                .limit(1)
                .get();
            
            return !snapshot.empty;
        } catch (error) {
            console.error('Erro ao verificar CNPJ:', error);
            return false;
        }
    }

    /**
     * Cria estrutura de dados isolada para a empresa
     */
    async createCompanyDataStructure(companyId) {
        try {
            const batch = this.db.batch();
            
            // Criar coleções isoladas para a empresa
            const collections = [
                'families',
                'associates', 
                'pets',
                'contracts',
                'payments',
                'services',
                'plans'
            ];
            
            for (const collectionName of collections) {
                const docRef = this.db.collection(`companies/${companyId}/${collectionName}`).doc('_init');
                batch.set(docRef, {
                    initialized: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            await batch.commit();
            
        } catch (error) {
            console.error('Erro ao criar estrutura de dados da empresa:', error);
            throw error;
        }
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Botão de confirmar troca
        const confirmBtn = document.getElementById('confirmSwitchBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmSwitch();
                const modal = bootstrap.Modal.getInstance(document.getElementById('switchCompanyModal'));
                if (modal) modal.hide();
            });
        }

        // Botão de salvar nova empresa
        const saveBtn = document.getElementById('saveCompanyBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveNewCompany();
            });
        }

        // Máscara para CNPJ
        const cnpjInput = document.getElementById('companyCnpj');
        if (cnpjInput) {
            cnpjInput.addEventListener('input', (e) => {
                e.target.value = this.applyCnpjMask(e.target.value);
            });
        }
    }

    /**
     * Configura validação do formulário
     */
    setupFormValidation() {
        const form = document.getElementById('newCompanyForm');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewCompany();
        });
    }

    /**
     * Aplica máscara ao CNPJ
     */
    applyCnpjMask(value) {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 18);
    }

    /**
     * Formata CNPJ para exibição
     */
    formatCnpj(cnpj) {
        if (!cnpj || typeof cnpj !== 'string') return '';
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    /**
     * Mostra/esconde loading
     */
    showLoading(show, message = 'Carregando...') {
        const loadingElement = document.getElementById('loadingSpinner');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
            const loadingText = loadingElement.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    }

    /**
     * Mostra estado vazio
     */
    showEmptyState() {
        const companiesContainer = document.getElementById('companiesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (companiesContainer) companiesContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }

    /**
     * Mostra notificação
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Delay para simulação
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Função global para adicionar nova empresa
function addNewCompany() {
    const modal = new bootstrap.Modal(document.getElementById('addCompanyModal'));
    modal.show();
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.companyManagerFirebase = new CompanyManagerFirebase();
});