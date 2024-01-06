"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const XHRInterceptor_1 = __importDefault(require("react-native/Libraries/Network/XHRInterceptor"));
const NetworkRequestInfo_1 = require("./NetworkRequestInfo");
const extractHost_1 = __importDefault(require("./utils/extractHost"));
const logger_1 = require("./utils/logger");
let nextXHRId = 0;
class Logger {
    requests = [];
    xhrIdMap = {};
    maxRequests = 500;
    ignoredHosts;
    ignoredUrls;
    ignoredPatterns;
    enabled = false;
    externalOnRequestCallback;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback = (requests) => { };
    setCallback = (callback) => {
        this.callback = callback;
    };
    getRequest = (xhrIndex) => {
        if (xhrIndex === undefined)
            return undefined;
        const requestIndex = this.requests.length - this.xhrIdMap[xhrIndex] - 1;
        return this.requests[requestIndex];
    };
    updateRequest = (index, update) => {
        const networkInfo = this.getRequest(index);
        if (!networkInfo)
            return;
        networkInfo.update(update);
    };
    openCallback = (method, url, xhr) => {
        xhr._index = nextXHRId++;
        const xhrIndex = this.requests.length;
        this.xhrIdMap[xhr._index] = xhrIndex;
        if (this.ignoredHosts) {
            const host = (0, extractHost_1.default)(url);
            if (host && this.ignoredHosts.has(host)) {
                return;
            }
        }
        if (this.ignoredUrls && this.ignoredUrls.has(url)) {
            return;
        }
        if (this.ignoredPatterns) {
            if (this.ignoredPatterns.some((pattern) => pattern.test(`${method} ${url}`))) {
                return;
            }
        }
        const newRequest = new NetworkRequestInfo_1.NetworkRequestInfo(`${nextXHRId}`, 'XMLHttpRequest', method, url);
        if (this.requests.length >= this.maxRequests) {
            this.requests.pop();
        }
        this.requests.unshift(newRequest);
    };
    requestHeadersCallback = (header, value, xhr) => {
        const networkInfo = this.getRequest(xhr._index);
        if (!networkInfo)
            return;
        networkInfo.requestHeaders[header] = value;
    };
    headerReceivedCallback = (responseContentType, responseSize, responseHeaders, xhr) => {
        this.updateRequest(xhr._index, {
            responseContentType,
            responseSize,
            responseHeaders: xhr.responseHeaders,
        });
    };
    sendCallback = (data, xhr) => {
        this.updateRequest(xhr._index, {
            startTime: Date.now(),
            dataSent: data,
        });
        this.callback(this.requests);
    };
    responseCallback = (status, timeout, response, responseURL, responseType, xhr) => {
        this.updateRequest(xhr._index, {
            endTime: Date.now(),
            status,
            timeout,
            response,
            responseURL,
            responseType,
        });
        if (this.externalOnRequestCallback) {
            const updatedRequest = this.getRequest(xhr._index);
            updatedRequest && this.externalOnRequestCallback(updatedRequest);
        }
        this.callback(this.requests);
    };
    enableXHRInterception = (options) => {
        if (this.enabled ||
            (XHRInterceptor_1.default.isInterceptorEnabled() && !options?.forceEnable)) {
            if (!this.enabled) {
                (0, logger_1.warn)('network interceptor has not been enabled as another interceptor is already running (e.g. another debugging program). Use option `forceEnable: true` to override this behaviour.');
            }
            return;
        }
        if (options?.maxRequests !== undefined) {
            if (typeof options.maxRequests !== 'number' || options.maxRequests < 1) {
                (0, logger_1.warn)('maxRequests must be a number greater than 0. The logger has not been started.');
                return;
            }
            this.maxRequests = options.maxRequests;
        }
        if (options?.ignoredHosts) {
            if (!Array.isArray(options.ignoredHosts) ||
                typeof options.ignoredHosts[0] !== 'string') {
                (0, logger_1.warn)('ignoredHosts must be an array of strings. The logger has not been started.');
                return;
            }
            this.ignoredHosts = new Set(options.ignoredHosts);
        }
        if (options?.ignoredPatterns) {
            this.ignoredPatterns = options.ignoredPatterns;
        }
        if (options?.ignoredUrls) {
            if (!Array.isArray(options.ignoredUrls) ||
                typeof options.ignoredUrls[0] !== 'string') {
                (0, logger_1.warn)('ignoredUrls must be an array of strings. The logger has not been started.');
                return;
            }
            this.ignoredUrls = new Set(options.ignoredUrls);
        }
        if (options?.onRequest) {
            this.externalOnRequestCallback = options.onRequest;
        }
        XHRInterceptor_1.default.setOpenCallback(this.openCallback);
        XHRInterceptor_1.default.setRequestHeaderCallback(this.requestHeadersCallback);
        XHRInterceptor_1.default.setHeaderReceivedCallback(this.headerReceivedCallback);
        XHRInterceptor_1.default.setSendCallback(this.sendCallback);
        XHRInterceptor_1.default.setResponseCallback(this.responseCallback);
        XHRInterceptor_1.default.enableInterception();
        this.enabled = true;
    };
    disableXHRInterception() {
        if (this.enabled) {
            XHRInterceptor_1.default.disableInterception();
            this.enabled = false;
        }
    }
    getRequests = () => {
        return this.requests;
    };
    clearRequests = () => {
        this.requests = [];
        this.callback(this.requests);
    };
}
exports.default = Logger;
