import { NetworkInterceptorApi } from './AbstractInterceptor';
import { startNetworkLogging, stopNetworkLogging, clearRequests } from "./../rn";
import { NetworkInterceptorCallbacksTable, NetworkInterceptorOptions } from '../types/types';
import { CONFIG } from './../config';
import { codebudConsoleLog } from '../helpers/helperFunctions';

class NetworkInterceptorRN extends NetworkInterceptorApi {
  protected async formatRequest(data: any) {
    let body: {[key: string]: any};

    try {
      body = JSON.parse(data.dataSent);
    } catch (e) {
      body = data.dataSent;
    }

    const formattedRequest = {
      method: data.method,
      body: body,
      url: data.url,
      requestHeaders: data.requestHeaders
    };

    return formattedRequest;
  }

  protected async formatResponse(data: any) {
    let responseData: {[key: string]: any};

    try {
      responseData = JSON.parse(data.response);
    } catch (e) {
      responseData = data.response;
    }

    const formattedResponse = {
      status: data.status,
      statusText: data.status.toString(),
      data: responseData,
      responseHeaders: data.responseHeaders
    };

    return formattedResponse;
  }

  constructor(callbacksTable: NetworkInterceptorCallbacksTable, options?: NetworkInterceptorOptions) {
    super(options);

    startNetworkLogging({ 
      forceEnable: true,
      // Ignore all HEAD requests
      ignoredPatterns: [/^HEAD /],
      ignoredHosts: CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS ? [CONFIG.DOMAIN] : undefined,
      onRequest: async (data: any) => {
        try {
          if (this.shouldProceedIntercepted(data.url, data.method)) {
            const formattedRequest = await this.formatRequest(data);
            const formattedResponse = await this.formatResponse(data);
            callbacksTable.onResponse({
              request: formattedRequest,
              response: formattedResponse,
              requestId: data.id
            });
          }
        } catch (e) {
          codebudConsoleLog(e);
        }
      }
    });
  };

  public dispose() {
    this.disposeIgnored();
    clearRequests();
    stopNetworkLogging();
  }
};

export { NetworkInterceptorRN };