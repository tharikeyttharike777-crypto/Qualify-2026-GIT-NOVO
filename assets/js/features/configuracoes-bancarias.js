/**
 * Configurações Bancárias - JavaScript
 * Gerencia configuração de integrações bancárias por empresa
 * Integração: Asaas (chave via variável de ambiente)
 */

// Configuração da API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4570/api'
    : 'https://qualify-2026.onrender.com/api'; // Render em produção

let empresaAtiva = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    console.log('🏦 Inicializando página de configurações bancárias (Asaas)...');

    // Aguarda Supabase estar pronto
    if (window.supabase) {
        inicializar();
    } else {
        // Fallback caso script do supabase ainda esteja carregando
        setTimeout(inicializar, 500);
    }
});

async function inicializar() {
    // Verifica autenticação
    if (!window.supabase) return;
    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session && session.user) {
        await carregarEmpresaAtiva();
    } else {
        window.location.href = '../login.html';
    }
    
    window.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = '../login.html';
        }
    });
}

async function carregarEmpresaAtiva() {
    try {
        const empresaId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
        const empresaNome = localStorage.getItem('empresaSelecionadaNome');

        if (!empresaId) {
            showToast('Selecione uma empresa primeiro', 'warning');
            setTimeout(() => {
                window.location.href = 'trocar-empresa.html';
            }, 2000);
            return;
        }

        empresaAtiva = {
            id: empresaId,
            nome: empresaNome || 'Empresa'
        };

        // Atualiza UI
        document.getElementById('empresaAtivaNome').textContent = empresaAtiva.nome;

        console.log('✅ Empresa ativa:', empresaAtiva);

    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        showToast('Erro ao carregar empresa', 'error');
    }
}

async function testarConexao() {
    if (!empresaAtiva) {
        showToast('Nenhuma empresa selecionada', 'error');
        return;
    }

    showLoading('Testando conexão com Asaas...');

    try {
        const response = await fetch(`${API_BASE_URL}/config/${empresaAtiva.id}/bancaria/testar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast(`✅ Conexão estabelecida com sucesso! (${result.ambiente || 'Produção'})`, 'success');

            // Atualiza status visual
            const statusCard = document.getElementById('statusIntegracao');
            statusCard.className = 'status-card status-ativo';
            statusCard.querySelector('.status-icon i').className = 'fas fa-check-circle';
            statusCard.querySelector('h3').textContent = 'Asaas Conectado';
            statusCard.querySelector('p').textContent = `Conexão testada com sucesso. Ambiente: ${result.ambiente || 'Produção'}`;
        } else {
            showToast(result.error || 'Falha no teste de conexão', 'error');

            // Atualiza status visual para erro
            const statusCard = document.getElementById('statusIntegracao');
            statusCard.className = 'status-card status-nao-configurado';
            statusCard.querySelector('.status-icon i').className = 'fas fa-exclamation-circle';
            statusCard.querySelector('h3').textContent = 'Erro na Conexão';
            statusCard.querySelector('p').textContent = result.error || 'Verifique a variável ASAAS_API_KEY no servidor.';
        }

    } catch (error) {
        console.error('Erro no teste:', error);
        showToast('Erro de conexão com o servidor', 'error');
    } finally {
        hideLoading();
    }
}

// ========== UTILITÁRIOS ==========

function showLoading(message = 'Processando...') {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove após 4 segundos
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
