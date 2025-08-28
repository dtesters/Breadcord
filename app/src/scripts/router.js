// Minimal internal router for Breadcord UI (no external deps)
(function () {
  const listeners = new Set();

  function getPath() {
    try { return new URL(window.location.href).pathname; } catch { return '/'; }
  }

  function notify() {
    const path = getPath();
    for (const fn of listeners) try { fn(path); } catch {}
  }

  window.BreadRouter = {
    navigate(path) {
      if (!path || typeof path !== 'string') return;
      const url = new URL(window.location.href);
      if (url.pathname === path) return;
      url.pathname = path;
      history.pushState({}, '', url.toString());
      notify();
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    path: getPath,
  };

  window.addEventListener('popstate', notify);
})();


