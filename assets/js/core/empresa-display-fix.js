// Fix para garantir a exibição da empresa ativa
(function() {
    'use strict';

    function atualizarEmpresaDisplay() {
        const empresaNome = localStorage.getItem('empresaSelecionadaNome');
        const emailFromLocal = localStorage.getItem('currentUserEmail') || localStorage.getItem('userEmail');
        const emailFromFirebase = (window.firebase && firebase.auth().currentUser) ? firebase.auth().currentUser.email : null;
        const userEmail = emailFromLocal || emailFromFirebase || null;

        console.log('[EMPRESA DISPLAY FIX] Atualizando display...');
        console.log('[EMPRESA DISPLAY FIX] Empresa Nome:', empresaNome);
        console.log('[EMPRESA DISPLAY FIX] User Email:', userEmail);

        // 1. Header (Top Bar)
        const headerEmpresaDisplay = document.getElementById('headerEmpresaDisplay');
        if (headerEmpresaDisplay) {
            headerEmpresaDisplay.textContent = empresaNome || 'Nenhuma empresa selec...';
            console.log('[EMPRESA DISPLAY FIX] Header atualizado:', headerEmpresaDisplay.textContent);
        }

        // 2. Menu Lateral (Sidebar) - Empresa
        const empresaDisplaySidebar = document.getElementById('empresaDisplaySidebar');
        if (empresaDisplaySidebar) {
            empresaDisplaySidebar.textContent = empresaNome || 'Nenhuma empresa ativa';
            console.log('[EMPRESA DISPLAY FIX] Sidebar Empresa atualizado:', empresaDisplaySidebar.textContent);
        }

        // 3. Menu Lateral (Sidebar) - Usuário
        // Removido: a atualização do usuário deve ser responsabilidade do sidebar-menu/auth
        // para evitar conflitos de fonte (Firebase vs localStorage).
    }

    // Inicializar quando o Firebase estiver pronto
    if (window.firebase && firebase.auth) {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log('[EMPRESA DISPLAY FIX] Usuário logado:', user.email);
                // Aguardar um pouco para garantir que o localStorage foi populado
                setTimeout(() => {
                    atualizarEmpresaDisplay();
                }, 300);
            } else {
                // Mesmo sem usuário do Firebase, tentamos com localStorage
                setTimeout(atualizarEmpresaDisplay, 300);
            }
        });
    }

    // Atualizar quando o localStorage mudar (quando uma empresa for selecionada)
    window.addEventListener('storage', (event) => {
        if (event.key === 'empresaSelecionadaNome' || event.key === 'currentUserEmail' || event.key === 'userEmail') {
            console.log('[EMPRESA DISPLAY FIX] Storage alterado:', event.key, '=>', event.newValue);
            atualizarEmpresaDisplay();
        }
    });

    // Atualizar quando a página carregar
    window.addEventListener('DOMContentLoaded', () => {
        console.log('[EMPRESA DISPLAY FIX] DOM carregado');
        setTimeout(() => {
            atualizarEmpresaDisplay();
        }, 1000);
    });

    // Exportar para uso global
    window.atualizarEmpresaDisplay = atualizarEmpresaDisplay;
})();
