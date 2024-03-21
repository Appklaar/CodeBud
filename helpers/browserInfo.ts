import { ObjectT } from "../types/types";

export type BrowserName = null | 'Opera' | 'MS Edge' | 'Chrome' | 'Mozilla Firefox' | 'Safari' | 'MS Explorer' | 'UC Browser' | 'Samsung Browser'; 

export const getBrowserInfo = (): ObjectT<any> => {
  try {
    const test = (regexp: RegExp) => {
      return regexp.test(navigator.userAgent);
    };

    let browserName: BrowserName = null;

    // @ts-ignore
    if (test(/opr\//i) || !!window.opr) {
      browserName = 'Opera';
    } else if (test(/edg/i)) {
      browserName = 'MS Edge';
    } else if (test(/chrome|chromium|crios/i)) {
      browserName = 'Chrome';
    } else if (test(/firefox|fxios/i)) {
      browserName = 'Mozilla Firefox';
    } else if (test(/safari/i)) {
      browserName = 'Safari';
    } else if (test(/trident/i)) {
      browserName = 'MS Explorer';
    } else if (test(/ucbrowser/i)) {
      browserName = 'UC Browser';
    } else if (test(/samsungbrowser/i)) {
      browserName = 'Samsung Browser';
    }

    if (browserName !== null)
      return { browserName };
  
    return {};
  } catch (e) {
    return {};
  }
}