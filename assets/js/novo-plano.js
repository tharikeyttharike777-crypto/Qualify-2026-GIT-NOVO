/**
 * Novo Plano - Gerenciador de Cadastro/Edição
 * Sistema de criação e edição de planos
 */

class NovoPlano {
    constructor() {
        this.isEditMode = false;
        this.currentPlanId = null;
        this.planData = {};
        this.existingPlans = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupMoneyMasks();
        
        // 1. Carregar TODOS os planos (Merge Firestore + LocalStorage)
        await this.loadExistingPlans();
        
        // 2. Verificar modo edição (agora que temos os dados)
        this.checkEditMode();
        
        // 3. Renderizar tabela lateral
        this.renderExistingPlans();
        
        console.log('Novo Plano inicializado com suporte a múltiplos planos.');
        
        // Expor para testes
        window.novoPlano = this;
    }

    // Helpers de ambiente / multitenant para Firestore
    getActiveCompanyId() {
        try {
            const activeCompanyStr = localStorage.getItem('activeCompany');
            const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
            return activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
        } catch (e) {
            return localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
        }
    }

    waitForFirebaseReady(timeoutMs = 5000) {
        return new Promise((resolve) => {
            if (window.firebase && window.db && window.auth) {
                resolve(true);
                return;
            }
            let elapsed = 0;
            const interval = 100;
            const check = () => {
                if (window.firebase && window.db && window.auth) {
                    resolve(true);
                } else if (elapsed >= timeoutMs) {
                    resolve(false);
                } else {
                    elapsed += interval;
                    setTimeout(check, interval);
                }
            };
            window.addEventListener('firebaseReady', () => resolve(true), { once: true });
            check();
        });
    }

    async loadExistingPlans() {
        const companyId = this.getActiveCompanyId();
        const ready = await this.waitForFirebaseReady(3000);
        const plansFromFirestore = [];

        // 1. Tentar carregar do Firestore (Merge de companies e empresas)
        if (ready && window.db) {
            let loaded = false;
            
            // A) Via Multitenant API
            if (window.getCompanyCollection) {
                try {
                    const snap = await window.getCompanyCollection('planos').get();
                    const docs = snap?.docs || [];
                    docs.forEach(doc => plansFromFirestore.push({ id: parseInt(doc.id, 10) || doc.id, ...doc.data() }));
                    if (docs.length > 0) loaded = true;
                } catch (e) { console.warn('Falha load multitenant:', e); }
            }

            // B) Via Path Manual (Fallback)
            if (!loaded) {
                const bases = ['companies', 'empresas'];
                for (const base of bases) {
                    try {
                        const path = `${base}/${companyId}/planos`;
                        const snap = await window.db.collection(path).get();
                        const docs = snap?.docs || [];
                        docs.forEach(doc => plansFromFirestore.push({ id: parseInt(doc.id, 10) || doc.id, ...doc.data() }));
                        if (docs.length > 0) break;
                    } catch (e) { console.warn(`Falha load ${base}:`, e); }
                }
            }
        }

        // 2. Carregar do LocalStorage
        let localPlans = [];
        try {
            const saved = localStorage.getItem('planos');
            if (saved) localPlans = JSON.parse(saved);
        } catch (e) { console.warn('Erro localStorage:', e); }

        // 3. Mesclar (Deduplicar por ID)
        // A prioridade é do Firestore se houver conflito, mas aqui assumimos que Firestore é mais atual
        const mergedMap = new Map();
        
        // Primeiro popula com local (pode ter dados offline)
        localPlans.forEach(p => mergedMap.set(String(p.id), p));
        
        // Sobrescreve/Adiciona com Firestore (fonte da verdade online)
        plansFromFirestore.forEach(p => mergedMap.set(String(p.id), p));

        this.existingPlans = Array.from(mergedMap.values());
        
        // Ordenar por ID ou Nome
        this.existingPlans.sort((a, b) => (a.id > b.id ? 1 : -1));

        console.log(`Planos carregados (Merge): ${this.existingPlans.length}`);
        
        // Atualizar status
        const statusEl = document.getElementById('existing-plans-status');
        if (statusEl) {
            const count = this.existingPlans.length;
            statusEl.textContent = count > 0 ? `${count} plano(s) encontrado(s)` : 'Nenhum plano encontrado';
        }
    }

