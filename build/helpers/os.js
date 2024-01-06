"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOS = void 0;
const getOS = () => {
    try {
        // @ts-ignore
        var userAgent = window.navigator.userAgent, platform = window.navigator?.userAgentData?.platform || window.navigator.platform, macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'], windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'], iosPlatforms = ['iPhone', 'iPad', 'iPod'], os = null;
        if (macosPlatforms.indexOf(platform) !== -1) {
            os = 'Mac OS';
        }
        else if (iosPlatforms.indexOf(platform) !== -1) {
            os = 'iOS';
        }
        else if (windowsPlatforms.indexOf(platform) !== -1) {
            os = 'Windows';
        }
        else if (/Android/.test(userAgent)) {
            os = 'Android';
        }
        else if (/Linux/.test(platform)) {
            os = 'Linux';
        }
        return { OS: os };
    }
    catch (e) {
        return {};
    }
};
exports.getOS = getOS;
