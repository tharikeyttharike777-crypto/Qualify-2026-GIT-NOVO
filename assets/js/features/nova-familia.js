// Dados e estado do formulário
let dependentesCount = 0;
let paisCount = 0;
let contratosCount = 0;
let petsCount = 0;
// Estado de edição do dependente
let editingDependenteId = null;
let currentContractParticipants = [];
let contractParticipantsPool = [];

async function waitForSupabaseReady(timeoutMs = 5000) {
    return new Promise((resolve) => {
        if (window.supabase) { resolve(true); return; }
        let elapsed = 0;
        const interval = 100;
        const check = () => {
            if (window.supabase) resolve(true);
            else if (elapsed >= timeoutMs) resolve(false);
            else { elapsed += interval; setTimeout(check, interval); }
        };
        check();
    });
}
// Proteção contra perda de dados
let isDirty = false; // Rastreia se houve alterações no formulário
let hasUnsavedChanges = false; // Controla o aviso de saída

// Estado dos dados
const familiaData = {
    dependentes: [],
    pais: [],
    contratos: [],
    pets: [],
    foto: null
};

// Campos obrigatórios para validação
const camposObrigatorios = [
    'nome',
    'dataNascimento',
    'rua',
    'numero',
    'bairro',
    'cidade'
];

// Inicialização da página
document.addEventListener('DOMContentLoaded', function () {
    console.log('Nova Família: script carregado e DOM pronto');
    initializeForm();
    setupEventListeners();
    setupFormValidation();
    // Estado de edição: apenas quando há parâmetro ?id= na URL.
    // Se não houver, limpamos qualquer estado antigo para garantir novo cadastro.
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const idFromUrl = urlParams.get('id');

        if (idFromUrl) {
            // Se tem ID na URL, é edição: salva para persistência
            localStorage.setItem('editFamilyId', String(idFromUrl));
        } else {
            // Se NÃO tem ID na URL, é NOVO cadastro: limpa qualquer lixo anterior
            localStorage.removeItem('editFamilyId');
        }
    } catch (e) {
        // continua normalmente
    }
    prefillIfEditing();
});

function initializeForm() {
    // Aplicar máscaras nos campos
    applyMasks();

    // Configurar validação em tempo real
    setupValidation();

    // Inicializar tabelas vazias
    renderDependentesTable();
    renderPaisTable();
    renderContratosTable();
    renderPetsTable();
}

// Prefill do formulário quando editando uma família existente
// Prefill do formulário quando editando uma família existente
async function prefillIfEditing() {
    // Cria/exibe overlay de loading
    const showLoadingOverlay = () => {
        let overlay = document.getElementById('prefill-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'prefill-loading-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(255, 255, 255, 0.8); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                font-family: sans-serif; font-size: 1.2rem; color: #333;
            `;
            overlay.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;"><i class="fas fa-spinner fa-spin fa-2x"></i><span>Carregando dados...</span></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    };

    const hideLoadingOverlay = () => {
        const overlay = document.getElementById('prefill-loading-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    try {
        // Entra em modo edição SOMENTE se houver ID via parâmetro de URL
        const params = new URLSearchParams(window.location.search);
        // Fallback adicional para casos onde o botão "Editar" não anexou ?id
        const idFromUrl = params.get('id');
        const editId = String(idFromUrl || '').trim();
        if (!editId) {
            return; // novo cadastro, não fazer prefill
        }

        showLoadingOverlay();

        let familias = JSON.parse(localStorage.getItem('familias') || '[]');
        let familia = familias.find(f => String(f.id) === String(editId));

        // Se não encontrou localmente, tenta buscar do Supabase
        if (!familia) {
            try {
                const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                if (companyId && window.supabase) {
                    const { data, error } = await window.supabase
                        .from('familias')
                        .select('*')
                        .eq('id', editId)
                        .eq('company_id', companyId)
                        .single();

                    if (data && !error) {
                        familia = {
                            id: data.id,
                            ...data.metadata,
                            titular: data.titular,
                            dependentes: data.dependentes,
                            endereco: data.endereco,
                            status: data.status,
                            companyId: data.company_id
                        };
                        // cache local para futuras edições
                        familias.push(familia);
                        try { localStorage.setItem('familias', JSON.stringify(familias)); } catch (e) { }
                    }
                }
            } catch (sbErr) {
                console.warn('Falha ao buscar família no Supabase para prefill:', sbErr);
            }
        }
        if (!familia) {
            showMessage('Família para edição não encontrada.', 'error');
            return;
        }

        let associados = JSON.parse(localStorage.getItem('associados') || '[]');
        let titularAssoc = associados.find(a => String(a.familiaId) === String(editId) && a.tipo === 'titular');
        // Busca titular no Supabase caso não exista localmente
        if (!titularAssoc) {
            try {
                const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                if (companyId && window.supabase) {
                    const { data, error } = await window.supabase
                        .from('associados')
                        .select('*')
                        .eq('familiaId', String(editId))
                        .eq('tipo', 'titular')
                        .eq('company_id', companyId)
                        .limit(1)
                        .maybeSingle();

                    if (data && !error) {
                        titularAssoc = { ...data, id: data.id };
                        associados.push(titularAssoc);
                        try { localStorage.setItem('associados', JSON.stringify(associados)); } catch (e) { }
                    }
                }
            } catch (sbErr) {
                console.warn('Falha ao buscar titular no Supabase para prefill:', sbErr);
            }
        }

        // Preenche campos do titular
        const nomeEl = document.getElementById('nome');
        const cpfEl = document.getElementById('cpf');
        const rgEl = document.getElementById('rg');
        const dnEl = document.getElementById('dataNascimento');
        const telEl = document.getElementById('telefone');
        const celEl = document.getElementById('celular');
        const emailEl = document.getElementById('email');
        const seguradoraEl = document.getElementById('seguradora');

        if (nomeEl) nomeEl.value = (titularAssoc?.nome || familia.titular?.nome || '');
        if (cpfEl) cpfEl.value = (titularAssoc?.cpf || familia.titular?.cpf || '');
        if (rgEl) rgEl.value = (titularAssoc?.rg || '');
        if (dnEl) dnEl.value = (titularAssoc?.dataNascimento || '');
        if (telEl) telEl.value = (titularAssoc?.telefone || '');
        if (celEl) celEl.value = (titularAssoc?.celular || familia.titular?.celular || '');
        if (emailEl) emailEl.value = (titularAssoc?.email || '');
        if (seguradoraEl) seguradoraEl.value = (titularAssoc?.seguradora || familia.titular?.seguradora || '');

        // Genero / Sexo
        const sexoVal = titularAssoc?.genero || titularAssoc?.sexo || familia.titular?.genero || '';
        if (sexoVal) {
            // Tenta selecionar pelo value (lowercase ou original)
            let radio = document.querySelector(`input[name="sexo"][value="${sexoVal}"]`);
            if (!radio) {
                radio = document.querySelector(`input[name="sexo"][value="${sexoVal.toLowerCase()}"]`);
            }
            if (radio) radio.checked = true;
        }

        // Endereço
        const end = familia.endereco || {};
        const cepEl = document.getElementById('cep');
        const ruaEl = document.getElementById('rua');
        const numEl = document.getElementById('numero');
        const compEl = document.getElementById('complemento');
        const bairroEl = document.getElementById('bairro');
        const cidadeEl = document.getElementById('cidade');
        if (cepEl) cepEl.value = end.cep || '';
        if (ruaEl) ruaEl.value = end.rua || '';
        if (numEl) numEl.value = end.numero || '';
        if (compEl) compEl.value = end.complemento || '';
        if (bairroEl) bairroEl.value = end.bairro || '';
        if (cidadeEl) cidadeEl.value = end.cidade || '';

        // Dados auxiliares: tabelas
        familiaData.dependentes = Array.isArray(familia.dependentes) ? familia.dependentes : [];
        // Normalizar produtos: mover 'produto' único para array 'produtos'
        familiaData.dependentes = (familiaData.dependentes || []).map(d => {
            try {
                if (!d.produtos || !Array.isArray(d.produtos)) {
                    const arr = [];
                    if (d.produto) arr.push(d.produto);
                    d.produtos = arr;
                }
                if (!d.psicologo && d.psicologos) {
                    d.psicologo = d.psicologos;
                }
            } catch (e) { }
            return d;
        });
        familiaData.pais = Array.isArray(familia.pais) ? familia.pais : [];
        familiaData.contratos = Array.isArray(familia.contratos) ? familia.contratos : [];
        familiaData.pets = Array.isArray(familia.pets) ? familia.pets : [];
        familiaData.foto = titularAssoc?.foto || null;

        renderDependentesTable();
        renderPaisTable();
        renderContratosTable();
        renderPetsTable();

        // Carregar foto se existir
        if (familiaData.foto) {
            const preview = document.getElementById('fotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${familiaData.foto}" alt="Foto do titular" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            }

            // Mostrar botão de remover
            const photoActions = document.querySelector('.photo-actions');
            if (photoActions) {
                photoActions.style.display = 'block';
            }
        }

        showMessage('Modo edição: dados carregados.', 'info');
    } catch (e) {
        console.warn('Falha no prefill de edição:', e);
        showMessage('Erro ao carregar dados da família.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

function setupEventListeners() {
    // Event listener para o CEP
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', function () {
            if (this.value.length === 9) {
                buscarCEP();
            }
        });
    }

    // Botão de buscar CEP
    const buscarBtn = document.getElementById('buscarCepBtn') || document.querySelector('.cep-input-group .btn.btn-primary');
    if (buscarBtn) {
        console.log('Nova Família: botão Buscar CEP vinculado');
        buscarBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('Nova Família: clique em Buscar CEP');
            buscarCEP();
        });
    } else {
        console.warn('Nova Família: botão Buscar CEP não encontrado');
    }

    // Listener delegado para garantir que o clique funcione mesmo se o botão for re-renderizado
    document.addEventListener('click', function (e) {
        const delegatedBtn = e.target.closest('#buscarCepBtn');
        if (delegatedBtn) {
            e.preventDefault();
            console.log('Nova Família: clique delegado em Buscar CEP');
            buscarCEP();
        }
    });

    // Event listeners para validação em tempo real
    const requiredFields = document.querySelectorAll('input[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', function () {
            validateField(this);
        });
    });

    // Event listeners para modais
    setupModalEventListeners();

    // PROTEÇÃO CONTRA PERDA DE DADOS
    setupFormProtection();
}

/**
 * Configura sistema de proteção contra perda de dados
 * Avisa o usuário se tentar sair da página com alterações não salvas
 */
function setupFormProtection() {
    // Monitora mudanças em TODOS os inputs, selects e textareas do formulário principal
    const formElements = document.querySelectorAll('#familyForm input, #familyForm select, #familyForm textarea');

    formElements.forEach(element => {
        // Ignora campos específicos que não devem marcar o form como dirty
        if (element.type === 'button' || element.type === 'submit') {
            return;
        }

        element.addEventListener('input', markFormAsDirty);
        element.addEventListener('change', markFormAsDirty);
    });

    // Event listener para beforeunload (aviso ao sair da página)
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('✅ Proteção contra perda de dados ativada');
}

/**
 * Marca o formulário como modificado (dirty)
 */
function markFormAsDirty() {
    if (!isDirty) {
        isDirty = true;
        hasUnsavedChanges = true;
        console.log('⚠️ Formulário modificado - proteção ativa');
    }
}

/**
 * Handler para beforeunload - mostra aviso se houver mudanças não salvas
 */
function handleBeforeUnload(e) {
    if (hasUnsavedChanges) {
        // Mensagem padrão do navegador (navegadores modernos ignoram mensagens customizadas)
        e.preventDefault();
        e.returnValue = ''; // Necessário para Chrome/Edge
        return ''; // Necessário para Firefox/Safari
    }
}

/**
 * Limpa o estado de proteção (chamar após salvar com sucesso)
 */
function clearFormProtection() {
    isDirty = false;
    hasUnsavedChanges = false;
    console.log('✅ Proteção desativada - formulário salvo');
}

function setupModalEventListeners() {
    // Fechar modal ao clicar fora
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

function applyMasks() {
    // Máscara para CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function () {
            this.value = formatCPF(this.value);
        });
    }

    // Máscara para telefone
    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function () {
            this.value = formatPhone(this.value);
        });
    }

    // Máscara para celular
    const celularInput = document.getElementById('celular');
    if (celularInput) {
        celularInput.addEventListener('input', function () {
            this.value = formatPhone(this.value);
        });
    }

    // Máscara para CEP
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', function () {
            this.value = formatCEP(this.value);
        });
    }

    // Máscara para valores monetários
    const rendaInput = document.getElementById('rendaFamiliar');
    const beneficioInput = document.getElementById('valorBeneficio');

    if (rendaInput) {
        rendaInput.addEventListener('input', function () {
            this.value = formatCurrency(this.value);
        });
    }

    if (beneficioInput) {
        beneficioInput.addEventListener('input', function () {
            this.value = formatCurrency(this.value);
        });
    }

    // Aplicar máscaras nos modais quando abertos
    applyModalMasks();
}

function applyModalMasks() {
    // Máscaras para campos dos modais
    const modalCpfFields = ['depCpf', 'paiCpf'];
    const modalPhoneFields = ['depCelular', 'paiTelefone'];
    const modalCurrencyFields = ['contValor'];

    modalCpfFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function () {
                this.value = formatCPF(this.value);
            });
        }
    });

    modalPhoneFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function () {
                this.value = formatPhone(this.value);
            });
        }
    });

    modalCurrencyFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function () {
                this.value = formatCurrency(this.value);
            });
        }
    });
}

// Funções de formatação
function formatCPF(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
}

function formatPhone(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
}

function formatCEP(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
}

function formatCurrency(value) {
    // Remove tudo que não é dígito
    let numericValue = value.replace(/\D/g, '');

    // Converte para número e divide por 100 para ter centavos
    numericValue = (parseInt(numericValue) / 100).toFixed(2);

    // Formata como moeda brasileira
    return 'R$ ' + numericValue.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Função para buscar CEP
async function buscarCEP() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) {
        showMessage('CEP deve conter 8 dígitos', 'error');
        return;
    }

    // Seleciona especificamente o botão de buscar CEP por id, com fallback seguro
    const button = document.getElementById('buscarCepBtn') || document.querySelector('.cep-input-group .btn.btn-primary');
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
    }

    try {
        // Verifica conectividade antes de fazer a requisição
        if (!navigator.onLine) {
            throw new Error('Sem conexão com a internet');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.erro) {
            throw new Error('CEP não encontrado');
        }

        // Preencher campos automaticamente
        document.getElementById('rua').value = data.logradouro || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = data.localidade || '';

        // Remove a classe de erro se existir
        cepInput.classList.remove('error');

        showMessage('CEP encontrado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        cepInput.classList.add('error');

        // Mensagens de erro específicas
        let errorMessage = 'Erro ao buscar CEP';
        if (error.name === 'AbortError') {
            errorMessage = 'Timeout: Verifique sua conexão';
        } else if (error.message.includes('Sem conexão')) {
            errorMessage = 'Sem conexão com a internet';
        } else if (error.message.includes('CEP não encontrado')) {
            errorMessage = 'CEP não encontrado';
        } else if (error.message.includes('Erro HTTP')) {
            errorMessage = 'Serviço temporariamente indisponível';
        }

        showMessage(errorMessage, 'error');

        // Limpa os campos em caso de erro
        document.getElementById('rua').value = '';
        document.getElementById('bairro').value = '';
        document.getElementById('cidade').value = '';
    } finally {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Funções para gerenciar upload de foto
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB em bytes
    if (file.size > maxSize) {
        showMessage('A foto deve ter no máximo 5MB', 'error');
        return;
    }

    try {
        // Mostrar preview da imagem
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('fotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview da foto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            }
        };
        reader.readAsDataURL(file);

        // Upload para Firebase Storage
        if (typeof window !== 'undefined' && window.storage) {
            const storage = window.storage;
            const timestamp = Date.now();
            const fileName = `familias/fotos/${timestamp}_${file.name}`;
            const storageRef = storage.ref(fileName);

            showMessage('Fazendo upload da foto...', 'info');

            // Upload do arquivo
            const uploadTask = storageRef.put(file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progresso do upload
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload progress:', progress + '%');
                },
                (error) => {
                    // Erro no upload
                    console.error('Erro ao fazer upload da foto:', error);
                    showMessage('Erro ao fazer upload da foto', 'error');
                },
                async () => {
                    // Upload concluído com sucesso
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        familiaData.foto = downloadURL;

                        // Mostrar botão de remover
                        const photoActions = document.querySelector('.photo-actions');
                        if (photoActions) {
                            photoActions.style.display = 'block';
                        }

                        showMessage('Foto carregada com sucesso!', 'success');
                        console.log('Foto salva em:', downloadURL);
                    } catch (error) {
                        console.error('Erro ao obter URL da foto:', error);
                        showMessage('Erro ao processar a foto', 'error');
                    }
                }
            );
        } else {
            // Fallback: salvar como base64 no localStorage
            const reader2 = new FileReader();
            reader2.onload = function (e) {
                familiaData.foto = e.target.result;

                // Mostrar botão de remover
                const photoActions = document.querySelector('.photo-actions');
                if (photoActions) {
                    photoActions.style.display = 'block';
                }

                showMessage('Foto carregada (modo local)', 'success');
            };
            reader2.readAsDataURL(file);
        }
    } catch (error) {
        console.error('Erro ao processar foto:', error);
        showMessage('Erro ao processar a foto', 'error');
    }
}

function removePhoto() {
    // Limpar a foto dos dados
    familiaData.foto = null;

    // Limpar o preview
    const preview = document.getElementById('fotoPreview');
    if (preview) {
        preview.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>Nenhuma foto selecionada</span>
        `;
    }

    // Limpar o input de arquivo
    const photoInput = document.getElementById('photoUpload');
    if (photoInput) {
        photoInput.value = '';
    }

    // Esconder botão de remover
    const photoActions = document.querySelector('.photo-actions');
    if (photoActions) {
        photoActions.style.display = 'none';
    }

    showMessage('Foto removida', 'info');
}

// Funções para gerenciar modais
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focar no primeiro campo do modal
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';

        // Limpar formulário do modal
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            // Remover classes de validação
            form.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('error', 'success');
                const message = group.querySelector('.error-message, .success-message');
                if (message) {
                    message.remove();
                }
            });
        }

        // Resetar estado do modal de dependente
        if (modalId === 'dependenteModal') {
            editingDependenteId = null;
            const titleEl = modal.querySelector('.modal-header h3');
            if (titleEl) titleEl.textContent = 'Adicionar Dependente';
            const saveBtn = modal.querySelector('.modal-footer .btn.btn-success');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
            const parentescoEl = document.getElementById('depParentesco');
            if (parentescoEl) { parentescoEl.required = true; parentescoEl.disabled = false; }
            const infoEl = document.getElementById('depParentescoInfo');
            if (infoEl) infoEl.remove();
        }
    }
}

