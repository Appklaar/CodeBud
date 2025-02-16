import { setUpXHRInterceptor } from './helpers/setupXHRInterceptor';
import { NetworkInterceptorApi } from './AbstractInterceptor';
import { NetworkInterceptorCallbacksTable, NetworkInterceptorOptions } from '../types/types';
import { codebudConsoleLog } from '../helpers/helperFunctions';
import { SPECIAL_HTTP_STATUS_CODES } from '../constants/httpStatusCodes';

class NetworkInterceptorGlobalFetch extends NetworkInterceptorApi {
  private _interceptor: ReturnType<typeof setUpXHRInterceptor> | null = null;
  private _currentId: number = 0;

  protected async formatRequest(request: any) {
    const formattedRequest = {
      method: request.method,
      body: request.body,
      url: request.url,
      requestHeaders: request.requestHeaders
    };

    return formattedRequest;
  };

  protected async formatResponse(response: any) {
    const formattedResponse = {
      status: response.status ?? SPECIAL_HTTP_STATUS_CODES.STATUS_CODE_UNDEFINED.STATUS,
      statusText: response.status?.toString() ?? SPECIAL_HTTP_STATUS_CODES.STATUS_CODE_UNDEFINED.STATUS_TEXT,
      data: response.response,
      responseHeaders: response.responseHeaders
    };

    return formattedResponse;
  };

  constructor(callbacksTable: NetworkInterceptorCallbacksTable, options?: NetworkInterceptorOptions) {
    super(options);

    this._interceptor = setUpXHRInterceptor({
      getRequestId: () => this._currentId++,
      DEBUG: false,
      windowOrGlobal: global
    });

    this._interceptor.onRequest(async (request: any) => {
      if (this.shouldProceedIntercepted(request.url, request.method)) {
        try {
          const formattedRequest = await this.formatRequest(request);
          callbacksTable.onRequest({
            request: formattedRequest, 
            requestId: request.requestId
          });
        } catch (e) {
          codebudConsoleLog(e);
        }
      }
    });

    this._interceptor.onResponse(async (response: any) => {
      if (this.shouldProceedIntercepted(response.url, response.method)) {
        try {
          const formattedRequest = await this.formatRequest(response);
          const formattedResponse = await this.formatResponse(response);
          callbacksTable.onResponse({
            response: formattedResponse,
            request: formattedRequest,
            requestId: response.requestId
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
    this._interceptor = null;
  };
};

export { NetworkInterceptorGlobalFetch };