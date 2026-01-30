/**
 * SISTEMA DE NOTIFICAÇÕES
 * Gerencia o pop-up de notificações do header
 */

class NotificationSystem {
    constructor() {
        this.notificationIcon = null;
        this.notificationDropdown = null;
        this.isOpen = false;
        
        this.init();
    }
    
    /**
     * Inicializa o sistema de notificações
     */
    init() {
        this.getElements();
        this.bindEvents();
        this.loadNotifications();
        
        console.log('✅ Sistema de notificações inicializado');
    }
    
    /**
     * Obtém os elementos do DOM
     */
    getElements() {
        this.notificationIcon = document.querySelector('.notification');
        
        // Cria o dropdown se não existir
        if (!document.getElementById('notification-dropdown')) {
            this.createNotificationDropdown();
        }
        
        this.notificationDropdown = document.getElementById('notification-dropdown');
    }
    
    /**
     * Cria o dropdown de notificações
     */
    createNotificationDropdown() {
        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.className = 'notification-dropdown';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h4>Notificações</h4>
                <button class="mark-all-read">Marcar todas como lidas</button>
            </div>
            <div class="notification-list" id="notification-list">
                <!-- Notificações serão inseridas aqui -->
            </div>
            <div class="notification-footer">
                <a href="pages/todas-notificacoes.html">Ver todas as notificações</a>
            </div>
        `;
        
        // Insere o dropdown após o ícone de notificação
        if (this.notificationIcon) {
            this.notificationIcon.parentNode.insertBefore(dropdown, this.notificationIcon.nextSibling);
        }
    }
    
    /**
     * Vincula os eventos
     */
    bindEvents() {
        if (this.notificationIcon) {
            this.notificationIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.notificationIcon?.contains(e.target) && 
                !this.notificationDropdown?.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Marcar todas como lidas
        const markAllReadBtn = document.querySelector('.mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }
    }
    
    /**
     * Alterna a exibição do dropdown
     */
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    /**
     * Abre o dropdown
     */
    openDropdown() {
        if (this.notificationDropdown) {
            this.notificationDropdown.classList.add('show');
            this.isOpen = true;
        }
    }
    
    /**
     * Fecha o dropdown
     */
    closeDropdown() {
        if (this.notificationDropdown) {
            this.notificationDropdown.classList.remove('show');
            this.isOpen = false;
        }
    }
    
    /**
     * Carrega as notificações
     */
    loadNotifications() {
        const notifications = this.getNotificationsData();
        this.renderNotifications(notifications);
        this.updateBadge(notifications.filter(n => !n.read).length);
    }
    
    /**
     * Obtém os dados das notificações (simulado)
     */
    getNotificationsData() {
        return [
            {
                id: 1,
                title: 'Nova família cadastrada',
                message: 'A família Silva foi cadastrada com sucesso',
                time: '2 min atrás',
                type: 'success',
                read: false,
                icon: 'fa-user-plus'
            },
            {
                id: 2,
                title: 'Pagamento recebido',
                message: 'Pagamento de R$ 150,00 foi processado',
                time: '5 min atrás',
                type: 'info',
                read: false,
                icon: 'fa-money-bill-wave'
            },
            {
                id: 3,
                title: 'Contrato vencendo',
                message: 'Contrato #1234 vence em 3 dias',
                time: '10 min atrás',
                type: 'warning',
                read: false,
                icon: 'fa-exclamation-triangle'
            },
            {
                id: 4,
                title: 'Backup concluído',
                message: 'Backup diário foi realizado com sucesso',
                time: '1 hora atrás',
                type: 'success',
                read: true,
                icon: 'fa-check-circle'
            },
            {
                id: 5,
                title: 'Novo pet cadastrado',
                message: 'Pet Rex foi adicionado à família Santos',
                time: '2 horas atrás',
                type: 'info',
                read: true,
                icon: 'fa-paw'
            }
        ];
    }
    
    /**
     * Renderiza as notificações
     */
    renderNotifications(notifications) {
        const notificationList = document.getElementById('notification-list');
        if (!notificationList) return;
        
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nenhuma notificação</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        notifications.forEach(notification => {
            html += `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
                    <div class="notification-icon ${notification.type}">
                        <i class="fas ${notification.icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${notification.time}</div>
                    </div>
                    ${!notification.read ? '<div class="unread-indicator"></div>' : ''}
                </div>
            `;
        });
        
        notificationList.innerHTML = html;
        
        // Adicionar eventos de clique nas notificações
        notificationList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                this.markAsRead(parseInt(item.dataset.id));
            });
        });
    }
    
    /**
     * Atualiza o badge de notificações
     */
    updateBadge(count) {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }
    
    /**
     * Marca uma notificação como lida
     */
    markAsRead(notificationId) {
        const notifications = this.getNotificationsData();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.loadNotifications();
        }
    }
    
    /**
     * Marca todas as notificações como lidas
     */
    markAllAsRead() {
        const notifications = this.getNotificationsData();
        notifications.forEach(n => n.read = true);
        this.loadNotifications();
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Aguarda um pequeno delay para garantir que todos os elementos estejam carregados
    setTimeout(() => {
        try {
            window.notificationSystem = new NotificationSystem();
        } catch (error) {
            console.error('Erro ao inicializar NotificationSystem:', error);
        }
    }, 50);
});

// Fallback para inicialização imediata se o DOM já estiver carregado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.notificationSystem) {
            try {
                window.notificationSystem = new NotificationSystem();
            } catch (error) {
                console.error('Erro ao inicializar NotificationSystem (fallback):', error);
            }
        }
    }, 50);
}