// Funções para abrir modais específicos
function openDependenteModal() {
    editingDependenteId = null;
    const modal = document.getElementById('dependenteModal');
    if (modal) {
        const form = document.getElementById('dependenteForm');
        if (form) form.reset();
        const nomeEl = document.getElementById('depNome');
        const parentescoEl = document.getElementById('depParentesco');
        const carenciaEl = document.getElementById('depCarencia');
        const dnEl = document.getElementById('depDataNasc');
        const cpfEl = document.getElementById('depCpf');
        const generoEl = document.getElementById('depGenero');
        const psicoEl = document.getElementById('depPsicologo');
        const telEl = document.getElementById('depCelular');
        const segEl = document.getElementById('depSeguradora');
        if (nomeEl) nomeEl.value = '';
        if (parentescoEl) { parentescoEl.value = ''; parentescoEl.required = true; parentescoEl.disabled = false; }
        if (carenciaEl) carenciaEl.value = 'padrao';
        if (dnEl) dnEl.value = '';
        if (cpfEl) cpfEl.value = '';
        if (generoEl) generoEl.value = '';
        if (psicoEl) psicoEl.value = '';
        if (telEl) telEl.value = '';
        if (segEl) segEl.value = '';
        const infoEl = document.getElementById('depParentescoInfo');
        if (infoEl) infoEl.remove();
        const titleEl = modal.querySelector('.modal-header h3');
        if (titleEl) titleEl.textContent = 'Adicionar Dependente';
        const saveBtn = modal.querySelector('.modal-footer .btn.btn-success');
        if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
    openModal('dependenteModal');
}

// Abrir modal para editar dependente existente
function openEditDependente(dependenteId) {
    const dep = (familiaData.dependentes || []).find(d => String(d.id) === String(dependenteId));
    if (!dep) {
        showMessage('Dependente não encontrado para edição.', 'error');
        return;
    }

    editingDependenteId = String(dep.id);
    const modal = document.getElementById('dependenteModal');
    if (!modal) return;

    const titleEl = modal.querySelector('.modal-header h3');
    if (titleEl) titleEl.textContent = 'Editar Dependente';
    const saveBtn = modal.querySelector('.modal-footer .btn.btn-success');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar alterações';

    // Preencher campos
    const nomeEl = document.getElementById('depNome');
    const parentescoEl = document.getElementById('depParentesco');
    const carenciaEl = document.getElementById('depCarencia');
    const dnEl = document.getElementById('depDataNasc');
    const cpfEl = document.getElementById('depCpf');
    const generoEl = document.getElementById('depGenero');
    const psicoEl = document.getElementById('depPsicologo');
    const telEl = document.getElementById('depCelular');
    const segEl = document.getElementById('depSeguradora');

    if (nomeEl) nomeEl.value = dep.nome || '';
    if (parentescoEl) {
        parentescoEl.value = dep.parentesco || '';
        const infoId = 'depParentescoInfo';
        const existingInfo = document.getElementById(infoId);
        const isTitular = String(dep.parentesco || '').toLowerCase() === 'titular';
        parentescoEl.required = !isTitular;
        parentescoEl.disabled = false;
        if (isTitular) {
            if (!existingInfo) {
                const info = document.createElement('div');
                info.id = infoId;
                info.className = 'form-text';
                info.textContent = 'Este dependente é o titular; grau de parentesco não é obrigatório.';
                parentescoEl.insertAdjacentElement('afterend', info);
            }
        } else if (existingInfo) {
            existingInfo.remove();
        }
    }
    if (carenciaEl) carenciaEl.value = dep.carencia || 'padrao';
    if (dnEl) dnEl.value = formatDateForInput(dep.dataNascimento || '');
    if (cpfEl) cpfEl.value = dep.cpf || '';
    if (generoEl) generoEl.value = dep.genero || '';
    if (psicoEl) psicoEl.value = dep.psicologo || '';
    if (telEl) telEl.value = dep.celular || '';
    if (segEl) segEl.value = dep.seguradora || '';

    openModal('dependenteModal');
}

function openPaiModal() {
    openModal('paiModal');
}

// Helpers para multitenant e normalização de planos
function getActiveCompanyIdForPlans() {
    // Preferir multitenantConfig se disponível
    try {
        const mt = window.multitenantConfig;
        if (mt && typeof mt.getActiveCompany === 'function') {
            const active = mt.getActiveCompany();
            if (active && active.id) {
                console.log('[Planos] Empresa ativa via multitenant:', active.id);
                return active.id;
            }
        }
    } catch (e) {
        console.warn('[Planos] Falha ao obter empresa via multitenant', e);
    }
    // Fallback: objeto salvo em localStorage
    try {
        const activeCompanyStr = localStorage.getItem('activeCompany');
        const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        const id = activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || null;
        if (id) {
            console.log('[Planos] Empresa ativa via localStorage:', id);
        } else {
            console.warn('[Planos] Nenhuma empresa ativa encontrada em localStorage');
        }
        return id;
    } catch (e) {
        const id = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || null;
        if (id) console.log('[Planos] Empresa ativa via localStorage (fallback simples):', id);
        return id;
    }
}

function normalizePlanName(plan) {
    return plan?.nome || plan?.name || plan?.titulo || plan?.descricao || plan?.label || '';
}

async function loadPlansFromSupabase(companyId) {
    const results = [];
    try {
        if (!window.supabase) return results;
        if (!companyId) return results;

        const { data, error } = await window.supabase
            .from('planos')
            .select('*')
            .eq('company_id', companyId);

        if (error) throw error;

        if (data && data.length > 0) {
            
            return data;
        }
    } catch (e) {
        console.warn('Falha ao carregar planos do Supabase:', e);
    }
    return results;
}

function loadPlansFromLocalStorage() {
    try {
        const stored = localStorage.getItem('planos');
        const planos = stored ? JSON.parse(stored) : [];
        return Array.isArray(planos) ? planos : [];
    } catch (e) {
        return [];
    }
}

async function populatePlanoSelectFromSources(selectEl) {
    if (!selectEl) return;
    // Placeholder
    selectEl.innerHTML = '<option value="">Selecione...</option>';
    const companyId = getActiveCompanyIdForPlans();
    let planos = [];
    const supabasePlans = await loadPlansFromSupabase(companyId);
    if (supabasePlans && supabasePlans.length) {
        planos = supabasePlans;
        console.log(`Planos carregados de Supabase (${supabasePlans.length})`);
    } else {
        const localPlans = loadPlansFromLocalStorage();
        if (localPlans && localPlans.length) {
            planos = localPlans;
            console.log(`Planos carregados de localStorage (${localPlans.length})`);
        }
    }
    try { window._plansCacheForContrato = planos; } catch (_) { }
    const seen = new Set();
    planos.forEach(p => {
        const nomePlano = normalizePlanName(p);
        if (nomePlano && !seen.has(nomePlano)) {
            seen.add(nomePlano);
            const opt = document.createElement('option');
            opt.value = nomePlano;
            opt.textContent = nomePlano;
            try {
                opt.dataset.monthlyValue = p.monthlyValue || '';
                opt.dataset.agePricing = JSON.stringify(p.agePricing || []);
                opt.dataset.raw = JSON.stringify(p || {});
            } catch (_) { }
            selectEl.appendChild(opt);
        }
    });
    // Caso nenhum plano seja encontrado, mostrar fallback visível
    if (!planos.length) {
        const noOpt = document.createElement('option');
        noOpt.value = '';
        noOpt.textContent = 'Nenhum plano cadastrado — verifique a empresa ativa';
        noOpt.disabled = true;
        selectEl.appendChild(noOpt);
        console.warn('[Planos] Nenhum plano disponível para a empresa atual.');
    }
}

async function openContratoModal() {
    openModal('contratoModal');
    // Gerar número de contrato sequencial (apenas números, até 7 dígitos)
    const numeroInput = document.getElementById('contNumero');
    if (numeroInput) {
        const nextNum = await window.SequenceManager.peek('contrato');
        numeroInput.value = String(nextNum);
        numeroInput.setAttribute('readonly', 'readonly');
    }

    // Carregar planos prioritariamente do Firestore com fallbacks
    const planoSelect = document.getElementById('contPlano');
    if (planoSelect) {
        await populatePlanoSelectFromSources(planoSelect);
        const valorInput = document.getElementById('contValor');
        const titularAge = getTitularAge();
        const plansCache = (typeof window !== 'undefined' && window._plansCacheForContrato) ? window._plansCacheForContrato : [];
        const normalizeMoney = (v) => {
            const s = String(v || '').trim();
            if (!s) return '';
            return s.startsWith('R$') ? s : `R$ ${s}`;
        };
        const parseRange = (range) => {
            if (!range) return null;
            if (String(range).endsWith('+')) {
                const min = parseInt(String(range).replace('+', ''), 10);
                return { min, max: Infinity };
            }
            const parts = String(range).split('-');
            const min = parseInt(parts[0], 10);
            const max = parseInt(parts[1], 10);
            if (isNaN(min) || isNaN(max)) return null;
            return { min, max };
        };
        const computePlanValue = (planObj, age) => {
            try {
                // 1) Faixa etária: agePricing [{minAge,maxAge,value}] (novo)
                const ap = planObj.agePricing;
                if (Array.isArray(ap) && ap.length && age != null) {
                    const hit = ap.find(r => {
                        const min = parseInt(r.minAge, 10);
                        const max = parseInt(r.maxAge, 10);
                        return !isNaN(min) && !isNaN(max) && age >= min && age <= max;
                    });
                    if (hit && hit.value) return normalizeMoney(hit.value);
                }
                // 2) Faixa etária legado: agePrices [{range:'0-18', value:'R$ ...'}]
                if (Array.isArray(planObj.agePrices) && planObj.agePricingEnabled && age != null) {
                    const hit = planObj.agePrices.find(ap2 => {
                        const r = parseRange(ap2.range);
                        return r && age >= r.min && age <= r.max;
                    });
                    if (hit && hit.value) return normalizeMoney(hit.value);
                }
                // 3) Valores diretos possíveis
                const candidates = [
                    planObj.monthlyValue,
                    planObj.valorMensalidade,
                    planObj.mensalidade,
                    planObj.value,
                    planObj.price
                ].map(x => String(x || '').trim()).filter(Boolean);
                if (candidates.length) return normalizeMoney(candidates[0]);
                return '';
            } catch (_) { return ''; }
        };
        const applyPrice = () => {
            try {
                const sel = planoSelect.selectedOptions[0];
                if (!sel || !valorInput) return;
                let finalValue = '';
                // Preferir usar o objeto de plano do cache para cobrir todas as chaves
                const name = sel.value;
                const planObj = plansCache.find(p => normalizePlanName(p) === name) || (function () { try { return JSON.parse(sel.dataset.raw || '{}'); } catch (_) { return {}; } })();
                finalValue = computePlanValue(planObj, titularAge);
                // Se ainda vazio, tentar dataset mensal direto
                if (!finalValue) {
                    const monthlyValue = sel.dataset.monthlyValue || '';
                    finalValue = normalizeMoney(monthlyValue);
                }
                if ((finalValue || '').trim()) {
                    valorInput.value = finalValue;
                }
            } catch (_) { }
        };
        // Aplicar preço inicial se houver seleção (primeira opção após placeholder)
        if (planoSelect.options.length > 1) {
            planoSelect.selectedIndex = 1;
            applyPrice();
        }
        planoSelect.addEventListener('change', applyPrice);
    }

    // Campos de Produto foram removidos conforme solicitação

    // Preencher a Data de início com a data atual (formato YYYY-MM-DD)
    const dataInicioInput = document.getElementById('contDataInicio');
    if (dataInicioInput) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInicioInput.value = `${ano}-${mes}-${dia}`;
    }

    // Preencher default da forma de pagamento
    const formaPagamentoSelect = document.getElementById('contFormaPagamento');
    if (formaPagamentoSelect) {
        if (!formaPagamentoSelect.value) {
            formaPagamentoSelect.value = 'Pix';
        }
    }

    // Popular opções de Plano de Contas se houver no storage
    const planoContasSelect = document.getElementById('contPlanoContas');
    if (planoContasSelect) {
        // Mantém primeira opção placeholder
        const hasOnlyPlaceholder = planoContasSelect.options.length <= 1;
        if (hasOnlyPlaceholder) {
            try {
                const saved = JSON.parse(localStorage.getItem('planoContasOptions') || '[]');
                const defaults = ['Mensalidade', 'Adesão', 'Anuidade', 'Serviço', 'Outros'];
                const options = Array.isArray(saved) && saved.length ? saved : defaults;
                options.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    planoContasSelect.appendChild(opt);
                });
            } catch (e) {
                ['Mensalidade', 'Adesão', 'Anuidade', 'Serviço', 'Outros'].forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    planoContasSelect.appendChild(opt);
                });
            }
        }
    }

    initializeContractParticipantsUI();
}

