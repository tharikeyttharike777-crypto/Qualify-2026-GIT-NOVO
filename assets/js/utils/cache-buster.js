;(function () {
  const stamp = Date.now().toString()
  const addParam = (url) => {
    try {
      const u = new URL(url, window.location.href)
      u.searchParams.set('cb', stamp)
      return u.toString()
    } catch (_) {
      const has = /([?&])cb=\d+/.test(url)
      if (has) return url.replace(/cb=\d+/, 'cb=' + stamp)
      const sep = url.includes('?') ? '&' : '?'
      return url + sep + 'cb=' + stamp
    }
  }
  const scripts = Array.from(document.querySelectorAll('script[src]'))
  scripts.forEach((el) => {
    const src = el.getAttribute('src') || ''
    if (src.includes('cache-buster.js')) return
    el.setAttribute('src', addParam(src))
  })
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
  links.forEach((el) => {
    const href = el.getAttribute('href') || ''
    el.setAttribute('href', addParam(href))
  })
  const imgs = Array.from(document.querySelectorAll('img[src]'))
  imgs.forEach((el) => {
    const src = el.getAttribute('src') || ''
    el.setAttribute('src', addParam(src))
  })
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
  }
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('cb', stamp)
    if (!window.location.search.includes('cb=')) {
      window.history.replaceState(null, document.title, url.toString())
    }
  } catch (_) {}
})()
