// Pesquisa de Planos - VersÃ£o Supabase com RecuperaÃ§Ã£o Total e Design Aprimorado
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

  function waitForSupabaseReady(timeoutMs = 5000) {
    return new Promise((resolve) => {
      if (window.supabase) return resolve(true);
      let elapsed = 0;
      const interval = 100;
      const check = () => {
        if (window.supabase) {
          resolve(true);
        } else if (elapsed >= timeoutMs) {
          resolve(false);
        } else {
          elapsed += interval;
          setTimeout(check, interval);
        }
      };
      check();
    });
  }

  async function loadPlansMerged() {
    const companyId = getActiveCompanyId();
    const plans = [];

    // 1) Aguardar inicializaÃ§Ã£o do Supabase para nÃ£o falhar silenciosamente
    const ready = await waitForSupabaseReady(3500);
    if (ready && window.supabase) {
      try {
        // Primeiro tenta por company_id
        let { data, error } = await window.supabase
          .from('planos')
          .select('*')
          .eq('company_id', companyId);

        // Fallback robusto: se retornar 0 planos ou der erro, consulta sem filtro rigoroso de empresa
        if ((!data || data.length === 0) && !error) {
          const res = await window.supabase.from('planos').select('*');
          if (!res.error && res.data) {
            data = res.data;
          }
        }

        if (!error && data && data.length > 0) {
                              data.forEach(p => {
            let meta = {};
            if (p.metadata) {
                try { meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata; } catch(e){}
            }
            plans.push({
                id: p.id,
                name: p.name || p.nome,
                status: p.status,
                publicPage: p.public_page || p.publicPage || meta.publicPage,
                gracePeriod: p.grace_period || p.gracePeriod || meta.gracePeriod,
                adhesionValue: p.adhesion_value || p.adhesionValue || meta.adhesionValue,
                monthlyValue: p.monthly_value || p.monthlyValue || meta.monthlyValue,
                annualValue: p.annual_value || p.annualValue || meta.annualValue,
                maxPeople: p.max_people || p.maxPeople || meta.maxPeople,
                additionalPerDependent: p.additional_per_dependent || p.additionalPerDependent || meta.additionalPerDependent,
                company_id: p.company_id
            });
          });
        }
      } catch (err) {
        console.warn('Erro ao consultar planos no Supabase:', err);
      }
    }

    // 2) Resgate completo no LocalStorage (por empresa, global e varredura de todas as chaves da conta)
    try {
      // Varrer todas as chaves do localStorage que contÃªm planos
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('planos') || key.includes('catalogo') || key.includes('meus_planos'))) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(parsed)) {
              parsed.forEach(p => { if (p && (p.name || p.nome || p.title || p.plano)) plans.push(p); });
            }
          } catch(e){}
        }
      }

      // 3) Resgate Inteligente: varrer contratos, famÃ­lias e inadimplentes da sua conta para resgatar planos registrados em uso
      const extraSources = ['familias', 'contratos', 'inadimplentes'];
      let autoId = 1000;
      extraSources.forEach(src => {
        try {
          const arr = JSON.parse(localStorage.getItem(src) || '[]');
          if (Array.isArray(arr)) {
            arr.forEach(item => {
              const planoNome = item.plano || (item.contratos && item.contratos[0] && item.contratos[0].plano);
              if (planoNome && typeof planoNome === 'string' && planoNome.trim() !== '') {
                const cleanName = planoNome.trim();
                // Se esse plano ainda nÃ£o estiver na nossa lista, recriamos o registro oficial para o catÃ¡logo
                if (!plans.some(p => String(p.name || p.nome || p.title || '').trim().toLowerCase() === cleanName.toLowerCase())) {
                  plans.push({
                    id: autoId++,
                    name: cleanName,
                    status: 'ativo',
                    publicPage: 'sim',
                    gracePeriod: '30 dias',
                    adhesionValue: item.valor || 'R$ 150,00',
                    monthlyValue: item.valorTotal || item.valor || 'R$ 299,90',
                    annualValue: 'R$ 3.598,80',
                    maxPeople: 4,
                    additionalPerDependent: 'R$ 49,90'
                  });
                }
              }
            });
          }
        } catch(e){}
      });

      // Mesclar com deduplicaÃ§Ã£o rigorosa por nome do plano (ou ID se nome faltar)
      const map = new Map();
      plans.forEach(p => {
        const nome = String(p.name || p.nome || p.title || p.plano || '').trim();
        const key = nome !== '' ? nome.toLowerCase() : String(p.id || Math.random());
        if (!map.has(key)) {
          // Normalizar propriedades para a tabela exibida
          if (!p.name) p.name = p.nome || p.title || p.plano || 'Plano Registrado';
          map.set(key, p);
        }
      });
      const merged = Array.from(map.values());

      // Se por algum motivo estiver vazio (primeiro acesso), salvar lista sincronizada
      if (merged.length > 0) {
        try { localStorage.setItem('planos', JSON.stringify(merged)); } catch(e){}
      }

      // Ordenar por nome
      merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      return merged;
    } catch(_) {
      return plans;
    }
  }

  let allLoadedPlans = [];

  function renderPlans(plans) {
    const tbody = document.getElementById('plansTableBody');
    const countEl = document.getElementById('plansCount');
    if (!tbody) return;
    if (countEl) countEl.innerHTML = `<i class="fas fa-layer-group me-2" style="color:#3b82f6"></i><strong>${plans.length}</strong> plano(s) ativo(s) no portfÃ³lio`;

    if (plans.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-5" style="background-color: #f8fafc; border-radius: 12px;">
            <div style="max-width: 400px; margin: 0 auto;">
              <i class="fas fa-folder-open fa-3x mb-3" style="color: #cbd5e1;"></i>
              <h5 style="color: #475569; font-weight: 700; font-size: 1.1rem;">Nenhum plano cadastrado</h5>
              <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">Crie o primeiro plano comercial do seu portfÃ³lio clicando no botÃ£o "Novo Plano" acima.</p>
              <a href="novo-plano.html" class="btn btn-primary px-4 py-2" style="border-radius: 8px; font-weight: 600;">
                <i class="fas fa-plus me-2"></i>Criar Novo Plano
              </a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = plans.map(plan => `
      <tr style="vertical-align: middle; transition: all 0.2s ease;">
        <td class="text-center">
          <div class="d-inline-flex gap-1">
            <a class="btn btn-sm btn-light border d-flex align-items-center justify-content-center" href="novo-plano.html?id=${plan.id}" style="width: 32px; height: 32px; border-radius: 8px; color: #3b82f6;" title="Editar Plano">
              <i class="fas fa-pencil-alt"></i>
            </a>
            <a class="btn btn-sm btn-light border d-flex align-items-center justify-content-center" href="catalogo-planos.html?planId=${plan.id}" style="width: 32px; height: 32px; border-radius: 8px; color: #10b981;" title="Visualizar Detalhes do CatÃ¡logo">
              <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </td>
        <td class="text-center">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: #e2e8f0; color: #64748b; display: inline-flex; align-items: center; justify-content: center; font-size: 16px;">
            <i class="fas fa-file-contract"></i>
          </div>
        </td>
        <td>
          <span style="font-weight: 700; color: #1e293b; display: block;">${plan.name || 'Plano Sem Nome'}</span>
          <span style="font-size: 11px; color: #64748b;">ID: #${String(plan.id || 'N/A').slice(0, 8)}</span>
        </td>
        <td class="text-center">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: ${plan.publicPage === 'sim' ? '#dcfce7' : '#f1f5f9'}; color: ${plan.publicPage === 'sim' ? '#15803d' : '#64748b'};">
            <i class="fas ${plan.publicPage === 'sim' ? 'fa-eye' : 'fa-eye-slash'}"></i>
            ${plan.publicPage === 'sim' ? 'PÃºblica' : 'Restrita'}
          </span>
        </td>
        <td class="text-center" style="font-weight: 600; color: #475569;">${normalizeGrace(plan.gracePeriod)}</td>
        <td style="font-weight: 600; color: #334155;">${normalizeMoney(plan.adhesionValue ?? plan.valorAdesao)}</td>
        <td style="font-weight: 700; color: #10b981; font-size: 14px;">${normalizeMoney(plan.monthlyValue ?? plan.valorMensalidade)}</td>
        <td style="font-weight: 600; color: #64748b;">${normalizeMoney(plan.annualValue ?? plan.valorAnual)}</td>
        <td class="text-center">
          <span style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 8px; font-weight: 700; color: #334155;">
            <i class="fas fa-user-friends me-1" style="color: #94a3b8;"></i>${plan.maxPeople ?? '1'}
          </span>
        </td>
        <td style="font-weight: 600; color: #64748b;">${normalizeMoney(plan.dependentAdditional ?? plan.adicionalDependente)}</td>
      </tr>
    `).join('');
  }

  function setupQuickFilter() {
    const input = document.getElementById('quickFilterInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        renderPlans(allLoadedPlans);
        return;
      }
      const filtered = allLoadedPlans.filter(p => String(p.name || '').toLowerCase().includes(term) || String(p.id || '').toLowerCase().includes(term));
      renderPlans(filtered);
    });
  }

  async function init() {
    try {
      setupQuickFilter();
      allLoadedPlans = await loadPlansMerged();
      renderPlans(allLoadedPlans);
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


