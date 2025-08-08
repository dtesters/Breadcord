const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

function createWindow() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'logo.png'));

    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        icon,
        frame: true,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 12, y: 12-2.5 },
        webPreferences: {
            contextIsolation: true,
            // preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (process.platform === 'darwin') {
        app.dock.setIcon(icon);
    }

    win.webContents.openDevTools({ mode: 'detach' });

    win.loadFile('index.html');
    win.setMenuBarVisibility(false);
}

if (process.platform === 'darwin') {
    app.setName('BreadCord');
}

app.whenReady().then(createWindow);