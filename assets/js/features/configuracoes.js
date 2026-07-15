// Configurações da página de Configurações
document.addEventListener('DOMContentLoaded', () => {
  const companyInfoEl = document.getElementById('companyInfo');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const saveBtn = document.getElementById('saveSettings');
  const logoutUserBtn = document.getElementById('logoutUserBtn');

  // Carrega empresa ativa
  const params = new URLSearchParams(window.location.search);
  const empresaId = params.get('empresa');
  let company = null;
  try {
    company = JSON.parse(localStorage.getItem('configCompany')) || null;
  } catch (e) {
    company = null;
  }

  if (companyInfoEl) {
    if (company && (!empresaId || String(company.id) === String(empresaId))) {
      const cnpj = formatCnpj(company.cnpj);
      companyInfoEl.textContent = `${company.name} • CNPJ ${cnpj} • ${company.city}/${company.state}`;
    } else {
      companyInfoEl.textContent = 'Nenhuma empresa selecionada. Use o botão acima para selecionar.';
    }
  }

  // Carrega preferências salvas
  const defaultSettings = {
    darkMode: false
  };
  let settings = defaultSettings;
  try {
    const saved = JSON.parse(localStorage.getItem('userSettings'));
    if (saved) settings = { ...defaultSettings, ...saved };
  } catch (e) {}

  // Aplica estado inicial
  if (darkModeToggle) darkModeToggle.checked = !!settings.darkMode;

  applyTheme(settings.darkMode ? 'dark' : 'light');

  // Listeners
  saveBtn?.addEventListener('click', () => {
    const newSettings = {
      darkMode: !!darkModeToggle?.checked
    };
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    applyTheme(newSettings.darkMode ? 'dark' : 'light');
    showNotification('Configurações salvas com sucesso!', 'success');
  });

  logoutUserBtn?.addEventListener('click', async () => {
    try {
      if (typeof window.handleLogout === 'function') {
        await window.handleLogout();
      } else if (typeof window.fazerLogout === 'function') {
        await window.fazerLogout();
      } else {
        showNotification('Função de logout não encontrada.', 'error');
      }
    } catch (e) {
      console.error('Erro ao realizar logout:', e);
      showNotification('Erro ao realizar logout.', 'error');
    }
  });
});

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
}

function formatCnpj(cnpj) {
  if (!cnpj || typeof cnpj !== 'string') return '';
  const clean = cnpj.replace(/\D/g, '');
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification-popup ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 80px; right: 20px; z-index: 10000;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: #fff; padding: 12px 16px; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); transform: translateX(100%);
    transition: transform 0.25s ease;
  `;
  document.body.appendChild(notification);
  requestAnimationFrame(() => { notification.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 250);
  }, 2500);
}