// Idade do titular para precificação por faixa
function getTitularAge() {
    try {
        const titular = (familiaData.dependentes || []).find(d => String(d.parentesco).toLowerCase() === 'titular');
        const displayDate = titular?.dataNascimento || '';
        if (!displayDate) return null;
        const [dd, mm, yyyy] = String(displayDate).split('/');
        if (!dd || !mm || !yyyy) return null;
        const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    } catch (_) {
        return null;
    }
}

function initializeContractParticipantsUI() {
    try {
        const pool = [];
        const deps = Array.isArray(familiaData.dependentes) ? familiaData.dependentes : [];
        deps.forEach(d => {
            pool.push({ id: String(d.id), nome: d.nome || '', parentesco: d.parentesco || '' });
        });
        const titularFromDeps = deps.find(d => String(d.parentesco).toLowerCase() === 'titular');
        const titularData = coletarDadosTitular ? coletarDadosTitular() : null;
        const nomeTitular = titularFromDeps ? (titularFromDeps.nome || '') : (titularData?.nome || document.getElementById('nome')?.value || '');
        if (nomeTitular) {
            const titularId = titularFromDeps ? String(titularFromDeps.id) : 'titular';
            const exists = pool.find(p => String(p.id) === titularId);
            if (!exists) pool.push({ id: titularId, nome: nomeTitular, parentesco: 'Titular' });
        }
        contractParticipantsPool = pool;
        currentContractParticipants = pool.map(p => String(p.id));
        renderContractParticipants();
    } catch (_) { }
}

