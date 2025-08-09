// war crimes have been committed in the making of this code
// i speedran ts in around 4 hours dont expect it to be good

var PLATFORM = null;
window.electronAPI.sendMessage('toMain', { code: 'platform_request' });

// lazy auth
if (!localStorage.getItem('token')) {

    // wait until PLATFORM is not null
    const checkPlatform = () => {
        if (PLATFORM !== null) {
            if (PLATFORM.startsWith('win')) {
                window.electronAPI.sendMessage('toMain', { code: 'search_for_discord_installs' });
            }
        } else {
            setTimeout(checkPlatform, 50);
        }
    };
    checkPlatform();

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

    var box = document.createElement('div');
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

window.electronAPI.onMessage('fromMain', (data) => {
    if (data.code === 'platform_response') {
        PLATFORM = data.platform;
    }
    if (data.code === 'autoimport_token_response') {
        localStorage.setItem('token', data.token);
        location.reload();
    }
    if (data.code === 'discord_installs_response') {
        if (data.found) {
            const button = document.createElement('button');
            button.textContent = 'Auto Import';
            button.style.padding = '8px 16px';
            button.style.background = '#dba570ff';
            button.style.color = '#fff8e1';
            button.style.border = 'none';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.fontWeight = 'bold';
            button.style.boxShadow = '0 1px 4px rgba(90, 60, 30, 0.2)';
            box.appendChild(button);

            button.addEventListener('click', () => {
                window.electronAPI.sendMessage('toMain', { code: 'autoimport_token' });
            });
        }
    }
});

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
var savedGuildId = localStorage.getItem('lastGuildId');
var savedChannelId = localStorage.getItem('lastChannelId');

var AVATAR_BASE_URL = 'https://cdn.discordapp.com/avatars/';

const sidebar = document.getElementById('sidebar');

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
    text = text.replace(/`([^`\n]+)`/g, (_, code) =>
      `<code>${escapeHtml(code)}</code>`
    );
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    text = text.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    text = text.replace(/__(.*?)__/g, '<u>$1</u>');
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
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
    textElem.innerHTML = markdownToSafeHtml(data.content);

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

    messageList.appendChild(messageElem);
    messageList.scrollTop = messageList.scrollHeight;
}



function changechannel(channelId) {
    const guildId = USER_GUILDS.find(guild => guild.channels.some(channel => channel.id === channelId))?.id;
    if (guildId) {
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

}

function changeguild(guildId) {
    
    const channelList = document.getElementById('channel-list');
    channelList.innerHTML = '';

    const guild = USER_GUILDS.find(g => g.id === guildId);
    if (!guild || !guild.channels) return;

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
                        }
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
                    if (meElemClickCount === 5) {
                        document.querySelectorAll('img').forEach(img => {
                            img.src = 'https://c.tenor.com/OFEdwMvaCzsAAAAd/tenor.gif';
                        });
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
                });
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
            }
            if (data.t === 'MESSAGE_CREATE') {
                console.log(CURRENT_CHANNEL, data.d.channel_id);
                if (String(CURRENT_CHANNEL) === String(data.d.channel_id)) {
                    rendermessage(data.d);
                }
            }
            if (data.t === 'MESSAGE_UPDATE') {
                if (String(CURRENT_CHANNEL) === String(data.d.channel_id)) {
                    rendermessage(data.d);
                }
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
            fetch(`https://discord.com/api/v10/channels/${CURRENT_CHANNEL}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': localStorage.getItem('token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                chatInput.value = '';
            })
            .catch(err => log('Error sending message: ' + err.message));
        }
    }
});

const messageList = document.getElementById('message-list');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    messageList.addEventListener(eventName, (e) => e.preventDefault(), false);
});

messageList.addEventListener('drop', (e) => {
    if (!CURRENT_CHANNEL) { return; }

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files[]', file, file.name);
    }

    fetch(`https://discord.com/api/v10/channels/${CURRENT_CHANNEL}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': localStorage.getItem('token')
        },
        body: formData
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    })
    .catch(err => log('Error uploading file: ' + err.message));
});