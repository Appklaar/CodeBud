import { codebudConsoleWarn, codebudConsoleLog } from "../../helpers/helperFunctions";

type RequestData = { api?: any, method?: string, url?: string, body?: any };

type ResponseData = RequestData & {status?: number, response?: any, responseHeaders?: any};

type RequestWaiter = (request: RequestData) => any;

type ResponseWaiter = (response: ResponseData) => any;

type OnInterceptionError = (debugId: string, e: any) => void;
type OnRequestSeen = (request: RequestData) => void;
type OnResponseSeen = (response: ResponseData) => void;

type HookXMLHttpRequestParams = {
  DEBUG: boolean;
  window: any;
  onInterceptionError: OnInterceptionError;
  onRequestSeen: OnRequestSeen;
  onResponseSeen: OnResponseSeen
};

function hookXMLHttpRequest({
  DEBUG,
  window,
  onInterceptionError,
  onRequestSeen,
  onResponseSeen,
}: HookXMLHttpRequestParams) {
  const swizzXMLHttpRequest = window.XMLHttpRequest;

  // note: normally takes no params, except for a Mozilla non-standard extension
  // http://devdocs.io/dom/xmlhttprequest/xmlhttprequest
  window.XMLHttpRequest = function XMLHttpRequest(mozParam: any) {
    const request = new swizzXMLHttpRequest(mozParam);

    try {
      let method: any = null;
      let url: any = null;
      let body: any = null;

      // intercept open() to grab method + url
      const originalOpen = request.open;
      request.open = function open() {
        try {
          method = (arguments[0] || 'GET').toUpperCase();
          url = (arguments[1] || '').toLowerCase();
        } catch (e) {
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
            } catch (e) {
              if (DEBUG)
                codebudConsoleWarn(e, {method, url, body});
              // swallow
            }
          }

          onRequestSeen({
            api: 'XMLHttpRequest',
            method,
            url,
            body,
          });
        } catch (e) {
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
              const headerMap: {[key: string]: string} = {};
              arr.forEach((line: string) => {
                const parts = line.split(": ");
                const header = parts.shift();
                const value = parts.join(": ");
                if (header)
                  headerMap[header] = value;
              });

              requestQuery = query;
              response = JSON.parse(response);
              responseHeaders = headerMap;
            } catch (e) {
              if (DEBUG)
                codebudConsoleWarn(
                  e,
                  {
                    method,
                    url,
                    response,
                  },
                );
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
        } catch (e) {
          onInterceptionError('processing XMLHttpRequest load evt', e);
        }
      });

      if (DEBUG)
        request.addEventListener('error', () =>
          codebudConsoleWarn(`error`, { method, url }, request),
        );
      if (DEBUG)
        request.addEventListener('abort', () =>
          codebudConsoleWarn(`abort`, { method, url }, request),
        );
    } catch (e) {
      onInterceptionError('intercepting XMLHttpRequest', e);
    }

    return request;
  };

  return swizzXMLHttpRequest;
}

type hookFetchParams = {
  DEBUG: boolean;
  window: any;
  onInterceptionError: OnInterceptionError;
  onRequestSeen: OnRequestSeen;
  onResponseSeen: OnRequestSeen;
};

function hookFetch({
  DEBUG,
  window,
  onInterceptionError,
  onRequestSeen,
  onResponseSeen,
}: hookFetchParams) {
  const swizzFetch = window.fetch;

  // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
  window.fetch = function fetch(input: any, init: any) {
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
        .then((response: any) => response.clone()) // important to avoid "body already read"
        .then((response: any) =>
          response
            .json()
            .catch(() => response.text())
            .catch(() => null)
            .then((res: any) => {
              onResponseSeen({
                api: 'fetch',
                method,
                url,
                body,
                // @ts-ignore
                response: res,
              });
            }),
        )
        .catch(onInterceptionError.bind(null, 'reading fetch() response'));
    } catch (e) {
      onInterceptionError('intercepting fetch()', e);
    }

    return promisedResponse;
  };

  return swizzFetch;
}

type setUpXHRInterceptorParams = {
  DEBUG?: boolean;
  window?: any;
};

export function setUpXHRInterceptor({
  DEBUG = true,
  window
}: setUpXHRInterceptorParams = {}) {
  // //////////////////////////////////

  function onInterceptionError(debugId: string, e: any) {
    if (DEBUG)
      codebudConsoleWarn(`error while ${debugId}`, e);
  }

  const requestWaiters: RequestWaiter[] = [];

  function onXHRRequest(callback: RequestWaiter) {
    requestWaiters.push(callback);
  }

  const responsesWaiters: ResponseWaiter[] = [];
  
  function onXHRResponse(callback: ResponseWaiter) {
    responsesWaiters.push(callback);
  }

  function onRequestSeen({ api, method, url, body }: RequestData = {}) {
      try {
        if (DEBUG) 
          codebudConsoleLog(`onRequestSeen`, { api, method, url, body });

        requestWaiters.forEach(callback => callback({ method, url, body }));
      } catch (e) {
        onInterceptionError('onRequestSeen', e);
        /* swallow */
      }
  }

  function onResponseSeen({ api, method, url, body, status, response, responseHeaders }: ResponseData = {}) {
    try {
      if (DEBUG)
        codebudConsoleLog(`onResponseSeen`, {api, method, url, body, status, response, responseHeaders});

      responsesWaiters.forEach(callback => callback({ method, url, body, status, response, responseHeaders }));
    } catch (e) {
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
  }

  return {
    onXHRRequest,
    onXHRResponse,
    dispose
  };
}