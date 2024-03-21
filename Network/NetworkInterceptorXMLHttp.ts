import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { NetworkInterceptorApi } from './AbstractInterceptor';
import { NetworkInterceptorCallbacksTable } from '../types/types';
import { shouldProceedIntercepted } from './helpers';
import { codebudConsoleLog } from '../helpers/helperFunctions';

class NetworkInterceptorXMLHttp extends NetworkInterceptorApi {
  private _interceptor: XMLHttpRequestInterceptor | null = null;

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
      codebudConsoleLog(e);
    }

    const formattedResponse = {
      status: response.status,
      statusText: response.statusText,
      data,
      responseHeaders: Object.fromEntries(response.headers)
    };

    return formattedResponse;
  };

  constructor(callbacksTable: NetworkInterceptorCallbacksTable) {
    super();
    
    this._interceptor = new XMLHttpRequestInterceptor();
    // Enable the interception of requests.
    this._interceptor.apply();

    this._interceptor.on('request', async (request, requestId) => {
      if (shouldProceedIntercepted(request.url)) {
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
      if (shouldProceedIntercepted(request.url)) {
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
    if (this._interceptor)
      this._interceptor.dispose();
  };
};

export { NetworkInterceptorXMLHttp };