function renderContractParticipants() {
    const container = document.getElementById('contParticipants');
    const addSelect = document.getElementById('contAddParticipantSelect');
    const addBtn = document.getElementById('contAddParticipantBtn');
    if (!container || !addSelect) return;
    container.innerHTML = '';
    const selectedSet = new Set(currentContractParticipants.map(String));
    currentContractParticipants.forEach(id => {
        const m = contractParticipantsPool.find(p => String(p.id) === String(id));
        const tag = document.createElement('span');
        tag.className = 'chip';
        tag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #ddd;border-radius:12px;background:#f7f7f7;';
        tag.innerHTML = `<span>${m ? (m.nome || 'Participante') : id}${m && m.parentesco ? ` (${m.parentesco})` : ''}</span><button type="button" class="btn btn-danger btn-sm" style="padding:2px 6px;" data-id="${id}"><i class="fas fa-times"></i></button>`;
        container.appendChild(tag);
        const btn = tag.querySelector('button');
        if (btn) btn.addEventListener('click', () => {
            currentContractParticipants = currentContractParticipants.filter(x => String(x) !== String(id));
            renderContractParticipants();
        });
    });
    addSelect.innerHTML = '<option value="">Adicionar participante...</option>';
    contractParticipantsPool.forEach(p => {
        if (!selectedSet.has(String(p.id))) {
            const opt = document.createElement('option');
            opt.value = String(p.id);
            opt.textContent = `${p.nome} (${p.parentesco || '—'})`;
            addSelect.appendChild(opt);
        }
    });
    if (addBtn) {
        addBtn.onclick = () => {
            const val = addSelect.value;
            if (val) {
                currentContractParticipants.push(String(val));
                renderContractParticipants();
            }
        };
    }
}

function getSelectedParticipantsSnapshot() {
    const sel = currentContractParticipants.map(id => {
        const m = contractParticipantsPool.find(p => String(p.id) === String(id));
        if (m) return { id: String(m.id), nome: m.nome || '', parentesco: m.parentesco || '' };
        return { id: String(id), nome: '', parentesco: '' };
    });
    return sel;
}

// Atualizar participantes quando dependentes mudarem
function onDependentesChanged() {
    try { initializeContractParticipantsUI(); } catch (_) { }
}

// Atualizar o select de planos quando a empresa ativa mudar
try {
    window.addEventListener('activeCompanyChanged', () => {
        const select = document.getElementById('contPlano');
        const modal = document.getElementById('contratoModal');
        if (select && modal && modal.classList.contains('show')) {
            populatePlanoSelectFromSources(select);
        }
    });
} catch (e) {
    console.warn('[Planos] Falha ao registrar listener de mudança de empresa:', e);
}

function openPetModal() {
    openModal('petModal');
}

// Funções para salvar dados dos modais
async function salvarDependente() {
    const form = document.getElementById('dependenteForm');
    const formData = new FormData(form);

    // Validar campos obrigatórios
    const nome = formData.get('nome');
    let parentesco = (formData.get('parentesco') || '').trim();
    const dataNascimento = formData.get('dataNascimento');

    let isEditingTitular = false;
    let previousParentesco = null;
    if (editingDependenteId) {
        const dep = (familiaData.dependentes || []).find(d => String(d.id) === String(editingDependenteId));
        if (dep) {
            previousParentesco = dep.parentesco || '';
            isEditingTitular = String(dep.parentesco).toLowerCase() === 'titular';
        }
    }

    if (!nome || (!parentesco && !isEditingTitular) || !dataNascimento) {
        showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }
    if (isEditingTitular && !parentesco) {
        parentesco = 'Titular';
    }

    // Validação estrita de CPF (se informado)
    const cpf = formData.get('cpf') || '';
    if (cpf && !isValidCPF(cpf)) {
        showMessage('O CPF informado é inválido.', 'error');
        return;
    }

    // Atualização quando em modo edição
    if (editingDependenteId) {
        const idx = (familiaData.dependentes || []).findIndex(d => String(d.id) === String(editingDependenteId));
        if (idx >= 0) {
            const car = formData.get('carencia') || 'padrao';
            familiaData.dependentes[idx] = {
                ...familiaData.dependentes[idx],
                nome,
                parentesco,
                dataNascimento: formatDateForDisplay(dataNascimento),
                cpf: formData.get('cpf') || '',
                genero: formData.get('genero') || '',
                psicologo: formData.get('psicologo') || '',
                celular: formData.get('celular') || '',
                seguradora: formData.get('seguradora') || '',
                carencia: car,
                carenciaCustomizada: car !== 'padrao'
            };
            renderDependentesTable();
            onDependentesChanged();
            closeModal('dependenteModal');
            showMessage('Dependente atualizado com sucesso!', 'success');
            editingDependenteId = null;
            return;
        }
    }

    // Inclusão de novo dependente
    const novoId = await window.SequenceManager.next('dependente');
    const dependente = {
        id: novoId,
        nome,
        parentesco,
        dataNascimento: formatDateForDisplay(dataNascimento),
        cpf: formData.get('cpf') || '',
        genero: formData.get('genero') || '',
        psicologo: formData.get('psicologo') || '',
        celular: formData.get('celular') || '',
        seguradora: formData.get('seguradora') || '',
        carencia: formData.get('carencia') || 'padrao',
        carenciaCustomizada: (formData.get('carencia') || 'padrao') !== 'padrao',
        produtos: []
    };

    familiaData.dependentes.push(dependente);
    renderDependentesTable();
    onDependentesChanged();
    closeModal('dependenteModal');
    showMessage('Dependente adicionado com sucesso!', 'success');

    // Se carência não for a padrão, exibir uma notificação assíncrona
    if (dependente.carenciaCustomizada) {
        setTimeout(() => {
            showMessage(`Carência customizada aplicada ao dependente ${dependente.nome}.`, 'info');
        }, 800);
    }
}

function salvarPai() {
    const form = document.getElementById('paiForm');
    const formData = new FormData(form);

    const nome = formData.get('nome');
    const parentesco = formData.get('parentesco');
    const dataNascimento = formData.get('dataNascimento');

    if (!nome || !parentesco || !dataNascimento) {
        showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const pai = {
        id: Date.now(),
        nome,
        parentesco,
        dataNascimento: formatDateForDisplay(dataNascimento),
        cpf: formData.get('cpf') || '',
        telefone: formData.get('telefone') || '',
        email: formData.get('email') || ''
    };

    familiaData.pais.push(pai);
    renderPaisTable();
    closeModal('paiModal');
    showMessage('Pai/Mãe adicionado com sucesso!', 'success');
}

// Estado temporário para confirmação de contrato
let pendingContrato = null;

async function salvarContrato() {
    const form = document.getElementById('contratoForm');
    const formData = new FormData(form);

    const plano = formData.get('plano');
    const dataInicioRaw = formData.get('dataInicio');
    const valorCobranca = formData.get('valor');
    const formaPagamento = formData.get('formaPagamento');
    const planoContas = formData.get('planoContas');
    const parcelasStr = formData.get('parcelas');

    // Validações básicas
    if (!plano) {
        showMessage('Plano é obrigatório.', 'error');
        return;
    }
    if (!formaPagamento) {
        showMessage('Forma de pagamento é obrigatória.', 'error');
        return;
    }
    if (!planoContas) {
        showMessage('Plano de Contas é obrigatório.', 'error');
        return;
    }
    if (!valorCobranca || !/^R\$\s?\d{1,3}(\.\d{3})*,\d{2}$/.test(valorCobranca)) {
        showMessage('Informe o Valor da Cobrança em formato válido (ex: R$ 117,00).', 'error');
        return;
    }
    const parcelas = parseInt(parcelasStr, 10);
    if (isNaN(parcelas) || parcelas <= 0) {
        showMessage('Número de parcelas deve ser um número maior que 0.', 'error');
        return;
    }

    // Preparar objeto pendente (sem consumir sequência ainda)
    const numeroPreview = await window.SequenceManager.peek('contrato');
    pendingContrato = {
        id: null, // será definido na confirmação
        numero: String(numeroPreview), // apenas preview
        plano,
        dataInicio: dataInicioRaw ? formatDateForDisplay(dataInicioRaw) : '',
        valor: valorCobranca,
        formaPagamento,
        planoContas,
        parcelas,
        participants: getSelectedParticipantsSnapshot()
    };

    // Atualizar resumo no modal de confirmação
    const summaryEl = document.getElementById('confirmContratoSummary');
    if (summaryEl) {
        summaryEl.textContent = `Confirma a criação do contrato do Plano ${pendingContrato.plano}, no valor de ${pendingContrato.valor} em ${pendingContrato.parcelas} parcelas?`;
    }

    // Abrir modal de confirmação
    openModal('confirmContratoModal');
}

async function confirmarSalvarContrato() {
    if (!pendingContrato) {
        closeModal('confirmContratoModal');
        return;
    }
    // Consumir sequência e finalizar dados
    const numeroEfetivo = await window.SequenceManager.next('contrato');
    const contrato = {
        id: String(numeroEfetivo),
        numero: String(numeroEfetivo),
        plano: pendingContrato.plano,
        dataInicio: pendingContrato.dataInicio,
        valor: pendingContrato.valor,
        formaPagamento: pendingContrato.formaPagamento,
        planoContas: pendingContrato.planoContas,
        parcelas: pendingContrato.parcelas,
        participants: Array.isArray(pendingContrato.participants) ? pendingContrato.participants : [],
        situacao: 'Adimplente',
        diaVencimento: (function () {
            try {
                if (pendingContrato.dataInicio) {
                    const p = String(pendingContrato.dataInicio).split('/');
                    if (p.length === 3) return p[0];
                }
            } catch (e) { }
            return null;
        })()
    };

    familiaData.contratos.push(contrato);

    // Tentar salvar a família automaticamente para garantir que o contrato tenha um "pai"
    try {
        
        await saveFamilyInternal();
        console.log('Família salva automaticamente.');
    } catch (e) {
        console.warn('Erro ao salvar família automaticamente (contrato será criado mas família pode não estar salva):', e);
        // Não bloqueia, mas avisa
        alert('Atenção: O contrato foi criado, mas houve um erro ao salvar os dados da família. Verifique se todos os campos obrigatórios estão preenchidos.');
    }

    try {
        localStorage.setItem(`CONTRACT_EDIT_${contrato.numero}`, JSON.stringify({
            numero: contrato.numero,
            plano: contrato.plano,
            dataContrato: (function () {
                try {
                    const parts = String(contrato.dataInicio || '').split('/');
                    if (parts.length === 3) {
                        const [d, m, y] = parts; const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        return iso;
                    }
                } catch (_) { }
                return '';
            })(),
            tipoCobranca: (function () {
                const f = String(contrato.formaPagamento || '').toLowerCase();
                if (f.includes('mensal')) return 'Mensal';
                if (f.includes('trimestral')) return 'Trimestral';
                if (f.includes('semestral')) return 'Semestral';
                if (f.includes('anual')) return 'Anual';
                if (f.includes('vista')) return 'À vista';
                return contrato.formaPagamento || '';
            })(),
            valorMensalidade: (function () {
                try { const s = String(contrato.valor || ''); const n = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,/g, '.'); const num = Number(n); return Number.isFinite(num) ? num : null; } catch (_) { return null; }
            })(),
            qtdParcelas: Number(contrato.parcelas) || null,
            situacao: contrato.situacao || '',
            primeiraParcela: (function () {
                try { const parts = String(contrato.dataInicio || '').split('/'); if (parts.length === 3) { const [d, m, y] = parts; return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; } } catch (_) { }
                return '';
            })()
        }));
    } catch (_) { }
    renderContratosTable();
    closeModal('confirmContratoModal');
    closeModal('contratoModal');
    showMessage('Contrato criado com sucesso!', 'success');

    // Permanecer na página e permitir gestão pelo botão dedicado em listagens

    // Limpar estado pendente
    pendingContrato = null;
}

function cancelarConfirmacaoContrato() {
    pendingContrato = null;
    closeModal('confirmContratoModal');
}

