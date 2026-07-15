;(function () {
  const KEEP_PREFIXES = [
    'familias',
    'associados',
    'contratos',
    'planos',
    'planos_',
    'CONTRACT_EDIT_',
    'CONTRACT_EDIT_HISTORY_',
    'CONTRACT_DOCS_',
    'CONTRACT_EVENTS_',
    'CONTRACT_REMINDERS_',
    'CONTRACT_RENOV_'
  ]
  const shouldKeep = (key) => {
    try {
      return KEEP_PREFIXES.some((p) => key === p || key.startsWith(p))
    } catch (_) {
      return false
    }
  }
  const originalClear = window.localStorage && window.localStorage.clear ? window.localStorage.clear.bind(window.localStorage) : null
  const originalSessionClear = window.sessionStorage && window.sessionStorage.clear ? window.sessionStorage.clear.bind(window.sessionStorage) : null
  function safeClearLocalStorage() {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) keys.push(k)
      }
      keys.forEach((k) => {
        if (!shouldKeep(k)) {
          try {
            localStorage.removeItem(k)
          } catch (_) {}
        }
      })
    } catch (_) {}
  }
  function safeClearSessionStorage() {
    try {
      if (!originalSessionClear) return
      originalSessionClear()
    } catch (_) {}
  }
  // Monkey-patch clears to be safe by default
  try {
    if (window.localStorage) {
      window.localStorage.clear = safeClearLocalStorage
    }
    if (window.sessionStorage) {
      window.sessionStorage.clear = safeClearSessionStorage
    }
  } catch (_) {}
  // Expose explicit APIs
  window.safeClearStorage = function () {
    safeClearLocalStorage()
    safeClearSessionStorage()
  }
})()
