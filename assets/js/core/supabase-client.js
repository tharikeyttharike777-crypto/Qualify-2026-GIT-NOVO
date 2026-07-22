/**
 * SUPABASE CLIENT INITIALIZATION
 * Substitui o firebase-config.js
 */

const SUPABASE_URL = 'https://vqcaovpvdmbjviyzudbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY2FvdnB2ZG1ianZpeXp1ZGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzgxNDIsImV4cCI6MjA5OTcxNDE0Mn0.ZMqQ3hdkGwWE023PhlODAKOfzbpr4LCDh0ewb_av0aU';

if (typeof supabase === 'undefined') {
    console.error('❌ Supabase SDK não carregado. Verifique o script no HTML.');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expor globalmente para manter compatibilidade com a estrutura legada
window.supabase = supabaseClient;

console.log('⚡ Supabase Client inicializado.');

// INJEÇÃO DO SWEETALERT2
(function() {
    if (!document.getElementById('sweetalert2-script')) {
        const script = document.createElement('script');
        script.id = 'sweetalert2-script';
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        document.head.appendChild(script);

        const style = document.createElement('style');
        style.textContent = `
            div:where(.swal2-container) button:where(.swal2-styled).swal2-confirm {
                background-color: var(--primary-color, #4361ee) !important;
            }
            div:where(.swal2-container) button:where(.swal2-styled).swal2-cancel {
                background-color: var(--secondary-color, #6c757d) !important;
            }
        `;
        document.head.appendChild(style);
    }
})();

// Função global para substituir o window.confirm nativo
window.swalConfirm = async function(title, text = '', type = 'warning', confirmText = 'Sim, confirmar!', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        // Aguarda a lib carregar se ainda não estiver pronta
        const checkSwal = setInterval(() => {
            if (window.Swal) {
                clearInterval(checkSwal);
                Swal.fire({
                    title: title,
                    text: text,
                    icon: type,
                    showCancelButton: true,
                    confirmButtonColor: 'var(--primary-color, #4361ee)',
                    cancelButtonColor: '#d33',
                    confirmButtonText: confirmText,
                    cancelButtonText: cancelText
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            }
        }, 50);
    });
};

// Função global para substituir o window.alert nativo por um mais bonito
window.swalAlert = function(title, text = '', type = 'info') {
    // Aguarda a lib carregar se ainda não estiver pronta
    const checkSwal = setInterval(() => {
        if (window.Swal) {
            clearInterval(checkSwal);
            Swal.fire(title, text, type);
        }
    }, 50);
};
