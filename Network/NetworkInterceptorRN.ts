import { NetworkInterceptorApi } from './AbstractInterceptor';
import { startNetworkLogging, clearRequests } from "./../rn";
import { NetworkInterceptorCallbacksTable } from '../types';

class NetworkInterceptorRN extends NetworkInterceptorApi {
  protected async formatRequest(data: any) {
    const formattedRequest = {
      method: data.method,
      body: undefined,
      url: data.url
    };

    return formattedRequest;
  }

  protected async formatResponse(data: any) {
    const formattedResponse = {
      status: data.status,
      statusText: data.status.toString(),
      data: data.response
    };

    return formattedResponse;
  }

  constructor(callbacksTable: NetworkInterceptorCallbacksTable) {
    super();

    startNetworkLogging({ 
      forceEnable: true,
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
  }
};

export { NetworkInterceptorRN };