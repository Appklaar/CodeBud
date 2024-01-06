"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRemoteSettings = void 0;
const react_1 = require("react");
const remoteSettingsService_1 = require("./../../services/remoteSettingsService");
const random_1 = require("./../../helpers/random");
const useRemoteSettings = () => {
    const [remoteSettings, setRemoteSettings] = (0, react_1.useState)(remoteSettingsService_1.remoteSettingsService.remoteSettings);
    // ComponentDidMount
    (0, react_1.useEffect)(() => {
        const listenerKey = (0, random_1.getId)();
        const innerHandler = (r) => {
            setRemoteSettings(r);
        };
        remoteSettingsService_1.remoteSettingsService.addRemoteSettingsListener(listenerKey, innerHandler);
        // ComponentWillUnmount
        return () => {
            remoteSettingsService_1.remoteSettingsService.removeRemoteSettingsListener(listenerKey);
        };
    }, []);
    return remoteSettings;
};
exports.useRemoteSettings = useRemoteSettings;
