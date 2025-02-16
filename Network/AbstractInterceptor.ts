import { CONFIG } from "../config";
import { codebudConsoleWarn } from "../helpers/helperFunctions";
import { extractHost } from "../helpers/network";
import { InterceptedRequest, InterceptedResponse, NetworkInterceptorOptions } from "../types/types";
import { DEFAULT_IGNORED_PATTERNS } from "./constants";

export abstract class NetworkInterceptorApi {
  protected ignoredHosts: Set<string> | undefined;
  protected ignoredUrls: Set<string> | undefined;
  protected ignoredPatterns: RegExp[] | undefined;

  constructor(options?: NetworkInterceptorOptions) {
    if (options?.ignoredHosts) {
      if (!Array.isArray(options.ignoredHosts) || typeof options.ignoredHosts[0] !== 'string') {
        codebudConsoleWarn('ignoredHosts must be an array of strings. The logger has not been started.');
        return;
      }
      this.ignoredHosts = new Set(options.ignoredHosts);
    }

    if (options?.ignoredPatterns) {
      this.ignoredPatterns = options.ignoredPatterns;
    }

    if (options?.ignoredUrls) {
      if (!Array.isArray(options.ignoredUrls) || typeof options.ignoredUrls[0] !== 'string') {
        codebudConsoleWarn('ignoredUrls must be an array of strings. The logger has not been started.');
        return;
      }
      this.ignoredUrls = new Set(options.ignoredUrls);
    }
  };

  protected shouldProceedIntercepted(url: string, method: string = ""): boolean {
    try {
      if (this.ignoredHosts) {
        const host = extractHost(url);
        if (host && this.ignoredHosts.has(host))
          return false;
      }

      if (this.ignoredUrls && this.ignoredUrls.has(url))
        return false;

      if (this.ignoredPatterns && this.ignoredPatterns.some((pattern) => pattern.test(`${method} ${url}`)))
        return false;

      if (CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS === false)
        return true;
    
      for (const r of DEFAULT_IGNORED_PATTERNS)
        if (r(url))
          return false;
    
      return url.indexOf(CONFIG.MAIN_URL) === -1;
    } catch (e) {
      codebudConsoleWarn("shouldProceedIntercepted unexpected behaviour:", e);
      return true;
    }
  };

  protected disposeIgnored() {
    this.ignoredHosts = undefined;
    this.ignoredUrls = undefined;
    this.ignoredPatterns = undefined;
  };

  protected abstract formatRequest(request: any): Promise<InterceptedRequest>;
  protected abstract formatResponse(response: any): Promise<InterceptedResponse>;
  
  public abstract dispose(): void;
};