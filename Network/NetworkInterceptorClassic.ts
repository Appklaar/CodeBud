import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { NetworkInterceptorApi } from './AbstractInterceptor';
import { NetworkInterceptorCallbacksTable, NetworkInterceptorOptions } from '../types/types';
import { codebudConsoleLog } from '../helpers/helperFunctions';

class NetworkInterceptorClassic extends NetworkInterceptorApi {
  private _interceptor: ClientRequestInterceptor | null = null;

  protected async formatRequest(request: any) {
    let body: any;
    const isJsonContentType = request.headers.get("content-type")?.includes("application/json");

    try {
      if (isJsonContentType) {
        body = await request.clone().json();
      } else {
        body = await request.clone().text();
      }
    } catch (e) {
      codebudConsoleLog('Request transfrom error');
    }

    const formattedRequest = {
      method: request.method,
      body,
      url: request.url,
      requestHeaders: Object.fromEntries(request.headers)
    };

    return formattedRequest;
  };

  protected async formatResponse(response: any) {
    const isJsonContentType = response.headers.get("content-type")?.includes("application/json");
    let data: any;

    try {
      if (isJsonContentType) {
        data = await response.clone().json();
      } else {
        data = await response.clone().text();
      }
    } catch (e) {
      codebudConsoleLog('Response transfrom error');
    }

    const formattedResponse = {
      status: response.status,
      statusText: response.statusText,
      data,
      responseHeaders: Object.fromEntries(response.headers)
    };

    return formattedResponse;
  };

  constructor(callbacksTable: NetworkInterceptorCallbacksTable, options?: NetworkInterceptorOptions) {
    super(options);
    
    this._interceptor = new ClientRequestInterceptor();
    // Enable the interception of requests.
    this._interceptor.apply();

    this._interceptor.on('request', async (request, requestId) => {
      if (this.shouldProceedIntercepted(request.url, request.method)) {
        try {
          const formattedRequest = await this.formatRequest(request);
          callbacksTable.onRequest({
            request: formattedRequest, 
            requestId
          });
        } catch (e) {
          codebudConsoleLog(e);
        }
      }
    });
    
    this._interceptor.on('response', async (response, request, requestId) => {
      if (this.shouldProceedIntercepted(request.url, request.method)) {
        try {
          const formattedResponse = await this.formatResponse(response);
          const formattedRequest = await this.formatRequest(request);
          callbacksTable.onResponse({
            response: formattedResponse,
            request: formattedRequest,
            requestId
          });
        } catch (e) {
          codebudConsoleLog(e);
        }
      }
    });
  };

  public dispose() {
    this.disposeIgnored();
    this._interceptor?.dispose();
  };
};

export { NetworkInterceptorClassic };