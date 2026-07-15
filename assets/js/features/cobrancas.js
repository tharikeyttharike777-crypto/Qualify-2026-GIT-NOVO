// Cobranças JavaScript

// DOM Elements
const cobrancasCards = document.querySelectorAll('.cobrancas-card');

// Card Click Events
cobrancasCards.forEach(card => {
    card.addEventListener('click', (e) => {
        const cardType = card.getAttribute('data-type');
        const cardTitle = card.querySelector('.card-title').textContent;
        
        // Add loading state
        card.classList.add('loading');
        
        // Simulate loading time
        setTimeout(() => {
            card.classList.remove('loading');
            
            // Handle navigation based on card type
            switch (cardType) {
                case 'contratos':
                    handleContratosClick();
                    break;
                case 'ordens':
                    handleOrdensClick();
                    break;
                case 'vendas':
                    handleVendasClick();
                    break;
                default:
                    // Navegação para outras páginas baseada no cardTitle
                    const pageMap = {
                        'Lista de Cobrança': './lista-cobranca.html',
                        'Inadimplentes': './inadimplentes.html',
                        'Renegociação': './renegociacao-cobrancas.html',
                        'Contas a Receber': './contas-receber.html'
                    };
                    
                    if (pageMap[cardTitle]) {
                        window.location.href = pageMap[cardTitle];
                    } else {
                        console.log(`Página não encontrada para: ${cardTitle}`);
                    }
            }
        }, 800);
    });
    
    // Add keyboard support
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
        }
    });
    
    // Make cards focusable
    card.setAttribute('tabindex', '0');
});

// Handle Contratos Click
function handleContratosClick() {
    showNotification('Acessando Recebimentos de Mensalidades de Planos...', 'success');
    
    // Navigate to contratos page after a short delay
    setTimeout(() => {
        window.location.href = 'contratos.html';
    }, 1000);
}

// Handle Ordens Click
function handleOrdensClick() {
    showNotification('Acessando Recebimentos de Serviços Prestados...', 'success');
    
    // Navigate to ordens de servico page after a short delay
    setTimeout(() => {
        window.location.href = 'ordens-servico.html';
    }, 1000);
}

// Handle Vendas Click
function handleVendasClick() {
    showNotification('Acessando Duplicatas de Vendas...', 'success');
    setTimeout(() => {
        window.location.href = './vendas.html';
    }, 1000);
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification-toast');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: getNotificationColor(type),
        color: '#ffffff',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideInRight 0.3s ease-out'
    });
    
    // Add animation keyframes
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: #ffffff;
                cursor: pointer;
                padding: 0.25rem;
                margin-left: 1rem;
                border-radius: 4px;
                transition: background-color 0.2s ease;
            }
            .notification-close:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Close button functionality
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-exclamation-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

// Get notification color based on type
function getNotificationColor(type) {
    switch (type) {
        case 'success':
            return '#27ae60';
        case 'error':
            return '#e74c3c';
        case 'warning':
            return '#f39c12';
        default:
            return '#3498db';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página de Cobranças carregada com sucesso!');
    
    // Add hover effects for better UX
    cobrancasCards.forEach((card, index) => {
        // Stagger animation delays
        card.style.animationDelay = `${index * 0.1}s`;
        
        // Add ripple effect on click
        card.addEventListener('mousedown', (e) => {
            const ripple = document.createElement('span');
            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            if (!document.querySelector('#ripple-styles')) {
                const style = document.createElement('style');
                style.id = 'ripple-styles';
                style.textContent = `
                    @keyframes ripple {
                        to {
                            transform: scale(4);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            card.style.position = 'relative';
            card.style.overflow = 'hidden';
            card.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
});

// Export functions for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        handleContratosClick,
        handleOrdensClick,
        handleVendasClick
    };
}