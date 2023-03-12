import logger from './loggerSingleton';
import { StartNetworkLoggingOptions } from './types';

export const startNetworkLogging = (options?: StartNetworkLoggingOptions) => {
  logger.enableXHRInterception(options);
};

export const getRequests = () => logger.getRequests();

export const clearRequests = () => logger.clearRequests();