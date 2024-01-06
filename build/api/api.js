"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS_EMIT = exports.SOCKET_EVENTS_LISTEN = exports.updateAuthorizationHeaderWithApiKey = exports.api = void 0;
const apisauce_1 = require("apisauce");
const config_1 = require("./../config");
const SOCKET_EVENTS_LISTEN = {
    CONNECT: "connect",
    EVENT: "event",
    SCENARIO: "scenario",
    STOP_SCENARIO_EXECUTION: "stopScenarioExecution",
    ERROR: "error",
    CONNECT_ERROR: "connect_error",
    DISCONNECT: "disconnect",
    SAVE_NEW_REMOTE_SETTINGS: "saveNewRemoteSettings",
    ADMIN_CONNECTED: "ADMIN_CONNECTED",
};
exports.SOCKET_EVENTS_LISTEN = SOCKET_EVENTS_LISTEN;
const SOCKET_EVENTS_EMIT = {
    SET_CONNECTION_INFO: "setConnectionInfo",
    EXECUTING_EVENT: "executingEvent",
    SAVE_EVENT_LOG: "saveEventLog",
    EXECUTING_SCENARIO: "executingScenario",
    SAVE_SCENARIO_LOG: "saveScenarioLog",
    SAVE_REDUX_STATE_COPY: "saveReduxStateCopy",
    SAVE_REDUX_ACTIONS_BATCH: "saveReduxActionsBatch",
    SAVE_INTERCEPTED_REQUEST: "saveInterceptedRequest",
    SAVE_INTERCEPTED_RESPONSE: "saveInterceptedResponse",
    SAVE_MOBILE_APP_STATE: "saveMobileAppState",
    SAVE_INTERCEPTED_STORAGE_ACTIONS_BATCH: "saveInterceptedStorageActionsBatch",
    CAPTURE_EVENT: "captureEvent"
};
exports.SOCKET_EVENTS_EMIT = SOCKET_EVENTS_EMIT;
const sauce = (0, apisauce_1.create)({
    baseURL: config_1.CONFIG.BASE_URL,
    headers: { Accept: "application/json" },
});
const sauceAuthorizedApiKey = (0, apisauce_1.create)({
    baseURL: config_1.CONFIG.BASE_URL,
    headers: {
        Accept: 'application/json'
    },
});
// Updates sauceAuthorizedApiKey instance (puts new ApiKey into headers)
const updateAuthorizationHeaderWithApiKey = (apiKey) => {
    sauceAuthorizedApiKey.setHeader('Authorization', apiKey);
};
exports.updateAuthorizationHeaderWithApiKey = updateAuthorizationHeaderWithApiKey;
const api = {
    sauce,
    getRemoteSettingsGet: (params) => sauceAuthorizedApiKey.get(`/project/${params.projectId}/remotesettings`)
};
exports.api = api;
