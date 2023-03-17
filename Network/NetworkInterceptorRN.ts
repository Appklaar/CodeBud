import { NetworkInterceptorApi } from './AbstractInterceptor';
import { startNetworkLogging, stopNetworkLogging, clearRequests } from "./../rn";
import { NetworkInterceptorCallbacksTable } from '../types';
import { CONFIG } from './../config';

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

  constructor(callbacksTable: NetworkInterceptorCallbacksTable) {
    super();

    startNetworkLogging({ 
      forceEnable: true,
      // Ignore all HEAD requests
      ignoredPatterns: [/^HEAD /],
      ignoredHosts: CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS ? [CONFIG.DOMAIN] : undefined,
      onRequest: async (data: any) => {
        try {
          const formattedRequest = await this.formatRequest(data);
          const formattedResponse = await this.formatResponse(data);
          callbacksTable.onResponse({
            request: formattedRequest,
            response: formattedResponse,
            requestId: data.id
          });
        } catch (e) {
          console.log(e);
        }
      }
    });
  };

  public dispose() {
    clearRequests();
    stopNetworkLogging();
  }
};

export { NetworkInterceptorRN };