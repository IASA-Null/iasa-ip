const {app, BrowserWindow, Menu, Tray, dialog, ipcMain, Notification} = require('electron');
const path = require('path');
const url = require('url');
const vibrancy = require('electron-acrylic-window');
const webControl = require('./webControl.js');
const {execSync} = require('child_process');
const settings = require('electron-settings');
const fs = require('fs');
const {startVpn, stopVpn} = require('./vpn.js');
const exec = require('child_process').exec;
const temp = require('temp');
const request = require('request');
const spawn = require('child_process').spawn;
const ipModule = require('./changeIp.js');
const process = require('process');

let tray = null;
let win;
let fir = true;
let manualVpnSW = false;

const verNum = 500;
const gameList = ['Bluestacks.exe', 'League of legends.exe', 'riotclientservices.exe', 'POWERPNT.EXE'];


function updateIP() {
    try {
        win.close();
    } catch (e) {

    }
    win = null;
    request('https://api.iasa.kr/ip/link/lastest', (error, response, url) => {
        let notification = new Notification({
            title: '업데이트 중...',
            body: 'IP를 업데이트 하는 중입니다.\n잠시만 기다려 주세요...',
            icon: 'C:\\Program Files\\IP\\res\\ipLogo.ico'
        });
        notification.show();
        const fName = temp.path({suffix: '.exe'});
        let file = fs.createWriteStream(fName);
        let receivedBytes = 0;
        let totalBytes;
        request(url).on('response', response => {
            totalBytes = response.headers['content-length'];
        }).on('data', chunk => {
            receivedBytes += chunk.length;
        }).pipe(file);
        file.on('finish', () => {
            file.close();
            setTimeout(() => {
                let child = spawn(fName, [], {
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore']
                });
                child.unref();
                app.exit();
            }, 1500);
        });
    });
}

function isGameRunning() {
    return new Promise(resolve => {
        exec(`tasklist`, (err, stdout) => {
            gameList.forEach(el => {
                if (stdout.toLowerCase().indexOf(el.toLowerCase()) > -1) resolve(true);
            });
            resolve(false);
        });
    });
}

try {
    execSync('schtasks /create /tn "MyTasks\\iasa-ip-l" /xml "./res/iasa-ip-l.xml" /f')
} catch (e) {

}

function resetApplication() {
    settings.set('svc', true);
    win.close();
    win = null;
    settings.delete('ip');
    settings.set('adp', null);
    settings.set('gate', null);
    createMainWindow();
}

ipcMain.on('resetApplication', () => {
    resetApplication();
});

ipcMain.on('update', () => {
    updateIP();
});


function openMainWindow() {
    if (win && !win.isVisible()) {
        win.show();
    } else {
        createMainWindow();
    }
}

function askStopService() {
    const dialogOptions = {
        type: 'info',
        buttons: ['예', '아니요'],
        message: '서비스를 종료하면 IP가 자동으로 바뀌지 않습니다.\n정말로 종료할까요?',
        title: "IP"
    };
    dialog.showMessageBox(dialogOptions).then(res => {
        if (!res.response) app.exit();
    });
}

function createTray() {
    tray = new Tray('C:\\Program Files\\IP\\res\\ipLogo.ico');
    const contextMenu = Menu.buildFromTemplate([
        {label: '열기', click: openMainWindow},
        {label: '서비스 종료', click: askStopService}
    ]);
    tray.setToolTip('IP가 실행 중입니다.');
    tray.setContextMenu(contextMenu);
    tray.on('click', openMainWindow);
}

function createMainWindow() {
    win = new BrowserWindow({
        width: 850, height: 600, webPreferences: {
            nodeIntegration: true,
            webSecurity: false
        }, show: false, icon: path.join(__dirname, 'res/ipLogo.ico'), frame: false, transparent: true
    });
    win.setMenu(null);
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    win.on('close', () => {
        win = null;
    });
    win.once('ready-to-show', () => {
        win.show();
        vibrancy.setVibrancy(win);
        win.setResizable(false);
        ipcMain.on('hide', () => {
            win.minimize();
        });
        //win.webContents.openDevTools();
    });
}

function onBackgroundService() {
    if (settings.get('svc') == null) settings.set('svc', true);
    return settings.get('svc');
}

function onFirstRun() {
    app.setAppUserModelId("iasa.null.ip");
    setInterval(() => {
        isGameRunning().then(res => {
            if ((res && !settings.get('nvpn')) || manualVpnSW) startVpn();
            else stopVpn();
        });
    }, 1500);
    chkUpdate();
    if (process.argv.length !== 2) createMainWindow();
    createTray();
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

app.on('second-instance', openMainWindow);


app.on('ready', onFirstRun);

async function allCloseHandler() {
    const res = onBackgroundService();
    if (!res) app.exit();
}

app.on('window-all-closed', async e => {
    e.preventDefault();
    await allCloseHandler();
});

async function autoIpUpdate() {
    const tName = await webControl.getWifiName();
    if (fir && tName != null) {
        fir = false;
        if (win == null) {
            if (tName === "Iasa_hs" && ipModule.getCurrentState() === 0) {
                let notification = new Notification({
                    title: 'IP 변경됨',
                    body: 'IP가 학교 내부망으로 변경되었습니다.',
                    icon: 'C:\\Program Files\\IP\\res\\ipLogo.ico'
                });
                notification.show();
                await ipModule.changeToSchool();
            }
            if (tName !== "Iasa_hs" && ipModule.getCurrentState() === 1) {
                let notification = new Notification({
                    title: 'IP 변경됨',
                    body: 'IP가 학교 외부망으로 변경되었습니다.',
                    icon: 'C:\\Program Files\\IP\\res\\ipLogo.ico'
                });
                notification.show();
                await ipModule.changeToOut();
            }
        }
    }
    fir = true;
}

setInterval(() => {
    autoIpUpdate();
}, 1000);


function chkUpdate() {
    request({url: 'https://api.iasa.kr/ip/ver', timeout: 1000}, (e, response) => {
        if (!e && parseInt(response.body) > verNum) {
            updateIP();
        }
    });
}

setInterval(() => {
    chkUpdate();
}, 1000 * 60 * 10);
