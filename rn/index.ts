import { AppState, Platform } from 'react-native';
import { StartNetworkLoggingOptions } from './types';
import logger from './loggerSingleton';

export { Wrapper as ReactNativeWrapper } from "./components/Wrapper/Wrapper";

export const startNetworkLogging = (options?: StartNetworkLoggingOptions) => {
  logger.enableXHRInterception(options);
};

export const getRequests = () => logger.getRequests();

export const clearRequests = () => logger.clearRequests();

export const stopNetworkLogging = () => logger.disableXHRInterception();

export const ReactNativePlugin = {
  subscribeForAppStateChanges: (onForeground: () => void, onBackground: () => void) => {
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

    // Returns unsubscribe method
    return subscription.remove;
  },
  getOS: () => {
    return { OS: Platform.OS };
  },
  getPlatformInfo: () => {
    return {
      ...Platform.constants,
      PlatformVersion: Platform.Version,
      isTV: Platform.isTV,
      isTesting: Platform.isTesting
    };
  }
}