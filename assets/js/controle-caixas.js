// Controle de Caixas - JavaScript

// Array para armazenar movimentações (será carregado do banco de dados)
let movimentacoes = [];
let movimentacoesFiltradas = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarMovimentacoes();
    atualizarResumo();
    definirDataAtual();
});

// Definir data atual nos campos de filtro
function definirDataAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data-inicio').value = hoje;
    document.getElementById('data-fim').value = hoje;
}

// Aplicar filtros
function aplicarFiltros() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    const tipoMovimento = document.getElementById('tipo-movimento').value;

    movimentacoesFiltradas = movimentacoes.filter(mov => {
        let passaFiltro = true;

        // Filtro por data (simulado)
        if (dataInicio && dataFim) {
            // Em uma implementação real, compararia as datas
            passaFiltro = passaFiltro && true;
        }

        // Filtro por tipo
        if (tipoMovimento) {
            passaFiltro = passaFiltro && mov.tipo === tipoMovimento;
        }

        return passaFiltro;
    });

    carregarMovimentacoes();
    atualizarResumo();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('data-inicio').value = '';
    document.getElementById('data-fim').value = '';
    document.getElementById('tipo-movimento').value = '';
    
    movimentacoesFiltradas = [...movimentacoes];
    carregarMovimentacoes();
    atualizarResumo();
    definirDataAtual();
}

// Carregar movimentações na tabela
function carregarMovimentacoes() {
    const tbody = document.getElementById('movimentacoes-tbody');
    
    if (movimentacoesFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Nenhuma movimentação encontrada</td></tr>';
        return;
    }

    tbody.innerHTML = movimentacoesFiltradas.map(mov => `
        <tr>
            <td>${formatarDataHora(mov.dataHora)}</td>
            <td><span class="tipo-${mov.tipo}">${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
            <td>${mov.descricao}</td>
            <td class="${mov.valor > 0 ? 'positive' : 'negative'}">${formatarMoeda(mov.valor)}</td>
            <td class="positive">${formatarMoeda(mov.saldo)}</td>
            <td>${mov.usuario}</td>
        </tr>
    `).join('');
}

// Atualizar resumo
function atualizarResumo() {
    const saldoAtual = movimentacoesFiltradas.length > 0 ? 
        movimentacoesFiltradas[movimentacoesFiltradas.length - 1].saldo : 0;
    
    const entradasDia = movimentacoesFiltradas
        .filter(mov => mov.tipo === 'entrada')
        .reduce((total, mov) => total + mov.valor, 0);
    
    const saidasDia = Math.abs(movimentacoesFiltradas
        .filter(mov => mov.tipo === 'saida')
        .reduce((total, mov) => total + mov.valor, 0));

    document.getElementById('saldo-atual').textContent = formatarMoeda(saldoAtual);
    document.getElementById('entradas-dia').textContent = formatarMoeda(entradasDia);
    document.getElementById('saidas-dia').textContent = formatarMoeda(saidasDia);
}

// Formatação
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Math.abs(valor));
}

function formatarDataHora(dataHora) {
    return new Date(dataHora).toLocaleString('pt-BR');
}

// Adicionar estilos CSS dinâmicos
const style = document.createElement('style');
style.textContent = `
    .tipo-entrada {
        background: #d4edda;
        color: #155724;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .tipo-saida {
        background: #f8d7da;
        color: #721c24;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
`;
document.head.appendChild(style);