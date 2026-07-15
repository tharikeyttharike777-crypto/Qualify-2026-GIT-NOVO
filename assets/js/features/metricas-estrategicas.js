// Dados serão carregados dinamicamente do Firestore
// Adiciona fallback seguro para evitar gráficos vazios quebrarem
const metricsData = {};

function getDefaultMetrics() {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return {
        months,
        cac: new Array(months.length).fill(0),
        contracts: new Array(months.length).fill(0),
        costs: new Array(months.length).fill(0),
        ltv: 0,
        ctl: 0,
        ticketMedio: 0
    };
}

function getSafeMetrics(year) {
    const y = year || currentYear;
    if (!metricsData[y]) {
        metricsData[y] = getDefaultMetrics();
    }
    return metricsData[y];
}

let cacChart, contractsChart, costsChart;
let currentYear = 2025;
let currentMonths = 12;

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    updateMetrics();
    createCharts();
});

function initializePage() {
    // Configurar data atual
    const today = new Date();
    const dateInput = document.getElementById('dataFinal');
    dateInput.value = today.toISOString().split('T')[0];
    
    // Configurar número de meses
    const monthsSelect = document.getElementById('numeroMeses');
    monthsSelect.value = currentMonths;
}

function applyFilters() {
    const dateInput = document.getElementById('dataFinal');
    const monthsSelect = document.getElementById('numeroMeses');
    
    const selectedDate = new Date(dateInput.value);
    currentYear = selectedDate.getFullYear();
    currentMonths = parseInt(monthsSelect.value);
    
    updateMetrics();
    updateCharts();
}

function updateMetrics() {
    const data = getSafeMetrics();
    
    // Calcular métricas baseadas nos dados
    const totalContracts = (data.contracts || []).reduce((sum, val) => sum + val, 0);
    const totalCosts = (data.costs || []).reduce((sum, val) => sum + val, 0);
    const cacCount = (data.cac || []).length || 1;
    const avgCAC = (data.cac || []).reduce((sum, val) => sum + val, 0) / cacCount;
    const relationCACLTV = data.ltv > 0 ? (avgCAC / data.ltv * 100) : 0;
    
    // Atualizar cards
    document.querySelector('.cac-value').textContent = formatCurrency(avgCAC);
    document.querySelector('.ltv-value').textContent = formatCurrency(data.ltv || 0);
    document.querySelector('.ctl-value').textContent = (data.ctl || 0).toFixed(2);
    document.querySelector('.relation-value').textContent = relationCACLTV.toFixed(1);
    document.querySelector('.ticket-value').textContent = formatCurrency(data.ticketMedio || 0);
    
    // Atualizar legendas dos gráficos
    updateChartLegends(totalContracts, totalCosts, avgCAC);
}

function updateChartLegends(totalContracts, totalCosts, avgCAC) {
    // Atualizar legenda do CAC
    const cacLegend = document.querySelector('.chart-item:nth-child(1) .legend-item');
    cacLegend.innerHTML = `
        <span class="legend-color cac-color"></span>
        CAC por Mês (Global: ${avgCAC.toFixed(2)})
    `;
    
    // Atualizar legenda dos contratos
    const contractsLegend = document.querySelector('.chart-item:nth-child(2) .legend-item');
    contractsLegend.innerHTML = `
        <span class="legend-color contracts-color"></span>
        Emitidos (${totalContracts})
    `;
    
    // Atualizar legenda dos custos
    const costsLegend = document.querySelector('.chart-item.full-width .legend-item');
    costsLegend.innerHTML = `
        <span class="legend-color costs-color"></span>
        Custos com CAC (Total: ${totalCosts.toFixed(2)})
    `;
}

function createCharts() {
    createCACChart();
    createContractsChart();
    createCostsChart();
}

function createCACChart() {
    const ctx = document.getElementById('cacChart').getContext('2d');
    const data = getSafeMetrics();
    
    cacChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months.slice(0, Math.min(currentMonths, data.months.length)),
            datasets: [{
                label: 'CAC por Mês',
                data: data.cac.slice(0, Math.min(currentMonths, data.cac.length)),
                borderColor: '#4ECDC4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4ECDC4',
                pointBorderColor: '#4ECDC4',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                }
            }
        }
    });
}

function createContractsChart() {
    const ctx = document.getElementById('contractsChart').getContext('2d');
    const data = getSafeMetrics();
    
    contractsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months.slice(0, Math.min(currentMonths, data.months.length)),
            datasets: [{
                label: 'Contratos Emitidos',
                data: data.contracts.slice(0, Math.min(currentMonths, data.contracts.length)),
                borderColor: '#5DADE2',
                backgroundColor: 'rgba(93, 173, 226, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#5DADE2',
                pointBorderColor: '#5DADE2',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                }
            }
        }
    });
}

function createCostsChart() {
    const ctx = document.getElementById('costsChart').getContext('2d');
    const data = getSafeMetrics();
    
    costsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.months.slice(0, Math.min(currentMonths, data.months.length)),
            datasets: [{
                label: 'Custos com CAC',
                data: data.costs.slice(0, Math.min(currentMonths, data.costs.length)),
                borderColor: '#F1948A',
                backgroundColor: 'rgba(241, 148, 138, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#F1948A',
                pointBorderColor: '#F1948A',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#666'
                    }
                }
            }
        }
    });
}

function updateCharts() {
    const data = getSafeMetrics();
    const monthsToShow = Math.min(currentMonths, data.months.length);
    
    // Atualizar gráfico CAC
    if (cacChart) {
        cacChart.data.labels = data.months.slice(0, monthsToShow);
        cacChart.data.datasets[0].data = data.cac.slice(0, monthsToShow);
        cacChart.update();
    }
    
    // Atualizar gráfico de contratos
    if (contractsChart) {
        contractsChart.data.labels = data.months.slice(0, monthsToShow);
        contractsChart.data.datasets[0].data = data.contracts.slice(0, monthsToShow);
        contractsChart.update();
    }
    
    // Atualizar gráfico de custos
    if (costsChart) {
        costsChart.data.labels = data.months.slice(0, monthsToShow);
        costsChart.data.datasets[0].data = data.costs.slice(0, monthsToShow);
        costsChart.update();
    }
}

function showHelp() {
    alert('Métricas Estratégicas\n\n' +
          'CAC (Customer Acquisition Cost): Custo para adquirir um novo cliente\n' +
          'LTV (Lifetime Value): Valor total que um cliente gera durante seu relacionamento\n' +
          'CTL (Customer Time to Live): Tempo médio de vida do cliente em meses\n' +
          'Relação CAC/LTV: Proporção entre custo de aquisição e valor do cliente\n' +
          'Ticket Médio: Valor médio por transação\n\n' +
          'Use os filtros para ajustar o período de análise.');
}

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função para exportar dados (placeholder)
function exportData() {
    console.log('Exportando dados das métricas estratégicas...');
    // Implementar lógica de exportação
}

// Função para imprimir relatório (placeholder)
function printReport() {
    window.print();
}