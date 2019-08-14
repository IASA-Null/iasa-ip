const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const webControl=require('./webControl.js');

let win, awin;

m=1;
f=0;

function createMainWindow() {
    // 새로운 브라우저 창을 생성합니다.
    win = new BrowserWindow({
        width: 800, height: 600, webPreferences: {
            nodeIntegration: true,
            webSecurity: false
        }, icon: path.join(__dirname, 'ipLogo.ico')
    })
    win.setMenu(null);

    // 그리고 현재 디렉터리의 index.html을 로드합니다.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // 개발자 도구를 엽니다.
    //win.webContents.openDevTools()

    // 창이 닫히면 호출됩니다.
    win.on('close', function(e){
        win=null;
    });
}

function createAlertWindow() {
    // 새로운 브라우저 창을 생성합니다.
    awin = new BrowserWindow({
        width: 600, height: 200, webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
        }, frame:false,transparent:true,icon: path.join(__dirname, 'res/ipLogo.ico')
    })
    awin.setMenu(null);

    // 그리고 현재 디렉터리의 index.html을 로드합니다.
    awin.loadURL(url.format({
        pathname: path.join(__dirname, 'alert.html'),
        protocol: 'file:',
        slashes: true
    }))
    awin.setOpacity(0.95);

    // 개발자 도구를 엽니다.
    //awin.webContents.openDevTools()
    awin.setAlwaysOnTop(true, "floating", 1);
    awin.setIgnoreMouseEvents(true);
    // 창이 닫히면 호출됩니다.
    awin.on('close', function(e){
        awin=null;
    });
}

let orgName, orgNetStat, orgDnsStat;
o=1;

fir=true;

app.on('ready', createAlertWindow)

app.on('window-all-closed', function(e){
    e.preventDefault();
});

async function makeAlert()
{
    var tName=await webControl.getWifiName();
    var tDnsStat=await webControl.checkDns();
    var tNetStat=await webControl.checkInternet();
    if(tName!=orgName || tNetStat!=orgNetStat || tDnsStat!=orgDnsStat) {
        if(!fir && !tNetStat) {
            if(win==null && awin==null) {
                createAlertWindow();
            }
        }
        fir=false;
    }
    orgName=tName;
    orgNetStat=tNetStat;
    orgDnsStat=tDnsStat;
}

setInterval(function() {
    makeAlert();
    //localStorage.setItem('chgStat', 10);
}, 1000);

