// Contas a Receber - JavaScript

// Dados serão carregados dinamicamente do Firestore
let contasReceber = [];

let contasFiltradas = [...contasReceber];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda o UserDataManager estar disponível
    setTimeout(() => {
        carregarContas();
    }, 1000);
    atualizarResumo();
});

// Aplicar filtros
function aplicarFiltros() {
    const cliente = document.getElementById('cliente').value.toLowerCase();
    const status = document.getElementById('status').value;
    const dataInicio = document.getElementById('vencimento-inicio').value;
    const dataFim = document.getElementById('vencimento-fim').value;

    contasFiltradas = contasReceber.filter(conta => {
        let passaFiltro = true;

        // Filtro por cliente
        if (cliente) {
            passaFiltro = passaFiltro && conta.cliente.toLowerCase().includes(cliente);
        }

        // Filtro por status
        if (status) {
            passaFiltro = passaFiltro && conta.status === status;
        }

        // Filtros de data (simulado)
        if (dataInicio && dataFim) {
            // Em uma implementação real, compararia as datas
            passaFiltro = passaFiltro && true;
        }

        return passaFiltro;
    });

    renderizarTabela();
    atualizarResumo();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('cliente').value = '';
    document.getElementById('status').value = '';
    document.getElementById('vencimento-inicio').value = '';
    document.getElementById('vencimento-fim').value = '';
    
    contasFiltradas = [...contasReceber];
    renderizarTabela();
    atualizarResumo();
}

// Carregar contas do Firestore
async function carregarContas() {
    if (!window.userDataManager || !window.userDataManager.isAuthenticated()) {
        console.log('Usuário não autenticado, não é possível carregar dados');
        mostrarEstadoVazio('Faça login para visualizar os dados');
        atualizarResumo(true); // Reset cards
        return;
    }

    try {
        // Mostra loading
        mostrarEstadoCarregando();
        
        // Busca dados do usuário logado
        const userData = await window.userDataManager.getUserData('contas-receber', {
            orderBy: { field: 'dataVencimento', direction: 'asc' }
        });
        
        contasReceber.length = 0; // Limpa array
        contasReceber.push(...(userData || []));
        contasFiltradas = [...contasReceber];
        
        if (contasReceber.length === 0) {
            mostrarEstadoVazio('Nenhuma conta a receber encontrada');
            atualizarResumo(true); // Reset cards
        } else {
            esconderEstadoCarregando();
            renderizarTabela();
            atualizarResumo();
        }
    } catch (error) {
        console.error('Erro ao carregar dados de contas a receber:', error);
        // Em caso de erro, apresentar estado vazio amigável
        mostrarEstadoVazio('Nenhuma conta a receber encontrada');
        atualizarResumo(true); // Reset cards
    }
}

// Renderizar tabela
function renderizarTabela() {
    const tbody = document.getElementById('contas-tbody');
    
    if (contasFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">Nenhuma conta encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = contasFiltradas.map(conta => `
        <tr>
            <td>${conta.cliente}</td>
            <td>${conta.documento}</td>
            <td>${formatarData(conta.dataVencimento)}</td>
            <td class="positive">${formatarMoeda(conta.valor)}</td>
            <td><span class="status-${conta.status}">${formatarStatus(conta.status)}</span></td>
            <td class="${conta.diasAtraso > 0 ? 'negative' : ''}">${conta.diasAtraso > 0 ? conta.diasAtraso + ' dias' : '-'}</td>
            <td class="actions">
                <button class="btn-success" onclick="marcarPago(${conta.id})" ${conta.status === 'paga' ? 'disabled' : ''}>Pagar</button>
                <button class="btn-primary" onclick="editarConta(${conta.id})">Editar</button>
            </td>
        </tr>
    `).join('');
}

// Mostra estado de loading
function mostrarEstadoCarregando() {
    const tbody = document.getElementById('contas-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
    }
}

// Esconde estado de loading
function esconderEstadoCarregando() {
    // A função renderizarTabela() já vai substituir o conteúdo
}

// Mostra estado vazio
function mostrarEstadoVazio(message) {
    const tbody = document.getElementById('contas-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">${message}</td></tr>`;
    }
}

// Atualizar resumo
function atualizarResumo(reset = false) {
    const totalReceberEl = document.getElementById('total-receber');
    const totalVencidasEl = document.getElementById('total-vencidas');
    const totalHojeEl = document.getElementById('total-hoje');
    const totalRecebidasEl = document.getElementById('total-recebidas');

    if (!totalReceberEl || !totalVencidasEl || !totalHojeEl || !totalRecebidasEl) {
        // Se os elementos não existirem, evita erro de JS
        return;
    }

    if (reset) {
        totalReceberEl.textContent = 'R$ 0,00';
        totalVencidasEl.textContent = 'R$ 0,00';
        totalHojeEl.textContent = 'R$ 0,00';
        totalRecebidasEl.textContent = 'R$ 0,00';
        return;
    }

    const hojeStr = new Date().toLocaleDateString('pt-BR');

    const totalReceber = contasFiltradas
        .filter(conta => conta.status !== 'paga')
        .reduce((total, conta) => total + (conta.valor || 0), 0);

    const totalVencidas = contasFiltradas
        .filter(conta => conta.status === 'vencida')
        .reduce((total, conta) => total + (conta.valor || 0), 0);

    const totalHoje = contasFiltradas
        .filter(conta => {
            const data = formatarData(conta.dataVencimento);
            return data === hojeStr;
        })
        .reduce((total, conta) => total + (conta.valor || 0), 0);

    const totalRecebidas = contasFiltradas
        .filter(conta => conta.status === 'paga')
        .reduce((total, conta) => total + (conta.valor || 0), 0);

    totalReceberEl.textContent = formatarMoeda(totalReceber);
    totalVencidasEl.textContent = formatarMoeda(totalVencidas);
    totalHojeEl.textContent = formatarMoeda(totalHoje);
    totalRecebidasEl.textContent = formatarMoeda(totalRecebidas);
}

// Marcar como pago
function marcarPago(id) {
    const conta = contasReceber.find(c => c.id === id);
    if (conta) {
        conta.status = 'paga';
        conta.diasAtraso = 0;
        
        // Atualizar filtradas também
        const contaFiltrada = contasFiltradas.find(c => c.id === id);
        if (contaFiltrada) {
            contaFiltrada.status = 'paga';
            contaFiltrada.diasAtraso = 0;
        }
        
        renderizarTabela();
        atualizarResumo();
        
        alert('Conta marcada como paga com sucesso!');
    }
}

// Editar conta (simulado)
function editarConta(id) {
    const conta = contasReceber.find(c => c.id === id);
    if (conta) {
        alert(`Editando conta de ${conta.cliente} - ${conta.documento}`);
        // Aqui seria aberto um modal ou redirecionado para página de edição
    }
}

// Formatação
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
    const statusMap = {
        'pendente': 'Pendente',
        'vencida': 'Vencida',
        'a-vencer': 'A Vencer',
        'paga': 'Paga'
    };
    return statusMap[status] || status;
}

// Adicionar estilos CSS dinâmicos
const style = document.createElement('style');
style.textContent = `
    .status-pendente {
        background: #fff3cd;
        color: #856404;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-vencida {
        background: #f8d7da;
        color: #721c24;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-a-vencer {
        background: #d1ecf1;
        color: #0c5460;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-paga {
        background: #d4edda;
        color: #155724;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
`;
document.head.appendChild(style);