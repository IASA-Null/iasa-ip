const {execSync} = require('child_process');
const settings = require('electron-settings');

function changeToSchool() {
    return new Promise(async resolve => {
        const adp = await settings.get('adp');
        const ip = await settings.get('ip');
        const mask = "255.255.255.0";
        const gate = await settings.get('gate');
        const dns1 = '211.46.153.1';
        const dns2 = '210.104.203.1';
        try {
            execSync('netsh -c int ip set address name="' + adp + '" source=static addr=' + ip + ' mask=' + mask + ' gateway=' + gate + ' gwmetric=0');
            execSync('netsh -c int ip set dnsservers name="' + adp + '" source=static ' + dns1 + ' validate=no');
            execSync('netsh interface ip add dns name="' + adp + '" addr=' + dns2 + ' validate=no index=2');
        } catch (e) {

        }
        await settings.set('stat', 1);
        resolve();
    });
}

function changeToOut() {
    return new Promise(async resolve => {
        const adp = await settings.get('adp');
        try {
            execSync('netsh -c int ip set address name="' + adp + '" source=dhcp');
            execSync('netsh -c int ip set dnsservers name="' + adp + '" source=dhcp');
        } catch (e) {

        }
        await settings.set('stat', 0);
        resolve();
    });
}

async function getCurrentState() {
    const settings = require('electron-settings');
    const t = await settings.get('stat');
    if (!t) return 0;
    else return t;
}

exports.changeToSchool = changeToSchool;
exports.changeToOut = changeToOut;
exports.getCurrentState = getCurrentState;