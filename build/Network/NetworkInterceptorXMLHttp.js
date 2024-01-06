"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkInterceptorXMLHttp = void 0;
const XMLHttpRequest_1 = require("@mswjs/interceptors/XMLHttpRequest");
const AbstractInterceptor_1 = require("./AbstractInterceptor");
const helpers_1 = require("./helpers");
const helperFunctions_1 = require("../helpers/helperFunctions");
class NetworkInterceptorXMLHttp extends AbstractInterceptor_1.NetworkInterceptorApi {
    _interceptor = null;
    async formatRequest(request) {
        let body;
        const isJsonContentType = request.headers.get("content-type")?.includes("application/json");
        try {
            if (isJsonContentType) {
                body = await request.clone().json();
            }
            else {
                body = await request.clone().text();
            }
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleLog)('Request transfrom error');
        }
        const formattedRequest = {
            method: request.method,
            body,
            url: request.url,
            requestHeaders: Object.fromEntries(request.headers)
        };
        return formattedRequest;
    }
    ;
    async formatResponse(response) {
        const isJsonContentType = response.headers.get("content-type")?.includes("application/json");
        let data;
        try {
            if (isJsonContentType) {
                data = await response.clone().json();
            }
            else {
                data = await response.clone().text();
            }
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleLog)(e);
        }
        const formattedResponse = {
            status: response.status,
            statusText: response.statusText,
            data,
            responseHeaders: Object.fromEntries(response.headers)
        };
        return formattedResponse;
    }
    ;
    constructor(callbacksTable) {
        super();
        this._interceptor = new XMLHttpRequest_1.XMLHttpRequestInterceptor();
        // Enable the interception of requests.
        this._interceptor.apply();
        this._interceptor.on('request', async (request, requestId) => {
            if ((0, helpers_1.shouldProceedIntercepted)(request.url)) {
                try {
                    const formattedRequest = await this.formatRequest(request);
                    callbacksTable.onRequest({
                        request: formattedRequest,
                        requestId
                    });
                }
                catch (e) {
                    (0, helperFunctions_1.codebudConsoleLog)(e);
                }
            }
        });
        this._interceptor.on('response', async (response, request, requestId) => {
            if ((0, helpers_1.shouldProceedIntercepted)(request.url)) {
                try {
                    const formattedResponse = await this.formatResponse(response);
                    const formattedRequest = await this.formatRequest(request);
                    callbacksTable.onResponse({
                        response: formattedResponse,
                        request: formattedRequest,
                        requestId
                    });
                }
                catch (e) {
                    (0, helperFunctions_1.codebudConsoleLog)(e);
                }
            }
        });
    }
    ;
    dispose() {
        if (this._interceptor)
            this._interceptor.dispose();
    }
    ;
}
exports.NetworkInterceptorXMLHttp = NetworkInterceptorXMLHttp;
;
