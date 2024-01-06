"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkInterceptorRN = void 0;
const AbstractInterceptor_1 = require("./AbstractInterceptor");
const rn_1 = require("./../rn");
const config_1 = require("./../config");
const helperFunctions_1 = require("../helpers/helperFunctions");
const helpers_1 = require("./helpers");
class NetworkInterceptorRN extends AbstractInterceptor_1.NetworkInterceptorApi {
    async formatRequest(data) {
        let body;
        try {
            body = JSON.parse(data.dataSent);
        }
        catch (e) {
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
    async formatResponse(data) {
        let responseData;
        try {
            responseData = JSON.parse(data.response);
        }
        catch (e) {
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
    constructor(callbacksTable) {
        super();
        (0, rn_1.startNetworkLogging)({
            forceEnable: true,
            // Ignore all HEAD requests
            ignoredPatterns: [/^HEAD /],
            ignoredHosts: config_1.CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS ? [config_1.CONFIG.DOMAIN] : undefined,
            onRequest: async (data) => {
                try {
                    if ((0, helpers_1.shouldProceedIntercepted)(data.url)) {
                        const formattedRequest = await this.formatRequest(data);
                        const formattedResponse = await this.formatResponse(data);
                        callbacksTable.onResponse({
                            request: formattedRequest,
                            response: formattedResponse,
                            requestId: data.id
                        });
                    }
                }
                catch (e) {
                    (0, helperFunctions_1.codebudConsoleLog)(e);
                }
            }
        });
    }
    ;
    dispose() {
        (0, rn_1.clearRequests)();
        (0, rn_1.stopNetworkLogging)();
    }
}
exports.NetworkInterceptorRN = NetworkInterceptorRN;
;
