class FichaAdesao {
    constructor() {
        this.planId = null;
        this.planData = null;
        this.init();
    }

    init() {
        this.planId = this.getPlanIdFromUrl();
        this.loadPlanData();
    }

    getPlanIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('planId') || '1';
    }

    loadPlanData() {
        // Simulate loading plan data
        const plansData = {
            '1': {
                name: 'Vitaplan Nacional',
                code: 'VPN-001',
                type: 'Plano de Saúde Empresarial',
                price: 'R$ 299,90',
                carencia: '180 dias para procedimentos eletivos',
                vigencia: '12 meses (renovação automática)',
                description: 'Plano completo com cobertura nacional'
            },
            '2': {
                name: 'Plano Básico',
                code: 'PB-002',
                type: 'Plano de Saúde Individual',
                price: 'R$ 149,90',
                carencia: '90 dias para consultas especializadas',
                vigencia: '12 meses (renovação automática)',
                description: 'Plano básico com cobertura regional'
            },
            '3': {
                name: 'Plano Premium',
                code: 'PP-003',
                type: 'Plano de Saúde Premium',
                price: 'R$ 499,90',
                carencia: '30 dias para todos os procedimentos',
                vigencia: '12 meses (renovação automática)',
                description: 'Plano premium com cobertura internacional'
            }
        };

        this.planData = plansData[this.planId] || plansData['1'];
        this.populatePlanInfo();
    }

    populatePlanInfo() {
        // Update page title and info
        document.getElementById('plan-info').textContent = `${this.planData.name} - ${this.planData.code}`;
        document.getElementById('plan-title').textContent = this.planData.name;
        
        // Update plan details
        document.getElementById('plan-name-detail').textContent = this.planData.name;
        document.getElementById('plan-code').textContent = this.planData.code;
        document.getElementById('plan-type').textContent = this.planData.type;
        document.getElementById('plan-price').textContent = this.planData.price;
        document.getElementById('plan-carencia').textContent = this.planData.carencia;
        document.getElementById('plan-vigencia').textContent = this.planData.vigencia;

        // Update page title
        document.title = `Ficha de Adesão - ${this.planData.name} - QUALIFY`;
    }

    // Method to fill form with sample data (for demonstration)
    fillSampleData() {
        // This method could be used to pre-fill the form with sample data
        // for demonstration purposes or when editing an existing enrollment
        
    }

    // Method to validate form before printing
    validateForm() {
        const requiredFields = [
            'Nome Completo',
            'Data de Nascimento',
            'CPF',
            'RG',
            'Endereço',
            'CEP',
            'Cidade',
            'UF',
            'Telefone'
        ];

        // In a real implementation, this would check if required fields are filled
        return true;
    }

    // Method to generate PDF (would require additional libraries)
    generatePDF() {
        // This would integrate with a PDF generation library
        // For now, we'll use the browser's print functionality
        window.print();
    }

    // Method to save form data
    saveFormData() {
        // This would collect all form data and save it
        const formData = {
            planId: this.planId,
            personalData: this.collectPersonalData(),
            dependents: this.collectDependentsData(),
            healthDeclaration: this.collectHealthData(),
            paymentInfo: this.collectPaymentData(),
            timestamp: new Date().toISOString()
        };

        
        return formData;
    }

    collectPersonalData() {
        // In a real implementation, this would collect data from form fields
        return {
            name: '',
            birthDate: '',
            cpf: '',
            rg: '',
            address: '',
            cep: '',
            city: '',
            state: '',
            phone: '',
            mobile: '',
            email: '',
            profession: ''
        };
    }

    collectDependentsData() {
        // Collect dependents data from the table
        return [];
    }

    collectHealthData() {
        // Collect health declaration data
        return {
            conditions: [],
            description: ''
        };
    }

    collectPaymentData() {
        // Collect payment information
        return {
            method: '',
            bank: '',
            agency: '',
            account: ''
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fichaAdesao = new FichaAdesao();
});

// Print functionality
window.addEventListener('beforeprint', () => {
    // Any pre-print preparations can be done here
    console.log('Preparing for print...');
});

window.addEventListener('afterprint', () => {
    // Any post-print cleanup can be done here
    console.log('Print completed or cancelled');
});