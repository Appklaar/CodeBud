import { setUpXHRInterceptor } from './../react/network/setupXHRInterceptor';
import { NetworkInterceptorApi } from './AbstractInterceptor';
import { NetworkInterceptorCallbacksTable } from '../types';
import { shouldProceedIntercepted } from './helpers';
import { codebudConsoleLog } from '../helpers/helperFunctions';

type Callback = (data: any) => void;

type XHRInterceptor = {
  onXHRRequest: (callback: Callback) => void;
  onXHRResponse: (callback: Callback) => void;
  dispose: () => void;
}

class NetworkInterceptorXHR extends NetworkInterceptorApi {
  private _interceptor: XHRInterceptor | null = null;
  private _currentId: number = 0;

  protected async formatRequest(request: any) {
    const formattedRequest = {
      method: request.method,
      body: request.body,
      url: request.url,
      // requestHeaders: Object.fromEntries(request.headers)
    };

    return formattedRequest;
  };

  protected async formatResponse(response: any) {
    const formattedResponse = {
      status: response.status,
      statusText: response.status.toString(),
      data: response.response,
      responseHeaders: response.responseHeaders
    };

    return formattedResponse;
  };

  constructor(callbacksTable: NetworkInterceptorCallbacksTable) {
    super();

    this._interceptor = setUpXHRInterceptor({
      DEBUG: false,
      window
    });

    this._interceptor.onXHRRequest(async (request: any) => {
      // if (shouldProceedIntercepted(request.url)) {
      //   try {
      //     const formattedRequest = await this.formatRequest(request);
      //     callbacksTable.onRequest({
      //       request: formattedRequest, 
      //       requestId: "10"
      //     });
      //   } catch (e) {
      //     codebudConsoleLog(e);
      //   }
      // }
    });

    this._interceptor.onXHRResponse(async (response: any) => {
      if (shouldProceedIntercepted(response.url)) {
        try {
          const formattedRequest = await this.formatRequest(response);
          const formattedResponse = await this.formatResponse(response);
          callbacksTable.onResponse({
            response: formattedResponse,
            request: formattedRequest,
            requestId: this._currentId.toString()
          });
          this._currentId++;
        } catch (e) {
          codebudConsoleLog(e);
        }
      }
    });
  };

  public dispose() {
    if (this._interceptor) {
      this._interceptor.dispose();
      this._interceptor = null;
    }
  };
};

export { NetworkInterceptorXHR };