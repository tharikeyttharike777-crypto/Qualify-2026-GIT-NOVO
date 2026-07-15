class ProdutosPlano {
    constructor() {
        this.planId = null;
        this.products = [];
        this.editingProductId = null;
        this.init();
    }

    init() {
        this.planId = this.getPlanIdFromUrl();
        this.setupEventListeners();
        this.loadPlanInfo();
        this.loadProducts();
        this.setupMoneyMasks();
    }

    getPlanIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('planId') || '1';
    }

    setupEventListeners() {
        // Save product button
        document.getElementById('save-product-btn').addEventListener('click', () => {
            this.saveProduct();
        });

        // Setup money masks
        this.setupMoneyMasks();
    }

    setupMoneyMasks() {
        const moneyInputs = document.querySelectorAll('.money-mask');
        moneyInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = (value / 100).toFixed(2);
                value = value.replace('.', ',');
                value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                e.target.value = value;
            });
        });
    }

    loadPlanInfo() {
        // Simulate loading plan information
        const planInfo = {
            '1': { name: 'Vitaplan Nacional', type: 'Plano de Saúde' },
            '2': { name: 'Plano Básico', type: 'Plano Básico' },
            '3': { name: 'Plano Premium', type: 'Plano Premium' }
        };

        const plan = planInfo[this.planId] || { name: 'Plano Desconhecido', type: 'N/A' };
        document.getElementById('plan-name').textContent = `${plan.name} - ${plan.type}`;
    }

    loadProducts() {
        // Simulate loading products data
        this.products = [
            {
                id: 1,
                name: 'Paracetamol 500mg',
                category: 'medicamentos',
                description: 'Analgésico e antitérmico',
                price: 15.90,
                discount: 10,
                stock: 150,
                status: 'ativo',
                brand: 'Genérico',
                supplier: 'Farmácia Central'
            },
            {
                id: 2,
                name: 'Termômetro Digital',
                category: 'equipamentos',
                description: 'Termômetro digital com display LCD',
                price: 45.00,
                discount: 0,
                stock: 25,
                status: 'ativo',
                brand: 'TechMed',
                supplier: 'MedEquip Ltda'
            },
            {
                id: 3,
                name: 'Vitamina C 1000mg',
                category: 'suplementos',
                description: 'Suplemento vitamínico',
                price: 32.50,
                discount: 15,
                stock: 5,
                status: 'ativo',
                brand: 'VitaLife',
                supplier: 'Suplementos Brasil'
            }
        ];

        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        grid.innerHTML = '';

        // Add "Add Product" card
        const addCard = this.createAddProductCard();
        grid.appendChild(addCard);

        // Add product cards
        this.products.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });
    }

    createAddProductCard() {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        col.innerHTML = `
            <div class="card add-product-card h-100" data-bs-toggle="modal" data-bs-target="#addProductModal">
                <div class="card-body d-flex flex-column justify-content-center align-items-center text-center py-5">
                    <i class="fas fa-plus fa-3x text-success mb-3"></i>
                    <h5 class="text-success mb-2">Adicionar Produto</h5>
                    <p class="text-muted mb-0">Clique para adicionar um novo produto ao plano</p>
                </div>
            </div>
        `;

        return col;
    }

    createProductCard(product) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        const stockLevel = this.getStockLevel(product.stock);
        const finalPrice = product.price * (1 - product.discount / 100);
        
        col.innerHTML = `
            <div class="card product-card h-100 position-relative">
                <span class="badge ${product.status === 'ativo' ? 'bg-success' : 'bg-secondary'} product-status">
                    ${product.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
                <div class="card-body">
                    <div class="d-flex align-items-start mb-3">
                        <div class="product-image me-3">
                            <i class="fas ${this.getCategoryIcon(product.category)}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">${product.name}</h6>
                            <small class="text-muted">${this.getCategoryName(product.category)}</small>
                        </div>
                    </div>
                    
                    <p class="card-text text-muted small mb-3">${product.description}</p>
                    
                    <div class="row mb-3">
                        <div class="col-6">
                            <small class="text-muted d-block">Preço</small>
                            <div>
                                ${product.discount > 0 ? `<small class="text-decoration-line-through text-muted">R$ ${product.price.toFixed(2).replace('.', ',')}</small><br>` : ''}
                                <strong class="text-success">R$ ${finalPrice.toFixed(2).replace('.', ',')}</strong>
                                ${product.discount > 0 ? `<small class="text-success"> (-${product.discount}%)</small>` : ''}
                            </div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">Estoque</small>
                            <div class="d-flex align-items-center">
                                <span class="stock-indicator ${stockLevel.class} me-2"></span>
                                <span class="fw-bold">${product.stock}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <small class="text-muted d-block">Marca: ${product.brand}</small>
                        <small class="text-muted d-block">Fornecedor: ${product.supplier}</small>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="produtosPlano.editProduct(${product.id})">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="produtosPlano.deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    getCategoryIcon(category) {
        const icons = {
            'medicamentos': 'fa-pills',
            'equipamentos': 'fa-stethoscope',
            'suplementos': 'fa-capsules',
            'cosmeticos': 'fa-spray-can',
            'higiene': 'fa-soap',
            'outros': 'fa-box'
        };
        return icons[category] || 'fa-box';
    }

    getCategoryName(category) {
        const names = {
            'medicamentos': 'Medicamentos',
            'equipamentos': 'Equipamentos',
            'suplementos': 'Suplementos',
            'cosmeticos': 'Cosméticos',
            'higiene': 'Higiene',
            'outros': 'Outros'
        };
        return names[category] || 'Outros';
    }

    getStockLevel(stock) {
        if (stock > 50) return { class: 'stock-high', level: 'Alto' };
        if (stock > 10) return { class: 'stock-medium', level: 'Médio' };
        return { class: 'stock-low', level: 'Baixo' };
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.editingProductId = productId;
        
        // Fill form with product data
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-price').value = product.price.toFixed(2).replace('.', ',');
        document.getElementById('product-discount').value = product.discount;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-status').value = product.status;
        document.getElementById('product-brand').value = product.brand;
        document.getElementById('product-supplier').value = product.supplier;

        // Update modal title
        document.querySelector('#addProductModal .modal-title').innerHTML = `
            <i class="fas fa-edit me-2"></i>
            Editar Produto
        `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
        modal.show();
    }

    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.showAlert(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir o produto "${product.name}"?`,
            'warning',
            () => {
                this.products = this.products.filter(p => p.id !== productId);
                this.renderProducts();
                this.showAlert('Sucesso!', 'Produto excluído com sucesso.', 'success');
            }
        );
    }

    saveProduct() {
        const form = document.getElementById('product-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const productData = {
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value.replace(/\./g, '').replace(',', '.')),
            discount: parseInt(document.getElementById('product-discount').value) || 0,
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            status: document.getElementById('product-status').value,
            brand: document.getElementById('product-brand').value,
            supplier: document.getElementById('product-supplier').value
        };

        if (this.editingProductId) {
            // Update existing product
            const productIndex = this.products.findIndex(p => p.id === this.editingProductId);
            if (productIndex !== -1) {
                this.products[productIndex] = { ...this.products[productIndex], ...productData };
                this.showAlert('Sucesso!', 'Produto atualizado com sucesso.', 'success');
            }
        } else {
            // Create new product
            const newProduct = {
                id: Date.now(),
                ...productData
            };
            this.products.push(newProduct);
            this.showAlert('Sucesso!', 'Produto adicionado com sucesso.', 'success');
        }

        this.renderProducts();
        this.resetForm();
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
        modal.hide();
    }

    resetForm() {
        document.getElementById('product-form').reset();
        this.editingProductId = null;
        
        // Reset modal title
        document.querySelector('#addProductModal .modal-title').innerHTML = `
            <i class="fas fa-plus me-2"></i>
            Adicionar Produto
        `;
    }

    showAlert(title, message, type = 'info', onConfirm = null) {
        // Create custom alert modal
        const alertModal = document.createElement('div');
        alertModal.className = 'modal fade';
        alertModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">${message}</p>
                    </div>
                    <div class="modal-footer border-0">
                        ${onConfirm ? '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>' : ''}
                        <button type="button" class="btn btn-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'}" id="confirm-btn">
                            ${onConfirm ? 'Confirmar' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(alertModal);
        const modal = new bootstrap.Modal(alertModal);
        
        alertModal.querySelector('#confirm-btn').addEventListener('click', () => {
            if (onConfirm) onConfirm();
            modal.hide();
        });

        alertModal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(alertModal);
        });

        modal.show();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.produtosPlano = new ProdutosPlano();
});

// Reset form when modal is hidden
document.getElementById('addProductModal').addEventListener('hidden.bs.modal', () => {
    if (window.produtosPlano) {
        window.produtosPlano.resetForm();
    }
});