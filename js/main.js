const verNum = 502;
const settings = require('electron-settings');
const ipModule = require('./changeIp.js');
const {ipcRenderer} = require('electron');
const os = require('os');
let adpArr = [0];
let betaView = false;

async function getTheme() {
    if (!await settings.get('atheme')) {
        return window.matchMedia('(prefers-color-scheme:dark)').matches;
    } else {
        return !!await settings.get('dtheme');
    }
}

function loadTheme() {
    getTheme().then(res => {
        if (res) {
            document.getElementById("theme").href = "./css/mainUI/dark.css";
            ipcRenderer.send('vibrancyDark');
        } else {
            document.getElementById("theme").href = "./css/mainUI/light.css";
            ipcRenderer.send('vibrancyLight');
        }
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    loadTheme();
    document.getElementById('chg2').style.display = 'none';
    chgView();
    chkUpdate();
    document.getElementById('stuId').addEventListener("keydown", e => {
        if (e.key === "Enter") submitWelcome();
    });
    if (await settings.get('ver') !== 500) {
        M.Modal.init(document.getElementById('modal-new')).open();
        await settings.set('ver', 500);
    }
    if (!await settings.get('ip')) showWelcome();
    else if (!await settings.get('adp')) getAdapter();
    if (await settings.get('svc')) document.getElementById('svc').querySelector('label').click();
    if (!await settings.get('atheme')) {
        document.getElementById('atheme').querySelector('label').click();
        document.getElementById('userTheme').style.display = 'none';
    }
    if (await settings.get('dtheme')) document.getElementById('dtheme').querySelector('label').click();
    if (!await settings.get('nvpn')) document.getElementById('vpn').querySelector('label').click();
    document.getElementById('svc').addEventListener("click", async () => {
        await settings.set('svc', document.getElementById('svc').querySelector('input').checked);
    });
    document.getElementById('vpn').addEventListener("click", async () => {
        await settings.set('nvpn', !document.getElementById('vpn').querySelector('input').checked);
    });
    document.getElementById('atheme').addEventListener("click", async () => {
        if (!document.getElementById('atheme').querySelector('input').checked) await settings.set('atheme', true);
        else await settings.set('atheme', false);
        if (await settings.get('atheme')) document.getElementById('userTheme').style.display = '';
        else document.getElementById('userTheme').style.display = 'none';
        if (window.matchMedia('(prefers-color-scheme:dark)').matches ^ document.getElementById('dtheme').querySelector('input').checked) {
            document.getElementById('dtheme').querySelector('label').click();
            if (document.getElementById('dtheme').querySelector('input').checked) await settings.set('dtheme', true);
            else await settings.set('dtheme', false);
        }
        loadTheme();
    });
    document.getElementById('dtheme').addEventListener("click", async () => {
        if (document.getElementById('dtheme').querySelector('input').checked) await settings.set('dtheme', true);
        else await settings.set('dtheme', false);
        loadTheme();
    });
    document.getElementById('close-button').addEventListener('click', () => {
        window.close();
    });
    document.getElementById('min-button').addEventListener('click', () => {
        ipcRenderer.send('hide');
    });
});

function chkUpdate() {
    fetch('https://api.iasa.kr/ip/ver').then(res => res.text()).then(data => {
        const ver = parseInt(data);
        if (ver > verNum) {
            ipcRenderer.send('update');
        } else if (ver < verNum) {
            if (!betaView) {
                M.Modal.init(document.getElementById('modal-beta')).open();
                betaView = true;
            }
        }
    });
}

async function chgView() {
    if (await ipModule.getCurrentState() === 0) {
        document.getElementById('ipIcon').src = './res/school.png';
        document.getElementById('ipInfo').innerText = 'IP를 교내 IP로 변경합니다.';
    } else {
        document.getElementById('ipIcon').src = './res/house.png';
        document.getElementById('ipInfo').innerText = 'IP를 교외 IP로 변경합니다.';
    }
}

function showSec(v) {
    document.querySelectorAll('.section').forEach((el) => {
        el.classList.remove('showSection');
        el.classList.remove('initShowSection');
        el.classList.add('hideSection');
    });
    document.getElementById('sec' + String(v)).classList.remove('hideSection');
    document.getElementById('sec' + String(v)).classList.remove('initShowSection');
    document.getElementById('sec' + String(v)).classList.add('showSection');
    setTimeout(() => {
        document.querySelectorAll('.section').forEach((el) => {
            el.classList.add('novisible');
        });
        document.getElementById('sec' + String(v)).classList.remove('novisible');
    }, 300);
    chkUpdate();
}

function showMain() {
    showSec(1);
}

function chgIp() {
    showSec(2);
    document.getElementById('chg1').style.display = '';
    document.getElementById('chg1').classList.remove('fadeout');
    document.getElementById('chg2').style.display = 'none';
    setTimeout(async () => {
        if (await ipModule.getCurrentState() === 0) await ipModule.changeToSchool();
        else await ipModule.changeToOut();
        setTimeout(() => {
            document.getElementById('chg1').classList.add('fadeout');
            chgView();
        }, 200);
        setTimeout(() => {
            document.getElementById('chg1').style.display = 'none';
            document.getElementById('chg2').style.display = '';
            document.getElementById('chg2').classList.add('fadein');
        }, 400);
        setTimeout(() => {
            showMain();
        }, 600);
    }, 600);
}

function showSet() {
    showSec(3);
}

function showCred() {
    showSec(4);
}

async function showWelcome() {
    await settings.set('svc', true);
    showSec(5);
    document.getElementById('sec5').classList.remove('hideSection');
    document.getElementById('sec5').classList.remove('showSection');
    document.getElementById('sec5').classList.remove('novisible');
    document.getElementById('sec5').classList.add('initShowSection');
    setTimeout(() => {
        document.getElementById("stuId").focus();
    }, 1500);
}

function submitError() {
    document.getElementById('stuId').classList.add('invalid');
    document.getElementById('stuId').classList.remove('validate');
}

async function submitWelcome() {
    let a, b, c, su, ip, gate;
    const stuId = document.getElementById('stuId').value;
    if (stuId == null) submitError();
    else if (stuId.length !== String(parseInt(stuId)).length) submitError();
    else if (stuId.length < 4) submitError();
    else if (stuId.length > 5) submitError();
    else {
        if (stuId.length === 4) {
            a = Math.floor(parseInt(stuId) / 1000);
            b = Math.floor(parseInt(stuId) / 100 % 10);
            c = parseInt(stuId) % 100;
        }
        if (stuId.length === 5) {
            a = Math.floor(parseInt(stuId) / 10000);
            b = Math.floor(parseInt(stuId) / 100 % 10);
            c = parseInt(stuId) % 100;
        }
        if (a > 3 || a < 1) submitError();
        else if (b > 5 || b < 1) submitError();
        else if (c > 16 || c < 1) submitError();
        else {
            su = 9 + c + (b - 1) * 16;
            if (a === 1) {
                ip = '10.140.82.' + String(su);
                gate = '10.140.82.254';
            }
            if (a === 2) {
                ip = '10.140.83.' + String(su);
                gate = '10.140.83.254';
            }
            if (a === 3) {
                ip = '10.140.84.' + String(su);
                gate = '10.140.84.254';
            }
            await settings.set('ip', ip);
            await settings.set('gate', gate);
            await settings.set('svc', true);
            await settings.set('adp', 'Wi-Fi');
            showMain();
        }
    }
}

function agreeResetIP() {
    ipcRenderer.send('resetApplication');
}

function resetIp() {
    M.Modal.init(document.getElementById('modal-reset')).open();
}

function getAdapter() {
    let i = 1;
    let adpHtml = `<option selected value="0">어댑터를 선택하세요</option>`;
    for (let n in os.networkInterfaces()) {
        adpHtml += `<option class="waves-effect" value="${String(i)}">${n}</option>`
        adpArr.push(n);
        i += 1;
    }
    document.getElementById('adpSel').innerHTML = adpHtml;
    M.FormSelect.init(document.getElementById('adpSel'));
    showSec(6);
    chkUpdate();
}

async function submitAdapter() {
    const idx = parseInt(document.getElementById('adpSel').value);
    if (!idx) return;
    await settings.set('adp', adpArr[idx]);
    showSec(1);
}

function showVpnSet() {
    M.FormSelect.init(document.getElementById('vpnSel'));
    showSec(7);
}

function showNew() {
    M.Modal.init(document.getElementById('modal-new')).open();
}

function reqResetAdp() {
    M.Modal.init(document.getElementById('modal-adp-reset')).open();
}

function resetAdp() {
    M.toast({html: '완료되었습니다!'});
}

function toggleVPN() {
    ipcRenderer.send('toggleVPN');
}

ipcRenderer.on('vpnStat', (e, data) => {
    if (data) document.getElementById('toggleVpnButton').innerText = 'VPN 연결 해제'
    else document.getElementById('toggleVpnButton').innerText = 'VPN 연결'
})