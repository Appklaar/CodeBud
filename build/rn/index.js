"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactNativePlugin = exports.stopNetworkLogging = exports.clearRequests = exports.getRequests = exports.startNetworkLogging = void 0;
const react_native_1 = require("react-native");
const loggerSingleton_1 = __importDefault(require("./loggerSingleton"));
const startNetworkLogging = (options) => {
    loggerSingleton_1.default.enableXHRInterception(options);
};
exports.startNetworkLogging = startNetworkLogging;
const getRequests = () => loggerSingleton_1.default.getRequests();
exports.getRequests = getRequests;
const clearRequests = () => loggerSingleton_1.default.clearRequests();
exports.clearRequests = clearRequests;
const stopNetworkLogging = () => loggerSingleton_1.default.disableXHRInterception();
exports.stopNetworkLogging = stopNetworkLogging;
exports.ReactNativePlugin = {
    subscribeForAppStateChanges: (onForeground, onBackground) => {
        let appState = '';
        const subscription = react_native_1.AppState.addEventListener('change', (nextAppState) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                // App has come to the foreground! (развернули)
                onForeground();
            }
            if (nextAppState.match(/inactive|background/) && appState === 'active') {
                //App has come to the background.
                onBackground();
            }
            appState = nextAppState;
        });
        // Returns unsubscribe method
        return subscription.remove;
    },
    getOS: () => {
        return { OS: react_native_1.Platform.OS };
    },
    getPlatformInfo: () => {
        return {
            ...react_native_1.Platform.constants,
            PlatformVersion: react_native_1.Platform.Version,
            isTV: react_native_1.Platform.isTV,
            isTesting: react_native_1.Platform.isTesting
        };
    }
};
