/**
 * Produtos - Gerenciador de Catálogo de Produtos e Serviços
 */

class ProdutosPage {
    constructor() {
        this.products = [];
        this.services = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMoneyMasks();
        this.loadFromStorage();
        console.log('Página Produtos inicializada');
    }

    setupEventListeners() {
        const addProductBtn = document.getElementById('add-product-btn');
        const addServiceBtn = document.getElementById('add-service-btn');
        const saveBtn = document.getElementById('save-btn');

        if (addProductBtn) addProductBtn.addEventListener('click', () => this.addProduct());
        if (addServiceBtn) addServiceBtn.addEventListener('click', () => this.addService());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveAll());
    }

    setupMoneyMasks() {
        const moneyInputs = document.querySelectorAll('.money-mask');
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => this.formatMoney(e.target));
        });
    }

    formatMoney(input) {
        let value = input.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        input.value = value;
    }

    addProduct() {
        const productsList = document.getElementById('products-list');
        const count = productsList.querySelectorAll('.product-item').length;
        const html = `
            <div class="product-item border rounded p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>Produto ${count + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.product-item').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Nome do Produto</label>
                        <input type="text" class="form-control" name="product_name_${count}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Quantidade</label>
                        <input type="number" class="form-control" name="product_quantity_${count}" min="1" value="1">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Valor</label>
                        <div class="input-group">
                            <span class="input-group-text">R$</span>
                            <input type="text" class="form-control money-mask" name="product_value_${count}">
                        </div>
                        <div class="form-check mt-2">
                            <input class="form-check-input age-pricing-toggle" type="checkbox" id="age_pricing_${count}">
                            <label class="form-check-label" for="age_pricing_${count}">Usar valores por faixa de idade</label>
                        </div>
                    </div>
                </div>
                <div class="age-pricing-container d-none mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">Configure faixas de idade e seus valores</small>
                        <button type="button" class="btn btn-sm btn-outline-primary add-age-row">Adicionar faixa</button>
                    </div>
                    <div class="age-rows"></div>
                </div>
            </div>`;

        if (count === 0) productsList.innerHTML = html; else productsList.insertAdjacentHTML('beforeend', html);

        const newMoneyInput = productsList.querySelector(`[name="product_value_${count}"]`);
        if (newMoneyInput) newMoneyInput.addEventListener('input', (e) => this.formatMoney(e.target));

        // Configurar toggle de faixas de idade
        const item = productsList.querySelectorAll('.product-item')[count];
        const toggle = item.querySelector('#age_pricing_' + count);
        const container = item.querySelector('.age-pricing-container');
        const addRowBtn = item.querySelector('.add-age-row');

        if (toggle) {
            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    container.classList.remove('d-none');
                } else {
                    container.classList.add('d-none');
                }
            });
        }

        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => {
                this.addAgePriceRow(item);
            });
        }
    }

    getDefaultAgeRanges() {
        return [
            '0-17','18-25','26-35','36-45','46-55','56-60','61-65','66-70','71-75','76+'
        ];
    }

    parseAgeRange(rangeStr) {
        try {
            const s = String(rangeStr || '').trim();
            if (!s) return { start: '', end: '' };
            if (/\+$/.test(s)) {
                const n = parseInt(s.replace(/\D/g, ''), 10);
                return { start: isNaN(n) ? '' : String(n), end: '' };
            }
            const parts = s.split('-');
            const start = parseInt(parts[0].replace(/\D/g, ''), 10);
            const end = parseInt((parts[1] || '').replace(/\D/g, ''), 10);
            return { start: isNaN(start) ? '' : String(start), end: isNaN(end) ? '' : String(end) };
        } catch (_) {
            return { start: '', end: '' };
        }
    }

    addAgePriceRow(productItem, preset = null) {
        const rowsContainer = productItem.querySelector('.age-rows');
        const row = document.createElement('div');
        row.className = 'row g-2 age-row';
        row.innerHTML = `
            <div class="col-md-3">
                <label class="form-label">Faixa inicial</label>
                <input type="number" class="form-control age-start" min="0" max="120" placeholder="Ex.: 18">
            </div>
            <div class="col-md-3">
                <label class="form-label">Faixa final</label>
                <input type="number" class="form-control age-end" min="0" max="120" placeholder="Ex.: 25">
                <div class="form-text">Deixe vazio para aberto (ex.: 76+)</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Valor</label>
                <div class="input-group">
                    <span class="input-group-text">R$</span>
                    <input type="text" class="form-control money-mask age-value">
                </div>
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="button" class="btn btn-outline-danger remove-age-row"><i class="fas fa-trash"></i></button>
            </div>
        `;
        rowsContainer.appendChild(row);
        const moneyInput = row.querySelector('.age-value');
        if (moneyInput) moneyInput.addEventListener('input', (e) => this.formatMoney(e.target));
        if (preset) {
            if (typeof preset.range === 'string') {
                const r = this.parseAgeRange(preset.range);
                row.querySelector('.age-start').value = r.start || '';
                row.querySelector('.age-end').value = r.end || '';
            } else {
                row.querySelector('.age-start').value = preset.start ?? '';
                row.querySelector('.age-end').value = preset.end ?? '';
            }
            row.querySelector('.age-value').value = preset.value || '';
        }
        row.querySelector('.remove-age-row').addEventListener('click', () => row.remove());
    }

    addService() {
        const servicesList = document.getElementById('services-list');
        const count = servicesList.querySelectorAll('.service-item').length;
        const html = `
            <div class="service-item border rounded p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>Serviço ${count + 1}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.service-item').remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-8">
                        <label class="form-label">Nome do Serviço</label>
                        <input type="text" class="form-control" name="service_name_${count}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Valor</label>
                        <div class="input-group">
                            <span class="input-group-text">R$</span>
                            <input type="text" class="form-control money-mask" name="service_value_${count}">
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-control" name="service_description_${count}" rows="2"></textarea>
                    </div>
                </div>
            </div>`;

        if (count === 0) servicesList.innerHTML = html; else servicesList.insertAdjacentHTML('beforeend', html);

        const newMoneyInput = servicesList.querySelector(`[name="service_value_${count}"]`);
        if (newMoneyInput) newMoneyInput.addEventListener('input', (e) => this.formatMoney(e.target));
    }

    collectData() {
        const data = { products: [], services: [] };

        document.querySelectorAll('.product-item').forEach(item => {
            const useAge = item.querySelector('.age-pricing-toggle')?.checked || false;
            const product = {
                name: item.querySelector('[name^="product_name_"]').value || '',
                quantity: item.querySelector('[name^="product_quantity_"]').value || '1',
                value: item.querySelector('[name^="product_value_"]').value || '',
                agePricingEnabled: useAge,
                agePrices: []
            };
            if (useAge) {
                item.querySelectorAll('.age-row').forEach(row => {
                    const startStr = row.querySelector('.age-start')?.value || '';
                    const endStr = row.querySelector('.age-end')?.value || '';
                    const value = row.querySelector('.age-value')?.value || '';
                    const start = startStr === '' ? '' : String(parseInt(startStr, 10));
                    const end = endStr === '' ? '' : String(parseInt(endStr, 10));
                    if (value && (start !== '' || end !== '')) {
                        product.agePrices.push({ start, end, value });
                    }
                });
            }
            data.products.push(product);
        });

        document.querySelectorAll('.service-item').forEach(item => {
            data.services.push({
                name: item.querySelector('[name^="service_name_"]').value || '',
                value: item.querySelector('[name^="service_value_"]').value || '',
                description: item.querySelector('[name^="service_description_"]').value || ''
            });
        });

        return data;
    }

    loadFromStorage() {
        try {
            const storedProducts = JSON.parse(localStorage.getItem('catalogoProdutos') || '[]');
            const storedServices = JSON.parse(localStorage.getItem('catalogoServicos') || '[]');

            storedProducts.forEach(() => this.addProduct());
            const productItems = document.querySelectorAll('.product-item');
            productItems.forEach((item, i) => {
                item.querySelector('[name^="product_name_"]').value = storedProducts[i]?.name || '';
                item.querySelector('[name^="product_quantity_"]').value = storedProducts[i]?.quantity || '1';
                item.querySelector('[name^="product_value_"]').value = storedProducts[i]?.value || '';
                // Popular faixas de idade se houver
                const toggle = item.querySelector('.age-pricing-toggle');
                const container = item.querySelector('.age-pricing-container');
                if (storedProducts[i]?.agePricingEnabled) {
                    if (toggle) toggle.checked = true;
                    if (container) container.classList.remove('d-none');
                    (storedProducts[i]?.agePrices || []).forEach(p => this.addAgePriceRow(item, p));
                }
            });

            storedServices.forEach(() => this.addService());
            const serviceItems = document.querySelectorAll('.service-item');
            serviceItems.forEach((item, i) => {
                item.querySelector('[name^="service_name_"]').value = storedServices[i]?.name || '';
                item.querySelector('[name^="service_value_"]').value = storedServices[i]?.value || '';
                item.querySelector('[name^="service_description_"]').value = storedServices[i]?.description || '';
            });
        } catch (e) {
            console.warn('Falha ao carregar catálogo do storage:', e);
        }
    }

    saveAll() {
        const data = this.collectData();
        try {
            localStorage.setItem('catalogoProdutos', JSON.stringify(data.products));
            localStorage.setItem('catalogoServicos', JSON.stringify(data.services));
            this.showAlert('Catálogo salvo com sucesso!', 'success');
        } catch (e) {
            console.error('Erro ao salvar catálogo:', e);
            this.showAlert('Erro ao salvar catálogo. Tente novamente.', 'danger');
        }
    }

    showAlert(message, type = 'info') {
        const existingAlerts = document.querySelectorAll('.alert-custom');
        existingAlerts.forEach(a => a.remove());
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '2000';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProdutosPage();
});
