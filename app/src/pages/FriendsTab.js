// Friends Tab: header + tabs + search + lists (Friends + Activity)
// This page uses BreadUI containers created by breadcord_ui and renders into
// the "breadcord-message-container" main content area. It also renders the DM
// list into the left sidebar (sidebar-channels-list) when on /friends.

(function () {
  const STATE = {
    tab: 'online', // all|online|pending|blocked|add (default: online)
    q: '',
    disposeFns: [],
  };

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

  // Discord snowflake -> ms
  function snowflakeToMs(id) {
    try {
      const ms = Number((BigInt(String(id)) >> 22n) + 1420070400000n);
      return Number.isFinite(ms) ? ms : 0;
    } catch {
      return 0;
    }
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
        // ensure we have a user object (READY may not embed it)
        const user = r.user || getUserById(r.id) || {};
        out.push({ ...r, user });
      }
    }
    return out;
  }

  function derivePending() {
    const rels = getRelationships();
    return rels.filter(r => r.type === 3 || r.type === 4);
  }

  function deriveBlocked() {
    const rels = getRelationships();
    return rels.filter(r => r.type === 2);
  }

  function isOnline(rel) {
    // Treat missing presence as online (until presence events are fully wired)
    const status = rel?.presence?.status;
    if (!status) return true;
    return status !== 'offline';
  }

  function deriveOnline(list) {
    return list.filter(isOnline);
  }

  function mountHeader(host) {
    const header = el('div', 'friends-header');
    header.setAttribute('role', 'tablist');

    const tabs = [
      { id: 'all', label: 'All' },
      { id: 'online', label: 'Online' },
      { id: 'pending', label: 'Pending' },
      { id: 'blocked', label: 'Blocked' },
      { id: 'add', label: 'Add Friend' },
    ];
    for (const t of tabs) {
      const btn = el('button', 'friends-tab', { 'role': 'tab', 'aria-selected': String(STATE.tab === t.id), 'data-tab': t.id, text: t.label });
      btn.addEventListener('click', () => {
        STATE.tab = t.id; render();
      });
      header.appendChild(btn);
    }

    const search = el('input', 'friends-search', { type: 'search', placeholder: 'Search' });
    let debounce;
    search.addEventListener('input', (e) => {
      const v = e.target.value || '';
      clearTimeout(debounce);
      debounce = setTimeout(() => { STATE.q = v; renderLists(); }, 150);
    });
    header.appendChild(search);

    host.appendChild(header);
    // Plugin hook
    BreadAPI.emit('friends:tab:header', { containerEl: header });
  }

  function matchesQuery(name, q) {
    if (!q) return true;
    const n = (name || '').toLowerCase();
    const s = q.toLowerCase();
    return n.includes(s);
  }

  function mountSection(titleText) {
    const wrap = el('section', 'friends-section');
    const h = el('div', 'friends-section-title', { text: titleText });
    wrap.appendChild(h);
    const list = el('div', 'friends-list');
    list.setAttribute('role', 'listbox');
    wrap.appendChild(list);
    return { wrap, list };
  }

  // Render DMs into the left sidebar (plain DOM to avoid BreadUI container id conflicts)
  function renderDMsSidebar() {
    const sidebarDom = document.querySelector('[data-container-id="sidebar-channels-list"]');
    if (!sidebarDom) return;

    // Clear existing children
    while (sidebarDom.firstChild) sidebarDom.removeChild(sidebarDom.firstChild);

    // Header (mimic category styles)
    const cat = document.createElement('div');
    cat.setAttribute('data-type', 'category-dms');
    cat.textContent = 'Direct Messages';
    sidebarDom.appendChild(cat);

    // Build list
    const dms = (BreadCache?.getPrivateChannels?.() || []).map(x => x);
    const normalized = dms.map(ch => ({
      id: ch.id,
      name: ch.recipients?.map?.(u => u.username).join(', ') || 'DM',
      lastMessageId: ch?.last_message_id || null,
      avatarUrl: ch.recipients?.[0]?.avatar ? `https://cdn.discordapp.com/avatars/${ch.recipients[0].id}/${ch.recipients[0].avatar}.png` : '',
    }));

    // Sort by last message timestamp desc (Discord behavior)
    normalized.sort((a, b) => snowflakeToMs(b.lastMessageId) - snowflakeToMs(a.lastMessageId));

    for (const dm of normalized) {
      const row = document.createElement('div');
      row.setAttribute('data-container-id', `channel-dm-${dm.id}`);

      const icon = document.createElement('div');
      icon.setAttribute('data-type', `channelicon-dm-${dm.id}`);
      if (dm.avatarUrl) icon.innerHTML = `<img class="avatar" src="${sanitize(dm.avatarUrl)}" alt="" width="20" height="20">`;

      const text = document.createElement('div');
      text.setAttribute('data-type', `channeltext-dm-${dm.id}`);
      text.textContent = dm.name;

      row.appendChild(icon);
      row.appendChild(text);

      row.addEventListener('click', () => { console.log('[FriendsTab] Open DM', dm.id); });
      sidebarDom.appendChild(row);

      BreadAPI.emit('dm:list:item:after', { el: row, dm });
    }
  }

  function renderFriends(container) {
    let list = deriveFriends();
    if (STATE.tab === 'online') list = deriveOnline(list);
    if (STATE.tab === 'pending') list = derivePending();
    if (STATE.tab === 'blocked') list = deriveBlocked();

    // Sort by username (case-insensitive), then id
    list.sort((a, b) => {
      const an = (a.user?.global_name || a.user?.username || '').toLowerCase();
      const bn = (b.user?.global_name || b.user?.username || '').toLowerCase();
      if (an !== bn) return an < bn ? -1 : 1;
      const ai = String(a.user?.id || a.id || '');
      const bi = String(b.user?.id || b.id || '');
      return ai.localeCompare(bi);
    });

    const q = STATE.q;
    container.innerHTML = '';
    for (const r of list) {
      const u = r.user || {};
      if (!matchesQuery(u.username || u.global_name, q)) continue;
      const row = el('div', 'friend-row');
      row.setAttribute('role', 'option');
      row.innerHTML = `<img class="avatar" alt="" width="32" height="32" src="${sanitize(u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : '')}"> <span>${sanitize(u.global_name || u.username || '')}</span>`;
      container.appendChild(row);
      BreadAPI.emit('friends:list:item:after', { el: row, friend: r });
    }

    // Empty state
    if (!container.children.length) {
      const empty = el('div', 'friend-row', { text: 'No friends to show.' });
      container.appendChild(empty);
    }
  }

  function renderActivity(container) {
    container.innerHTML = '';
    const list = deriveFriends();
    for (const r of list.slice(0, 50)) {
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
  }

  function renderLists() {
    const host = document.querySelector('[data-container-id="breadcord-message-container"]');
    if (!host) return;
    const body = host.querySelector('.friends-body');
    if (!body) return;
    const friendsList = body.querySelector('.friends-friends');
    const activityList = body.querySelector('.friends-activity');
    // Sidebar DMs
    renderDMsSidebar();
    // Main content
    renderFriends(friendsList);
    if (window.ActivityPanel?.mount) {
      window.ActivityPanel.mount(activityList);
    } else {
      // fallback to inline if ActivityPanel not loaded yet
      renderActivity(activityList);
    }
  }

  function render() {
    const host = document.querySelector('[data-container-id="breadcord-message-container"]');
    if (!host) return;
    host.innerHTML = '';

    const headerMount = el('div', 'friends-header-mount');
    mountHeader(headerMount);
    host.appendChild(headerMount);

    const body = el('div', 'friends-body');
    const secFriends = mountSection('Friends');
    secFriends.list.classList.add('friends-friends', 'scroll-stable');
    const secActivity = mountSection('Activity');
    secActivity.list.classList.add('friends-activity', 'scroll-stable');

    body.appendChild(secFriends.wrap);
    body.appendChild(secActivity.wrap);
    host.appendChild(body);

    renderLists();
  }

  window.FriendsTab = {
    mount: render,
  };
})();