    renderExistingPlans() {
        const tbody = document.getElementById('existing-plans-tbody');
        if (!tbody) return;

        const formatMoney = (val) => {
            if (val == null || val === '') return 'R$ 0,00';
            const s = String(val).trim();
            return s.startsWith('R$') ? s : `R$ ${s}`;
        };
        const formatGrace = (val) => {
            if (val == null || val === '') return '0 dias';
            const n = parseInt(String(val).replace(/\D/g, ''), 10);
            return Number.isFinite(n) ? `${n} dias` : String(val);
        };

        if (this.existingPlans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="fas fa-search fa-2x text-muted mb-2"></i>
                        <p class="text-muted mb-0">Nenhum plano encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.existingPlans.map(plan => `
            <tr>
                <td><strong>${plan.name || '—'}</strong></td>
                <td>
                    <span class="badge ${plan.status === 'ativo' ? 'bg-success' : 'bg-secondary'}">
                        ${plan.status || '—'}
                    </span>
                </td>
                <td>${formatGrace(plan.gracePeriod)}</td>
                <td>${formatMoney(plan.monthlyValue ?? plan.valorMensalidade)}</td>
                <td>${plan.maxPeople ?? '—'}</td>
            </tr>
            <tr>
                <td colspan="5" class="py-2">
                    <button class="btn btn-sm btn-primary" onclick="location.href='novo-plano.html?id=${plan.id}'">
                        <i class="fas fa-pencil-alt"></i> Editar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    setupEventListeners() {
        const saveBtn = document.getElementById('save-plan-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.savePlan());
        }

        const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                this.handleTabChange(e.target.getAttribute('data-bs-target'));
            });
        });

        const addProductBtn = document.getElementById('add-product-btn');
        const addServiceBtn = document.getElementById('add-service-btn');

        if (addProductBtn) addProductBtn.addEventListener('click', () => this.addProduct());
        if (addServiceBtn) addServiceBtn.addEventListener('click', () => this.addService());

        this.setupFormValidation();
    }

    setupMoneyMasks() {
        const moneyInputs = document.querySelectorAll('.money-mask');
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.formatMoney(e.target);
            });
        });
    }

    formatMoney(input) {
        let value = input.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        input.value = value;
    }

    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        let planId = urlParams.get('id');
        const cloneId = urlParams.get('clone');

        if (!planId) {
            try {
                const stored = localStorage.getItem('editingPlanId');
                if (stored) {
                    planId = stored;
                    localStorage.removeItem('editingPlanId');
                }
            } catch (e) { }
        }

        if (planId) {
            this.isEditMode = true;
            this.currentPlanId = parseInt(planId, 10) || planId; // Aceita string ou int
            this.loadPlanData(planId);
            this.updatePageTitle('Editar Plano');
        } else if (cloneId) {
            this.isEditMode = false;
            this.currentPlanId = null;
            this.loadPlanData(cloneId, true);
            this.updatePageTitle('Novo Plano (cópia)');
        }
    }

    updatePageTitle(title) {
        document.getElementById('page-title').textContent = title;
        document.getElementById('main-title').textContent = title;
        document.title = `${title} - Qualify`;
    }

    loadPlanData(planId, isClone = false) {
        // Busca na lista já carregada (this.existingPlans)
        const plan = this.existingPlans.find(p => String(p.id) === String(planId));
        
        if (plan) {
            const mapToForm = {
                planName: plan.name || '',
                planStatus: plan.status || 'ativo',
                planDescription: plan.description || '',
                maxPeople: plan.maxPeople || '',
                publicPage: plan.publicPage || 'sim',
                gracePeriod: parseInt(String(plan.gracePeriod || '0').replace(/\D/g, ''), 10) || 0,
                graceType: 'geral',
                graceDescription: '',
                adhesionValue: (plan.adhesionValue || '').replace(/^R\$\s?/, ''),
                monthlyValue: (plan.monthlyValue || '').replace(/^R\$\s?/, ''),
                annualValue: (plan.annualValue || '').replace(/^R\$\s?/, ''),
                dependentAdditional: (plan.dependentAdditional || '').replace(/^R\$\s?/, ''),
                discountPercentage: 0,
                planClause: plan.clauseText || ''
            };

            this.planData = plan;
            this.populateForm(mapToForm);
        } else {
            console.warn('Plano não encontrado para carregamento:', planId);
            if(this.isEditMode) this.showAlert('Erro: Plano não encontrado.', 'danger');
        }
    }

    populateForm(data) {
        Object.keys(data).forEach(key => {
            const field = document.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = data[key];
                } else {
                    field.value = data[key];
                }
            }
        });

        if (this.planData.agePricing && Array.isArray(this.planData.agePricing)) {
            const tbody = document.getElementById('age-pricing-tbody');
            if(tbody) {
                tbody.innerHTML = ''; 
                this.planData.agePricing.forEach(item => this.addAgeRange(item));
            }
        }
    }

    handleTabChange(targetTab) {
        this.saveCurrentTabData();
        switch (targetTab) {
            case '#produtos': this.loadProducts(); break;
            case '#servicos': this.loadServices(); break;
        }
    }

    saveCurrentTabData() {
        const form = document.getElementById('plan-form');
        if (form) {
            const formData = new FormData(form);
            for (let [key, value] of formData.entries()) {
                this.planData[key] = value;
            }
        }
    }

    setupFormValidation() {
        const requiredFields = document.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
        });
    }

    validateField(field) {
        const isValid = field.checkValidity();
        if (!isValid) {
            field.classList.add('is-invalid');
            this.showFieldError(field, 'Este campo é obrigatório');
        } else {
            field.classList.remove('is-invalid');
            this.hideFieldError(field);
        }
        return isValid;
    }

    showFieldError(field, message) {
        let errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    }

    hideFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    validateForm() {
        const planName = document.getElementById('plan-name');
        if (!planName || !planName.value.trim()) {
            this.showAlert('O nome do plano é obrigatório.', 'danger');
            if (planName) {
                planName.focus();
                planName.classList.add('is-invalid');
            }
            return false;
        }
        planName.classList.remove('is-invalid');
        return true;
    }

    addProduct() {
        const productsList = document.getElementById('products-list');
        if(!productsList) return;
        const productCount = productsList.querySelectorAll('.product-item').length;
        const productHtml = `
            <div class="product-item border rounded p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>Produto ${productCount + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.product-item').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Nome do Produto</label>
                        <input type="text" class="form-control" name="product_name_${productCount}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Quantidade</label>
                        <input type="number" class="form-control" name="product_quantity_${productCount}" min="1" value="1">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Valor</label>
                        <div class="input-group">
                            <span class="input-group-text">R$</span>
                            <input type="text" class="form-control money-mask" name="product_value_${productCount}">
                        </div>
                    </div>
                </div>
            </div>
        `;
        productsList.insertAdjacentHTML('beforeend', productHtml);
        const newMoneyInput = productsList.lastElementChild.querySelector(`.money-mask`);
        if (newMoneyInput) newMoneyInput.addEventListener('input', (e) => this.formatMoney(e.target));
    }

    addService() {
        const servicesList = document.getElementById('services-list');
        if(!servicesList) return;
        const serviceCount = servicesList.querySelectorAll('.service-item').length;
        const serviceHtml = `
            <div class="service-item border rounded p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>Serviço ${serviceCount + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.service-item').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-8">
                        <label class="form-label">Nome do Serviço</label>
                        <input type="text" class="form-control" name="service_name_${serviceCount}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Valor</label>
                        <div class="input-group">
                            <span class="input-group-text">R$</span>
                            <input type="text" class="form-control money-mask" name="service_value_${serviceCount}">
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-control" name="service_description_${serviceCount}" rows="2"></textarea>
                    </div>
                </div>
            </div>
        `;
        servicesList.insertAdjacentHTML('beforeend', serviceHtml);
        const newMoneyInput = servicesList.lastElementChild.querySelector(`.money-mask`);
        if (newMoneyInput) newMoneyInput.addEventListener('input', (e) => this.formatMoney(e.target));
    }

    loadProducts() { console.log('Carregando produtos do plano (placeholder)'); }
    loadServices() { console.log('Carregando serviços do plano (placeholder)'); }

    collectFormData() {
        const formData = {};
        document.querySelectorAll('#geral [name], #carencia [name], #valores [name], #clausula [name]').forEach(el => {
            if (/^(product_|service_)/.test(el.name)) return;
            formData[el.name] = (el.type === 'checkbox') ? el.checked : el.value;
        });

        const getVal = (id) => document.getElementById(id)?.value || '';
        formData.adhesionValue = formData.adhesionValue ?? getVal('adhesion-value');
        formData.monthlyValue = formData.monthlyValue ?? getVal('monthly-value');
        formData.annualValue = formData.annualValue ?? getVal('annual-value');
        formData.dependentAdditional = formData.dependentAdditional ?? getVal('dependent-additional');
        formData.gracePeriod = formData.gracePeriod ?? getVal('grace-period');

        const normalizeMoney = (v) => {
            const val = (v || '').trim();
            if (!val) return 'R$ 0,00';
            return val.startsWith('R$') ? val : `R$ ${val}`;
        };
        formData.adhesionValue = normalizeMoney(formData.adhesionValue);
        formData.monthlyValue = normalizeMoney(formData.monthlyValue);
        formData.annualValue = normalizeMoney(formData.annualValue);
        formData.dependentAdditional = normalizeMoney(formData.dependentAdditional);

        if (formData.gracePeriod !== undefined) {
            const n = parseInt(formData.gracePeriod, 10);
            formData.gracePeriod = (!isNaN(n)) ? `${n} dias` : (formData.gracePeriod || '0 dias');
        }
        formData.maxPeople = formData.maxPeople || '1';

        const products = [];
        document.querySelectorAll('.product-item').forEach((item) => {
            products.push({
                name: item.querySelector(`[name^="product_name_"]`)?.value || '',
                quantity: item.querySelector(`[name^="product_quantity_"]`)?.value || '1',
                value: normalizeMoney(item.querySelector(`[name^="product_value_"]`)?.value || '')
            });
        });
        formData.products = products;

        const services = [];
        document.querySelectorAll('.service-item').forEach((item) => {
            services.push({
                name: item.querySelector(`[name^="service_name_"]`)?.value || '',
                value: normalizeMoney(item.querySelector(`[name^="service_value_"]`)?.value || ''),
                description: item.querySelector(`[name^="service_description_"]`)?.value || ''
            });
        });
        formData.services = services;

        const agePricing = [];
        const ageRows = document.querySelectorAll('#age-pricing-tbody tr');
        ageRows.forEach(row => {
            const minAge = row.querySelector('.min-age')?.value;
            const maxAge = row.querySelector('.max-age')?.value;
            const value = normalizeMoney(row.querySelector('.age-value')?.value);
            if (minAge && maxAge && value) agePricing.push({ minAge, maxAge, value });
        });
        formData.agePricing = agePricing;

        return formData;
    }

    addAgeRange(data = null) {
        const tbody = document.getElementById('age-pricing-tbody');
        if(!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="form-control min-age" value="${data?.minAge || ''}" placeholder="0"></td>
            <td><input type="number" class="form-control max-age" value="${data?.maxAge || ''}" placeholder="100"></td>
            <td>
                <div class="input-group">
                    <span class="input-group-text">R$</span>
                    <input type="text" class="form-control money-mask age-value" value="${data?.value || ''}">
                </div>
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        const moneyInput = tr.querySelector('.money-mask');
        moneyInput.addEventListener('input', (e) => this.formatMoney(e.target));
    }

    async savePlan() {
        if (!this.validateForm()) {
            this.showAlert('Por favor, preencha todos os campos obrigatórios.', 'danger');
            return;
        }

        const formData = this.collectFormData();
        const saveBtn = document.getElementById('save-plan-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Salvando...';
        saveBtn.disabled = true;

        try {
            if (this.isEditMode) {
                await this.updatePlan(formData);
            } else {
                await this.createPlan(formData);
            }
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // Persistência Centralizada: Salva no localStorage e tenta no Firestore
    async saveToStorageAndFirestore(plan, isUpdate) {
        // 1. Atualizar localStorage (Sincronização imediata)
        localStorage.setItem('planos', JSON.stringify(this.existingPlans));
        try {
            const companyId = this.getActiveCompanyId();
            if (companyId) localStorage.setItem(`planos_${companyId}`, JSON.stringify(this.existingPlans));
        } catch(_) {}

        // 2. Salvar no Firestore
        try {
            await this.waitForFirebaseReady(2000);
            const companyId = this.getActiveCompanyId();
            const planIdStr = String(plan.id);
            let saved = false;

            if (window.getCompanyCollection) {
                try {
                    await window.getCompanyCollection('planos').doc(planIdStr).set(plan, { merge: true });
                    console.log(`Plano ${planIdStr} salvo via Multitenant API.`);
                    saved = true;
                } catch (e) { console.warn('Falha Multitenant API Save:', e); }
            }

            if (!saved && window.db) {
                const bases = ['companies', 'empresas'];
                for (const base of bases) {
                    try {
                        const path = `${base}/${companyId}/planos`;
                        await window.db.collection(path).doc(planIdStr).set(plan, { merge: true });
                        console.log(`Plano ${planIdStr} salvo em ${path}.`);
                        saved = true;
                        break;
                    } catch (e) { console.warn(`Falha save ${base}:`, e); }
                }
            }
        } catch (e) {
            console.warn('Falha ao persistir no Firestore (dados salvos localmente):', e);
        }
    }

    async createPlan(data) {
        console.log('Criando novo plano:', data);
        try {
            // CORREÇÃO: Usar this.existingPlans que contém o merge de Firestore + LocalStorage
            // Calcula novo ID baseado no maior ID existente
            const maxId = this.existingPlans.reduce((acc, p) => {
                const pid = parseInt(p.id, 10);
                return Math.max(acc, Number.isFinite(pid) ? pid : 0);
            }, 0);
            const newId = maxId + 1;

            const newPlan = {
                id: newId,
                name: data.planName,
                status: data.planStatus || 'ativo',
                publicPage: data.publicPage || 'sim',
                gracePeriod: data.gracePeriod || '0 dias',
                adhesionValue: data.adhesionValue || 'R$ 0,00',
                monthlyValue: data.monthlyValue || 'R$ 0,00',
                annualValue: data.annualValue || 'R$ 0,00',
                maxPeople: parseInt(data.maxPeople) || 1,
                dependentAdditional: data.dependentAdditional || 'R$ 0,00',
                photo: data.photo || null,
                description: data.planDescription || '',
                products: data.products || [],
                services: data.services || [],
                agePricing: data.agePricing || [],
                clauseText: data.planClause || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Adiciona ao array em memória
            this.existingPlans.push(newPlan);

            // Persiste
            await this.saveToStorageAndFirestore(newPlan, false);

            this.showAlert('Plano criado com sucesso!', 'success');
            
            // Renderiza novamente a lista lateral
            this.renderExistingPlans();

            setTimeout(() => {
                window.location.href = '../pages/pesquisa-planos.html';
            }, 2000);

        } catch (error) {
            console.error('Erro ao salvar plano:', error);
            this.showAlert('Erro ao salvar plano. Tente novamente.', 'danger');
        }
    }

    async updatePlan(data) {
        console.log('Atualizando plano:', data);
        try {
            const planIndex = this.existingPlans.findIndex(p => String(p.id) === String(this.currentPlanId));

            if (planIndex !== -1) {
                // Atualiza objeto
                this.existingPlans[planIndex] = {
                    ...this.existingPlans[planIndex],
                    name: data.planName,
                    status: data.planStatus || 'ativo',
                    publicPage: data.publicPage || 'sim',
                    gracePeriod: data.gracePeriod || '0 dias',
                    adhesionValue: data.adhesionValue || 'R$ 0,00',
                    monthlyValue: data.monthlyValue || 'R$ 0,00',
                    annualValue: data.annualValue || 'R$ 0,00',
                    maxPeople: parseInt(data.maxPeople) || 1,
                    dependentAdditional: data.dependentAdditional || 'R$ 0,00',
                    photo: data.photo || null,
                    description: data.planDescription || '',
                    products: data.products || [],
                    services: data.services || [],
                    agePricing: data.agePricing || [],
                    clauseText: data.planClause || this.existingPlans[planIndex].clauseText || '',
                    updatedAt: new Date().toISOString()
                };

                // Persiste
                await this.saveToStorageAndFirestore(this.existingPlans[planIndex], true);

                this.showAlert('Plano atualizado com sucesso!', 'success');
                this.renderExistingPlans();

                setTimeout(() => {
                    window.location.href = '../pages/pesquisa-planos.html';
                }, 2000);
            } else {
                throw new Error('Plano não encontrado para atualização.');
            }
        } catch (error) {
            console.error('Erro ao atualizar plano:', error);
            this.showAlert('Erro ao atualizar plano. Tente novamente.', 'danger');
        }
    }

    showAlert(message, type = 'info') {
        const existingAlerts = document.querySelectorAll('.alert-custom');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
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
        setTimeout(() => {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }
}

// Inicializar quando o DOM estiver carregado
let novoPlanoInstance;
document.addEventListener('DOMContentLoaded', () => {
    novoPlanoInstance = new NovoPlano();
    window.addAgeRange = () => novoPlanoInstance.addAgeRange();
    
    // Teste Manual (Disponível no console)
    window.testPlanStorage = async function() {
        console.log("Iniciando teste de armazenamento...");
        const initialCount = novoPlanoInstance.existingPlans.length;
        console.log(`Planos iniciais: ${initialCount}`);
        
        const dummyPlan = {
            planName: "Teste Automático " + Date.now(),
            planStatus: "ativo",
            monthlyValue: "R$ 100,00",
            maxPeople: 5
        };
        
        await novoPlanoInstance.createPlan(dummyPlan);
        
        const newCount = novoPlanoInstance.existingPlans.length;
        console.log(`Planos após adição: ${newCount}`);
        
        if(newCount === initialCount + 1) {
            console.log("✅ Sucesso: Plano adicionado corretamente (incremento verificado).");
        } else {
            console.error("❌ Falha: Contagem de planos incorreta.");
        }
        
        // Verificar persistência no localStorage
        const stored = JSON.parse(localStorage.getItem('planos') || '[]');
        if(stored.length === newCount) {
             console.log("✅ Sucesso: LocalStorage sincronizado.");
        } else {
             console.error("❌ Falha: LocalStorage desatualizado.");
        }
    }
});
