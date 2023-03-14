import { AppState } from 'react-native';
import { StartNetworkLoggingOptions } from './types';
import logger from './loggerSingleton';

export const startNetworkLogging = (options?: StartNetworkLoggingOptions) => {
  logger.enableXHRInterception(options);
};

export const getRequests = () => logger.getRequests();

export const clearRequests = () => logger.clearRequests();

export const subscribeForAppStateChanges = (onForeground: () => void, onBackground: () => void) => {
  let appState: string = '';

  const subscription = AppState.addEventListener(
    'change',
    (nextAppState: string) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground! (развернули)
        onForeground();
      }

      if (nextAppState.match(/inactive|background/) && appState === 'active') {
        //App has come to the background.
        onBackground();
      }

      appState = nextAppState;
    },
  );
}