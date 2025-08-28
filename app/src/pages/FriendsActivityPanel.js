(function () {
  function el(tag, className, attrs = {}) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    return n;
  }

  function sanitize(text) {
    return String(text || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function getRelationships() {
    try { return BreadCache ? BreadCache.getRelationships?.() || [] : []; } catch { return []; }
  }

  function getUserById(id) {
    try { return BreadCache?.getUser?.(id) || null; } catch { return null; }
  }

  function deriveFriends() {
    const rels = getRelationships();
    const out = [];
    for (const r of rels) {
      if (r.type === 1) {
        const user = r.user || getUserById(r.id) || {};
        out.push({ ...r, user });
      }
    }
    return out;
  }

  function render(container) {
    container.innerHTML = '';
    const list = deriveFriends();
    for (const r of list.slice(0, 100)) {
      const u = r.user || {};
      const presence = BreadCache?.getPresence?.(u.id) || {};
      const status = presence.status || 'offline';
      const primaryActivity = Array.isArray(presence.activities) && presence.activities.find(a => (a.type === 0 || a.type === 2 || a.type === 4)) || presence.activities?.[0];
      const activityText = primaryActivity ? (primaryActivity.name || primaryActivity.state || 'Active') : (status === 'online' ? 'Online' : status);
      const card = el('div', 'activity-card');
      card.innerHTML = `<div class="row"><img class="avatar" width="24" height="24" alt="" src="${sanitize(u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : '')}"><strong>${sanitize(u.global_name || u.username || '')}</strong><span class="time">${sanitize(status)}</span></div><div class="detail">${sanitize(activityText)}</div>`;
      container.appendChild(card);
      BreadAPI.emit('friends:activity:item:after', { el: card, activity: { userId: u.id, type: primaryActivity?.type || 'custom', presence } });
    }
    if (!container.children.length) {
      const empty = el('div', 'friend-row', { text: 'No recent activity.' });
      container.appendChild(empty);
    }
  }

  function mount(containerEl) {
    if (!containerEl) return () => {};
    render(containerEl);
    let off = () => {};
    if (typeof BreadCache?.onPresenceUpdate === 'function') {
      off = BreadCache.onPresenceUpdate(() => render(containerEl));
    }
    return () => { try { off(); } catch {} };
  }

  window.ActivityPanel = { mount };
})();


