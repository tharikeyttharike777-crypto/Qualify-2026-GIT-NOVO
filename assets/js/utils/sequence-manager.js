// SequenceManager: contador sequencial único por empresa/conta
// Versão Supabase - usa localStorage como fonte principal
(function() {
  'use strict';

  function pad7(n) {
    const num = parseInt(n, 10) || 0;
    return String(Math.min(num, 9999999)).padStart(7, '0');
  }

  function getActiveCompanyId() {
    try {
      if (window.multitenantConfig && typeof window.multitenantConfig.getActiveCompany === 'function') {
        const comp = window.multitenantConfig.getActiveCompany();
        if (comp && (comp.id || comp.companyId)) return comp.id || comp.companyId;
      }
    } catch {}
    const keys = ['activeCompanyId', 'empresaSelecionadaId', 'activeCompany'];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      try {
        const obj = JSON.parse(v);
        if (obj && (obj.id || obj.companyId)) return obj.id || obj.companyId;
      } catch {
        if (String(v).trim()) return String(v);
      }
    }
    return 'no-company';
  }

  function localKey(companyId, entity) {
    return `seq:${companyId || 'no-company'}:${entity}`;
  }

  // Gera próximo ID sequencial via localStorage (sem Firebase)
  function nextLocal(companyId, entity) {
    const key = localKey(companyId, entity);
    const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const next = Math.min(current + 1, 9999999);
    localStorage.setItem(key, String(next));
    const formatted = pad7(next);
    console.log(`[SequenceManager] ${entity} -> ${formatted} via localStorage (company=${companyId})`);
    return formatted;
  }

  function peekLocal(companyId, entity) {
    const key = localKey(companyId, entity);
    const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    return pad7(Math.min(current + 1, 9999999));
  }

  const SequenceManager = {
    // Retorna Promise para compatibilidade com código que usa await
    async next(entity) {
      const companyId = getActiveCompanyId();
      return nextLocal(companyId, entity);
    },
    async peek(entity) {
      const companyId = getActiveCompanyId();
      return peekLocal(companyId, entity);
    },
    // Versão síncrona para uso sem await quando necessário
    nextSync(entity) {
      const companyId = getActiveCompanyId();
      return nextLocal(companyId, entity);
    }
  };

  window.SequenceManager = SequenceManager;
})();