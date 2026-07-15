// Sidebar functionality
class Sidebar {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.mainContent = document.querySelector('.main-content');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setActiveMenuItem();
    }

    setupEventListeners() {
        // Toggle sidebar
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Handle sidebar item clicks
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const href = item.getAttribute('href');
                if (href && href !== '#') {
                    window.location.href = href;
                }
            });
        });

        // Handle responsive behavior
        this.handleResponsive();
        window.addEventListener('resize', () => {
            this.handleResponsive();
        });
    }

    toggleSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.toggle('collapsed');
            
            if (this.mainContent) {
                this.mainContent.classList.toggle('sidebar-collapsed');
            }
        }
    }

    setActiveMenuItem() {
        const currentPath = window.location.pathname;
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        
        sidebarItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    handleResponsive() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            if (this.sidebar) {
                this.sidebar.classList.add('collapsed');
            }
            if (this.mainContent) {
                this.mainContent.classList.add('sidebar-collapsed');
            }
        } else {
            // Restore desktop behavior
            if (this.sidebar && !this.sidebar.classList.contains('collapsed')) {
                if (this.mainContent) {
                    this.mainContent.classList.remove('sidebar-collapsed');
                }
            }
        }
    }

    showSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.add('show');
        }
    }

    hideSidebar() {
        if (this.sidebar) {
            this.sidebar.classList.remove('show');
        }
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Sidebar();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sidebar;
}