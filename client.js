// war crimes have been committed in the making of this code
// i speedran ts in around 4 hours dont expect it to be good

// lazy auth
if (!localStorage.getItem('token')) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(90, 60, 30, 0.7)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.background = '#c2a679';
    box.style.padding = '24px';
    box.style.borderRadius = '12px';
    box.style.boxShadow = '0 2px 12px rgba(90, 60, 30, 0.3)';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';
    box.style.border = '2px solid #a67c52';

    const label = document.createElement('label');
    label.textContent = 'Enter your Discord user token:';
    label.style.color = '#5c3a1e';
    label.style.marginBottom = '12px';
    label.style.fontWeight = 'bold';

    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '300px';
    input.style.padding = '8px';
    input.style.marginBottom = '12px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid #a67c52';
    input.style.background = '#f5e6c8';
    input.style.color = '#5c3a1e';

    const button = document.createElement('button');
    button.textContent = 'Submit';
    button.style.padding = '8px 16px';
    button.style.background = '#a67c52';
    button.style.color = '#fff8e1';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.boxShadow = '0 1px 4px rgba(90, 60, 30, 0.2)';

    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(button);
    modal.appendChild(box);
    document.body.appendChild(modal);

    button.addEventListener('click', () => {
        const token = input.value.trim();
        if (token) {
            localStorage.setItem('token', token);
            document.body.removeChild(modal);
            location.reload();
        } else {
            label.textContent = 'No token provided, please enter your token.';
            label.style.color = '#ff5555';
        }
    });
}

const log = (msg) => { document.getElementById('log').textContent += msg + '\n'; };

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const socket = new WebSocket(GATEWAY_URL);

let heartbeatInterval;

socket.onopen = () => { log('Connected to Gateway'); };

var USER_DATA = {}
var USER_RELATIONSHIPS = []
var USER_GUILDS = []
var PRIVATE_CHANNELS = []
var CURRENT_CHANNEL = null;
var CURRENT_GUILD_ID = null;
var USER_PRESENCES = {};
var CHANNEL_TYPING = {};
var LAST_TYPING_SENT_AT = 0;
var savedGuildId = localStorage.getItem('lastGuildId');
var savedChannelId = localStorage.getItem('lastChannelId');
var USER_DELETED_MESSAGES = [];

var recall_messages = ["breadcord the best", "garlic bread is cool", "yeetus cleetus this message has been deletus", "mods hes using vencodr :shock:", "abracadabra"]

function random_message() {
    // do not delete
    return recall_messages[Math.floor(Math.random() * recall_messages.length)]+" ||$#493$.34@||"; // trick people into thinking the gibberish causes the message to disappear
}


var AVATAR_BASE_URL = 'https://cdn.discordapp.com/avatars/';

const sidebar = document.getElementById('sidebar');

function applyUserPreferences() {
  try {
    const fontSize = localStorage.getItem('pref:fontSize');
    if (fontSize) {
      const old = document.getElementById('bc-font-style');
      if (old) old.remove();
      const style = document.createElement('style');
      style.id = 'bc-font-style';
      style.textContent = `#message-list .message .content .text{font-size:${fontSize}px !important}`;
      document.head.appendChild(style);
    }
  } catch (_) {}
}

function openModal(title, contentNode) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const header = document.createElement('div');
  header.className = 'modal-header';
  const h = document.createElement('div');
  h.className = 'modal-title';
  h.textContent = title;
  const close = document.createElement('button');
  close.className = 'close-btn';
  close.textContent = '✕';
  close.addEventListener('click', () => document.body.removeChild(overlay));
  header.appendChild(h);
  header.appendChild(close);
  modal.appendChild(header);
  modal.appendChild(contentNode);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
  return overlay;
}

function openSettingsModal() {
  const wrap = document.createElement('div');
  const row1 = document.createElement('div');
  row1.className = 'settings-row';
  row1.innerHTML = '<span>Message font size</span>';
  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.min = '10';
  sizeInput.max = '24';
  sizeInput.step = '1';
  sizeInput.value = localStorage.getItem('pref:fontSize') || '14';
  sizeInput.addEventListener('change', () => {
    localStorage.setItem('pref:fontSize', String(sizeInput.value));
    applyUserPreferences();
  });
  row1.appendChild(sizeInput);
  wrap.appendChild(row1);

  const hr = document.createElement('hr');
  hr.style.border = 'none';
  hr.style.borderTop = '1px solid #e0bf95';
  wrap.appendChild(hr);

  const row2 = document.createElement('div');
  row2.className = 'settings-row';
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'primary danger';
  logoutBtn.textContent = 'Log out';
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload();
  });
  row2.appendChild(document.createTextNode('Session'));
  row2.appendChild(logoutBtn);
  wrap.appendChild(row2);

  openModal('Settings', wrap);
}

