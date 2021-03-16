const {app, Menu, Tray, dialog, ipcMain, Notification} = require('electron');
const path = require('path');
const url = require('url');
const {BrowserWindow} = require('electron-acrylic-window');
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

const verNum = 502;
const gameList = ['Bluestacks.exe', 'League of legends.exe', 'riotclientservices.exe'];


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

async function resetApplication() {
    win.close();
    await settings.set('svc', true);
    win = null;
    await settings.set('ip', null);
    await settings.set('adp', null);
    await settings.set('gate', null);
    createMainWindow();
}

ipcMain.on('resetApplication', () => {
    resetApplication();
});

ipcMain.on('update', () => {
    updateIP();
});

ipcMain.on('toggleVPN', () => {
    manualVpnSW = !manualVpnSW
});


ipcMain.on('hide', () => {
    if (win) win.minimize();
});


ipcMain.on('vibrancyLight', () => {
    if (win) {
        win.setVibrancy('#FFFFFF77');
        win.show();
    }
});
ipcMain.on('vibrancyDark', () => {
    if (win) {
        win.setVibrancy('#00000077');
        win.show();
    }
});


function openMainWindow() {
    if (win) {
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
        width: 850,
        height: 550,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            enableRemoteModule: true,
        },
        icon: 'C:\\Program Files\\IP\\res\\ipLogo.ico',
        frame: false,
        backgroundColor: '#00000000'
    });
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    win.once('close', () => {
        win = null;
    });
    win.setResizable(false);
    //win.webContents.openDevTools({mode: "detach"});
}

async function onBackgroundService() {
    if (await settings.get('svc') == null) await settings.set('svc', true);
    return await settings.get('svc');
}

function onFirstRun() {
    app.setAppUserModelId("iasa.null.ip");
    setInterval(() => {
        isGameRunning().then(async res => {
            if ((res && !await settings.get('nvpn')) || manualVpnSW) startVpn(!manualVpnSW);
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
    const res = await onBackgroundService();
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
            if (tName === "Iasa_hs" && await ipModule.getCurrentState() === 0) {
                let notification = new Notification({
                    title: 'IP 변경됨',
                    body: 'IP가 학교 내부망으로 변경되었습니다.',
                    icon: 'C:\\Program Files\\IP\\res\\ipLogo.ico'
                });
                notification.show();
                await ipModule.changeToSchool();
            }
            if (tName !== "Iasa_hs" && await ipModule.getCurrentState() === 1) {
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

setInterval(() => {
    if (win) win.webContents.send('vpnStat', manualVpnSW)
}, 100)