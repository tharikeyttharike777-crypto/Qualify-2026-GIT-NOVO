// DOM Elements com verificações de segurança
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const cards = document.querySelectorAll('.card');
const notificationBell = document.querySelector('.notification');
const userMenu = document.querySelector('.user-menu');

// Verificações de segurança para elementos críticos
if (!sidebar) {
    console.warn('Elemento .sidebar não encontrado - funcionalidade de sidebar desabilitada');
}
if (!menuToggle) {
    console.warn('Elemento .menu-toggle não encontrado - funcionalidade de toggle desabilitada');
}

// Menu Toggle
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (sidebar && menuToggle && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Card Click Events
if (cards && cards.length > 0) {
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            const spanElement = card.querySelector('span');
            if (!spanElement) return;
            
            const cardText = spanElement.textContent;
            
            // Add visual feedback
            card.style.transform = 'scale(0.98)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
            
            // Navigate to specific pages
            // Navegação para páginas específicas baseada no texto do card
            const pageMap = {
                'Pesquisa simplificada': './pages/pesquisa-simplificada.html',
                'Cobranças': './pages/cobrancas.html',
                'Contas a receber': './pages/cobrancas.html',
                'Contratos': './pages/contratos.html',
                'Ordens de serviço': './pages/ordens-servico.html',
                'Vendas': './pages/vendas.html',
                'Dashboard': './pages/dashboard.html',
                'Aniversariantes': './pages/aniversariantes.html',
                'Contratos Ativos': './pages/contratos-ativos.html',
                'Mensalidades': './pages/contratos-mensalidades.html',
                'Renovações Pendentes': './pages/renovacoes-pendentes.html',
                'Inadimplentes': './pages/inadimplentes.html',
                'Cancelados': './pages/cancelados.html',
                'Contas a Pagar': './pages/contas-pagar.html',
                'DRE Gerencial': './pages/dre-gerencial.html',
                'Metas': './pages/metas.html',
                'Resumo do Dia': './pages/resumo-dia.html',
                'Lista de Cobrança': './pages/lista-cobranca.html',
                'Nova Família': './pages/nova-familia.html',
                'Pesquisar Associados': './pages/pesquisar-associados.html',
                'Pesquisar Famílias': './pages/pesquisar-familias.html',
                'Pesquisar Pets': './pages/pesquisar-pets.html',
                // Comissionamento removido
                'Métricas Estratégicas': './pages/metricas-estrategicas.html',
                'Minhas Movimentações': './pages/minhas-movimentacoes.html',
                'Controle de Caixas': './pages/controle-caixas.html',
                'Contas a Receber': './pages/contas-receber.html',
                'Renegociação de Cobranças': './pages/renegociacao-cobrancas.html'
            };
            
            const targetPage = pageMap[cardText];
            if (targetPage) {
                window.location.href = targetPage;
            } else {
                console.log(`Página não encontrada para: ${cardText}`);
            }
        });
    });
}

// Notification Bell Click
if (notificationBell) {
    notificationBell.addEventListener('click', () => {
        console.log('Você tem 9 notificações pendentes!');
    });
}

// User Menu Click
if (userMenu) {
    userMenu.addEventListener('click', () => {
        const userMenuOptions = [
            'Meu Perfil',
            'Configurações',
            'Ajuda',
            'Sair'
        ];
        
        console.log('Menu do usuário clicado - opções disponíveis:', userMenuOptions);
    });
}

// Responsive behavior
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});

// Add hover effects for better UX
if (cards && cards.length > 0) {
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Navigation items in sidebar
const navItems = document.querySelectorAll('.sidebar-menu li');
if (navItems && navItems.length > 0) {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const itemText = item.textContent.trim();
            console.log(`Navegando para: ${itemText}`);
        });
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Qualify Dashboard carregado com sucesso!');
    
    // Add loading animation to cards
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Utility function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-popup ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Example usage of notification system
// showNotification('Bem-vindo ao Qualify Dashboard!', 'success');