function userAvatarUrl(user) {
  if (!user) return '';
  if (user.avatar) {
    const isAnimated = String(user.avatar).startsWith('a_');
    const format = isAnimated ? 'gif' : 'png';
    return `${AVATAR_BASE_URL}${user.id}/${user.avatar}.${format}`;
  }
  const discrim = Number(user.discriminator || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${discrim}.png`;
}

function openUserProfile(userId, guildId) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '10px';
  const img = document.createElement('img');
  img.style.width = '64px';
  img.style.height = '64px';
  img.style.borderRadius = '50%';
  header.appendChild(img);
  const name = document.createElement('div');
  name.style.fontSize = '16px';
  name.style.color = '#3a2e1c';
  name.style.fontWeight = '600';
  header.appendChild(name);
  wrap.appendChild(header);

  const about = document.createElement('div');
  about.style.whiteSpace = 'pre-wrap';
  about.style.fontSize = '14px';
  about.style.color = '#4a3e2f';
  wrap.appendChild(about);

  const overlay = openModal('Profile', wrap);

  fetch(`https://discord.com/api/v10/users/${userId}/profile`, { headers: { 'Authorization': localStorage.getItem('token') } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Profile fetch failed')))
    .then(p => {
      img.src = userAvatarUrl(p.user);
      name.textContent = (p.user.global_name || p.user.display_name || p.user.username) + ` (@${p.user.username})`;
      about.textContent = p.user_profile?.bio || '';
    })
    .catch(() => {})
    .finally(() => {
      if (!guildId) return;
      const guild = USER_GUILDS.find(g => g.id === guildId);
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { headers: { 'Authorization': localStorage.getItem('token') } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(m => {
          if (m.avatar) {
            const url = `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${m.avatar}.png`;
            img.src = url;
          } else if (!img.src) {
            img.src = userAvatarUrl(m.user);
          }
          if (m.nick) {
            name.textContent = m.nick + (m.user?.username ? ` (@${m.user.username})` : '');
          }
          if (Array.isArray(m.roles) && guild?.roles) {
            const badges = document.createElement('div');
            for (const roleId of m.roles) {
              const role = guild.roles.find(r => r.id === roleId);
              if (!role) continue;
              const b = document.createElement('span');
              b.className = 'role-badge';
              b.textContent = role.name;
              if (role.color && role.color !== 0) {
                b.style.backgroundColor = `#${role.color.toString(16).padStart(6, '0')}`;
                b.style.color = '#fff6e5';
              }
              badges.appendChild(b);
            }
            wrap.appendChild(badges);
          }
        })
        .catch(() => {
          const member = guild?.members?.find(m => m.user?.id === userId);
          const user = member?.user || USER_DATA;
          if (!img.src) img.src = userAvatarUrl(user);
          if (!name.textContent) name.textContent = (user.global_name || user.display_name || user.username) + (user.username ? ` (@${user.username})` : '');
        });
    });
}

function requestGuildMembers(guildId) {
  try {
    socket.send(JSON.stringify({ op: 8, d: { guild_id: guildId, query: '', limit: 1000 } }));
  } catch (_) {}
}

function presencePriority(status) {
  switch (status) {
    case 'online': return 0;
    case 'idle': return 1;
    case 'dnd': return 2;
    case 'invisible':
    case 'offline':
    default: return 3;
  }
}

function renderMemberList(guildId) {
  const container = document.getElementById('member-list');
  if (!container) return;
  container.innerHTML = '';
  const guild = USER_GUILDS.find(g => g.id === guildId);
  if (!guild) return;

  const roles = Array.isArray(guild.roles) ? [...guild.roles] : [];
  roles.sort((a,b) => b.position - a.position);
  const roleIdToRole = Object.fromEntries(roles.map(r => [r.id, r]));

  const members = Array.isArray(guild.members) ? [...guild.members] : [];
  if (members.length === 0) {
    const note = document.createElement('div');
    note.className = 'section-title';
    note.textContent = 'Fetching members…';
    container.appendChild(note);
    requestGuildMembers(guildId);
    return;
  }

  const buckets = new Map();
  for (const m of members) {
    const roleIds = Array.isArray(m.roles) ? m.roles : [];
    let highestRole = null;
    for (const id of roleIds) {
      const r = roleIdToRole[id];
      if (!r) continue;
      if (!highestRole || r.position > highestRole.position) highestRole = r;
    }
    const key = highestRole ? highestRole.id : '0';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  }

  const order = [...buckets.keys()].sort((a,b) => {
    if (a === '0') return 1;
    if (b === '0') return -1;
    return (roleIdToRole[b]?.position || 0) - (roleIdToRole[a]?.position || 0);
  });

  for (const key of order) {
    const title = document.createElement('div');
    title.className = 'section-title';
    if (key === '0') title.textContent = `Breadlings — ${buckets.get(key).length}`;
    else title.textContent = `${roleIdToRole[key]?.name || 'Members'} — ${buckets.get(key).length}`;
    container.appendChild(title);

    const list = buckets.get(key)
      .sort((a,b) => {
        const ap = presencePriority(USER_PRESENCES[a.user?.id] || 'offline');
        const bp = presencePriority(USER_PRESENCES[b.user?.id] || 'offline');
        if (ap !== bp) return ap - bp;
        const an = (a.nick || a.user?.global_name || a.user?.username || '').toLowerCase();
        const bn = (b.nick || b.user?.global_name || b.user?.username || '').toLowerCase();
        return an.localeCompare(bn);
      });
    for (const m of list) {
      const row = document.createElement('div');
      row.className = 'member';
      const avWrap = document.createElement('div');
      avWrap.style.position = 'relative';
      avWrap.style.width = '28px';
      avWrap.style.height = '28px';
      const av = document.createElement('img');
      av.className = 'avatar';
      av.src = userAvatarUrl(m.user);
      avWrap.appendChild(av);
      const dot = document.createElement('span');
      dot.className = 'presence-dot';
      const status = USER_PRESENCES[m.user?.id] || 'offline';
      const colorMap = { online: '#3ba55d', idle: '#faa61a', dnd: '#ed4245', offline: '#747f8d', invisible: '#747f8d' };
      dot.style.position = 'absolute';
      dot.style.right = '-2px';
      dot.style.bottom = '-2px';
      dot.style.background = colorMap[status] || '#747f8d';
      avWrap.appendChild(dot);
      const nm = document.createElement('div');
      nm.className = 'name';
      nm.textContent = m.nick || m.user?.global_name || m.user?.username || 'Unknown';
      row.appendChild(avWrap);
      row.appendChild(nm);
      row.addEventListener('click', () => openUserProfile(m.user?.id, guildId));
      container.appendChild(row);
    }
  }
}

function renderDMMemberList(channelId) {
  const container = document.getElementById('member-list');
  if (!container) return;
  container.innerHTML = '';
  const chan = PRIVATE_CHANNELS.find(c => String(c.id) === String(channelId));
  if (!chan) return;
  const participants = [...(chan.recipients || [])];
  participants.push(USER_DATA);
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = `Participants — ${participants.length}`;
  container.appendChild(title);
  participants
    .sort((a,b) => {
      const ap = presencePriority(USER_PRESENCES[a.id] || 'offline');
      const bp = presencePriority(USER_PRESENCES[b.id] || 'offline');
      if (ap !== bp) return ap - bp;
      return (a.global_name || a.username || '').localeCompare(b.global_name || b.username || '');
    })
    .forEach(u => {
      const row = document.createElement('div');
      row.className = 'member';
      const avWrap = document.createElement('div');
      avWrap.style.position = 'relative';
      avWrap.style.width = '28px';
      avWrap.style.height = '28px';
      const av = document.createElement('img');
      av.className = 'avatar';
      av.src = userAvatarUrl(u);
      avWrap.appendChild(av);
      const dot = document.createElement('span');
      dot.className = 'presence-dot';
      const status = USER_PRESENCES[u.id] || 'offline';
      const colorMap = { online: '#3ba55d', idle: '#faa61a', dnd: '#ed4245', offline: '#747f8d', invisible: '#747f8d' };
      dot.style.position = 'absolute';
      dot.style.right = '-2px';
      dot.style.bottom = '-2px';
      dot.style.background = colorMap[status] || '#747f8d';
      avWrap.appendChild(dot);
      const nm = document.createElement('div');
      nm.className = 'name';
      nm.textContent = u.global_name || u.username || 'Unknown';
      row.appendChild(avWrap);
      row.appendChild(nm);
      row.addEventListener('click', () => openUserProfile(u.id, CURRENT_GUILD_ID));
      container.appendChild(row);
    });
}

function renderTypingIndicator(channelId) {
  const elem = document.getElementById('typing-indicator');
  if (!elem) return;
  const now = Date.now();
  const map = CHANNEL_TYPING[channelId];
  if (!map) { elem.textContent = ''; return; }
  for (const [uid, until] of Array.from(map.entries())) {
    if (until <= now) map.delete(uid);
  }
  const users = Array.from(map.keys()).filter(uid => String(uid) !== String(USER_DATA.id));
  if (users.length === 0) { elem.textContent = ''; return; }
  const names = users.slice(0, 2).map(uid => {
    const u = PRIVATE_CHANNELS.flatMap(c => c.recipients || []).find(x => String(x.id) === String(uid))
          || USER_GUILDS.flatMap(g => (g.members || []).map(m => m.user)).find(x => String(x?.id) === String(uid));
    return u?.global_name || u?.username || 'Someone';
  });
  let text = '';
  if (users.length === 1) text = `${names[0]} is typing…`;
  else if (users.length === 2) text = `${names[0]} and ${names[1]} are typing…`;
  else text = `${names[0]}, ${names[1]} and ${users.length - 2} others are typing…`;
  elem.textContent = text;
}

function sendTyping() {
  if (!CURRENT_CHANNEL) return;
  const now = Date.now();
  if (now - LAST_TYPING_SENT_AT < 8000) return;
  LAST_TYPING_SENT_AT = now;
  fetch(`https://discord.com/api/v10/channels/${CURRENT_CHANNEL}/typing`, {
    method: 'POST',
    headers: { 'Authorization': localStorage.getItem('token') }
  }).catch(() => {});
}

function showDMHome() {
  const channelList = document.getElementById('channel-list');
  channelList.innerHTML = '';
  CURRENT_GUILD_ID = null;
  const title = document.createElement('div');
  title.className = 'category';
  title.textContent = 'Direct Messages';
  channelList.appendChild(title);
  const items = [...PRIVATE_CHANNELS];
  items.sort((a,b) => BigInt(b.last_message_id || 0) - BigInt(a.last_message_id || 0));
  items.forEach(c => {
    const channelElem = document.createElement('div');
    channelElem.className = 'channel';
    let label = c.name;
    if (!label) {
      const recips = c.recipients || [];
      if (c.type === 1) label = recips[0]?.global_name || recips[0]?.username || 'DM';
      else if (c.type === 3) label = (recips.map(r => r.global_name || r.username).join(', ')).slice(0, 40);
      else label = 'DM';
    }
    channelElem.textContent = label;
    channelElem.addEventListener('click', () => {
      changechannel(c.id);
      channelList.querySelectorAll('.channel.selected').forEach(elem => elem.classList.remove('selected'));
      channelElem.classList.add('selected');
    });
    channelList.appendChild(channelElem);
  });
}

function uploadFilesToCurrentChannel(files) {
  if (!CURRENT_CHANNEL || !files || files.length === 0) return;
  const formData = new FormData();
  for (const file of files) {
    formData.append('files[]', file, file.name);
  }
  fetch(`https://discord.com/api/v10/channels/${CURRENT_CHANNEL}/messages`, {
    method: 'POST',
    headers: { 'Authorization': localStorage.getItem('token') },
    body: formData
  })
  .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); })
  .catch(err => log('Error uploading file: ' + err.message));
}