function salvarPet() {
    const form = document.getElementById('petForm');
    const formData = new FormData(form);

    const nome = formData.get('nome');
    const especie = formData.get('especie');
    const idade = formData.get('idade');

    if (!nome || !especie || !idade) {
        showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const pet = {
        id: Date.now(),
        nome,
        especie,
        raca: formData.get('raca') || '',
        idade,
        genero: formData.get('genero') || '',
        observacoes: formData.get('observacoes') || ''
    };

    familiaData.pets.push(pet);
    renderPetsTable();
    closeModal('petModal');
    showMessage('Pet adicionado com sucesso!', 'success');
}

// Função para remover itens das tabelas
function removerItem(tipo, id) {
    familiaData[tipo] = familiaData[tipo].filter(item => item.id !== id);

    // Renderizar a tabela correspondente
    switch (tipo) {
        case 'dependentes':
            renderDependentesTable();
            break;
        case 'pais':
            renderPaisTable();
            break;
        case 'contratos':
            renderContratosTable();
            break;
        case 'pets':
            renderPetsTable();
            break;
    }

    showMessage('Item removido com sucesso!', 'success');
}

// Função auxiliar para formatar data para exibição
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    // Normaliza ISO 'YYYY-MM-DD' para evitar fuso
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, d] = dateString.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('pt-BR');
    }
    const dt = new Date(dateString);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('pt-BR');
}

// Converter data de exibição (pt-BR) para valor de input (YYYY-MM-DD)
function formatDateForInput(displayDate) {
    if (!displayDate) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) return displayDate;
    const parts = String(displayDate).split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts;
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
    }
    const dt = new Date(displayDate);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    return '';
}

// Funções para upload de foto
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecione apenas arquivos de imagem.', 'error');
        return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('A imagem deve ter no máximo 5MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('photoPreview');
        const uploadArea = document.querySelector('.photo-upload-area');

        preview.src = e.target.result;
        preview.style.display = 'block';
        uploadArea.style.display = 'none';

        // Mostrar ações da foto
        document.querySelector('.photo-actions').style.display = 'flex';

        // Armazenar a foto nos dados da família
        familiaData.foto = e.target.result;

        showMessage('Foto carregada com sucesso!', 'success');
    };

    reader.readAsDataURL(file);
}

function removePhoto() {
    const preview = document.getElementById('photoPreview');
    const uploadArea = document.querySelector('.photo-upload-area');
    const fileInput = document.getElementById('photoUpload');

    preview.src = '';
    preview.style.display = 'none';
    uploadArea.style.display = 'flex';
    fileInput.value = '';

    // Esconder ações da foto
    document.querySelector('.photo-actions').style.display = 'none';

    // Remover a foto dos dados da família
    familiaData.foto = null;

    showMessage('Foto removida com sucesso!', 'success');
}

// Funções de renderização das tabelas
function renderDependentesTable() {
    const tbody = document.querySelector('#tabelaDependentes tbody');
    tbody.innerHTML = '';

    if (familiaData.dependentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Nenhum dependente cadastrado</td></tr>';
        return;
    }

    familiaData.dependentes.forEach((dependente, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dependente.id}</td>
            <td>${dependente.nome}</td>
            <td>${dependente.parentesco}</td>
            <td>${dependente.dataNascimento}</td>
            <td>${dependente.cpf}</td>
            <td>${(dependente.psicologo || dependente.psicologos || '').toString().trim() || '-'}</td>
            <td>${dependente.seguradora || '-'}</td>
            <td>${(dependente.produtos && dependente.produtos.length) ? dependente.produtos.map(p => p.nome || '').filter(Boolean).join(', ') : (dependente.produto && dependente.produto.nome ? dependente.produto.nome : '-')}</td>
            <td>
                <div class="table-actions">
                    <button type="button" class="btn btn-info btn-sm" onclick="openEditDependenteIndex(${idx})" title="Editar Dependente"><i class="fas fa-edit"></i></button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="openDependenteProdutoModal('${dependente.id}')" title="Adicionar Produto"><i class="fas fa-box"></i></button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="removerItem('dependentes', '${dependente.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Abrir modal de edição por índice para evitar colisão de IDs
function openEditDependenteIndex(index) {
    const dep = (familiaData.dependentes || [])[index];
    if (!dep) {
        showMessage('Dependente não encontrado para edição.', 'error');
        return;
    }
    openEditDependente(String(dep.id));
}

// Abrir modal de produto do dependente
function openDependenteProdutoModal(dependenteId) {
    const select = document.getElementById('depProdutoNome');
    const qtdInput = document.getElementById('depProdutoQuantidade');
    const valorInput = document.getElementById('depProdutoValor');
    const hiddenId = document.getElementById('depProdutoDependenteId');

    if (!select || !qtdInput || !valorInput || !hiddenId) return;

    hiddenId.value = String(dependenteId);

    // Obter idade do dependente para precificação por faixa
    const dep = (familiaData.dependentes || []).find(d => String(d.id) === String(dependenteId));
    const computeAgeFromDisplay = (displayDate) => {
        if (!displayDate) return null;
        const [dd, mm, yyyy] = (displayDate || '').split('/');
        if (!dd || !mm || !yyyy) return null;
        const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };
    const age = dep ? computeAgeFromDisplay(dep.dataNascimento) : null;

    // Carregar catálogo de produtos do storage
    let catalogo = [];
    try {
        catalogo = JSON.parse(localStorage.getItem('catalogoProdutos') || '[]');
    } catch (e) {
        console.warn('Falha ao carregar catálogo de produtos:', e);
    }

    // Popular options
    select.innerHTML = '<option value="">Selecione...</option>';
    const parseRange = (range) => {
        if (!range) return null;
        if (range.endsWith('+')) {
            const min = parseInt(range.replace('+', ''), 10);
            return { min, max: Infinity };
        }
        const [minStr, maxStr] = range.split('-');
        const min = parseInt(minStr, 10);
        const max = parseInt(maxStr, 10);
        if (isNaN(min) || isNaN(max)) return null;
        return { min, max };
    };

    catalogo.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name || '';
        opt.textContent = p.name || '';
        // Calcular valor considerando faixas de idade, se habilitado
        let valor = p.value || '';
        if (p.agePricingEnabled && Array.isArray(p.agePrices) && age != null) {
            const match = p.agePrices.find(ap => {
                const r = parseRange(ap.range);
                return r && age >= r.min && age <= r.max;
            });
            if (match) valor = match.value || valor;
        }
        opt.dataset.valor = valor;
        select.appendChild(opt);
    });

    // Atualizar valor ao escolher produto
    select.onchange = () => {
        const selected = select.selectedOptions[0];
        valorInput.value = selected?.dataset?.valor || '';
    };

    // Limpar seleção para adicionar novo produto (suporta múltiplos)
    select.value = '';
    qtdInput.value = 1;
    valorInput.value = '';

    openModal('dependenteProdutoModal');
}

// Salvar produto do dependente
function salvarDependenteProduto() {
    const hiddenId = document.getElementById('depProdutoDependenteId');
    const select = document.getElementById('depProdutoNome');
    const qtdInput = document.getElementById('depProdutoQuantidade');
    const valorInput = document.getElementById('depProdutoValor');

    if (!hiddenId || !select || !qtdInput || !valorInput) return;

    const dependenteId = hiddenId.value;
    const nomeProduto = select.value;
    const quantidade = parseInt(qtdInput.value, 10) || 1;
    const valor = valorInput.value || '';

    const depIndex = (familiaData.dependentes || []).findIndex(d => String(d.id) === String(dependenteId));
    if (depIndex === -1) {
        showMessage('Dependente não encontrado.', 'error');
        return;
    }

    const dep2 = familiaData.dependentes[depIndex];
    if (!Array.isArray(dep2.produtos)) {
        dep2.produtos = [];
    }
    if (nomeProduto) {
        dep2.produtos.push({ nome: nomeProduto, quantidade, valor });
    }
    renderDependentesTable();
    closeModal('dependenteProdutoModal');
    showMessage('Produto adicionado ao dependente!', 'success');
}

// Salvar titular dentro da seção de Informações pessoais e refletir como item na lista de dependentes
async function salvarTitular() {
    const nome = document.getElementById('nome')?.value || '';
    const dataNasc = document.getElementById('dataNascimento')?.value || '';
    const cpf = document.getElementById('cpf')?.value || '';
    const telefone = document.getElementById('telefone')?.value || '';
    const celular = document.getElementById('celular')?.value || '';
    const genero = document.querySelector('input[name="sexo"]:checked')?.value || '';

    if (!nome || !dataNasc || !cpf) {
        showMessage('Preencha Nome, Data de nascimento e CPF do titular.', 'error');
        return;
    }

    const formattedDate = formatDateForDisplay(dataNasc);

    // Verifica se já existe um registro de titular na lista de dependentes
    const existingIndex = (familiaData.dependentes || []).findIndex(d => (d.parentesco === 'Titular'));
    const titularEntry = {
        id: existingIndex !== -1 ? familiaData.dependentes[existingIndex].id : await window.SequenceManager.next('titular'),
        nome,
        parentesco: 'Titular',
        dataNascimento: formattedDate,
        cpf,
        genero,
        telefone,
        celular,
        seguradora: '',
        carencia: 'padrao',
        carenciaCustomizada: false
    };

    if (existingIndex !== -1) {
        familiaData.dependentes[existingIndex] = { ...familiaData.dependentes[existingIndex], ...titularEntry };
    } else {
        familiaData.dependentes.push(titularEntry);
    }

    renderDependentesTable();
    showMessage('Titular salvo e refletido na lista de dependentes.', 'success');
}

