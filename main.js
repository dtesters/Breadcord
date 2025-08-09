const { app, BrowserWindow, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'logo.png'));

    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        icon,
        frame: true,
        ...(process.platform === 'darwin' ? {
            titleBarStyle: 'hidden',
            trafficLightPosition: { x: 12, y: 9.5 },
        } : {}),
        webPreferences: {
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (process.platform === 'darwin') {
        app.dock.setIcon(icon);
    }

    // Allow Devtools
    win.webContents.on('before-input-event', (event, input) => {
        const isMac = process.platform === 'darwin';
        const devToolsShortcut =
            (isMac && input.meta && input.alt && input.key.toLowerCase() === 'i') ||
            (!isMac && input.control && input.shift && input.key.toLowerCase() === 'i');

        if (devToolsShortcut) {
            win.webContents.openDevTools({ mode: 'undocked' });
            event.preventDefault();
        }
    });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);

    ipcMain.on('toMain', (event, data) => {
        if (data.code === 'platform_request') {
            const platform = process.platform;
            event.sender.send('fromMain', {
                code: 'platform_response',
                platform,
            });
        }

        if (data.code === 'search_for_discord_installs') {
            const discordPaths = [
                path.join(process.env.LOCALAPPDATA, 'Discord'),
                path.join(process.env.LOCALAPPDATA, 'DiscordCanary'),
                path.join(process.env.LOCALAPPDATA, 'DiscordPTB'),
                path.join(process.env.LOCALAPPDATA, 'DiscordDevelopment')
            ];

            function isLoggedIn(discordPath) {
                const settingsPath = path.join(discordPath, 'settings.json');
                try {
                    if (fs.existsSync(settingsPath)) {
                        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                        return !!settings['TOKEN'] || !!settings['token'];
                    }
                } catch (e) {}
                return false;
            }

            const installs = discordPaths
                .filter(p => fs.existsSync(p))
                .map(p => ({
                    path: p,
                    loggedIn: isLoggedIn(p)
                }));

            event.sender.send('fromMain', {
                code: 'discord_installs_response',
                found: installs.length > 0
            });
        }

        if (data.code === 'autoimport_token') {
            const discordPaths = [
                path.join(process.env.LOCALAPPDATA, 'Discord'),
                path.join(process.env.LOCALAPPDATA, 'DiscordCanary'),
                path.join(process.env.LOCALAPPDATA, 'DiscordPTB'),
                path.join(process.env.LOCALAPPDATA, 'DiscordDevelopment')
            ];

            const TOKEN_REGEX = /[\w-]{24}\.[\w-]{6}\.[\w-]{27}|mfa\.[\w-]{84}/g;

            function getTokenFromLevelDB(discordPath) {
                const leveldbPath = path.join(discordPath, 'Local Storage', 'leveldb');
                if (!fs.existsSync(leveldbPath)) return null;

                const files = fs.readdirSync(leveldbPath).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));

                for (const file of files) {
                    try {
                        const content = fs.readFileSync(path.join(leveldbPath, file), 'utf8');
                        const matches = content.match(TOKEN_REGEX);
                        if (matches && matches.length > 0) {
                            return matches[0];  // Return the first token found
                        }
                    } catch (e) {
                        // Ignore read errors
                    }
                }
                return null;
            }

            function getToken(discordPath) {
                // Try legacy settings first (likely won't work)
                const settingsPath = path.join(discordPath, 'settings.json');
                if (fs.existsSync(settingsPath)) {
                    try {
                        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                        if (settings['TOKEN'] || settings['token']) {
                            return settings['TOKEN'] || settings['token'];
                        }
                    } catch {}
                }
                // Fallback to scanning leveldb files
                return getTokenFromLevelDB(discordPath);
            }

            let token = null;
            for (const p of discordPaths) {
                if (fs.existsSync(p)) {
                    token = getToken(p);
                    if (token) break;
                }
            }

            event.sender.send('fromMain', {
                code: 'autoimport_token_response',
                token
            });
        }
    });
}

app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        app.setName('BreadCord');
    }
    createWindow();
});