function markdownToSafeHtml(input) {
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function replaceDiscordEmojis(text) {
    return text.replace(/&lt;(a?):(\w+):(\d+)&gt;/g, (_, animated, name, id) => {
      const ext = animated ? 'gif' : 'png';
      const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
      const alt = `:${name}:`;
      return `<img class="discord-emoji" alt="${alt}" src="${url}" style="height:1.7em; vertical-align:middle;">`;
    });
  }

  function inlineMarkdown(text) {
    text = text.replace(/`([^`\n]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    text = text.replace(/__(.*?)__/g, '<u>$1</u>');
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    // basic mentions formatting <@id> and <@!id>
    text = text.replace(/&lt;@!?([0-9]+)&gt;/g, (_, id) => {
      const isMe = String(id) === String(USER_DATA.id);
      return `<span class="mention">@${isMe ? (USER_DATA.username || 'you') : 'user'}</span>`;
    });
    // channel mention <#id>
    text = text.replace(/&lt;#([0-9]+)&gt;/g, '#$1');
    return text;
  }

  const lines = input.split('\n');

  let htmlLines = [];
  let blockquoteGroup = [];

  function flushBlockquoteGroup() {
    if (blockquoteGroup.length > 0) {
      const content = blockquoteGroup.map(line => inlineMarkdown(line)).join('<br>');
      htmlLines.push(`<blockquote>${content}</blockquote>`);
      blockquoteGroup = [];
    }
  }

  for (let line of lines) {
    line = escapeHtml(line);

    if (/^### (.+)/.test(line)) {
      flushBlockquoteGroup();
      htmlLines.push(`<h3>${inlineMarkdown(RegExp.$1)}</h3>`);
      continue;
    }
    if (/^## (.+)/.test(line)) {
      flushBlockquoteGroup();
      htmlLines.push(`<h2>${inlineMarkdown(RegExp.$1)}</h2>`);
      continue;
    }
    if (/^# (.+)/.test(line)) {
      flushBlockquoteGroup();
      htmlLines.push(`<h1>${inlineMarkdown(RegExp.$1)}</h1>`);
      continue;
    }

    if (/^&gt; (.+)/.test(line)) {
      blockquoteGroup.push(RegExp.$1);
    } else {
      flushBlockquoteGroup();
      if (line.trim() === '') continue;
      htmlLines.push(replaceDiscordEmojis(inlineMarkdown(line)));
    }
  }

  flushBlockquoteGroup();

  return htmlLines.join('<br>\n');
}

function rendermessage(data) {
    console.log('Rendering message:', data);
    const messageList = document.getElementById('message-list');
    messageList.style.overflowY = 'auto';

    let messageElem = messageList.querySelector(`[data-message-id="${data.id}"]`);
    if (messageElem) {
        const lastTextElem = messageElem.querySelector('.content .text:last-child');
        if (lastTextElem && lastTextElem.textContent === data.content) {
            return;
        }

        const textElems = messageElem.querySelectorAll('.text');
        const oldTextElem = textElems.length > 0 ? textElems[textElems.length - 1] : null;
        if (oldTextElem) {
            oldTextElem.style.color = 'red';
            oldTextElem.querySelectorAll('img').forEach(img => {
                img.style.filter = 'grayscale(100%)';
            });
        }

        const newTextElem = document.createElement('div');
        newTextElem.className = 'text';
        newTextElem.innerHTML = markdownToSafeHtml(data.content);

        // sticker support
        if (Array.isArray(data.stickers) && data.stickers.length > 0) {
            data.stickers.forEach(sticker => {
                var sticker_url = "https://cdn.discordapp.com/stickers/" + sticker.id + ".png";
                const stickerElem = document.createElement('img');
                stickerElem.src = sticker_url;
                stickerElem.alt = sticker.name || 'sticker';
                stickerElem.className = 'sticker';
                newTextElem.appendChild(stickerElem);
            });
        }

        if (Array.isArray(data.attachments) && data.attachments.length > 0) {
            data.attachments.forEach(attachment => {
                if (attachment.proxy_url) {
                    const imgElem = document.createElement('img');
                    imgElem.src = attachment.proxy_url;
                    imgElem.alt = attachment.filename || 'attachment image';
                    imgElem.style.maxWidth = '100%';
                    imgElem.style.marginTop = '4px';
                    newTextElem.appendChild(imgElem);
                }
            });
        }

        messageElem.querySelector('.content').appendChild(newTextElem);

        if (data.edited_timestamp) {
            if (!newTextElem.querySelector('.edited')) {
                const editedElem = document.createElement('span');
                editedElem.className = 'edited';
                editedElem.innerText = ' (edited)';
                editedElem.style.fontSize = '0.8em';
                editedElem.style.opacity = '0.6';
                newTextElem.appendChild(editedElem);
            }
        }
        return;
    }

    messageElem = document.createElement('div');
    messageElem.className = 'message';
    messageElem.dataset.messageId = data.id;

    if (data.nonce) {
        messageElem.dataset.nonce = data.nonce;
    }

    const author = data.author;

    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'avatar-wrapper';

    let avatarUrl;
    if (author.avatar) {
        const isAnimated = author.avatar.startsWith('a_');
        const format = isAnimated ? 'gif' : 'png';
        avatarUrl = `${AVATAR_BASE_URL}${author.id}/${author.avatar}.${format}`;
    } else {
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${(author.discriminator % 5)}.png`;
    }

    const avatarElem = document.createElement('img');
    avatarElem.src = avatarUrl;
    avatarElem.className = 'avatar';
    avatarElem.addEventListener('click', () => openUserProfile(author.id, USER_GUILDS.find(g=>g.channels?.some(c=>c.id===data.channel_id))?.id));
    avatarWrapper.appendChild(avatarElem);

    // Avatar decoration support
    if (author.avatar_decoration) {
        const decorationElem = document.createElement('img');
        decorationElem.className = 'avatar-decoration';
        decorationElem.src = `https://cdn.discordapp.com/avatar-decorations/${author.avatar_decoration}.png`;
        avatarWrapper.appendChild(decorationElem);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content';

    // Display name
    let displayName = author.global_name || author.display_name || author.username;
    const nameElem = document.createElement('span');
    nameElem.className = 'author';
    nameElem.style.cursor = 'pointer';
    nameElem.addEventListener('click', () => openUserProfile(author.id, USER_GUILDS.find(g=>g.channels?.some(c=>c.id===data.channel_id))?.id));

    // Role icon
    let roleIconElem = null;
    if (data.member && data.member.roles && Array.isArray(data.member.roles) && data.member.roles.length > 0) {
        const guild = USER_GUILDS.find(g => g.channels.some(c => c.id === data.channel_id));
        if (guild && guild.roles) {
            const roles = guild.roles.filter(role => data.member.roles.includes(role.id));
            if (roles.length > 0) {
                roles.sort((a, b) => b.position - a.position);
                const highestRole = roles[0];

                if (highestRole.color && highestRole.color !== 0) {
                    nameElem.style.color = `#${highestRole.color.toString(16).padStart(6, '0')}`;
                }

                if (highestRole.icon) {
                    const iconUrl = `https://cdn.discordapp.com/role-icons/${highestRole.id}/${highestRole.icon}.png`;
                    roleIconElem = document.createElement('img');
                    roleIconElem.className = 'role-icon';
                    roleIconElem.src = iconUrl;
                    roleIconElem.style.width = '16px';
                    roleIconElem.style.height = '16px';
                    roleIconElem.style.verticalAlign = 'middle';
                    roleIconElem.style.marginLeft = '4px';
                    roleIconElem.style.marginRight = '4px';
                }
            }
        }
    }

    nameElem.innerText = displayName;

    const timestampElem = document.createElement('span');
    timestampElem.className = 'timestamp';
    const now = new Date();
    timestampElem.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const header = document.createElement('div');
    header.appendChild(nameElem);
    if (roleIconElem) header.appendChild(roleIconElem);
    header.appendChild(timestampElem);

    const textElem = document.createElement('div');
    textElem.className = 'text';
    // Basic mention highlighting
    let contentHtml = markdownToSafeHtml(data.content || '');
    const meMentionPattern = new RegExp(`@${USER_DATA.username}`, 'g');
    contentHtml = contentHtml.replace(meMentionPattern, `<span class="mention">@${USER_DATA.username}</span>`);
    textElem.innerHTML = contentHtml;

    // Reply context
    if (data.message_reference && data.referenced_message) {
        const ctx = document.createElement('div');
        ctx.className = 'reply-context';
        const ra = data.referenced_message.author || {};
        ctx.textContent = `@${ra.global_name || ra.username || 'Unknown'}: ${(data.referenced_message.content || '').slice(0, 80)}`;
        contentWrapper.appendChild(ctx);
    }

    contentWrapper.appendChild(header);
    contentWrapper.appendChild(textElem);

    messageElem.appendChild(avatarWrapper);
    messageElem.appendChild(contentWrapper);

    // Support attachments images for new messages
    if (Array.isArray(data.attachments) && data.attachments.length > 0) {
        data.attachments.forEach(attachment => {
            if (attachment.proxy_url) {
                const imgElem = document.createElement('img');
                imgElem.src = attachment.proxy_url;
                imgElem.alt = attachment.filename || 'attachment image';
                imgElem.style.display = 'block';
                imgElem.style.maxWidth = '400px';
                imgElem.style.maxHeight = '400px';
                imgElem.style.marginTop = '4px';
                imgElem.style.height = 'auto';
                imgElem.style.width = 'auto';
                textElem.appendChild(imgElem);
            }
        });
    }

    // Basic embeds rendering
    if (Array.isArray(data.embeds) && data.embeds.length > 0) {
        data.embeds.forEach(embed => {
            const e = document.createElement('div');
            e.className = 'embed';
            if (embed.title) {
                const t = document.createElement('div'); t.style.fontWeight = '600'; t.textContent = embed.title; e.appendChild(t);
            }
            if (embed.description) {
                const d = document.createElement('div'); d.innerHTML = markdownToSafeHtml(embed.description); e.appendChild(d);
            }
            if (embed.thumbnail?.url) {
                const th = document.createElement('img'); th.src = embed.thumbnail.url; th.style.maxWidth = '120px'; th.style.borderRadius = '6px'; th.style.marginTop = '6px'; e.appendChild(th);
            }
            if (embed.image?.url) {
                const im = document.createElement('img'); im.src = embed.image.url; im.style.maxWidth = '400px'; im.style.borderRadius = '6px'; im.style.marginTop = '6px'; e.appendChild(im);
            }
            textElem.appendChild(e);
        });
    }

    // Action buttons (reply / react)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'msg-actions-container';
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    const replyBtn = document.createElement('button'); replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
    replyBtn.addEventListener('click', () => startReplyToMessage(data));
    const reactBtn = document.createElement('button'); reactBtn.innerHTML = '<i class="fa-solid fa-face-smile"></i>';
    reactBtn.addEventListener('click', () => quickReactToMessage(data, '👍'));
    const deleteBtn = document.createElement('button'); deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener('click', () => deletemessage(data));
    actions.appendChild(replyBtn);
    actions.appendChild(reactBtn);
    actions.appendChild(deleteBtn);
    actionsContainer.appendChild(actions);
    header.appendChild(actionsContainer);

    messageList.appendChild(messageElem);
    messageList.scrollTop = messageList.scrollHeight;
}

function showerr(text) {
    // prevent xss
    const escapedText = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // create a fullscreen error modal
    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.innerHTML = `
        <div class="error-content">
            <h2>🍞 Oops! Toasted!</h2>
            <p>${escapedText}</p>
            <button id="close-error-modal">Close</button>
        </div>
    `;

    // style for bread theme + always on top
    const style = document.createElement('style');
    style.textContent = `
        .error-modal {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2147483647;
        }
        .error-content {
            background: linear-gradient(#f8e0b0, #f5d19b);
            border: 4px solid #d6a257;
            border-radius: 20px;
            padding: 25px 35px;
            text-align: center;
            font-family: 'Comic Sans MS', cursive, sans-serif;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
            max-width: 400px;
            width: 90%;
        }
        .error-content h2 {
            color: #8b5a2b;
            margin-bottom: 10px;
        }
        .error-content p {
            color: #5a3b1f;
            font-size: 1.1rem;
            margin-bottom: 20px;
        }
        #close-error-modal {
            background: #d6a257;
            border: none;
            color: white;
            padding: 10px 20px;
            font-size: 1rem;
            border-radius: 10px;
            cursor: pointer;
            transition: background 0.2s;
        }
        #close-error-modal:hover {
            background: #c48d41;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    document.getElementById('close-error-modal').addEventListener('click', () => {
        modal.remove();
    });

    // Close modal when clicking the background
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function deletemessage(data) {
    if (USER_DELETED_MESSAGES.some(id => String(id) === String(data.id))) {
        console.log("PERFORMING BUG")
        console.log("PERFORMING BUG")
        console.log("PERFORMING BUG")
        console.log("PERFORMING BUG")
        // Perform remove from message logger bug
        const rng_msg = random_message();
        var message = document.querySelector(`.message[data-message-id="${data.id}"]`);
        // send a message using the nonce of the deleted message
        if (message) {
            fetch(`https://discord.com/api/v10/channels/${data.channel_id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: rng_msg,
                    nonce: data.id
                })
            });
            return;
        }
        else {
            showerr('Failed to find message element');
        }
    }

    if (data.author.id === USER_DATA.id) {
        USER_DELETED_MESSAGES.push(data.id);
    }

    fetch(`https://discord.com/api/v10/channels/${data.channel_id}/messages/${data.id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': localStorage.getItem('token')
        }
    })
    .then(response => {
        if (response.ok) {
            console.log('Message deleted successfully');
        } else {
            showerr('Failed to delete message: ' + response.statusText + ' (HTTP ' + response.status + ')');
        }
    })
    .catch(err => {
        showerr('Error deleting message: ' + err);
    });
}

function changechannel(channelId) {
    const guildId = USER_GUILDS.find(guild => guild.channels.some(channel => channel.id === channelId))?.id;
    if (guildId) {
        CURRENT_GUILD_ID = guildId;
        socket.send(JSON.stringify({
            op: 14,
            d: {
                guild_id: guildId,
                typing: true,
                activities: true,
                threads: true,
                channels: {
                    [channelId]: [[0, 99]]
                }
            }
        }));
    }
    console.log('Changing channel to:', channelId);
    CURRENT_CHANNEL = channelId;
    const isDM = !guildId;
    if (isDM) {
        CURRENT_GUILD_ID = null;
        renderDMMemberList(channelId);
    } else if (CURRENT_GUILD_ID) {
        renderMemberList(CURRENT_GUILD_ID);
    }
    var guildIdForChannel = USER_GUILDS.find(g => g.channels.some(c => c.id === channelId))?.id;
    if (guildIdForChannel) {
        localStorage.setItem('lastGuildId', guildIdForChannel);
        localStorage.setItem('lastChannelId', channelId);
    }
    const messageList = document.getElementById('message-list');
    messageList.innerHTML = '';
    // fetch last 10 msg
    fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
        headers: {
            'Authorization': localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(messages => {
        messages.reverse();
        messages.forEach(msg => {
            rendermessage(msg);
        });
    })
    .catch(err => {
        console.error('Error fetching messages:', err);
        log('⚠️ Error fetching messages: ' + err.message);
    }
    );
    renderTypingIndicator(channelId);

}

function changeguild(guildId) {
    
    const channelList = document.getElementById('channel-list');
    channelList.innerHTML = '';

    const guild = USER_GUILDS.find(g => g.id === guildId);
    if (!guild || !guild.channels) return;

    CURRENT_GUILD_ID = guildId;
    renderMemberList(guildId);
    requestGuildMembers(guildId);

    const channels = guild.channels;

    const categories = channels
        .filter(c => c.type === 4)
        .sort((a, b) => a.position - b.position);

    const channelsByParent = {};
    channels.forEach(channel => {
        if (channel.parent_id) {
            if (!channelsByParent[channel.parent_id]) {
                channelsByParent[channel.parent_id] = [];
            }
            channelsByParent[channel.parent_id].push(channel);
        }
    });

    categories.forEach(category => {
        const catElem = document.createElement('div');
        catElem.className = 'category';
        catElem.textContent = category.name;
        channelList.appendChild(catElem);

        const children = (channelsByParent[category.id] || []).sort((a, b) => a.position - b.position);
        children.forEach(channel => {
            const channelElem = document.createElement('div');
            channelElem.className = 'channel';
            channelElem.textContent = channel.name;
            channelElem.addEventListener('click', () => {
                changechannel(channel.id);
                channelList.querySelectorAll('.channel.selected').forEach(elem => {
                    elem.classList.remove('selected');
                });
                channelElem.classList.add('selected');
            });
            channelList.appendChild(channelElem);
        });
    });

    const uncategorized = channels
        .filter(c => c.type !== 4 && !c.parent_id)
        .sort((a, b) => a.position - b.position);

    uncategorized.forEach(channel => {
        const channelElem = document.createElement('div');
        channelElem.className = 'channel';
        channelElem.textContent = channel.name;
        channelElem.addEventListener('click', () => changechannel(channel.id));
        channelList.appendChild(channelElem);
    });
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    if (data.op !== 0) { log(`Received msg: ${JSON.stringify(data, null, 2)}`); }
    
    switch (data.op) {
        case 10:
            const interval = data.d.heartbeat_interval;
            heartbeatInterval = setInterval(() => {
                socket.send(JSON.stringify({ op: 1, d: null }));
                log('Sent heartbeat');
            }, interval);

            const token = localStorage.getItem('token');
            if (token) {
                const identifyPayload = {
                    op: 2,
                    d: {
                        token: token,
                        properties: {
                            os: 'linux',
                            browser: 'breadcord',
                            device: 'breadcord'
                        },
                        intents: 57091
                    }
                };
                socket.send(JSON.stringify(identifyPayload));
                log('Sent IDENTIFY');
            } else {
                log('⚠️ No token found in localStorage');
            }
            break;

        case 11:
            log('Heartbeat ack');
            break;
        
        case 0:
            log(`Event received: ${data.t}`);
            if (data.t === 'READY') {
                log('Successfully connected to Discord!');
                USER_GUILDS = data.d.guilds;
                PRIVATE_CHANNELS = data.d.private_channels;
                USER_DATA = data.d.user;
                USER_RELATIONSHIPS = data.d.relationships;
                log(`User: ${USER_DATA.username}#${USER_DATA.discriminator}`);
                var avatarUrl = `${AVATAR_BASE_URL}${USER_DATA.id}/${USER_DATA.avatar}.png`;
                var meElem = document.createElement('img');
                meElem.id = 'me';
                meElem.src = avatarUrl;
                sidebar.appendChild(meElem);

                let meElemClickCount = 0;
                meElem.addEventListener('click', () => {
                    meElemClickCount++;
                    if (meElemClickCount >= 5) {
                        document.querySelectorAll('img').forEach(img => { img.src = 'https://c.tenor.com/OFEdwMvaCzsAAAAd/tenor.gif'; });
                        meElemClickCount = 0;
                    } else {
                        openUserProfile(USER_DATA.id, CURRENT_GUILD_ID);
                    }
                });
                var spacer = document.createElement('div');
                spacer.className = 'spacer';
                sidebar.appendChild(spacer);
                USER_GUILDS.forEach(guild => {
                    if (guild.icon) {
                        const guildIconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
                        const guildElem = document.createElement('img');
                        guildElem.src = guildIconUrl;
                        guildElem.className = 'guild';
                        guildElem.style.backgroundColor = guild.icon_color ? `#${guild.icon_color.toString(16).padStart(6, '0')}` : '#2f3136';
                        guildElem.addEventListener('click', () => {
                            document.querySelectorAll('.guild.selected').forEach(elem => {
                                elem.classList.remove('selected');
                            });
                            guildElem.classList.add('selected');
                            changeguild(guild.id);
                        });
                        sidebar.appendChild(guildElem);
                    }
                    else {
                        // First letter of each word in the server name, up to 5 letters
                        const serverName = guild.name || 'Unknown';
                        const initials = serverName.split(' ').map(word => word.charAt(0)).join('').slice(0, 3).toUpperCase();
                        const guildElem = document.createElement('div');
                        guildElem.className = 'guild iconless-guild';
                        guildElem.textContent = initials;
                        guildElem.addEventListener('click', () => {
                            document.querySelectorAll('.guild.selected').forEach(elem => {
                                elem.classList.remove('selected');
                            });
                            guildElem.classList.add('selected');
                            changeguild(guild.id);
                        });
                        sidebar.appendChild(guildElem);
                    }
                });
                // DM Home button
                const dmHome = document.createElement('div');
                dmHome.className = 'guild dm-home';
                dmHome.textContent = 'DM';
                dmHome.title = 'Direct Messages';
                dmHome.addEventListener('click', () => {
                    document.querySelectorAll('.guild.selected').forEach(elem => elem.classList.remove('selected'));
                    dmHome.classList.add('selected');
                    showDMHome();
                });
                const spacerEl = sidebar.querySelector('.spacer');
                if (spacerEl && spacerEl.nextSibling) sidebar.insertBefore(dmHome, spacerEl.nextSibling);
                else sidebar.appendChild(dmHome);
                if (savedGuildId && savedChannelId) {
                    changeguild(savedGuildId);

                    var guildElems = sidebar.querySelectorAll('.guild');
                    for (var i = 0; i < guildElems.length; i++) {
                        if (guildElems[i].src.indexOf(savedGuildId) !== -1) {
                            guildElems[i].classList.add('selected');
                            break;
                        }
                    }

                    changechannel(savedChannelId);

                    setTimeout(function() {
                        var guildObj = USER_GUILDS.find(function(g) { return g.id === savedGuildId; });
                        var chanObj = guildObj && guildObj.channels.find(function(c) { return c.id === savedChannelId; });
                        if (chanObj) {
                            var channelElems = document.querySelectorAll('.channel');
                            for (var j = 0; j < channelElems.length; j++) {
                                if (channelElems[j].textContent === chanObj.name) {
                                    channelElems[j].classList.add('selected');
                                    break;
                                }
                            }
                        }
                    }, 100);
                }
                applyUserPreferences();
            }
            if (data.t === 'GUILD_CREATE') {
                const g = data.d;
                const idx = USER_GUILDS.findIndex(x => x.id === g.id);
                if (idx !== -1) {
                    USER_GUILDS[idx] = { ...USER_GUILDS[idx], ...g };
                } else {
                    USER_GUILDS.push(g);
                }
                if (g.id === CURRENT_GUILD_ID) {
                    renderMemberList(g.id);
                }
            }
            if (data.t === 'GUILD_UPDATE') {
                const g = data.d;
                const idx = USER_GUILDS.findIndex(x => x.id === g.id);
                if (idx !== -1) {
                    USER_GUILDS[idx] = { ...USER_GUILDS[idx], ...g };
                }
            }
            if (data.t === 'PRESENCE_UPDATE') {
                const u = data.d.user?.id;
                if (u) {
                    USER_PRESENCES[u] = data.d.status || 'offline';
                    if (CURRENT_GUILD_ID) renderMemberList(CURRENT_GUILD_ID);
                    else if (CURRENT_CHANNEL) renderDMMemberList(CURRENT_CHANNEL);
                }
            }
            if (data.t === 'TYPING_START') {
                const ch = data.d.channel_id;
                const uid = data.d.user_id;
                if (!CHANNEL_TYPING[ch]) CHANNEL_TYPING[ch] = new Map();
                const until = Date.now() + 9000;
                CHANNEL_TYPING[ch].set(uid, until);
                setTimeout(() => renderTypingIndicator(ch), 0);
                setTimeout(() => renderTypingIndicator(ch), 9100);
                if (String(ch) === String(CURRENT_CHANNEL)) renderTypingIndicator(ch);
            }
            if (data.t === 'GUILD_MEMBERS_CHUNK') {
                const gId = data.d.guild_id;
                const members = data.d.members || [];
                const idx = USER_GUILDS.findIndex(x => x.id === gId);
                if (idx !== -1) {
                    const existing = USER_GUILDS[idx].members || [];
                    const map = new Map(existing.map(m => [m.user?.id, m]));
                    for (const m of members) { map.set(m.user?.id, m); }
                    USER_GUILDS[idx].members = Array.from(map.values());
                    if (gId === CURRENT_GUILD_ID) renderMemberList(gId);
                }
            }
            if (data.t === 'MESSAGE_CREATE') {
                console.log(CURRENT_CHANNEL, data.d.channel_id);
                if (data.d.author.id === USER_DATA.id) {
                    if (data.d.content.includes(" ||$#493$.34@||")) {
                        deletemessage(data.d);
                        
                    }
                }
                if (String(CURRENT_CHANNEL) === String(data.d.channel_id)) {
                    rendermessage(data.d);
                }
            }
            if (data.t === 'MESSAGE_UPDATE') {
                if (String(CURRENT_CHANNEL) === String(data.d.channel_id)) {
                    rendermessage(data.d);
                }
            }
            if (data.t === 'MESSAGE_DELETE') {
            }
            break;
    }
};

