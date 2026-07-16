// Perfil.js - Funcionalidades da página de perfil do usuário
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.selectedImage = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserData();
        this.setupPhoneMask();
        this.setupCepMask();
    }

    bindEvents() {
        // Botão Salvar
        const btnSave = document.getElementById('btnSave');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveProfile());
        }

        // Botão Alterar Senha
        const btnChangePassword = document.getElementById('btnChangePassword');
        if (btnChangePassword) {
            btnChangePassword.addEventListener('click', () => this.openChangePasswordModal());
        }

        // Botão Salvar Nova Senha
        const btnSavePassword = document.getElementById('btnSavePassword');
        if (btnSavePassword) {
            btnSavePassword.addEventListener('click', () => this.changePassword());
        }

        // Botões de Imagem
        const btnSelectImage = document.getElementById('btnSelectImage');
        if (btnSelectImage) {
            btnSelectImage.addEventListener('click', () => this.selectImage());
        }

        const btnUploadImage = document.getElementById('btnUploadImage');
        if (btnUploadImage) {
            btnUploadImage.addEventListener('click', () => this.uploadImage());
        }

        const btnRemoveImage = document.getElementById('btnRemoveImage');
        if (btnRemoveImage) {
            btnRemoveImage.addEventListener('click', () => this.removeImage());
        }

        // Input de arquivo de imagem
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        // Botão Buscar CEP
        const btnSearchCep = document.getElementById('btnSearchCep');
        if (btnSearchCep) {
            btnSearchCep.addEventListener('click', () => this.searchCep());
        }

        // Enter no campo CEP
        const cepInput = document.getElementById('userCep');
        if (cepInput) {
            cepInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchCep();
                }
            });
        }

        // Validação em tempo real do email
        const emailInput = document.getElementById('userEmail');
        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail());
        }

        // Validação das senhas no modal
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    // Carrega dados do usuário
    async loadUserData() {
        try {
            if (!window.supabase) {
                this.populateForm({ name: localStorage.getItem('userDisplayName') || '', email: localStorage.getItem('userEmail') || '' });
                return;
            }
            
            const { data: { user } } = await window.supabase.auth.getUser();
            const name = localStorage.getItem('userDisplayName') || user?.user_metadata?.name || '';
            const email = localStorage.getItem('userEmail') || user?.email || '';
            const baseData = { name, email };
            
            if (user) {
                try {
                    // Buscar na tabela users do supabase
                    const { data, error } = await window.supabase
                        .from('users')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                        
                    if (!error && data) {
                        this.populateForm(Object.assign({}, baseData, {
                            phone: data.phone || '',
                            cep: data.cep || '',
                            city: data.city || '',
                            state: data.state || '',
                            street: data.street || '',
                            neighborhood: data.neighborhood || '',
                            number: data.number || ''
                        }));
                        return;
                    }
                } catch (_) {
                }
            }
            this.populateForm(baseData);
        } catch (error) {
            this.showNotification('Erro ao carregar dados do usuário', 'error');
        }
    }

    // Popula o formulário com os dados
    populateForm(userData) {
        const fields = {
            'userName': userData.name,
            'userEmail': userData.email,
            'userPhone': userData.phone,
            'userCep': userData.cep,
            'userCity': userData.city,
            'userState': userData.state,
            'userStreet': userData.street,
            'userNeighborhood': userData.neighborhood,
            'userNumber': userData.number
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });
    }

    // Salva o perfil
    async saveProfile() {
        try {
            if (!this.validateForm()) return;
            const formData = this.getFormData();
            if (!window.supabase) {
                this.showNotification('Banco de dados indisponível', 'error');
                return;
            }
            
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user || !user.id) {
                this.showNotification('Usuário não autenticado', 'error');
                return;
            }
            
            if (formData.name) {
                try { 
                    await window.supabase.auth.updateUser({ data: { name: formData.name } });
                } catch(_) {}
                try { localStorage.setItem('userDisplayName', formData.name); } catch(_) {}
            }
            
            // Check if user exists in table before updating
            const { data: existingUser } = await window.supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single();
                
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cep: formData.cep,
                city: formData.city,
                state: formData.state,
                street: formData.street,
                neighborhood: formData.neighborhood,
                number: formData.number,
                updated_at: new Date().toISOString()
            };
            
            if (existingUser) {
                await window.supabase.from('users').update(payload).eq('id', user.id);
            } else {
                await window.supabase.from('users').insert({ id: user.id, ...payload });
            }
            
            this.showNotification('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao salvar perfil. Tente novamente.', 'error');
        }
    }

    // Coleta dados do formulário
    getFormData() {
        return {
            name: document.getElementById('userName')?.value || '',
            email: document.getElementById('userEmail')?.value || '',
            phone: document.getElementById('userPhone')?.value || '',
            cep: document.getElementById('userCep')?.value || '',
            city: document.getElementById('userCity')?.value || '',
            state: document.getElementById('userState')?.value || '',
            street: document.getElementById('userStreet')?.value || '',
            neighborhood: document.getElementById('userNeighborhood')?.value || '',
            number: document.getElementById('userNumber')?.value || '',
            image: this.selectedImage
        };
    }

    // Valida o formulário
    validateForm() {
        const email = document.getElementById('userEmail')?.value;
        
        if (!email) {
            this.showNotification('Email é obrigatório', 'error');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showNotification('Email inválido', 'error');
            return false;
        }

        return true;
    }

    // Valida email
    validateEmail() {
        const emailInput = document.getElementById('userEmail');
        const email = emailInput?.value;

        if (email && !this.isValidEmail(email)) {
            emailInput.style.borderColor = '#dc3545';
            return false;
        } else {
            emailInput.style.borderColor = '#e9ecef';
            return true;
        }
    }

    // Verifica se email é válido
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Abre modal de alteração de senha
    openChangePasswordModal() {
        const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
        modal.show();
        
        // Limpa os campos
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }

    // Altera a senha
    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword')?.value;
            const newPassword = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;

            if (!this.validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
                return;
            }

            // Simula chamada de API
            await this.simulateApiCall();

            // Em produção, aqui seria feita a chamada real para alterar a senha
            

            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();

            this.showNotification('Senha alterada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            this.showNotification('Erro ao alterar senha. Tente novamente.', 'error');
        }
    }

    // Valida alteração de senha
    validatePasswordChange(currentPassword, newPassword, confirmPassword) {
        if (!currentPassword) {
            this.showNotification('Senha atual é obrigatória', 'error');
            return false;
        }

        if (!newPassword || newPassword.length < 6) {
            this.showNotification('Nova senha deve ter pelo menos 6 caracteres', 'error');
            return false;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('Confirmação de senha não confere', 'error');
            return false;
        }

        return true;
    }

    // Valida se as senhas coincidem
    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && newPassword !== confirmPassword) {
            confirmInput.style.borderColor = '#dc3545';
        } else {
            confirmInput.style.borderColor = '#e9ecef';
        }
    }

    // Seleciona imagem
    selectImage() {
        const imageInput = document.getElementById('imageInput');
        imageInput?.click();
    }

    // Manipula seleção de imagem
    handleImageSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (this.validateImageFile(file)) {
                this.selectedImage = file;
                this.previewImage(file);
            }
        }
    }

    // Valida arquivo de imagem
    validateImageFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP.', 'error');
            return false;
        }

        if (file.size > maxSize) {
            this.showNotification('Arquivo muito grande. Máximo 5MB.', 'error');
            return false;
        }

        return true;
    }

    // Preview da imagem
    previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const profileImage = document.getElementById('profileImage');
            const imagePlaceholder = document.getElementById('imagePlaceholder');
            
            if (profileImage && imagePlaceholder) {
                profileImage.src = e.target.result;
                profileImage.style.display = 'block';
                imagePlaceholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }

    // Upload da imagem
    async uploadImage() {
        if (!this.selectedImage) {
            this.showNotification('Selecione uma imagem primeiro', 'error');
            return;
        }

        try {
            // Simula upload
            await this.simulateApiCall();
            
            // Em produção, aqui seria feito o upload real
            console.log('Fazendo upload da imagem:', this.selectedImage.name);
            
            this.showNotification('Imagem enviada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showNotification('Erro no upload da imagem', 'error');
        }
    }

    // Remove imagem
    removeImage() {
        const profileImage = document.getElementById('profileImage');
        const imagePlaceholder = document.getElementById('imagePlaceholder');
        const imageInput = document.getElementById('imageInput');
        
        if (profileImage && imagePlaceholder && imageInput) {
            profileImage.style.display = 'none';
            profileImage.src = '';
            imagePlaceholder.style.display = 'block';
            imageInput.value = '';
            this.selectedImage = null;
            
            this.showNotification('Imagem removida', 'success');
        }
    }

    // Busca CEP
    async searchCep() {
        const cepInput = document.getElementById('userCep');
        const cep = cepInput?.value.replace(/\D/g, '');

        if (!cep || cep.length !== 8) {
            this.showNotification('CEP deve ter 8 dígitos', 'error');
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                this.showNotification('CEP não encontrado', 'error');
                return;
            }

            this.fillAddressFields(data);
            this.showNotification('Endereço encontrado!', 'success');
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            this.showNotification('Erro ao buscar CEP. Tente novamente.', 'error');
        }
    }

    // Preenche campos de endereço
    fillAddressFields(addressData) {
        const fields = {
            'userCity': addressData.localidade,
            'userState': addressData.uf,
            'userStreet': addressData.logradouro,
            'userNeighborhood': addressData.bairro
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });
    }

    // Configura máscara do telefone
    setupPhoneMask() {
        const phoneInput = document.getElementById('userPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length <= 11) {
                    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                    if (value.length < 14) {
                        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                    }
                }
                
                e.target.value = value;
            });
        }
    }

    // Configura máscara do CEP
    setupCepMask() {
        const cepInput = document.getElementById('userCep');
        if (cepInput) {
            cepInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{5})(\d{3})/, '$1-$2');
                e.target.value = value;
            });
        }
    }

    // Simula chamada de API
    simulateApiCall() {
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    // Mostra notificação
    showNotification(message, type = 'success') {
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
}

// Função para limpar campos
function clearField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = '';
        field.focus();
    }
}

// Inicializa quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

// Exporta para uso global se necessário
window.ProfileManager = ProfileManager;
