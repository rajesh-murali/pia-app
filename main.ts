const electron = require('electron');
// Module to control application life.
const { app, BrowserWindow } = electron;
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Keep window state
const windowStateKeeper = require('electron-window-state');

const path = require('path');
const url = require('url');
const gotTheLock = app.requestSingleInstanceLock();

//-------------------------------------------------------------------
// Logging
//
// THIS SECTION IS NOT REQUIRED
//
// This logging setup is not required for auto-updates to work,
// but it sure makes debugging easier :)
//-------------------------------------------------------------------
log.transports.file.level = 'info';
autoUpdater.logger = log;

log.info('App starting...');

let template = [
    {
        label: 'Edit',
        submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            {role: 'pasteandmatchstyle'},
            {role: 'delete'},
            {role: 'selectall'}
        ]
    },
    {
        label: 'View',
        submenu: [
            {role: 'resetzoom'},
            {role: 'zoomin'},
            {role: 'zoomout'},
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    },
    {
        role: 'window',
        submenu: [
            {role: 'minimize'},
            {role: 'close'}
        ]
    }
];

if (process.platform === 'darwin') {
    template.unshift({
        label: 'PIA',
        submenu: [
            {role: 'hide'},
            {role: 'hideothers'},
            {role: 'unhide'},
            {type: 'separator'},
            {role: 'quit'}
        ]
    });

    // Edit menu
    template[1].submenu.push(
        {type: 'separator'},
        {
            label: 'Speech',
            submenu: [
                {role: 'startspeaking'},
                {role: 'stopspeaking'}
            ]
        }
    );

    // Window menu
    template[3].submenu = [
        {role: 'close'},
        {role: 'minimize'},
        {role: 'zoom'},
        {type: 'separator'},
        {role: 'front'}
    ]
}
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const menu = electron.Menu.buildFromTemplate(template);

function sendStatusToWindow(text) {
    log.info(text);
    mainWindow.webContents.send('message', text);
};

function createWindow() {
    let winState = windowStateKeeper({
        defaultWidth: 1920,
        defaultHeight: 1024
    });

    electron.Menu.setApplicationMenu(null);

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: winState.width,
        height: winState.height,
        x: winState.x,
        y: winState.y,
        minWidth: 1920,
        minHeight: 1024,
        alwaysOnTop: false,
        fullscreen: false,
        kiosk: false,
        icon: `$(__dirname)/icons/64x64.png`,
        webPreferences: {
            nodeIntegration: false, plugins: true
        }
    });

    winState.manage(mainWindow);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'dist', 'pia', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });

    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
    });
}

autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
})
autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available.');
})
autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
})
autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
})
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
})
autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded');
});

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus()
        }
    });

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready',function() {
        createWindow();
        autoUpdater.checkForUpdatesAndNotify();
    } );

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit()
        }
    });

    app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) {
            createWindow()
        }
    })

    // In this file you can include the rest of your app's specific main process
    // code. You can also put them in separate files and require them here.
}
