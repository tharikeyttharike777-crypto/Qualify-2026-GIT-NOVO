// Minhas Movimentações JavaScript

// Dados reais podem ser injetados via window.movimentacoesRealData
const movimentacoesData = window.movimentacoesRealData || {
    summary: {
        entrada: 0,
        saida: 0,
        saldo: 0
    },
    formasPagamento: [],
    caixas: [],
    extrato: []
};

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    renderCharts();
});

// Initialize page data
function initializePage() {
    updateSummaryCards();
    renderFormasPagamentoTable();
    renderCaixasTable();
    renderExtratoTable();
    initializeAccordionSections();
}

// Initialize accordion sections to be expanded by default
function initializeAccordionSections() {
    const sections = ['formas-pagamento', 'caixas', 'extrato'];
    
    sections.forEach(sectionId => {
        const content = document.getElementById(sectionId + '-content');
        const icon = document.getElementById(sectionId + '-icon');
        
        if (content && icon) {
            // Start expanded by default
            content.classList.add('expanded');
            content.classList.remove('collapsed');
            icon.classList.remove('rotated');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Collapsible sections are handled by onclick in HTML
    console.log('Event listeners setup completed');
}

// Toggle collapsible sections
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const icon = document.getElementById(sectionId + '-icon');
    
    if (content && icon) {
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            icon.classList.add('rotated');
        } else {
            content.classList.add('collapsed');
            content.classList.remove('expanded');
            icon.classList.remove('rotated');
        }
    }
}

// Update summary cards
function updateSummaryCards() {
    const cards = document.querySelectorAll('.summary-card');
    const data = movimentacoesData.summary;
    
    cards.forEach(card => {
        const valueElement = card.querySelector('.card-value');
        if (card.classList.contains('entrada')) {
            valueElement.textContent = formatCurrency(data.entrada);
        } else if (card.classList.contains('saida')) {
            valueElement.textContent = formatCurrency(-data.saida);
        } else if (card.classList.contains('saldo')) {
            valueElement.textContent = formatCurrency(data.saldo);
        }
    });
}

// Render Formas de Pagamento table
function renderFormasPagamentoTable() {
    const tbody = document.getElementById('formasPagamentoTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!movimentacoesData.formasPagamento || movimentacoesData.formasPagamento.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="5" style="text-align:center;color:#6c757d;">Nenhuma movimentação encontrada</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    movimentacoesData.formasPagamento.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.forma}</td>
            <td>${item.quantidade}</td>
            <td>${formatCurrency(item.entrada)}</td>
            <td>${formatCurrency(item.saida)}</td>
            <td>${formatCurrency(item.saldo)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render Caixas table
function renderCaixasTable() {
    const tbody = document.getElementById('caixasTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!movimentacoesData.caixas || movimentacoesData.caixas.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="7" style="text-align:center;color:#6c757d;">Nenhuma movimentação encontrada</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    movimentacoesData.caixas.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.caixa}</td>
            <td>${item.descricao}</td>
            <td>${item.planoContas}</td>
            <td>${item.quantidade}</td>
            <td>${formatCurrency(item.entrada)}</td>
            <td>${formatCurrency(item.saida)}</td>
            <td>${formatCurrency(item.saldo)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render Extrato table
function renderExtratoTable() {
    const tbody = document.getElementById('extratoTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!movimentacoesData.extrato || movimentacoesData.extrato.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="8" style="text-align:center;color:#6c757d;">Nenhuma movimentação encontrada</td>`;
        tbody.appendChild(emptyRow);
        return;
    }

    movimentacoesData.extrato.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.data}</td>
            <td>${item.descricao}</td>
            <td>${item.planoContas}</td>
            <td>${item.caixa}</td>
            <td>${item.formaPagamento}</td>
            <td>${item.quantidade}</td>
            <td>${item.dataOperacao}</td>
            <td>${formatCurrency(item.valor)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render charts using Canvas API
function renderCharts() {
    renderEntradasChart();
    renderSaidasChart();
}

// Render Entradas pie chart
function renderEntradasChart() {
    const canvas = document.getElementById('entradasChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = movimentacoesData.formasPagamento || [];
    
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + (item.entrada || 0), 0);
    if (!data.length || total === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sem dados para entradas', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Colors for the chart
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8'];
    
    // Draw pie chart
    drawPieChart(ctx, data.map(item => ({
        label: item.forma,
        value: item.entrada,
        percentage: (item.entrada / total * 100).toFixed(1)
    })), colors, canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 3);
}

// Render Saídas pie chart
function renderSaidasChart() {
    const canvas = document.getElementById('saidasChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = movimentacoesData.formasPagamento.filter(item => item.saida > 0);
    
    if (data.length === 0) {
        // Draw "No data" message
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma saída registrada', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.saida, 0);
    
    // Colors for the chart
    const colors = ['#dc3545', '#ffc107', '#17a2b8', '#6f42c1', '#fd7e14'];
    
    // Draw pie chart
    drawPieChart(ctx, data.map(item => ({
        label: item.forma,
        value: item.saida,
        percentage: (item.saida / total * 100).toFixed(1)
    })), colors, canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 3);
}

// Draw pie chart function
function drawPieChart(ctx, data, colors, centerX, centerY, radius) {
    let currentAngle = -Math.PI / 2; // Start from top
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Draw slices
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    // Draw legend
    drawLegend(ctx, data, colors, centerX, centerY, radius);
}

// Draw legend for pie chart
function drawLegend(ctx, data, colors, centerX, centerY, radius) {
    const legendX = centerX + radius + 20;
    let legendY = centerY - (data.length * 20) / 2;
    
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    data.forEach((item, index) => {
        // Draw color box
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY - 8, 12, 12);
        
        // Draw text
        ctx.fillStyle = '#333';
        ctx.fillText(`${item.label} (${item.percentage}%)`, legendX + 18, legendY + 2);
        
        legendY += 20;
    });
}

// Utility function to format currency
function formatCurrency(value) {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
    
    return isNegative ? `-${formatted}` : formatted;
}

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Show message function
function showMessage(message, type = 'info') {
    // Create a simple toast message
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Export functions for global access
window.toggleSection = toggleSection;
window.showMessage = showMessage;

console.log('Minhas Movimentações page loaded successfully');