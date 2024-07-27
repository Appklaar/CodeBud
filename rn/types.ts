import { NetworkInterceptorOptions } from "../types/types";
import { NetworkRequestInfo } from "./NetworkRequestInfo";

export type { Headers, RequestMethod } from "./NetworkRequestInfo";

export type StartNetworkLoggingOptions = NetworkInterceptorOptions & {
  /**
   * Max number of requests to keep before overwriting
   * @default 500
   */
  maxRequests?: number;
  /**
   * Force the network logger to start even if another program is using the network interceptor
   * e.g. a dev/debuging program
   */
  forceEnable?: boolean;
  /**
   * Custom onRequest callback
   */
  onRequest?: (request: NetworkRequestInfo) => void;
};

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
