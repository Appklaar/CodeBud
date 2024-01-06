"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteSettingsService = void 0;
const regex_1 = require("../constants/regex");
const helperFunctions_1 = require("../helpers/helperFunctions");
const api_1 = require("./../api/api");
class RemoteSettingsService {
    _projectId = "";
    _isInit = false;
    _remoteSettings = null;
    _remoteSettingsListenersTable = {};
    _autoUpdateTimer = null;
    addRemoteSettingsListener(key, handler) {
        this._remoteSettingsListenersTable[key] = handler;
    }
    ;
    removeRemoteSettingsListener(key) {
        delete this._remoteSettingsListenersTable[key];
    }
    ;
    constructor() { }
    onGotNewRemoteSettings(r) {
        if (!this._isInit)
            return;
        this._remoteSettings = r;
        for (const key of Object.keys(this._remoteSettingsListenersTable))
            this._remoteSettingsListenersTable[key](r);
    }
    async refreshRemoteSettings(callbackFn) {
        try {
            if (!this._isInit) {
                throw new Error("Remote settings service is not initiated. Please make sure that you've passed correct projectId and check console for related errors.");
            }
            const remoteSettings = await api_1.api.getRemoteSettingsGet({ projectId: this._projectId })
                .then((response) => {
                if (response.ok && response.data) {
                    return response.data?.remoteSettings;
                }
                else {
                    throw new Error("Response returned an error");
                }
            });
            this.onGotNewRemoteSettings(remoteSettings);
            callbackFn && callbackFn(remoteSettings);
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleWarn)("Error while trying to fetch remote settings", e);
        }
    }
    init(projectId, autoUpdateInterval) {
        try {
            if (this._isInit)
                throw new Error("Already initiated!");
            if (!(0, regex_1.validateHexId24Symbols)(projectId))
                throw new Error("Invalid projectId");
            this._isInit = true;
            if (autoUpdateInterval !== undefined && autoUpdateInterval < 6e4) {
                (0, helperFunctions_1.codebudConsoleWarn)("Remote settings service: autoUpdateInterval must be at least 60000ms. Minimum value will be applied.");
                autoUpdateInterval = 6e4;
            }
            this._projectId = projectId;
            this.refreshRemoteSettings();
            if (autoUpdateInterval !== undefined)
                this._autoUpdateTimer = setInterval(() => this.refreshRemoteSettings(), autoUpdateInterval);
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleWarn)("Remote settings service cannot be initiated: ", e);
        }
    }
    get remoteSettings() {
        return this._remoteSettings;
    }
    clear() {
        if (this._autoUpdateTimer !== null)
            clearInterval(this._autoUpdateTimer);
        this._projectId = "";
        this._remoteSettings = null;
        this._remoteSettingsListenersTable = {};
        this._isInit = false;
    }
}
;
exports.remoteSettingsService = new RemoteSettingsService();
