// Área do Associado - JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da página
    const loadingOverlay = document.getElementById('loadingOverlay');
    const errorState = document.getElementById('errorState');
    const refreshBtn = document.getElementById('refreshData');
    const printBtn = document.getElementById('printArea');
    const copyPixBtn = document.getElementById('copyPixCode');
    const supportLink = document.getElementById('supportLink');

    // Verificar se os elementos existem antes de usar
    if (!loadingOverlay) {
        console.error('Elemento loadingOverlay não encontrado');
        return;
    }

    // Simular carregamento inicial
    setTimeout(() => {
        loadUserData();
    }, 1500);

    // Função para carregar dados do usuário
    function loadUserData() {
        try {
            console.log('Iniciando carregamento de dados do usuário...');
            
            // Tentar obter dados do localStorage primeiro
            let userData = getUserDataFromStorage();
            
            // Se não houver dados no localStorage, usar dados padrão
            if (!userData) {
                console.log('Usando dados padrão do usuário');
                userData = getDefaultUserData();
                // Salvar dados padrão no localStorage para próximas visitas
                saveUserDataToStorage(userData);
            }

            // Verificar se userData é válido
            if (!userData || typeof userData !== 'object') {
                throw new Error('Dados do usuário inválidos');
            }

            

            // Preencher dados na página com verificação de existência
            const userCpf = document.getElementById('userCpf');
            const userEmail = document.getElementById('userEmail');
            const userPhone = document.getElementById('userPhone');
            const memberSince = document.getElementById('memberSince');
            const mensalidadeValor = document.getElementById('mensalidadeValor');
            const proximoVencimento = document.getElementById('proximoVencimento');
            const pixCode = document.getElementById('pixCode');
            const statusElement = document.getElementById('statusPagamento');
            const lastUpdate = document.getElementById('lastUpdate');

            if (userCpf) userCpf.textContent = `CPF: ${userData.cpf || 'Não informado'}`;
            if (userEmail) userEmail.textContent = userData.email || 'Não informado';
            if (userPhone) userPhone.textContent = userData.phone || 'Não informado';
            if (memberSince) memberSince.textContent = `Associado desde: ${userData.memberSince || 'Não informado'}`;
            if (mensalidadeValor) mensalidadeValor.textContent = userData.mensalidadeValor || 'R$ 0,00';
            if (proximoVencimento) proximoVencimento.textContent = userData.proximoVencimento || 'Não definido';
            if (pixCode) pixCode.value = userData.pixCode || '';
            
            // Definir status do pagamento
            if (statusElement) {
                const status = userData.statusPagamento || 'Indefinido';
                statusElement.textContent = status;
                statusElement.className = 'status-badge';
                
                if (status === 'Em dia') {
                    statusElement.classList.add('pago');
                } else if (status === 'Vencido') {
                    statusElement.classList.add('vencido');
                }
            }

            // Atualizar timestamp
            if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString('pt-BR');

            // Gerar QR Code (simulado)
            generateQRCode(userData.pixCode || '');

            // Esconder loading e mostrar conteúdo
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            
            // Mostrar conteúdo principal
            const mainContent = document.querySelector('main.dashboard-container');
            const header = document.querySelector('header.associado-header');
            if (mainContent) mainContent.style.display = 'block';
            if (header) header.style.display = 'block';
            
            // Esconder estado de erro se estiver visível
            if (errorState) errorState.classList.add('d-none');
            
            console.log('Dados do usuário carregados e exibidos com sucesso');
            
        } catch (error) {
            console.error('Erro detalhado ao carregar dados:', error);
            console.error('Stack trace:', error.stack);
            showError();
        }
    }

    // Função para obter dados padrão do usuário
    function getDefaultUserData() {
        return {
            cpf: '123.456.789-00',
            email: 'associado@exemplo.com',
            phone: '(11) 99999-9999',
            memberSince: '15/03/2020',
            mensalidadeValor: 'R$ 89,90',
            proximoVencimento: '15/12/2024',
            statusPagamento: 'Em dia',
            pixCode: '00020126580014BR.GOV.BCB.PIX013636c4c14c-4b34-4c6e-a4e5-123456789abc5204000053039865802BR5925QUALIFY SISTEMA DE GESTAO6009SAO PAULO62070503***6304ABCD'
        };
    }

    // Função para obter dados do localStorage
    function getUserDataFromStorage() {
        try {
            const stored = localStorage.getItem('areaAssociadoData');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Erro ao ler dados do localStorage:', error);
            return null;
        }
    }

    // Função para salvar dados no localStorage
    function saveUserDataToStorage(userData) {
        try {
            localStorage.setItem('areaAssociadoData', JSON.stringify(userData));
            console.log('Dados do usuário salvos no localStorage');
        } catch (error) {
            console.warn('Erro ao salvar dados no localStorage:', error);
        }
    }

    // Função para mostrar erro
    function showError() {
        // Esconder loading
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Esconder conteúdo principal
        const mainContent = document.querySelector('main.dashboard-container');
        const header = document.querySelector('header.associado-header');
        if (mainContent) mainContent.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Mostrar estado de erro
        if (errorState) errorState.classList.remove('d-none');
    }

    // Função para gerar QR Code (simulada)
    function generateQRCode(pixCode) {
        const qrContainer = document.getElementById('qrCodeContainer');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="width: 150px; height: 150px; background: #f0f0f0; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                    <i class="fas fa-qrcode" style="font-size: 3rem; color: #333;"></i>
                </div>
                <p class="mt-2 text-muted small">QR Code para pagamento PIX</p>
            `;
        }
    }

    // Event listeners
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Botão de atualizar clicado');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            if (errorState) errorState.classList.add('d-none');
            
            // Recarregar dados após um pequeno delay
            setTimeout(() => {
                loadUserData();
            }, 500);
        });
    }

    // Event listener para o botão "Tentar novamente" na tela de erro
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', function() {
            console.log('Botão "Tentar novamente" clicado');
            
            // Esconder estado de erro
            if (errorState) errorState.classList.add('d-none');
            
            // Mostrar loading
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
            
            // Recarregar dados após um pequeno delay
            setTimeout(() => {
                loadUserData();
            }, 500);
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }

    if (copyPixBtn) {
        copyPixBtn.addEventListener('click', function() {
            const pixCodeInput = document.getElementById('pixCode');
            if (pixCodeInput) {
                pixCodeInput.select();
                document.execCommand('copy');
                
                // Feedback visual
                const originalText = copyPixBtn.innerHTML;
                copyPixBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                copyPixBtn.classList.add('btn-success');
                copyPixBtn.classList.remove('btn-outline-primary');
                
                setTimeout(() => {
                    copyPixBtn.innerHTML = originalText;
                    copyPixBtn.classList.remove('btn-success');
                    copyPixBtn.classList.add('btn-outline-primary');
                }, 2000);
            }
        });
    }

    if (supportLink) {
        supportLink.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Em breve você será redirecionado para o nosso canal de suporte!');
        });
    }

    // Adicionar funcionalidade aos botões de histórico
    const viewHistoryBtn = document.getElementById('viewHistory');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', function() {
            window.location.href = 'contratos-mensalidades.html';
        });
    }

    // Animações de hover nos cards
    const quickLinks = document.querySelectorAll('.quick-link-btn');
    if (quickLinks.length > 0) {
        quickLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });
    }
});