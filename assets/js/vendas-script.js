// Script específico para a página de Vendas
// Este script evita conflitos com elementos que não existem nesta página

document.addEventListener('DOMContentLoaded', function() {
    console.log('Pagina de Vendas carregada com sucesso!');
    
    // Inicializar funcionalidades específicas da página de vendas
    if (typeof initializeVendasPage === 'function') {
        initializeVendasPage();
    }
    
    // Verificar se o vendas.js foi carregado
    if (typeof window.vendasPageLoaded !== 'undefined') {
        console.log('Vendas.js carregado com sucesso!');
    }
});

// Função para mostrar notificações (cópia da função principal)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Estilos inline para garantir que funcione
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    // Cores baseadas no tipo
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Marcar que este script foi carregado
window.vendasScriptLoaded = true;