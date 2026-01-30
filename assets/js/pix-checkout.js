document.addEventListener('DOMContentLoaded', () => {
  const payBtn = document.getElementById('payViaPix');
  const statusBadge = document.getElementById('statusPagamento');

  function ensurePixModalExists() {
    let modal = document.getElementById('pixCheckoutModal');
    if (modal) return modal;
    const markup = `\n<!-- PIX Checkout Modal (injected) -->\n<div id="pixCheckoutModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">\n  <div class="bg-white rounded-lg shadow-xl w-full max-w-xl">\n    <div class="px-6 py-4 border-b">\n      <h2 class="text-lg font-semibold">Efetuar Pagamento da Mensalidade</h2>\n    </div>\n    <div class="p-6 space-y-4">\n      <div class="grid grid-cols-2 gap-4">\n        <div>\n          <p class="text-sm text-gray-500">Plano</p>\n          <p id="checkoutPlano" class="font-medium">—</p>\n        </div>\n        <div>\n          <p class="text-sm text-gray-500">Vencimento</p>\n          <p id="checkoutVencimento" class="font-medium">—</p>\n        </div>\n        <div>\n          <p class="text-sm text-gray-500">Valor</p>\n          <p id="checkoutValor" class="font-semibold text-indigo-600">—</p>\n        </div>\n        <div>\n          <p class="text-sm text-gray-500">Total a Pagar</p>\n          <p id="checkoutTotal" class="font-semibold text-indigo-700">—</p>\n        </div>\n      </div>\n      <div>\n        <h3 class="text-sm font-semibold mb-2">Pague com PIX</h3>\n        <div id="checkoutQrContainer" class="flex items-center justify-center">\n          <div class="w-48 h-48 bg-gray-100 rounded-lg border flex items-center justify-center">\n            <i class="fas fa-qrcode text-4xl text-gray-400"></i>\n          </div>\n        </div>\n      </div>\n      <div>\n        <button id="copyCheckoutPix" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md">Copiar Código PIX</button>\n      </div>\n      <div class="flex items-center gap-2 text-xs text-gray-500">\n        <i class="fas fa-shield-alt"></i>\n        <span>Pagamento seguro processado pelo Banco Inter</span>\n      </div>\n    </div>\n    <div class="px-6 py-4 border-t flex justify-end">\n      <button id="closePixCheckout" class="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Fechar</button>\n    </div>\n  </div>\n</div>`;
    document.body.insertAdjacentHTML('beforeend', markup);
    return document.getElementById('pixCheckoutModal');
  }

  function parseCurrencyBRLToNumber(text) {
    if (!text) return 0;
    const cleaned = String(text).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  let pollTimer = null;

  async function startCheckout() {
    const modal = ensurePixModalExists();
    const closeBtn = document.getElementById('closePixCheckout');
    const copyBtn = document.getElementById('copyCheckoutPix');
    const planoEl = document.getElementById('checkoutPlano');
    const vencEl = document.getElementById('checkoutVencimento');
    const valorEl = document.getElementById('checkoutValor');
    const totalEl = document.getElementById('checkoutTotal');
    const qrContainer = document.getElementById('checkoutQrContainer');

    const valorBRL = (document.getElementById('mensalidadeValor')?.textContent) || 'R$ 0,00';
    const amount = parseCurrencyBRLToNumber(valorBRL);
    const dueBR = (document.getElementById('proximoVencimento')?.textContent) || '';
    const [dia, mes, ano] = (dueBR || '').split('/');
    const dueDate = (ano && mes && dia) ? `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}` : new Date().toISOString().slice(0, 10);

    const stored = localStorage.getItem('areaAssociadoData');
    const user = stored ? JSON.parse(stored) : {};
    const cpf = String(user.cpf || '').replace(/\D/g, '');
    const nome = user.nome || 'Associado';
    const planoNome = user.plano || 'Mensalidade';

    const invoiceId = `mensalidade-${cpf || 'anon'}-${dueDate}`;

    if (planoEl) planoEl.textContent = planoNome;
    if (vencEl) vencEl.textContent = dueBR || dueDate;
    if (valorEl) valorEl.textContent = valorBRL;
    if (totalEl) totalEl.textContent = valorBRL;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
      // Obtém empresa ativa
      const empresaId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

      if (!empresaId) {
        if (qrContainer) {
          qrContainer.innerHTML = `
            <div class="w-48 h-48 bg-gray-100 rounded-lg border flex flex-col items-center justify-center p-4">
              <i class="fas fa-building text-4xl text-gray-400 mb-2"></i>
              <p class="text-xs text-gray-500 text-center">Selecione uma empresa para gerar cobranças</p>
            </div>`;
        }
        return;
      }

      // URL da API (local ou produção)
      const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4570/api'
        : 'https://qualify-2026.onrender.com/api';

      const resp = await fetch(`${API_BASE}/pix/cobv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          invoiceId,
          valor: amount,
          vencimento: dueDate,
          pagador: { cpf, nome },
          descricao: `Mensalidade ${planoNome}`
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (qrContainer) {
          // Mensagem de erro mais detalhada
          let errorMsg = 'Não foi possível gerar o QR Code';
          if (data.code === 'BANK_CONFIG_NOT_FOUND') {
            errorMsg = 'Configure a integração bancária em Configurações > Integrações Bancárias';
          } else if (data.code === 'BANK_INTEGRATION_DISABLED') {
            errorMsg = 'Integração bancária desativada. Execute o teste de conexão.';
          } else if (data.error) {
            errorMsg = data.error;
          }
          qrContainer.innerHTML = `
            <div class="w-48 h-48 bg-gray-100 rounded-lg border flex flex-col items-center justify-center p-4">
              <i class="fas fa-exclamation-circle text-4xl text-red-400 mb-2"></i>
              <p class="text-xs text-gray-500 text-center">${errorMsg}</p>
            </div>`;
        }
        return;
      }
      const { qrcode, imagemQrcode } = data;
      if (qrContainer) {
        if (imagemQrcode && imagemQrcode.startsWith('data:image')) {
          qrContainer.innerHTML = `<img alt=\"QR Code PIX\" class=\"rounded-md\" src=\"${imagemQrcode}\" />`;
        } else {
          qrContainer.innerHTML = `\n            <div class=\"w-48 h-48 bg-gray-100 rounded-lg border flex items-center justify-center\">\n              <i class=\"fas fa-qrcode text-4xl text-gray-400\"></i>\n            </div>`;
        }
      }
      if (copyBtn) {
        copyBtn.onclick = async () => {
          if (!qrcode) return;
          try {
            await navigator.clipboard.writeText(qrcode);
            copyBtn.textContent = 'Copiado!';
            setTimeout(() => (copyBtn.textContent = 'Copiar Código PIX'), 2000);
          } catch (e) { }
        };
      }
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(async () => {
        try {
          const s = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/status?empresaId=${empresaId}`);
          const sj = await s.json();
          if (sj && sj.status === 'PAGA') {
            if (statusBadge) {
              statusBadge.textContent = 'Em dia';
              statusBadge.classList.add('pago');
              statusBadge.classList.remove('vencido');
            }
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            clearInterval(pollTimer);
          }
        } catch (e) { }
      }, 5000);
    } catch (error) {
      console.error('Erro ao iniciar checkout PIX:', error);
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if (pollTimer) clearInterval(pollTimer);
      };
    }
  }

  if (payBtn) {
    payBtn.addEventListener('click', startCheckout);
  }
});