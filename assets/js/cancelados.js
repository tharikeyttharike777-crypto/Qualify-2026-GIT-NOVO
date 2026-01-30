// Contratos Cancelados - JavaScript

// Array para armazenar contratos cancelados (será carregado do banco de dados)
let contratosCancelados = [];
let contratosFiltrados = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarContratos();
    atualizarResumo();
});

// Aplicar filtros
function aplicarFiltros() {
    const cliente = document.getElementById('cliente').value.toLowerCase();
    const motivo = document.getElementById('motivo').value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;

    contratosFiltrados = contratosCancelados.filter(contrato => {
        let passaFiltro = true;

        // Filtro por cliente
        if (cliente) {
            passaFiltro = passaFiltro && contrato.cliente.toLowerCase().includes(cliente);
        }

        // Filtro por motivo
        if (motivo) {
            passaFiltro = passaFiltro && contrato.motivoCancelamento === motivo;
        }

        // Filtros de data (simulado)
        if (dataInicio && dataFim) {
            // Em uma implementação real, compararia as datas
            passaFiltro = passaFiltro && true;
        }

        return passaFiltro;
    });

    carregarContratos();
    atualizarResumo();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('cliente').value = '';
    document.getElementById('motivo').value = '';
    document.getElementById('data-inicio').value = '';
    document.getElementById('data-fim').value = '';
    
    contratosFiltrados = [...contratosCancelados];
    carregarContratos();
    atualizarResumo();
}

// Carregar contratos na tabela
function carregarContratos() {
    const tbody = document.getElementById('cancelados-tbody');
    
    if (contratosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">Nenhum contrato cancelado encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = contratosFiltrados.map(contrato => `
        <tr>
            <td>${contrato.cliente}</td>
            <td>${contrato.contrato}</td>
            <td>${formatarData(contrato.dataCancelamento)}</td>
            <td><span class="motivo-badge motivo-${contrato.motivoCancelamento}">${formatarMotivo(contrato.motivoCancelamento)}</span></td>
            <td class="positive">${formatarMoeda(contrato.valorMensal)}</td>
            <td>${contrato.tempoContrato}</td>
            <td class="actions">
                <button class="btn-primary" onclick="verDetalhes(${contrato.id})">Detalhes</button>
                <button class="btn-success" onclick="reativarContrato(${contrato.id})">Reativar</button>
            </td>
        </tr>
    `).join('');
}

// Atualizar resumo
function atualizarResumo() {
    const totalCancelados = contratosFiltrados.length;
    
    const receitaPerdida = contratosFiltrados
        .reduce((total, contrato) => total + contrato.valorMensal, 0);
    
    const cancelamentosRecentes = contratosFiltrados
        .filter(contrato => {
            const dataCancelamento = new Date(contrato.dataCancelamento);
            const hoje = new Date();
            const diffTime = Math.abs(hoje - dataCancelamento);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
        }).length;

    document.getElementById('total-cancelados').textContent = totalCancelados;
    document.getElementById('valor-perdido').textContent = formatarMoeda(receitaPerdida);
    document.getElementById('cancelados-mes').textContent = cancelamentosRecentes;
}

// Ver detalhes do contrato
function verDetalhes(id) {
    const contrato = contratosCancelados.find(c => c.id === id);
    if (contrato) {
        alert(`Detalhes do Contrato:\n\nCliente: ${contrato.cliente}\nContrato: ${contrato.contrato}\nData Cancelamento: ${formatarData(contrato.dataCancelamento)}\nMotivo: ${formatarMotivo(contrato.motivoCancelamento)}\nValor Mensal: ${formatarMoeda(contrato.valorMensal)}\nTempo de Contrato: ${contrato.tempoContrato}\nResponsável: ${contrato.responsavel}`);
    }
}

// Reativar contrato (simulado)
function reativarContrato(id) {
    const contrato = contratosCancelados.find(c => c.id === id);
    if (contrato) {
        const confirmar = confirm(`Deseja reativar o contrato de ${contrato.cliente}?\n\nEsta ação irá:\n- Remover o contrato da lista de cancelados\n- Criar um novo contrato ativo\n- Enviar notificação ao cliente`);
        
        if (confirmar) {
            // Remover da lista de cancelados
            const index = contratosCancelados.findIndex(c => c.id === id);
            if (index > -1) {
                contratosCancelados.splice(index, 1);
            }
            
            // Atualizar lista filtrada
            const indexFiltrado = contratosFiltrados.findIndex(c => c.id === id);
            if (indexFiltrado > -1) {
                contratosFiltrados.splice(indexFiltrado, 1);
            }
            
            carregarContratos();
            atualizarResumo();
            
            alert('Contrato reativado com sucesso!');
        }
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

function formatarMotivo(motivo) {
    const motivoMap = {
        'inadimplencia': 'Inadimplência',
        'solicitacao-cliente': 'Solicitação do Cliente',
        'mudanca-plano': 'Mudança de Plano',
        'outros': 'Outros'
    };
    return motivoMap[motivo] || motivo;
}

// Exportar relatório (simulado)
function exportarRelatorio() {
    const contratos = document.querySelectorAll('.contrato-item');
    const totalContratos = contratos.length;
    
    // Simula a geração do relatório
    setTimeout(() => {
        alert(`Relatório gerado com sucesso!\n\nResumo:\n- ${totalContratos} contratos cancelados\n- Análise por motivo de cancelamento\n- Impacto financeiro calculado\n- Gráficos e estatísticas incluídos`);
    }, 1000);
    
    // Mostra feedback imediato
    alert('Gerando relatório de contratos cancelados...');
}