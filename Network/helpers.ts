import { localhostSymbolicateRegex } from '../constants/regex';
import { CONFIG } from './../config';

const DEFAULT_IGNORED_PATTERNS = [
  localhostSymbolicateRegex
];

export const shouldProceedIntercepted = (url: string) => {
  if (CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS === false)
    return true;

  for (const r of DEFAULT_IGNORED_PATTERNS)
    if (r(url))
      return false;

  return url.indexOf(CONFIG.MAIN_URL) === -1;
};