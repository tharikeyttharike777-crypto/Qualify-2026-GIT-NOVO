// DRE Gerencial JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDREChart();
    initializeYearSelector();
    initializeExpandableRows();
    initializeFilters();
    initializeExportFunctions();
});

// Estado da aplicação
const dreState = {
    currentYear: '2025',
    expandedRows: new Set(),
    filters: {
        showOnlyPositive: false,
        showOnlyNegative: false,
        minValue: null,
        maxValue: null
    }
};

// Dados do DRE por ano com subcategorias
const dreData = {
    2025: {
        receitas: {
            total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            subcategorias: {
                'Mensalidades': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Taxas de Adesão': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Serviços Extras': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Outras Receitas': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
        },
        custos: {
            total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            subcategorias: {
                'Custos Operacionais': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Taxas Bancárias': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                'Outros Custos': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }
        },
        resultadoLiquido: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    2024: {
        receitas: {
            total: [24598.60, 25404.35, 25037.23, 24835.50, 24539.97, 24231.51, 29152.23, 24576.58, 25123.45, 26789.12, 27456.78, 28234.56],
            subcategorias: {
                'Mensalidades': [20000.00, 20500.00, 20200.00, 20100.00, 19800.00, 19500.00, 23000.00, 19900.00, 20200.00, 21500.00, 22000.00, 22500.00],
                'Taxas de Adesão': [2300.60, 2600.35, 2500.23, 2400.50, 2300.97, 2200.51, 2800.23, 2300.58, 2400.45, 2600.12, 2700.78, 2800.56],
                'Serviços Extras': [1798.00, 1804.00, 1837.00, 1835.00, 1939.00, 2031.00, 2352.00, 1876.00, 2023.00, 2189.00, 2256.00, 2434.00],
                'Outras Receitas': [500.00, 500.00, 500.00, 500.00, 500.00, 500.00, 1000.00, 500.00, 500.00, 500.00, 500.00, 500.00]
            }
        },
        custos: {
            total: [293.96, 4400.25, 273.24, 292.76, 296.04, 275.87, 411.66, 359.65, 387.45, 423.12, 456.78, 534.56],
            subcategorias: {
                'Custos Operacionais': [150.00, 3800.00, 130.00, 150.00, 150.00, 130.00, 200.00, 180.00, 200.00, 220.00, 250.00, 300.00],
                'Taxas Bancárias': [93.96, 300.25, 93.24, 92.76, 96.04, 95.87, 111.66, 129.65, 137.45, 153.12, 156.78, 184.56],
                'Outros Custos': [50.00, 300.00, 50.00, 50.00, 50.00, 50.00, 100.00, 50.00, 50.00, 50.00, 50.00, 50.00]
            }
        },
        resultadoLiquido: [24304.64, 21004.10, 24764.99, 24542.74, 24243.83, 23955.64, 28740.57, 24216.93, 24735.00, 26366.00, 27000.00, 27700.00]
    },
    2023: {
        receitas: {
            total: [22598.60, 23404.35, 23037.23, 22835.50, 22539.97, 22231.51, 27152.23, 22576.58, 23123.45, 24789.12, 25456.78, 26234.56],
            subcategorias: {
                'Mensalidades': [18000.00, 18500.00, 18200.00, 18100.00, 17800.00, 17500.00, 21000.00, 17900.00, 18200.00, 19500.00, 20000.00, 20500.00],
                'Taxas de Adesão': [2100.60, 2400.35, 2300.23, 2200.50, 2100.97, 2000.51, 2600.23, 2100.58, 2200.45, 2400.12, 2500.78, 2600.56],
                'Serviços Extras': [1998.00, 2004.00, 2037.00, 2035.00, 2139.00, 2231.00, 2552.00, 2076.00, 2223.00, 2389.00, 2456.00, 2634.00],
                'Outras Receitas': [500.00, 500.00, 500.00, 500.00, 500.00, 500.00, 1000.00, 500.00, 500.00, 500.00, 500.00, 500.00]
            }
        },
        custos: {
            total: [193.96, 3400.25, 173.24, 192.76, 196.04, 175.87, 311.66, 259.65, 287.45, 323.12, 356.78, 434.56],
            subcategorias: {
                'Custos Operacionais': [100.00, 2800.00, 80.00, 100.00, 100.00, 80.00, 150.00, 130.00, 150.00, 170.00, 200.00, 250.00],
                'Taxas Bancárias': [43.96, 250.25, 43.24, 42.76, 46.04, 45.87, 61.66, 79.65, 87.45, 103.12, 106.78, 134.56],
                'Outros Custos': [50.00, 350.00, 50.00, 50.00, 50.00, 50.00, 100.00, 50.00, 50.00, 50.00, 50.00, 50.00]
            }
        },
        resultadoLiquido: [22404.64, 20004.10, 22864.99, 22642.74, 22343.83, 22055.64, 26840.57, 22316.93, 22836.00, 24466.00, 25100.00, 25800.00]
    },
    2022: {
        receitas: {
            total: [20598.60, 21404.35, 21037.23, 20835.50, 20539.97, 20231.51, 25152.23, 20576.58, 21123.45, 22789.12, 23456.78, 24234.56],
            subcategorias: {
                'Mensalidades': [16000.00, 16500.00, 16200.00, 16100.00, 15800.00, 15500.00, 19000.00, 15900.00, 16200.00, 17500.00, 18000.00, 18500.00],
                'Taxas de Adesão': [1900.60, 2200.35, 2100.23, 2000.50, 1900.97, 1800.51, 2400.23, 1900.58, 2000.45, 2200.12, 2300.78, 2400.56],
                'Serviços Extras': [2198.00, 2204.00, 2237.00, 2235.00, 2339.00, 2431.00, 2752.00, 2276.00, 2423.00, 2589.00, 2656.00, 2834.00],
                'Outras Receitas': [500.00, 500.00, 500.00, 500.00, 500.00, 500.00, 1000.00, 500.00, 500.00, 500.00, 500.00, 500.00]
            }
        },
        custos: {
            total: [93.96, 2400.25, 73.24, 92.76, 96.04, 75.87, 211.66, 159.65, 187.45, 223.12, 256.78, 334.56],
            subcategorias: {
                'Custos Operacionais': [50.00, 2000.00, 30.00, 50.00, 50.00, 30.00, 100.00, 80.00, 100.00, 120.00, 150.00, 200.00],
                'Taxas Bancárias': [23.96, 200.25, 23.24, 22.76, 26.04, 25.87, 61.66, 59.65, 67.45, 83.12, 86.78, 114.56],
                'Outros Custos': [20.00, 200.00, 20.00, 20.00, 20.00, 20.00, 50.00, 20.00, 20.00, 20.00, 20.00, 20.00]
            }
        },
        resultadoLiquido: [20504.64, 19004.10, 20964.99, 20742.74, 20443.83, 20155.64, 24940.57, 20416.93, 20936.00, 22566.00, 23200.00, 23900.00]
    }
};

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

let dreChart;

function initializeDREChart() {
    const ctx = document.getElementById('dreChart').getContext('2d');
    const currentYear = document.getElementById('year').value;
    const data = dreData[currentYear];
    
    // Verificar se há dados reais (não apenas zeros)
    const hasRealData = data.resultadoLiquido.some(value => value > 0);
    const chartContainer = document.querySelector('.chart-container');
    
    if (!hasRealData) {
        // Ocultar o gráfico e mostrar mensagem de "sem dados"
        chartContainer.style.display = 'none';
        
        // Criar ou atualizar mensagem de "sem dados"
        let noDataMessage = document.getElementById('no-data-message');
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.id = 'no-data-message';
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #333;">Nenhum dado disponível</h3>
                    <p style="margin: 0; font-size: 14px;">O gráfico será exibido quando houver dados de receitas e custos cadastrados no sistema.</p>
                </div>
            `;
            chartContainer.parentNode.insertBefore(noDataMessage, chartContainer.nextSibling);
        }
        return;
    }
    
    // Remover mensagem de "sem dados" se existir
    const noDataMessage = document.getElementById('no-data-message');
    if (noDataMessage) {
        noDataMessage.remove();
    }
    
    // Mostrar o gráfico
    chartContainer.style.display = 'block';
    
    dreChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'Resultado Líquido',
                data: data.resultadoLiquido,
                borderColor: '#4ECDC4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4ECDC4',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4ECDC4',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'R$ ' + context.parsed.y.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    },
                    beginAtZero: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function initializeYearSelector() {
    const yearSelect = document.getElementById('year');
    yearSelect.addEventListener('change', function() {
        updateDREData(this.value);
    });
}

function updateDREData(year) {
    const data = dreData[year];
    
    // Atualizar tabela
    updateTable(data, year);
    
    // Atualizar gráfico
    updateChart(data);
}

function updateTable(data, year) {
    const table = document.querySelector('.dre-table tbody');
    
    // Calcular totais
    const totalReceitas = data.receitas.total.reduce((sum, val) => sum + val, 0);
    const totalCustos = data.custos.total.reduce((sum, val) => sum + val, 0);
    const totalResultado = data.resultadoLiquido.reduce((sum, val) => sum + val, 0);
    
    // Calcular percentuais
    const percentCustos = ((totalCustos / totalReceitas) * 100).toFixed(2);
    const percentResultado = ((totalResultado / totalReceitas) * 100).toFixed(2);
    
    // Atualizar linha de receitas
    const receitasRow = table.querySelector('.revenue-row');
    if (receitasRow) {
        receitasRow.setAttribute('data-category', 'receitas');
        const receitasCells = receitasRow.querySelectorAll('.value');
        for (let i = 0; i < 8; i++) {
            if (i < data.receitas.total.length) {
                receitasCells[i].textContent = formatCurrency(data.receitas.total[i]);
            }
        }
        receitasCells[8].textContent = formatCurrency(totalReceitas); // Total
    }
    
    // Atualizar linha de custos
    const custosRow = table.querySelector('.expense-row');
    if (custosRow) {
        custosRow.setAttribute('data-category', 'custos');
        const custosCells = custosRow.querySelectorAll('.value');
        for (let i = 0; i < 8; i++) {
            if (i < data.custos.total.length) {
                custosCells[i].textContent = '-' + formatCurrency(data.custos.total[i]);
            }
        }
        custosCells[8].textContent = '-' + formatCurrency(totalCustos); // Total
        custosRow.querySelector('.percent').textContent = '-' + percentCustos + '%';
    }
    
    // Atualizar linha de resultado
    const resultadoRow = table.querySelector('.result-row');
    if (resultadoRow) {
        const resultadoCells = resultadoRow.querySelectorAll('.value');
        for (let i = 0; i < 8; i++) {
            if (i < data.resultadoLiquido.length) {
                resultadoCells[i].textContent = formatCurrency(data.resultadoLiquido[i]);
            }
        }
        resultadoCells[8].textContent = formatCurrency(totalResultado); // Total
        resultadoRow.querySelector('.percent').textContent = percentResultado + '%';
    }
    
    // Atualizar legenda do gráfico
    const legendItem = document.querySelector('.legend-item');
    if (legendItem) {
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: #4ECDC4;"></span>
            Resultado Líquido (${formatCurrency(totalResultado, false)})
        `;
    }
    
    // Remover subcategorias existentes
    removeExistingSubcategories();
    
    // Reinicializar linhas expansíveis
    initializeExpandableRows();
}

function updateChart(data) {
    // Verificar se há dados reais (não apenas zeros)
    const hasRealData = data.resultadoLiquido.some(value => value > 0);
    const chartContainer = document.querySelector('.chart-container');
    
    if (!hasRealData) {
        // Ocultar o gráfico e mostrar mensagem de "sem dados"
        chartContainer.style.display = 'none';
        
        // Criar ou atualizar mensagem de "sem dados"
        let noDataMessage = document.getElementById('no-data-message');
        if (!noDataMessage) {
            noDataMessage = document.createElement('div');
            noDataMessage.id = 'no-data-message';
            noDataMessage.className = 'no-data-message';
            noDataMessage.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #333;">Nenhum dado disponível</h3>
                    <p style="margin: 0; font-size: 14px;">O gráfico será exibido quando houver dados de receitas e custos cadastrados no sistema.</p>
                </div>
            `;
            chartContainer.parentNode.insertBefore(noDataMessage, chartContainer.nextSibling);
        }
        return;
    }
    
    // Remover mensagem de "sem dados" se existir
    const noDataMessage = document.getElementById('no-data-message');
    if (noDataMessage) {
        noDataMessage.remove();
    }
    
    // Mostrar o gráfico
    chartContainer.style.display = 'block';
    
    dreChart.data.datasets[0].data = data.resultadoLiquido;
    dreChart.update('active');
}

function formatCurrency(value, includeSymbol = true) {
    const formatted = value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return includeSymbol ? 'R$ ' + formatted : formatted;
}

// Função para exportar dados (futura implementação)
function exportDREData() {
    const year = document.getElementById('year').value;
    const data = dreData[year];
    
    console.log('Exportando dados do DRE para o ano:', year);
    console.log('Dados:', data);
    
    // Implementar exportação para Excel/PDF
    const reportData = document.querySelector('.dre-content');
    if (reportData) {
        alert('Exportando relatório DRE Gerencial para Excel/PDF...');
    } else {
        alert('Nenhum dado disponível para exportação');
    }
}

// Função para imprimir relatório (futura implementação)
function printDREReport() {
    window.print();
}

// Função para inicializar linhas expansíveis
function initializeExpandableRows() {
    const receitasRow = document.querySelector('tr[data-category="receitas"]');
    const custosRow = document.querySelector('tr[data-category="custos"]');
    
    if (receitasRow) {
        receitasRow.style.cursor = 'pointer';
        receitasRow.addEventListener('click', () => toggleSubcategories('receitas'));
        
        // Adicionar ícone de expansão
        const firstCell = receitasRow.querySelector('td');
        if (firstCell && !firstCell.querySelector('.expand-icon')) {
            const icon = document.createElement('span');
            icon.className = 'expand-icon';
            icon.innerHTML = '▶';
            icon.style.marginRight = '8px';
            icon.style.fontSize = '12px';
            icon.style.transition = 'transform 0.3s ease';
            firstCell.insertBefore(icon, firstCell.firstChild);
        }
    }
    
    if (custosRow) {
        custosRow.style.cursor = 'pointer';
        custosRow.addEventListener('click', () => toggleSubcategories('custos'));
        
        // Adicionar ícone de expansão
        const firstCell = custosRow.querySelector('td');
        if (firstCell && !firstCell.querySelector('.expand-icon')) {
            const icon = document.createElement('span');
            icon.className = 'expand-icon';
            icon.innerHTML = '▶';
            icon.style.marginRight = '8px';
            icon.style.fontSize = '12px';
            icon.style.transition = 'transform 0.3s ease';
            firstCell.insertBefore(icon, firstCell.firstChild);
        }
    }
}

// Função para alternar subcategorias
function toggleSubcategories(category) {
    const isExpanded = dreState.expandedRows[category];
    
    if (isExpanded) {
        collapseSubcategories(category);
    } else {
        expandSubcategories(category);
    }
    
    dreState.expandedRows[category] = !isExpanded;
    
    // Atualizar ícone
    const row = document.querySelector(`tr[data-category="${category}"]`);
    const icon = row.querySelector('.expand-icon');
    if (icon) {
        icon.style.transform = dreState.expandedRows[category] ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

// Função para expandir subcategorias
function expandSubcategories(category) {
    const currentYear = document.getElementById('year').value;
    const data = dreData[currentYear];
    const categoryRow = document.querySelector(`tr[data-category="${category}"]`);
    
    if (!categoryRow || !data[category].subcategorias) return;
    
    const subcategorias = data[category].subcategorias;
    const tbody = categoryRow.parentNode;
    
    Object.keys(subcategorias).forEach((subcat, index) => {
        const subcatRow = document.createElement('tr');
        subcatRow.className = `subcategory-row ${category}-subcategory`;
        subcatRow.style.backgroundColor = '#f8f9fa';
        
        // Primeira célula com nome da subcategoria
        const nameCell = document.createElement('td');
        nameCell.className = 'category';
        nameCell.style.paddingLeft = '30px';
        nameCell.style.fontSize = '13px';
        nameCell.style.color = '#666';
        nameCell.textContent = subcat;
        subcatRow.appendChild(nameCell);
        
        // Células de valores mensais
        for (let i = 0; i < 8; i++) {
            const valueCell = document.createElement('td');
            valueCell.className = 'value';
            valueCell.style.fontSize = '13px';
            
            if (i < subcategorias[subcat].length) {
                const value = subcategorias[subcat][i];
                const formattedValue = category === 'custos' ? 
                    '-' + formatCurrency(value) : 
                    formatCurrency(value);
                valueCell.textContent = formattedValue;
            }
            subcatRow.appendChild(valueCell);
        }
        
        // Célula de total
        const totalCell = document.createElement('td');
        totalCell.className = 'value';
        totalCell.style.fontSize = '13px';
        totalCell.style.fontWeight = '600';
        const total = subcategorias[subcat].reduce((sum, val) => sum + val, 0);
        const formattedTotal = category === 'custos' ? 
            '-' + formatCurrency(total) : 
            formatCurrency(total);
        totalCell.textContent = formattedTotal;
        subcatRow.appendChild(totalCell);
        
        // Célula de percentual (vazia para subcategorias)
        const percentCell = document.createElement('td');
        percentCell.className = 'percent';
        subcatRow.appendChild(percentCell);
        
        // Inserir após a linha principal
        const nextSibling = categoryRow.nextSibling;
        tbody.insertBefore(subcatRow, nextSibling);
    });
}

// Função para colapsar subcategorias
function collapseSubcategories(category) {
    const subcategoryRows = document.querySelectorAll(`.${category}-subcategory`);
    subcategoryRows.forEach(row => row.remove());
}

// Função para remover subcategorias existentes
function removeExistingSubcategories() {
    const subcategoryRows = document.querySelectorAll('.subcategory-row');
    subcategoryRows.forEach(row => row.remove());
    
    // Reset estado de expansão
    dreState.expandedRows = {
        receitas: false,
        custos: false
    };
}

// Função para inicializar filtros
function initializeFilters() {
    // Criar controles de filtro se não existirem
    createFilterControls();
    
    // Event listeners para filtros
    const positiveFilter = document.getElementById('filter-positive');
    const negativeFilter = document.getElementById('filter-negative');
    const minValueFilter = document.getElementById('filter-min-value');
    const maxValueFilter = document.getElementById('filter-max-value');
    
    if (positiveFilter) {
        positiveFilter.addEventListener('change', applyFilters);
    }
    if (negativeFilter) {
        negativeFilter.addEventListener('change', applyFilters);
    }
    if (minValueFilter) {
        minValueFilter.addEventListener('input', debounce(applyFilters, 500));
    }
    if (maxValueFilter) {
        maxValueFilter.addEventListener('input', debounce(applyFilters, 500));
    }
}

// Função para criar controles de filtro
function createFilterControls() {
    const controlsContainer = document.querySelector('.dre-controls');
    if (!controlsContainer || controlsContainer.querySelector('.filter-controls')) return;
    
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-controls';
    filterDiv.style.marginLeft = '20px';
    filterDiv.style.display = 'flex';
    filterDiv.style.gap = '15px';
    filterDiv.style.alignItems = 'center';
    
    filterDiv.innerHTML = `
        <label style="font-size: 14px; color: #666;">
            <input type="checkbox" id="filter-positive" checked> Valores Positivos
        </label>
        <label style="font-size: 14px; color: #666;">
            <input type="checkbox" id="filter-negative" checked> Valores Negativos
        </label>
        <input type="number" id="filter-min-value" placeholder="Valor mín." 
               style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
        <input type="number" id="filter-max-value" placeholder="Valor máx." 
               style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
        <button onclick="clearFilters()" 
                style="padding: 5px 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px;">
            Limpar
        </button>
    `;
    
    controlsContainer.appendChild(filterDiv);
}

// Função para aplicar filtros
function applyFilters() {
    const showPositive = document.getElementById('filter-positive')?.checked ?? true;
    const showNegative = document.getElementById('filter-negative')?.checked ?? true;
    const minValue = parseFloat(document.getElementById('filter-min-value')?.value) || null;
    const maxValue = parseFloat(document.getElementById('filter-max-value')?.value) || null;
    
    dreState.filters = {
        showPositive,
        showNegative,
        minValue,
        maxValue
    };
    
    // Aplicar filtros às linhas da tabela
    const rows = document.querySelectorAll('.dre-table tbody tr');
    
    rows.forEach(row => {
        if (row.classList.contains('subcategory-row')) return;
        
        const category = row.getAttribute('data-category');
        if (!category) return;
        
        const totalCell = row.querySelector('.value:nth-last-child(2)');
        if (!totalCell) return;
        
        const valueText = totalCell.textContent.replace(/[R$\s.-]/g, '').replace(',', '.');
        const value = parseFloat(valueText);
        
        let shouldShow = true;
        
        // Filtro de valores positivos/negativos
        if (value > 0 && !showPositive) shouldShow = false;
        if (value < 0 && !showNegative) shouldShow = false;
        
        // Filtro de valor mínimo
        if (minValue !== null && Math.abs(value) < minValue) shouldShow = false;
        
        // Filtro de valor máximo
        if (maxValue !== null && Math.abs(value) > maxValue) shouldShow = false;
        
        row.style.display = shouldShow ? '' : 'none';
        
        // Ocultar subcategorias se a linha principal estiver oculta
        if (!shouldShow && dreState.expandedRows[category]) {
            const subcategoryRows = document.querySelectorAll(`.${category}-subcategory`);
            subcategoryRows.forEach(subRow => subRow.style.display = 'none');
        }
    });
}

// Função para limpar filtros
function clearFilters() {
    document.getElementById('filter-positive').checked = true;
    document.getElementById('filter-negative').checked = true;
    document.getElementById('filter-min-value').value = '';
    document.getElementById('filter-max-value').value = '';
    
    dreState.filters = {
        showPositive: true,
        showNegative: true,
        minValue: null,
        maxValue: null
    };
    
    // Mostrar todas as linhas
    const rows = document.querySelectorAll('.dre-table tbody tr');
    rows.forEach(row => row.style.display = '');
}

// Função para inicializar funções de exportação
function initializeExportFunctions() {
    // Adicionar botões de exportação se não existirem
    createExportButtons();
}

// Função para criar botões de exportação
function createExportButtons() {
    const controlsContainer = document.querySelector('.dre-controls');
    if (!controlsContainer || controlsContainer.querySelector('.export-controls')) return;
    
    const exportDiv = document.createElement('div');
    exportDiv.className = 'export-controls';
    exportDiv.style.marginLeft = 'auto';
    exportDiv.style.display = 'flex';
    exportDiv.style.gap = '10px';
    
    exportDiv.innerHTML = `
        <button onclick="exportDREData()" 
                style="padding: 8px 16px; background: #4ECDC4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
            📊 Exportar Excel
        </button>
        <button onclick="printDREReport()" 
                style="padding: 8px 16px; background: #45B7B8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
            🖨️ Imprimir
        </button>
    `;
    
    controlsContainer.appendChild(exportDiv);
}

// Função utilitária para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}