function renderPaisTable() {
    const table = document.querySelector('#tabelaPais');
    if (!table) return; // Seção de pais removida da UI
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (familiaData.pais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Nenhum pai/mãe cadastrado</td></tr>';
        return;
    }

    familiaData.pais.forEach(pai => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pai.nome}</td>
            <td>${pai.parentesco}</td>
            <td>${pai.dataNascimento}</td>
            <td>${pai.cpf}</td>
            <td>${pai.telefone}</td>
            <td>
                <button type="button" class="btn btn-danger" onclick="removerItem('pais', ${pai.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderContratosTable() {
    const tbody = document.querySelector('#tabelaContratos tbody');
    tbody.innerHTML = '';

    if (familiaData.contratos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">Nenhum contrato cadastrado</td></tr>';
        return;
    }

    familiaData.contratos.forEach(contrato => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contrato.numero}</td>
            <td>${contrato.plano}</td>
            <td>${contrato.dataInicio || '-'}</td>
            <td>
                <button type="button" class="btn btn-primary" title="Acessar" onclick="abrirResumoContrato('${contrato.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn btn-danger" onclick="removerItem('contratos', '${contrato.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Estado do contrato atualmente exibido no resumo
let contratoResumoAtual = null;

// Abre o modal de resumo com dados do contrato selecionado
function abrirResumoContrato(id) {
    try {
        const contrato = familiaData.contratos.find(c => c.id === id);
        if (!contrato) {
            showMessage('Contrato não encontrado.', 'error');
            return;
        }
        contratoResumoAtual = contrato;
        const numeroEl = document.getElementById('resumoContratoNumero');
        const situacaoEl = document.getElementById('resumoContratoSituacao');
        const planoEl = document.getElementById('resumoContratoPlano');
        const valorEl = document.getElementById('resumoContratoValor');
        const vencEl = document.getElementById('resumoContratoVencimento');

        if (numeroEl) numeroEl.textContent = contrato.numero || '-';
        if (situacaoEl) situacaoEl.textContent = contrato.situacao || 'Adimplente';
        if (planoEl) planoEl.textContent = contrato.plano || '-';
        if (valorEl) valorEl.textContent = contrato.valor || '-';

        let dia = contrato.diaVencimento;
        if (!dia && contrato.dataInicio) {
            try {
                const p = String(contrato.dataInicio).split('/');
                if (p.length === 3) dia = p[0];
            } catch (e) { dia = null; }
        }
        if (vencEl) vencEl.textContent = dia ? `Dia ${dia}` : '-';

        openModal('resumoContratoModal');
    } catch (e) {
        console.warn('Falha ao abrir resumo do contrato:', e);
        showMessage('Não foi possível abrir o resumo do contrato.', 'error');
    }
}

// Redireciona para a edição do contrato atualmente exibido
function acessarContratoCompleto() {
    if (!contratoResumoAtual) return;
    try {
        const num = contratoResumoAtual.numero;
        window.location.href = `/pages/edicao-contrato.html?numero=${encodeURIComponent(num)}`;
    } catch (e) {
        console.warn('Falha ao redirecionar para edição do contrato:', e);
    }
}

// Retorna o próximo número de contrato (7 dígitos) sem consumir a sequência
function getNextContractNumber() {
    return peekSequential('contrato');
}

// Salvamento interno rápido para persistir contratos na família em edição
async function saveFamilyInternal() {
    try {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let activeCompany = null;
        try { activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null; } catch (_) { activeCompany = null; }
        const companyId = activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'public';
        if (!editId) return true; // nada a persistir vinculado
        let familias = [];
        try { familias = JSON.parse(localStorage.getItem('familias') || '[]') || []; } catch (_) { familias = []; }
        const idx = familias.findIndex(f => String(f.id) === String(editId));
        if (idx >= 0) {
            familias[idx].contratos = Array.isArray(familiaData.contratos) ? familiaData.contratos : [];
        } else {
            familias.push({ id: String(editId), companyId, contratos: Array.isArray(familiaData.contratos) ? familiaData.contratos : [] });
        }
        try { localStorage.setItem('familias', JSON.stringify(familias)); } catch (_) { }
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('familias')
                    .update({ dependentes: Array.isArray(familiaData.dependentes) ? familiaData.dependentes : [] })
                    .eq('id', editId)
                    .eq('company_id', companyId);
                if (error) throw error;
            }
        } catch (e) { /* silencioso */ }
        return true;
    } catch (_) {
        return false;
    }
}

