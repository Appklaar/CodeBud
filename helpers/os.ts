import { ObjectT } from "../types";

export type UserOS = null | 'MacOS' | 'iOS' | 'Windows' | 'Android' | 'Linux';

export const getOSBrowser = (): ObjectT<any> => {
  try {
    // @ts-ignore
    var userAgent = window.navigator.userAgent, platform = window.navigator?.userAgentData?.platform || window.navigator.platform,
      macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K', 'macOS'],
      windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
      iosPlatforms = ['iPhone', 'iPad', 'iPod'],
      os: UserOS = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
      os = 'MacOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
      os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      os = 'Windows';
    } else if (/Android/.test(userAgent)) {
      os = 'Android';
    } else if (/Linux/.test(platform)) {
      os = 'Linux';
    }

    return { OS: os };
  } catch (e) {
    return {};
  }
}

export const getOSNodeProcess = (): ObjectT<any> => {
  try {
    const platform = process.platform;

    let os: UserOS = null;

    switch (platform) {
      case "aix":
        break;
      case "darwin":
        os = "MacOS";
        break;
      case "freebsd":
        break;
      case "linux":
        os = "Linux";
        break;
      case "openbsd":
        break;
      case "sunos":
        break;
      case "win32":
        os = "Windows";
        break;
      case "android":
        os = "Android";
        break;
      case "cygwin":
        os = "Windows";
        break;
      case "haiku":
        break;
      case "netbsd":
        break;
    
      default:
        break;
    }

    return { OS: os };
  } catch (e) {
    return {};
  }
};

export const getOS = (): ObjectT<any> => {
  try {
    const browserOS = getOSBrowser();

    if (browserOS.OS)
      return browserOS;

    return getOSNodeProcess();
  } catch (e) {
    return {};
  }
};