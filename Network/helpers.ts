import { CONFIG } from './../config';

export const shouldProceedIntercepted = (url: string) => {
  if (CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS === false)
    return true;

  return url.indexOf(CONFIG.MAIN_URL) === -1;
};