function renderPetsTable() {
    const tbody = document.querySelector('#tabelaPets tbody');
    tbody.innerHTML = '';

    if (familiaData.pets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Nenhum pet cadastrado</td></tr>';
        return;
    }

    familiaData.pets.forEach(pet => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pet.nome}</td>
            <td>${pet.especie}</td>
            <td>${pet.raca}</td>
            <td>${pet.idade}</td>
            <td>${pet.genero}</td>
            <td>
                <button type="button" class="btn btn-danger" onclick="removerItem('pets', ${pet.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function adicionarEndereco() {
    const safeGetValue = (id) => {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Campo não encontrado no HTML: ${id}. Retornando vazio.`);
            return '';
        }
        return el.value;
    };
    const endereco = {
        cep: safeGetValue('cep'),
        rua: safeGetValue('rua') || safeGetValue('logradouro'),
        numero: safeGetValue('numero'),
        bairro: safeGetValue('bairro'),
        cidade: safeGetValue('cidade'),
        estado: safeGetValue('estado') || safeGetValue('uf'),
        complemento: safeGetValue('complemento')
    };

    if (!endereco.cep || !endereco.rua || !endereco.numero || !endereco.bairro || !endereco.cidade) {
        showMessage('Por favor, preencha todos os campos obrigatórios do endereço.', 'error');
        return;
    }

    try { familiaData.endereco = endereco; } catch (_) { }
    showMessage('Endereço adicionado com sucesso!', 'success');
}

// Validação do formulário
function setupValidation() {
    const form = document.getElementById('novaFamiliaForm');

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (validateForm()) {
            salvarFamilia();
        }
    });
}

function validateField(field) {
    const formGroup = (field && typeof field.closest === 'function') ? field.closest('.form-group') : null;
    if (!formGroup) {
        console.warn(`Tentou validar o campo "${field?.id || field?.name || 'desconhecido'}" mas o contêiner .form-group não foi encontrado.`);
        return true;
    }
    let isValid = true;
    let message = '';

    // Remover classes anteriores
    formGroup.classList.remove('error', 'success');
    const existingMessage = formGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Validar campo obrigatório
    if (field.hasAttribute('required') && !field.value.trim()) {
        isValid = false;
        message = 'Este campo é obrigatório';
    }

    // Validar email
    if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            isValid = false;
            message = 'Email inválido';
        }
    }

    // Validar CPF
    if (field.id === 'cpf' && field.value) {
        if (!isValidCPF(field.value)) {
            isValid = false;
            message = 'CPF inválido';
        }
    }

    // Aplicar classe e mensagem
    if (!isValid) {
        formGroup.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        formGroup.appendChild(errorDiv);
    } else if (field.value.trim()) {
        formGroup.classList.add('success');
    }

    return isValid;
}

function validateForm() {
    const requiredFields = document.querySelectorAll('input[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        // Ignora campos dentro de modais que estão ocultos
        const parentModal = field.closest('.modal');
        if (parentModal) {
            const style = window.getComputedStyle(parentModal);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return; // pula este campo
            }
        }
        if (!validateField(field)) {
            isValid = false;
        }
    });

    return isValid;
}

function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }

    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
}

// Funções principais
async function salvarFamilia(evt) {
    if (evt) evt.preventDefault(); // <--- OBRIGATÓRIO: Impede o refresh/submit duplo

    if (window.__saving === true) {
        return;
    }

    // 1. TRAVA O BOTÃO E MUDA O TEXTO
    const button = (evt && evt.target && evt.target.closest('button')) ||
        document.querySelector('button[onclick*="salvarFamilia"]') ||
        document.querySelector('#novaFamiliaForm .btn.btn-success') || null;

    let originalBtnText = '';
    if (button) {
        if (button.disabled) return; // Se já clicou, ignora
        button.disabled = true;
        originalBtnText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        button.classList.add('loading');
    }

    window.__saving = true;

    if (!validateForm()) {
        showMessage('Por favor, corrija os erros no formulário antes de salvar.', 'error');
        window.__saving = false;
        if (button) {
            button.disabled = false;
            button.innerHTML = originalBtnText;
            button.classList.remove('loading');
        }
        return;
    }

    try {
        // Verificar empresa ativa
        await waitForSupabaseReady(3000);
        const activeCompanyStr = localStorage.getItem('activeCompany');
        let activeCompany = null;
        try {
            activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
        } catch (e) {
            activeCompany = null;
        }
        if (!activeCompany || !activeCompany.id) {
            const fallbackId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
            const fallbackName = localStorage.getItem('empresaSelecionadaNome') || '';
            if (!fallbackId) {
                if (button) {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
                showMessage('Selecione uma empresa ativa antes de salvar a família.', 'error');
                return;
            }
            activeCompany = { id: fallbackId, name: fallbackName };
            try { localStorage.setItem('activeCompany', JSON.stringify(activeCompany)); } catch (e) { }
        }
        const companyId = activeCompany.id;

        // Coletar dados do titular
        const titularData = coletarDadosTitular();

        // Se estamos editando, atualizar registros existentes (somente quando há ?id= na URL)
        const editId = new URLSearchParams(window.location.search).get('id');
        if (editId) {
            let familias = JSON.parse(localStorage.getItem('familias') || '[]');
            const idx = familias.findIndex(f => String(f.id) === String(editId));
            if (idx === -1) {
                // Fallback: se não existir, cria como nova família usando o mesmo ID de edição
                const novaFamilia = {
                    id: String(editId),
                    companyId: companyId,
                    titular: {
                        id: generateId(),
                        nome: titularData.nome,
                        cpf: titularData.cpf,
                        dataNascimento: titularData.dataNascimento, // CRÍTICO: incluir data de nascimento!
                        seguradora: titularData.seguradora || ''
                    },
                    endereco: {
                        cep: titularData.cep,
                        rua: titularData.rua,
                        numero: titularData.numero,
                        complemento: titularData.complemento,
                        bairro: titularData.bairro,
                        cidade: titularData.cidade,
                        estado: titularData.estado
                    },
                    dependentes: Array.isArray(familiaData.dependentes) ? familiaData.dependentes : [],
                    pais: Array.isArray(familiaData.pais) ? familiaData.pais : [],
                    contratos: Array.isArray(familiaData.contratos) ? familiaData.contratos : [],
                    pets: Array.isArray(familiaData.pets) ? familiaData.pets : [],
                    dataCriacao: new Date().toISOString(),
                    status: 'ativo'
                };
                familias.push(novaFamilia);
                localStorage.setItem('familias', JSON.stringify(familias));

                // Cria/atualiza titular em associados
                let associados = JSON.parse(localStorage.getItem('associados') || '[]');
                const associadoId = generateId();
                associados.push({
                    id: associadoId,
                    familiaId: String(editId),
                    companyId: companyId,
                    tipo: 'titular',
                    nome: titularData.nome,
                    cpf: titularData.cpf,
                    rg: titularData.rg,
                    dataNascimento: titularData.dataNascimento,
                    telefone: titularData.telefone,
                    email: titularData.email,
                    endereco: novaFamilia.endereco,
                    foto: familiaData.foto,
                    seguradora: titularData.seguradora || '',
                    dataCadastro: new Date().toISOString(),
                    status: 'ativo'
                });
                // Dependentes atuais do formulário
                (familiaData.dependentes || []).forEach(dependente => {
                    associados.push({
                        id: generateId(),
                        familiaId: String(editId),
                        companyId: companyId,
                        tipo: 'dependente',
                        nome: dependente.nome,
                        cpf: dependente.cpf,
                        rg: dependente.rg,
                        dataNascimento: dependente.dataNascimento,
                        telefone: dependente.telefone,
                        email: dependente.email,
                        endereco: novaFamilia.endereco,
                        parentesco: dependente.parentesco,
                        seguradora: dependente.seguradora || '',
                        dataCadastro: new Date().toISOString(),
                        status: 'ativo'
                    });
                });
                localStorage.setItem('associados', JSON.stringify(associados));

                button.classList.remove('loading');
                button.disabled = false;
                clearFormProtection(); // Desativa aviso de perda de dados
                showMessage('Família criada para edição e salva com sucesso!', 'success');
                setTimeout(() => {
                    try { localStorage.removeItem('editFamilyId'); } catch (e) { }
                    window.location.href = 'pesquisar-familias.html';
                }, 1200);
                return;
            }
            const familia = familias[idx];

            // Atualiza dados principais
            familia.titular = {
                id: familia.titular?.id || generateId(),
                nome: titularData.nome,
                cpf: titularData.cpf,
                genero: titularData.genero,
                celular: titularData.celular,
                seguradora: titularData.seguradora || ''
            };
            familia.endereco = {
                cep: titularData.cep,
                rua: titularData.rua,
                numero: titularData.numero,
                complemento: titularData.complemento,
                bairro: titularData.bairro,
                cidade: titularData.cidade,
                estado: titularData.estado
            };
            familia.dependentes = Array.isArray(familiaData.dependentes) ? familiaData.dependentes : [];
            familia.pais = Array.isArray(familiaData.pais) ? familiaData.pais : [];
            familia.contratos = Array.isArray(familiaData.contratos) ? familiaData.contratos : [];
            familia.pets = Array.isArray(familiaData.pets) ? familiaData.pets : [];
            // Garante o vínculo da família com a empresa ativa
            familia.companyId = companyId;
            familias[idx] = familia;
            localStorage.setItem('familias', JSON.stringify(familias));

            // Atualiza família no Supabase (modo edição)
            try {
                const ready = await waitForSupabaseReady(3000);
                if (ready && window.supabase) {
                    const { error } = await window.supabase
                        .from('familias')
                        .upsert({
                            id: String(editId),
                            company_id: companyId,
                            titular: familia.titular,
                            dependentes: familia.dependentes,
                            endereco: familia.endereco,
                            status: familia.status,
                            metadata: {
                                pais: familia.pais,
                                contratos: familia.contratos,
                                pets: familia.pets,
                                dataCriacao: familia.dataCriacao
                            }
                        });
                    if (error) throw error;
                }
            } catch (e) {
                console.warn('Falha ao atualizar família no Supabase:', e);
            }

            // Atualiza associados (titular e dependentes)
            let associados = JSON.parse(localStorage.getItem('associados') || '[]');
            const titularIndex = associados.findIndex(a => String(a.familiaId) === String(editId) && a.tipo === 'titular');
            if (titularIndex !== -1) {
                const existe = associados[titularIndex];
                associados[titularIndex] = {
                    ...existe,
                    companyId: companyId,
                    nome: titularData.nome,
                    cpf: titularData.cpf,
                    rg: titularData.rg,
                    dataNascimento: titularData.dataNascimento,
                    telefone: titularData.telefone,
                    celular: titularData.celular,
                    genero: titularData.genero,
                    email: titularData.email,
                    endereco: familia.endereco,
                    foto: familiaData.foto,
                    seguradora: titularData.seguradora || '',
                    status: existe.status || 'ativo'
                };
            } else {
                // Cria titular caso não exista em associados
                const associadoId = generateId();
                associados.push({
                    id: associadoId,
                    familiaId: editId,
                    companyId: companyId,
                    tipo: 'titular',
                    nome: titularData.nome,
                    cpf: titularData.cpf,
                    rg: titularData.rg,
                    dataNascimento: titularData.dataNascimento,
                    telefone: titularData.telefone,
                    celular: titularData.celular,
                    genero: titularData.genero,
                    email: titularData.email,
                    endereco: familia.endereco,
                    foto: familiaData.foto,
                    seguradora: titularData.seguradora || '',
                    dataCadastro: new Date().toISOString(),
                    status: 'ativo'
                });
            }

            // Atualiza dependentes preservando IDs quando possível
            const dependentesExistentes = associados.filter(a => String(a.familiaId) === String(editId) && a.tipo === 'dependente');
            const mapaPorCPF = new Map();
            const mapaPorNome = new Map();
            dependentesExistentes.forEach(d => {
                if (d.cpf) mapaPorCPF.set(String(d.cpf), d.id);
                if (d.nome) mapaPorNome.set(String(d.nome).trim(), d.id);
            });

            // Remove dependentes antigos e recria lista mantendo IDs
            associados = associados.filter(a => !(String(a.familiaId) === String(editId) && a.tipo === 'dependente'));
            const dependentesAtualizados = [];
            (familiaData.dependentes || []).forEach(dependente => {
                const chaveCPF = dependente.cpf ? String(dependente.cpf) : null;
                const chaveNome = dependente.nome ? String(dependente.nome).trim() : null;
                const idPreservado = (chaveCPF && mapaPorCPF.get(chaveCPF)) || (chaveNome && mapaPorNome.get(chaveNome)) || null;
                const depId = idPreservado || generateId();
                const novoDep = {
                    id: depId,
                    familiaId: editId,
                    companyId: companyId,
                    tipo: 'dependente',
                    nome: dependente.nome,
                    cpf: dependente.cpf,
                    rg: dependente.rg,
                    dataNascimento: dependente.dataNascimento,
                    telefone: dependente.telefone,
                    email: dependente.email,
                    endereco: familia.endereco,
                    parentesco: dependente.parentesco,
                    seguradora: dependente.seguradora || '',
                    dataCadastro: new Date().toISOString(),
                    status: 'ativo'
                };
                dependentesAtualizados.push(novoDep);
                associados.push(novoDep);
            });
            localStorage.setItem('associados', JSON.stringify(associados));

            // Persistir titular e dependentes no Supabase (modo edição)
            try {
                if (window.supabase) {
                    // Atualiza titular (upsert)
                    const titularPersist = associados.find(a => String(a.familiaId) === String(editId) && a.tipo === 'titular');
                    if (titularPersist) {
                        await window.supabase
                            .from('associados')
                            .upsert({ ...titularPersist, company_id: companyId });
                    }

                    // Supabase não tem Batch nativo como o Firestore, mas podemos fazer upsert de array
                    if (dependentesAtualizados.length > 0) {
                        await window.supabase
                            .from('associados')
                            .upsert(dependentesAtualizados.map(d => ({ ...d, company_id: companyId })));
                    }

                    // Upsert dos contratos
                    const contratosLista = Array.isArray(familia.contratos) ? familia.contratos : [];
                    if (contratosLista.length > 0) {
                        for (const contrato of contratosLista) {
                            const numeroRaw = contrato.numero || contrato.id || '';
                            const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
                            const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : Date.now();
                            const contratoDoc = {
                                numero: String(numeroRaw || numeroNumerico),
                                plano: contrato.plano || '',
                                status: 'ativo',
                                company_id: company_id,
                                familia_id: String(editId),
                                metadata: {
                                    date: contrato.dataInicio || new Date().toLocaleDateString('pt-BR'),
                                    titular: titularData.nome,
                                    cpf: titularData.cpf || '',
                                    vendedor: 'nenhum',
                                    valorTotal: 'R$ 0,00',
                                    parcelas: contrato.parcelas || 0,
                                    participants: Array.isArray(contrato.participants) ? contrato.participants : []
                                }
                            };
                            await window.supabase
                                .from('contratos')
                                .upsert(contratoDoc);
                        }
                    }
                }
            } catch (e) {
                console.warn('Falha ao persistir associados/contratos no Supabase (edição):', e);
            }

            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
                if (originalBtnText) button.innerHTML = originalBtnText;
            }
            clearFormProtection();
            showMessage('Família atualizada com sucesso!', 'success');
            const mode = window.__saveMode || 'confirm';
            if (mode === 'exit') {
                setTimeout(() => { window.location.href = 'pesquisar-familias.html'; }, 1000);
            }
            window.__saving = false;
            return; // Não seguir para fluxo de criação
        }

        // Gerar ID ÚNICO para evitar sobrescrita de famílias
        // CORRIGIDO: Antes usava CPF como base, causando sobrescrita quando CPF era igual ou vazio
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 10);
        const familiaId = `fam_${companyId}_${timestamp}_${randomPart}`;

        // Manter ID do associado como aleatório para compatibilidade existente
        const associadoId = generateId();

        // Criar registro da família
        const familia = {
            id: familiaId,
            companyId: companyId,
            titular: {
                id: associadoId,
                nome: titularData.nome,
                cpf: titularData.cpf,
                dataNascimento: titularData.dataNascimento, // CRÍTICO: incluir data de nascimento!
                genero: titularData.genero,
                celular: titularData.celular,
                seguradora: titularData.seguradora || ''
            },
            dataCriacao: new Date().toISOString(),
            status: 'ativo',
            endereco: {
                cep: titularData.cep,
                rua: titularData.rua,
                numero: titularData.numero,
                complemento: titularData.complemento,
                bairro: titularData.bairro,
                cidade: titularData.cidade,
                estado: titularData.estado
            },
            dependentes: familiaData.dependentes,
            contratos: familiaData.contratos,
            pais: familiaData.pais,
            pets: familiaData.pets
        };

        // Criar registro do associado (titular)
        const associado = {
            id: associadoId,
            familiaId: familiaId,
            companyId: companyId,
            tipo: 'titular',
            nome: titularData.nome,
            cpf: titularData.cpf,
            rg: titularData.rg,
            dataNascimento: titularData.dataNascimento,
            telefone: titularData.telefone,
            celular: titularData.celular,
            genero: titularData.genero,
            email: titularData.email,
            endereco: familia.endereco,
            foto: familiaData.foto,
            seguradora: titularData.seguradora || '',
            dataCadastro: new Date().toISOString(),
            status: 'ativo'
        };

        // Persistir em Supabase (criação)
        try {
            const ready = await waitForSupabaseReady(3000);
            if (ready && window.supabase) {
                // Criar família
                const { error: errorFamilia } = await window.supabase
                    .from('familias')
                    .insert({
                        id: String(familiaId),
                        company_id: companyId,
                        titular: familia.titular,
                        dependentes: familia.dependentes,
                        endereco: familia.endereco,
                        status: familia.status,
                        metadata: {
                            pais: familia.pais,
                            contratos: familia.contratos,
                            pets: familia.pets,
                            dataCriacao: familia.dataCriacao
                        }
                    });
                if (errorFamilia) throw errorFamilia;

                // Criar associado (titular)
                await window.supabase
                    .from('associados')
                    .insert({ ...associado, company_id: companyId });

                // Criar contratos
                const contratosLista = Array.isArray(familiaData.contratos) ? familiaData.contratos : [];
                for (const contrato of contratosLista) {
                    const numeroRaw = contrato.numero || contrato.id || '';
                    const numeroLimpo = String(numeroRaw).replace(/\D/g, '');
                    const numeroNumerico = numeroLimpo ? parseInt(numeroLimpo, 10) : Date.now();
                    const contratoDoc = {
                        numero: String(numeroRaw || numeroNumerico),
                        plano: contrato.plano || '',
                        status: 'ativo',
                        company_id: companyId,
                        familia_id: String(familiaId),
                        metadata: {
                            date: contrato.dataInicio || new Date().toLocaleDateString('pt-BR'),
                            titular: titularData.nome,
                            cpf: titularData.cpf || '',
                            vendedor: 'nenhum',
                            valorTotal: 'R$ 0,00',
                            parcelas: contrato.parcelas || 0,
                            participants: Array.isArray(contrato.participants) ? contrato.participants : []
                        }
                    };
                    await window.supabase
                        .from('contratos')
                        .insert(contratoDoc);
                }
            }
        } catch (e) {
            console.error('Falha ao salvar família/titular/contratos no Supabase:', e);
            alert("ERRO DO BANCO DE DADOS: " + (e.message || JSON.stringify(e)) + "\n\n(Tire um print desse erro e envie para o suporte)");
            window.__saving = false;
            return; // Bloqueia a continuação para não dar falso positivo
        }
        salvarFamiliaLocalStorage(familia);
        salvarAssociadoLocalStorage(associado);

        // Salvar dependentes como associados
        for (const dependente of familiaData.dependentes) {
            const dependenteAssociado = {
                id: dependente.id || generateId(),
                familiaId: familiaId,
                companyId: companyId,
                tipo: 'dependente',
                nome: dependente.nome,
                cpf: dependente.cpf,
                rg: dependente.rg,
                dataNascimento: dependente.dataNascimento,
                telefone: dependente.telefone,
                email: dependente.email,
                endereco: familia.endereco, // Herda endereço da família
                parentesco: dependente.parentesco,
                seguradora: dependente.seguradora || '',
                dataCadastro: new Date().toISOString(),
                status: 'ativo'
            };
            salvarAssociadoLocalStorage(dependenteAssociado);
            // Também persiste no Supabase
            try {
                if (window.supabase) {
                    await window.supabase
                        .from('associados')
                        .insert({ ...dependenteAssociado, company_id: companyId });
                }
            } catch (e) {
                console.warn('Falha ao salvar dependente no Supabase:', e);
            }
        }

        // SUCESSO: MOSTRA SÓ O TOAST E REDIRECIONA
        clearFormProtection();
        showMessage('Família e Titular salvos com sucesso!', 'success');

        const mode = window.__saveMode || 'exit'; // Default: redirecionar (sem confirm)

        if (mode === 'stay') {
            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
                if (originalBtnText) button.innerHTML = originalBtnText;
            }
        } else {
            // Mantém botão travado e redireciona
            setTimeout(() => {
                window.location.href = 'pesquisar-familias.html';
            }, 1500);
        }

    } catch (error) {
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
            if (originalBtnText) button.innerHTML = originalBtnText;
        }
        showMessage('Erro ao salvar família: ' + error.message, 'error');
        console.error('Erro ao salvar família:', error);
        window.__saving = false;
    }
    window.__saving = false;
}

function salvarFamiliaStay(evt) {
    try { window.__saveMode = 'stay'; } catch (_) { }
    salvarFamilia(evt);
    try { window.__saveMode = null; } catch (_) { }
}

function salvarFamiliaExit(evt) {
    try { window.__saveMode = 'exit'; } catch (_) { }
    salvarFamilia(evt);
    try { window.__saveMode = null; } catch (_) { }
}

try { window.salvarFamiliaStay = salvarFamiliaStay; } catch (_) { }

function cancelarFormulario() {
    if (confirm('Tem certeza que deseja cancelar? Todos os dados não salvos serão perdidos.')) {
        window.location.href = '../index.html';
    }
}

function limparFormulario() {
    document.getElementById('novaFamiliaForm').reset();

    // Limpar dados da família
    familiaData.dependentes = [];
    familiaData.pais = [];
    familiaData.contratos = [];
    familiaData.pets = [];
    familiaData.foto = null;

    // Renderizar tabelas vazias
    renderDependentesTable();
    renderPaisTable();
    renderContratosTable();
    renderPetsTable();

    // Limpar foto
    const preview = document.getElementById('photoPreview');
    const uploadArea = document.querySelector('.photo-upload-area');
    const fileInput = document.getElementById('photoUpload');

    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (uploadArea) {
        uploadArea.style.display = 'flex';
    }
    if (fileInput) {
        fileInput.value = '';
    }

    // Esconder ações da foto
    const photoActions = document.querySelector('.photo-actions');
    if (photoActions) {
        photoActions.style.display = 'none';
    }

    // Resetar contadores
    dependentesCount = 0;
    paisCount = 0;
    contratosCount = 0;
    petsCount = 0;

    // Remover classes de validação
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('error', 'success');
        const message = group.querySelector('.error-message, .success-message');
        if (message) {
            message.remove();
        }
    });

    showMessage('Formulário limpo com sucesso!', 'success');
}

// Função para mostrar mensagens
function showMessage(message, type = 'info') {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.alert-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-message alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button type="button" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Adicionar estilos inline para a mensagem
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // Definir cor baseada no tipo
    switch (type) {
        case 'success':
            alertDiv.style.backgroundColor = '#28a745';
            break;
        case 'error':
            alertDiv.style.backgroundColor = '#dc3545';
            break;
        case 'info':
            alertDiv.style.backgroundColor = '#17a2b8';
            break;
        default:
            alertDiv.style.backgroundColor = '#6c757d';
    }

    // Estilo do botão de fechar
    const closeButton = alertDiv.querySelector('button');
    closeButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        font-size: 16px;
    `;

    document.body.appendChild(alertDiv);

    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Funções auxiliares para salvamento
function coletarDadosTitular() {
    return {
        nome: document.getElementById('nome')?.value || '',
        cpf: document.getElementById('cpf')?.value || '',
        rg: document.getElementById('rg')?.value || '',
        dataNascimento: document.getElementById('dataNascimento')?.value || '',
        telefone: document.getElementById('telefone')?.value || '',
        celular: document.getElementById('celular')?.value || '',
        genero: document.querySelector('input[name="sexo"]:checked')?.value || '',
        email: document.getElementById('email')?.value || '',
        seguradora: document.getElementById('seguradora')?.value || '',
        cep: document.getElementById('cep')?.value || '',
        rua: document.getElementById('rua')?.value || '',
        numero: document.getElementById('numero')?.value || '',
        complemento: document.getElementById('complemento')?.value || '',
        bairro: document.getElementById('bairro')?.value || '',
        cidade: document.getElementById('cidade')?.value || '',
        estado: document.getElementById('estado')?.value || ''
    };
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== Sequenciamento de IDs (7 dígitos) =====
// Inicializa contadores com base nos dados existentes do usuário
function pad7(n) {
    const num = parseInt(n, 10) || 0;
    return String(Math.min(num, 9999999)).padStart(7, '0');
}

function getSeqKey(entity) {
    switch (entity) {
        case 'familia': return 'seqFamilia';
        case 'dependente': return 'seqDependente';
        case 'contrato': return 'seqContrato';
        default: return 'seqGeneric';
    }
}

function readMaxFromArray(arr, field) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((max, item) => {
        const raw = field ? (item?.[field]) : item;
        const onlyDigits = String(raw || '').replace(/\D/g, '');
        // Considera somente valores numéricos até 7 dígitos
        if (!onlyDigits) return max;
        const n = parseInt(onlyDigits, 10);
        if (isNaN(n)) return max;
        return Math.max(max, Math.min(n, 9999999));
    }, 0);
}

function initSequentialCounters() {
    try {
        // Família: olhar IDs de famílias salvas
        const familias = JSON.parse(localStorage.getItem('familias') || '[]');
        const maxFam = readMaxFromArray(familias, 'id');
        const currentFamSeq = parseInt(localStorage.getItem('seqFamilia') || '0', 10) || 0;
        if (maxFam > currentFamSeq) localStorage.setItem('seqFamilia', String(maxFam));

        // Dependente: olhar associados tipo dependente e dependentes em família atual
        const associados = JSON.parse(localStorage.getItem('associados') || '[]');
        const depAssociados = Array.isArray(associados) ? associados.filter(a => a?.tipo === 'dependente') : [];
        const maxAssocDep = readMaxFromArray(depAssociados, 'id');
        const maxDepLocal = readMaxFromArray((typeof familiaData !== 'undefined' ? familiaData.dependentes : []), 'id');
        const maxDep = Math.max(maxAssocDep, maxDepLocal);
        const currentDepSeq = parseInt(localStorage.getItem('seqDependente') || '0', 10) || 0;
        if (maxDep > currentDepSeq) localStorage.setItem('seqDependente', String(maxDep));

        // Contrato: vasculhar número de contratos dentro das famílias
        let maxContrato = 0;
        if (Array.isArray(familias)) {
            familias.forEach(f => {
                maxContrato = Math.max(maxContrato, readMaxFromArray(f?.contratos || [], 'numero'));
            });
        }
        // Também considerar contratos já adicionados no estado atual
        maxContrato = Math.max(maxContrato, readMaxFromArray((typeof familiaData !== 'undefined' ? familiaData.contratos : []), 'numero'));
        const currentContrSeq = parseInt(localStorage.getItem('seqContrato') || '0', 10) || 0;
        if (maxContrato > currentContrSeq) localStorage.setItem('seqContrato', String(maxContrato));
    } catch (e) {
        // Em caso de erro, mantém contadores como estão
        console.warn('Falha ao inicializar contadores sequenciais:', e);
    }
}

function nextSequential(entity) {
    const key = getSeqKey(entity);
    const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const next = Math.min(current + 1, 9999999);
    localStorage.setItem(key, String(next));
    return pad7(next);
}

function generateSequentialId(entity) {
    return nextSequential(entity);
}

// Apenas consulta o próximo valor sem avançar o contador
function peekSequential(entity) {
    const key = getSeqKey(entity);
    const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const next = Math.min(current + 1, 9999999);
    return pad7(next);
}

function salvarFamiliaLocalStorage(familia) {
    let familias = JSON.parse(localStorage.getItem('familias') || '[]');
    const cpf = String(familia?.titular?.cpf || '').replace(/\D+/g, '');
    const companyId = familia?.companyId;
    let idx = familias.findIndex(f => String(f.id) === String(familia.id));
    if (idx === -1 && cpf && companyId) {
        idx = familias.findIndex(f => String(f.companyId) === String(companyId) && String((f.titular?.cpf || '').replace(/\D+/g, '')) === cpf);
    }
    if (idx >= 0) {
        familias[idx] = familia;
    } else {
        familias.push(familia);
    }
    localStorage.setItem('familias', JSON.stringify(familias));
}

function salvarAssociadoLocalStorage(associado) {
    let associados = JSON.parse(localStorage.getItem('associados') || '[]');
    const idx = associados.findIndex(a => String(a.id) === String(associado.id));
    if (idx >= 0) {
        associados[idx] = associado;
    } else {
        associados.push(associado);
    }
    localStorage.setItem('associados', JSON.stringify(associados));
}

// Função de validação em tempo real
function setupFormValidation() {
    camposObrigatorios.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            // Validação em tempo real
            campo.addEventListener('blur', function () {
                validarCampo(this);
            });

            campo.addEventListener('input', function () {
                // Remove erro quando usuário começa a digitar
                const formGroup = this.closest('.form-group');
                if (formGroup && formGroup.classList.contains('error')) {
                    formGroup.classList.remove('error');
                    const errorMessage = formGroup.querySelector('.error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                }
            });
        }
    });
}

function validarCampo(campo) {
    const formGroup = campo.closest('.form-group');
    const valor = campo.value.trim();

    // Remove mensagens anteriores
    const existingMessage = formGroup.querySelector('.error-message, .success-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Remove classes anteriores
    formGroup.classList.remove('error', 'success');

    if (!valor) {
        // Campo obrigatório vazio
        formGroup.classList.add('error');
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Este campo é obrigatório';
        errorMessage.style.cssText = `
            color: #dc3545;
            font-size: 12px;
            margin-top: 5px;
            display: block;
        `;
        formGroup.appendChild(errorMessage);
        return false;
    } else {
        // Campo preenchido corretamente
        formGroup.classList.add('success');
        return true;
    }
}

function validateForm() {
    let isValid = true;

    camposObrigatorios.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            const campoValido = validarCampo(campo);
            if (!campoValido) {
                isValid = false;
            }
        }
    });

    // Scroll para o primeiro erro
    if (!isValid) {
        const firstError = document.querySelector('.form-group.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return isValid;
}

// Expor funções críticas globalmente para uso em handlers inline
// Garante que onclick="buscarCEP()" e onclick="salvarFamilia()" funcionem mesmo com escopo estrito
try {
    window.buscarCEP = buscarCEP;
    window.salvarFamilia = salvarFamilia;
} catch (e) {
    // Ambiente sem window (tests) ignora
}

// Contadores centralizados via SequenceManager no Firestore
try {
    console.info('SequenceManager ativo: contadores globais por empresa');
} catch (e) {
    // ignore
}
