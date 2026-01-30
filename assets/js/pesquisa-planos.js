// Pesquisa de Planos - Refeito do zero com listagem funcional
(function(){
  function getActiveCompanyId() {
    try {
      const activeCompanyStr = localStorage.getItem('activeCompany');
      const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
      return activeCompany?.id || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
    } catch (_) {
      return localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || 'default';
    }
  }

  function waitForFirebaseReady(timeoutMs) {
    return new Promise((resolve) => {
      if (window.firebase && window.db) {
        resolve(true);
        return;
      }
      let elapsed = 0;
      const interval = 100;
      const check = () => {
        if (window.firebase && window.db) {
          resolve(true);
        } else if (elapsed >= timeoutMs) {
          resolve(false);
        } else {
          elapsed += interval;
          setTimeout(check, interval);
        }
      };
      window.addEventListener('firebaseReady', () => resolve(true), { once: true });
      check();
    });
  }

  function normalizeMoney(val) {
    if (val == null || val === '') return 'R$ 0,00';
    const s = String(val).trim();
    return s.startsWith('R$') ? s : `R$ ${s}`;
  }

  function normalizeGrace(val) {
    if (val == null || val === '') return '0 dias';
    const n = parseInt(String(val).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? `${n} dias` : String(val);
  }

  async function loadPlansMerged() {
    const companyId = getActiveCompanyId();
    const ready = await waitForFirebaseReady(3000);
    const plans = [];

    // 1) Firestore (companies/empresas), se disponível
    if (ready && window.db) {
      let loaded = false;
      // Multitenant helper se existir
      if (window.getCompanyCollection) {
        try {
          const snap = await window.getCompanyCollection('planos').get();
          const docs = snap?.docs || [];
          docs.forEach(doc => plans.push({ id: parseInt(doc.id, 10) || doc.id, ...doc.data() }));
          loaded = docs.length > 0;
        } catch (_) {}
      }
      if (!loaded) {
        const bases = ['companies', 'empresas'];
        for (const base of bases) {
          try {
            const path = `${base}/${companyId}/planos`;
            const snap = await window.db.collection(path).get();
            const docs = snap?.docs || [];
            docs.forEach(doc => plans.push({ id: parseInt(doc.id, 10) || doc.id, ...doc.data() }));
            if (docs.length > 0) break;
          } catch (_) {}
        }
      }
    }

    // 2) LocalStorage por empresa, depois global
    try {
      const perCompanyKey = companyId ? `planos_${companyId}` : null;
      const savedCompany = perCompanyKey ? localStorage.getItem(perCompanyKey) : null;
      const savedGlobal = localStorage.getItem('planos');
      const localCompany = savedCompany ? JSON.parse(savedCompany) : [];
      const localGlobal = savedGlobal ? JSON.parse(savedGlobal) : [];

      // Mesclar com deduplicação por id
      const map = new Map();
      [...plans, ...localCompany, ...localGlobal].forEach(p => {
        const pid = parseInt(p.id, 10);
        const key = Number.isFinite(pid) ? pid : String(p.id);
        if (!map.has(key)) map.set(key, p);
      });
      const merged = Array.from(map.values());

      // Ordenar por nome
      merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      return merged;
    } catch(_) {
      return plans;
    }
  }

  function renderPlans(plans) {
    const tbody = document.getElementById('plansTableBody');
    const countEl = document.getElementById('plansCount');
    if (!tbody) return;
    if (countEl) countEl.textContent = `${plans.length} plano(s) encontrado(s)`;

    if (plans.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-4">
            <i class="fas fa-search fa-2x text-muted mb-2"></i>
            <p class="text-muted mb-0">Nenhum plano encontrado</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = plans.map(plan => `
      <tr>
        <td>
          <div class="table-actions d-flex gap-2">
            <a class="btn btn-outline-success btn-sm" href="novo-plano.html?id=${plan.id}">
              <i class="fas fa-pencil-alt me-1"></i>Editar
            </a>
            <a class="btn btn-outline-primary btn-sm" href="catalogo-planos.html?planId=${plan.id}">
              <i class="fas fa-file-alt me-1"></i>Detalhes
            </a>
          </div>
        </td>
        <td>
          <div class="photo-placeholder"><i class="fas fa-image"></i></div>
        </td>
        <td><strong>${plan.name || '-'}</strong></td>
        <td>
          <span class="badge ${plan.publicPage === 'sim' ? 'bg-success' : 'bg-secondary'}">
            ${plan.publicPage === 'sim' ? 'Sim' : 'Não'}
          </span>
        </td>
        <td>${normalizeGrace(plan.gracePeriod)}</td>
        <td>${normalizeMoney(plan.adhesionValue ?? plan.valorAdesao)}</td>
        <td>${normalizeMoney(plan.monthlyValue ?? plan.valorMensalidade)}</td>
        <td>${normalizeMoney(plan.annualValue ?? plan.valorAnual)}</td>
        <td>${plan.maxPeople ?? '-'}</td>
        <td>${normalizeMoney(plan.dependentAdditional ?? plan.adicionalDependente)}</td>
      </tr>
    `).join('');
  }

  async function init() {
    try {
      const plans = await loadPlansMerged();
      renderPlans(plans);
    } catch (_) {
      renderPlans([]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
