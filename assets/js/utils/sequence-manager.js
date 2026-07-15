// SequenceManager: contador sequencial único por empresa/conta
// - IDs com 7 dígitos, zeros à esquerda
// - Atomicidade via transações do Firestore
// - Logs de auditoria por geração
(function() {
  'use strict';

  function pad7(n) {
    const num = parseInt(n, 10) || 0;
    return String(Math.min(num, 9999999)).padStart(7, '0');
  }

  function waitForFirebaseReady() {
    return new Promise((resolve) => {
      if (window.firebase && window.db) {
        resolve();
        return;
      }
      const check = () => {
        if (window.firebase && window.db) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      window.addEventListener('firebaseReady', () => resolve(), { once: true });
      check();
    });
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
    return null;
  }

  function localKey(companyId, entity) {
    return `seq:${companyId || 'no-company'}:${entity}`;
  }

  async function runTransactionWithFallback(companyId, entity, action) {
    await waitForFirebaseReady();
    const db = window.db;
    const auth = window.auth || (window.firebase ? window.firebase.auth() : null);
    const user = auth && typeof auth.currentUser === 'object' ? auth.currentUser : null;

    if (!db || !companyId) {
      // Fallback localStorage (não-atomico entre abas)
      const key = localKey(companyId, entity);
      const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      const next = Math.min(current + 1, 9999999);
      localStorage.setItem(key, String(next));
      console.warn(`[SequenceManager][fallback] ${entity} -> ${pad7(next)} (company=${companyId || 'unknown'})`);
      return { next, formatted: pad7(next), origin: 'local' };
    }

    // Prefer path: empresas/{id}/counters/sequences
    const docRef = db.collection(`empresas/${companyId}/counters`).doc('sequences');
    const logsCol = db.collection(`empresas/${companyId}/sequence_logs`);

    return db.runTransaction(async (t) => {
      const snap = await t.get(docRef);
      const data = snap.exists ? (snap.data() || {}) : {};
      const current = parseInt(data[entity] || 0, 10) || 0;
      const next = Math.min(current + 1, 9999999);

      // Atualiza contador
      const updateData = {
        [entity]: next,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user ? user.uid : null
      };
      t.set(docRef, updateData, { merge: true });

      // Log de auditoria (dentro da transação)
      const logRef = logsCol.doc();
      t.set(logRef, {
        entity,
        next,
        formatted: pad7(next),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: user ? user.uid : null
      });

      return { next, formatted: pad7(next), origin: 'firestore' };
    }).catch(async (err) => {
      console.warn('[SequenceManager] Falha na transação, usando fallback local:', err && err.message ? err.message : err);
      const key = localKey(companyId, entity);
      const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      const next = Math.min(current + 1, 9999999);
      localStorage.setItem(key, String(next));
      return { next, formatted: pad7(next), origin: 'local' };
    });
  }

  async function readPeek(companyId, entity) {
    await waitForFirebaseReady();
    const db = window.db;
    if (!db || !companyId) {
      const key = localKey(companyId, entity);
      const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      return pad7(Math.min(current + 1, 9999999));
    }
    try {
      const docRef = db.collection(`empresas/${companyId}/counters`).doc('sequences');
      const snap = await docRef.get();
      const data = snap.exists ? (snap.data() || {}) : {};
      const current = parseInt(data[entity] || 0, 10) || 0;
      return pad7(Math.min(current + 1, 9999999));
    } catch (e) {
      const key = localKey(companyId, entity);
      const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      return pad7(Math.min(current + 1, 9999999));
    }
  }

  const SequenceManager = {
    async next(entity) {
      const companyId = getActiveCompanyId();
      const result = await runTransactionWithFallback(companyId, entity, 'next');
      console.log(`[SequenceManager] ${entity} -> ${result.formatted} via ${result.origin}`);
      return result.formatted;
    },
    async peek(entity) {
      const companyId = getActiveCompanyId();
      const formatted = await readPeek(companyId, entity);
      console.log(`[SequenceManager][peek] ${entity} -> ${formatted}`);
      return formatted;
    }
  };

  window.SequenceManager = SequenceManager;
})();