socket.onerror = (err) => { log('WebSocket err: ' + err.message);};
socket.onclose = () => { log('Disconnected from Gateway!'); clearInterval(heartbeatInterval); };

const chatInput = document.getElementById('chat-input');

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // no newline
        const content = chatInput.value.trim();
        if (content && CURRENT_CHANNEL) {
            const payload = REPLY_TO_MESSAGE_ID ? {
                content,
                message_reference: { channel_id: CURRENT_CHANNEL, message_id: REPLY_TO_MESSAGE_ID }
            } : { content };
            fetch(`https://discord.com/api/v10/channels/${CURRENT_CHANNEL}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                chatInput.value = '';
                cancelReply();
            })
            .catch(err => log('Error sending message: ' + err.message));
        }
    }
    // Typing indicator
    if (CURRENT_CHANNEL) sendTyping();
});

const messageList = document.getElementById('message-list');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    messageList.addEventListener(eventName, (e) => e.preventDefault(), false);
});

messageList.addEventListener('drop', (e) => {
    if (!CURRENT_CHANNEL) { return; }

    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    uploadFilesToCurrentChannel(files);
});

// Attach and Settings controls
const attachBtn = document.getElementById('attach-button');
const settingsBtn = document.getElementById('settings-button');
const fileInput = document.getElementById('file-input');
if (attachBtn && fileInput) {
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        uploadFilesToCurrentChannel(fileInput.files);
        fileInput.value = '';
    });
}
if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
}

// Reply and reactions helpers
let REPLY_TO_MESSAGE_ID = null;
const replyBanner = document.getElementById('reply-banner');

function startReplyToMessage(message) {
  REPLY_TO_MESSAGE_ID = message.id;
  if (replyBanner) {
    const author = message.author?.global_name || message.author?.username || 'Unknown';
    replyBanner.textContent = `Replying to ${author}: ${(message.content || '').slice(0,60)}`;
    replyBanner.style.display = '';
  }
  chatInput.focus();
}

function cancelReply() {
  REPLY_TO_MESSAGE_ID = null;
  if (replyBanner) replyBanner.style.display = 'none';
}

function quickReactToMessage(message, emoji) {
  fetch(`https://discord.com/api/v10/channels/${message.channel_id}/messages/${message.id}/reactions/${encodeURIComponent(emoji)}/@me`, {
    method: 'PUT',
    headers: { 'Authorization': localStorage.getItem('token') }
  }).catch(err => log('React failed: ' + err.message));
}
