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
    });
}

app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        app.setName('BreadCord');
    }
    createWindow();
});
