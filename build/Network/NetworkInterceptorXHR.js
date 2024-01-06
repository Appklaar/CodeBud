"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkInterceptorXHR = void 0;
const setupXHRInterceptor_1 = require("./../react/network/setupXHRInterceptor");
const AbstractInterceptor_1 = require("./AbstractInterceptor");
const helpers_1 = require("./helpers");
const helperFunctions_1 = require("../helpers/helperFunctions");
class NetworkInterceptorXHR extends AbstractInterceptor_1.NetworkInterceptorApi {
    _interceptor = null;
    _currentId = 0;
    async formatRequest(request) {
        const formattedRequest = {
            method: request.method,
            body: request.body,
            url: request.url,
            // requestHeaders: Object.fromEntries(request.headers)
        };
        return formattedRequest;
    }
    ;
    async formatResponse(response) {
        const formattedResponse = {
            status: response.status,
            statusText: response.status.toString(),
            data: response.response,
            responseHeaders: response.responseHeaders
        };
        return formattedResponse;
    }
    ;
    constructor(callbacksTable) {
        super();
        this._interceptor = (0, setupXHRInterceptor_1.setUpXHRInterceptor)({
            DEBUG: false,
            window
        });
        this._interceptor.onXHRRequest(async (request) => {
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
        this._interceptor.onXHRResponse(async (response) => {
            if ((0, helpers_1.shouldProceedIntercepted)(response.url)) {
                try {
                    const formattedRequest = await this.formatRequest(response);
                    const formattedResponse = await this.formatResponse(response);
                    callbacksTable.onResponse({
                        response: formattedResponse,
                        request: formattedRequest,
                        requestId: this._currentId.toString()
                    });
                    this._currentId++;
                }
                catch (e) {
                    (0, helperFunctions_1.codebudConsoleLog)(e);
                }
            }
        });
    }
    ;
    dispose() {
        if (this._interceptor) {
            this._interceptor.dispose();
            this._interceptor = null;
        }
    }
    ;
}
exports.NetworkInterceptorXHR = NetworkInterceptorXHR;
;
