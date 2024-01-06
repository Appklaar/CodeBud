"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpXHRInterceptor = void 0;
const helperFunctions_1 = require("../../helpers/helperFunctions");
function hookXMLHttpRequest({ DEBUG, window, onInterceptionError, onRequestSeen, onResponseSeen, }) {
    const swizzXMLHttpRequest = window.XMLHttpRequest;
    // note: normally takes no params, except for a Mozilla non-standard extension
    // http://devdocs.io/dom/xmlhttprequest/xmlhttprequest
    window.XMLHttpRequest = function XMLHttpRequest(mozParam) {
        const request = new swizzXMLHttpRequest(mozParam);
        try {
            let method = null;
            let url = null;
            let body = null;
            // intercept open() to grab method + url
            const originalOpen = request.open;
            request.open = function open() {
                try {
                    method = (arguments[0] || 'GET').toUpperCase();
                    url = (arguments[1] || '').toLowerCase();
                }
                catch (e) {
                    onInterceptionError('intercepting XMLHttpRequest open()', e);
                }
                return originalOpen.apply(request, arguments);
            };
            // intercept send() to grab the optional body
            const originalSend = request.send;
            request.send = function send() {
                try {
                    body = arguments[0];
                    if (typeof body === 'string' && body[0] === '{') {
                        try {
                            body = JSON.parse(body);
                        }
                        catch (e) {
                            if (DEBUG)
                                (0, helperFunctions_1.codebudConsoleWarn)(e, { method, url, body });
                            // swallow
                        }
                    }
                    onRequestSeen({
                        api: 'XMLHttpRequest',
                        method,
                        url,
                        body,
                    });
                }
                catch (e) {
                    onInterceptionError('intercepting XMLHttpRequest send()', e);
                }
                return originalSend.apply(request, arguments);
            };
            // listen to request end
            request.addEventListener('load', () => {
                try {
                    let { response } = request;
                    let responseHeaders;
                    let requestQuery = {};
                    if (typeof response === 'string' && response[0] === '{') {
                        try {
                            const urlParams = new URLSearchParams(request.responseURL.split('?')[1]);
                            const query = Object.fromEntries([...urlParams]);
                            // Get the raw header string
                            const headers = request.getAllResponseHeaders();
                            // Convert the header string into an array
                            // of individual headers
                            const arr = headers.trim().split(/[\r\n]+/);
                            // Create a map of header names to values
                            const headerMap = {};
                            arr.forEach((line) => {
                                const parts = line.split(": ");
                                const header = parts.shift();
                                const value = parts.join(": ");
                                if (header)
                                    headerMap[header] = value;
                            });
                            requestQuery = query;
                            response = JSON.parse(response);
                            responseHeaders = headerMap;
                        }
                        catch (e) {
                            if (DEBUG)
                                (0, helperFunctions_1.codebudConsoleWarn)(e, {
                                    method,
                                    url,
                                    response,
                                });
                            // swallow
                        }
                    }
                    onResponseSeen({
                        api: 'XMLHttpRequest',
                        method,
                        url,
                        body: body ?? (Object.keys(requestQuery).length > 0 ? requestQuery : undefined),
                        status: request.status,
                        response,
                        responseHeaders
                    });
                }
                catch (e) {
                    onInterceptionError('processing XMLHttpRequest load evt', e);
                }
            });
            if (DEBUG)
                request.addEventListener('error', () => (0, helperFunctions_1.codebudConsoleWarn)(`error`, { method, url }, request));
            if (DEBUG)
                request.addEventListener('abort', () => (0, helperFunctions_1.codebudConsoleWarn)(`abort`, { method, url }, request));
        }
        catch (e) {
            onInterceptionError('intercepting XMLHttpRequest', e);
        }
        return request;
    };
    return swizzXMLHttpRequest;
}
function hookFetch({ DEBUG, window, onInterceptionError, onRequestSeen, onResponseSeen, }) {
    const swizzFetch = window.fetch;
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
    window.fetch = function fetch(input, init) {
        const promisedResponse = swizzFetch.apply(window, arguments);
        try {
            const method = ((init ? init.method : null) || 'GET').toUpperCase();
            const url = (typeof input === 'string' ? input : '').toLowerCase();
            const body = init ? init.body : null;
            onRequestSeen({
                api: 'fetch',
                method,
                url,
                body,
            });
            promisedResponse
                .then((response) => response.clone()) // important to avoid "body already read"
                .then((response) => response
                .json()
                .catch(() => response.text())
                .catch(() => null)
                .then((res) => {
                onResponseSeen({
                    api: 'fetch',
                    method,
                    url,
                    body,
                    // @ts-ignore
                    response: res,
                });
            }))
                .catch(onInterceptionError.bind(null, 'reading fetch() response'));
        }
        catch (e) {
            onInterceptionError('intercepting fetch()', e);
        }
        return promisedResponse;
    };
    return swizzFetch;
}
function setUpXHRInterceptor({ DEBUG = true, window } = {}) {
    // //////////////////////////////////
    function onInterceptionError(debugId, e) {
        if (DEBUG)
            (0, helperFunctions_1.codebudConsoleWarn)(`error while ${debugId}`, e);
    }
    const requestWaiters = [];
    function onXHRRequest(callback) {
        requestWaiters.push(callback);
    }
    const responsesWaiters = [];
    function onXHRResponse(callback) {
        responsesWaiters.push(callback);
    }
    function onRequestSeen({ api, method, url, body } = {}) {
        try {
            if (DEBUG)
                (0, helperFunctions_1.codebudConsoleLog)(`onRequestSeen`, { api, method, url, body });
            requestWaiters.forEach(callback => callback({ method, url, body }));
        }
        catch (e) {
            onInterceptionError('onRequestSeen', e);
            /* swallow */
        }
    }
    function onResponseSeen({ api, method, url, body, status, response, responseHeaders } = {}) {
        try {
            if (DEBUG)
                (0, helperFunctions_1.codebudConsoleLog)(`onResponseSeen`, { api, method, url, body, status, response, responseHeaders });
            responsesWaiters.forEach(callback => callback({ method, url, body, status, response, responseHeaders }));
        }
        catch (e) {
            onInterceptionError('onResponseSeen', e);
            /* swallow */
        }
    }
    const swizzXMLHttpRequest = hookXMLHttpRequest({
        window,
        DEBUG,
        onInterceptionError,
        onRequestSeen,
        onResponseSeen
    });
    const swizzFetch = hookFetch({
        window,
        DEBUG,
        onInterceptionError,
        onRequestSeen,
        onResponseSeen
    });
    const dispose = () => {
        window.XMLHttpRequest = swizzXMLHttpRequest;
        window.fetch = swizzFetch;
    };
    return {
        onXHRRequest,
        onXHRResponse,
        dispose
    };
}
exports.setUpXHRInterceptor = setUpXHRInterceptor;
