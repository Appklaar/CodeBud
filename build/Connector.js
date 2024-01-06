"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = void 0;
const config_1 = require("./config");
const Errors_1 = require("./Errors");
const api_1 = require("./api/api");
const events_1 = require("./constants/events");
const socket_io_client_1 = require("socket.io-client");
const helperFunctions_1 = require("./helpers/helperFunctions");
const environment_1 = require("./helpers/environment");
const os_1 = require("./helpers/os");
const remoteSettingsService_1 = require("./services/remoteSettingsService");
const asyncStorage_1 = require("./asyncStorage/asyncStorage");
const localStorage_1 = require("./localStorage/localStorage");
const moment_1 = __importDefault(require("moment"));
class Connector {
    static _currentInstanceId = 0;
    static _eventListenersTable = {};
    static _currentInterceptedReduxActionId = 0;
    static _currentInterceptedStorageActionId = 0;
    static _currentCapturedEventId = 0;
    _apiKey;
    _projectInfo = null;
    _instructionsTable = {};
    _onEventUsersCustomCallback;
    _networkInterceptor = null;
    _connectionInfoPacket;
    _shouldStopScenarioExecution = false;
    _lastEventLog;
    _dataToForward = null;
    _socket;
    _sendReduxStateBatchingTimer = null;
    _currentReduxStateCopy = null;
    _sendReduxActionsBatchingTimer = null;
    _currentReduxActionsBatch = [];
    _encryption = null;
    _asyncStorageHandler = null;
    _trackAsyncStorage;
    _untrackAsyncStorage;
    _localStorageHandler = null;
    _trackLocalStorage;
    _untrackLocalStorage;
    _storageActionsBatchingTimeMs = 500;
    _sendStorageActionsBatchingTimer = null;
    _currentStorageActionsBatch = [];
    _unsubscribeFromAppStateChanges;
    static lastEvent = null;
    instanceId;
    static addEventListener(key, handler) {
        Connector._eventListenersTable[key] = handler;
    }
    ;
    static removeEventListener(key) {
        delete Connector._eventListenersTable[key];
    }
    ;
    _prepareEnvironmentInfo(config) {
        try {
            const envInfo = (0, environment_1.getProcessEnv)();
            const osInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getOS() : (0, os_1.getOS)();
            const additionalInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getPlatformInfo() : {};
            return {
                ...envInfo,
                ...osInfo,
                ...additionalInfo
            };
        }
        catch (e) {
            return {};
        }
    }
    ;
    _encryptData(json) {
        if (!this._encryption)
            return (0, helperFunctions_1.jsonStringifyKeepMeta)(json);
        return this._encryption.encryptData(json);
    }
    ;
    _fillInstructionsTable(instructions) {
        const table = {};
        instructions.forEach((ins) => {
            table[ins.id] = ins;
        });
        this._instructionsTable = table;
    }
    _getInstructionsPublicFields(instructions) {
        const instructionsPublic = instructions.map((el) => {
            const publicData = (({ handler, ...o }) => o)(el); // remove "handler" field
            return publicData;
        });
        return instructionsPublic;
    }
    serveAllExternalListenersWithNewEvent(event) {
        Connector.lastEvent = event;
        this._onEventUsersCustomCallback(event);
        for (const key of Object.keys(Connector._eventListenersTable))
            Connector._eventListenersTable[key](event);
    }
    ;
    async _innerHandleEvent(event, isPartOfScenario = false) {
        (0, helperFunctions_1.codebudConsoleLog)('On event:', event);
        try {
            const correspondingInstructionsTable = event.eventType === "default" ? this._instructionsTable : events_1.SPECIAL_INSTRUCTIONS_TABLE;
            // @ts-ignore
            const correspondingInstruction = correspondingInstructionsTable[event.instructionId];
            if (!correspondingInstruction)
                throw new Errors_1.EventHandleError(event, `No instruction with id ${event.instructionId} found.`);
            event.args = event.args ?? [];
            const startTimestamp = (0, moment_1.default)().valueOf();
            if (this._dataToForward && event.args[0]) {
                Object.keys(this._dataToForward).forEach((key) => {
                    // @ts-ignore
                    event.args[0][key] = this._dataToForward[key];
                });
                this._dataToForward = null;
            }
            this.serveAllExternalListenersWithNewEvent(event);
            if (event.args.length !== correspondingInstruction.handler.length)
                throw new Errors_1.EventHandleError(event, `Instruction handler takes ${correspondingInstruction.handler.length} args, but ${event.args.length} were passed.`);
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.EXECUTING_EVENT, event.id);
            let result = await correspondingInstruction.handler(...event.args);
            if (event.instructionId === "condition" && this._lastEventLog?.result) {
                const { param, equalsTo } = event.args[0];
                if ((0, helperFunctions_1.stringifyIfNotString)(this._lastEventLog.result[param]) != (0, helperFunctions_1.stringifyIfNotString)(equalsTo))
                    result = { conditionEvaluatedTo: 0, shouldSkipNextEvent: 1 };
                else
                    result = { conditionEvaluatedTo: 1, shouldSkipNextEvent: 0 };
            }
            else if (event.instructionId === "forwardData" && this._lastEventLog?.result) {
                const dataToForward = {};
                for (const key of event.args[0].paramsToForward)
                    dataToForward[key] = this._lastEventLog.result[key];
                this._dataToForward = dataToForward;
            }
            const endTimestamp = (0, moment_1.default)().valueOf();
            const eventLog = {
                event,
                ok: true,
                result,
                startTimestamp,
                endTimestamp,
                elapsedTime: endTimestamp - startTimestamp
            };
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, eventLog);
            return eventLog;
        }
        catch (error) {
            (0, helperFunctions_1.codebudConsoleLog)(`Error while trying to handle event.`, error);
            // If current event was part of scenario then throw error so it would be processed inside _innerHandleScenario's catch block
            if (isPartOfScenario)
                throw error;
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, { event, ok: false, error });
        }
    }
    async _innerHandleScenario(scenario) {
        // codebudConsoleLog('On scenario:', scenario);
        var eventIndex = 0;
        this._lastEventLog = undefined;
        this._dataToForward = null;
        try {
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.EXECUTING_SCENARIO, scenario.id);
            const startTimestamp = (0, moment_1.default)().valueOf();
            let executionWasStoppedManually = false;
            for (const event of scenario.events) {
                if (this._shouldStopScenarioExecution) {
                    this._shouldStopScenarioExecution = false;
                    executionWasStoppedManually = true;
                    break;
                }
                if (!this._lastEventLog?.result?.shouldSkipNextEvent) {
                    const eventLog = await this._innerHandleEvent(event, true);
                    this._lastEventLog = eventLog;
                }
                eventIndex++;
            }
            const endTimestamp = (0, moment_1.default)().valueOf();
            const scenarioLog = {
                scenario,
                ok: true,
                executionWasStoppedManually,
                startTimestamp,
                endTimestamp,
                elapsedTime: endTimestamp - startTimestamp
            };
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, scenarioLog);
        }
        catch (error) {
            (0, helperFunctions_1.codebudConsoleLog)(`Error while trying to handle scenario.`, error);
            const scenarioError = new Errors_1.ScenarioHandleError(scenario, scenario.events[eventIndex], "Scenario execution failed.");
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, { scenario, ok: false, error: scenarioError });
        }
    }
    async _setupNetworkMonitor(config) {
        this._networkInterceptor = new config.Interceptor({
            onRequest: ({ request, requestId }) => {
                // codebudConsoleLog(`Intercepted request ${requestId}`, request);
                const timestamp = (0, moment_1.default)().valueOf();
                const encryptedData = this._encryptData({ request, requestId, timestamp });
                this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_REQUEST, encryptedData);
            },
            onResponse: ({ response, request, requestId }) => {
                // codebudConsoleLog(`Intercepted response ${requestId}`, response);
                const timestamp = (0, moment_1.default)().valueOf();
                const encryptedData = this._encryptData({ response, request, requestId, timestamp });
                this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_RESPONSE, encryptedData);
            }
        });
    }
    ;
    async _setupRN(config) {
        this._unsubscribeFromAppStateChanges = config.ReactNativePlugin.subscribeForAppStateChanges(() => this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, { foreground: true }), () => this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, { foreground: false }));
    }
    ;
    constructor(apiKey, instructions, usersCustomCallback, config) {
        this.instanceId = Connector._currentInstanceId++;
        this._apiKey = apiKey;
        this._fillInstructionsTable(instructions);
        this._onEventUsersCustomCallback = usersCustomCallback;
        if (config?.EncryptionPlugin) {
            this._encryption = new config.EncryptionPlugin();
        }
        if (config?.projectInfo) {
            this._projectInfo = config.projectInfo;
        }
        this._connectionInfoPacket = {
            apiKey,
            projectId: this._projectInfo?.projectId,
            environmentInfo: this._prepareEnvironmentInfo(config),
            clientType: "CLIENT",
            publicKey: this._encryption?.publicKey,
            availableInstructions: this._getInstructionsPublicFields(instructions),
            specialInstructions: this._getInstructionsPublicFields(events_1.SPECIAL_INSTRUCTIONS)
        };
        this._socket = (0, socket_io_client_1.io)(config_1.CONFIG.MAIN_SOCKET_ADDRESS, {
            withCredentials: true,
            path: config_1.CONFIG.SOCKET_PATH,
            transports: ['websocket'],
            query: { apiKey: this._apiKey }
        });
        if (config?.Interceptor) {
            this._setupNetworkMonitor(config);
        }
        if (config?.ReactNativePlugin) {
            this._setupRN(config);
        }
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.CONNECT, () => {
            (0, helperFunctions_1.codebudConsoleLog)('Socket connected:', this._socket.connected);
            this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SET_CONNECTION_INFO, this._connectionInfoPacket);
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.ADMIN_CONNECTED, (data) => {
            (0, helperFunctions_1.codebudConsoleLog)("AdminConnected");
            if (!data.isAdmin) {
                return;
            }
            if (this._encryption)
                this._encryption.setAdminPanelPublicKey(data.publicKey.data);
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.EVENT, (event) => this._innerHandleEvent(event));
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.SCENARIO, (scenario) => this._innerHandleScenario(scenario));
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.STOP_SCENARIO_EXECUTION, () => {
            (0, helperFunctions_1.codebudConsoleLog)("Stopping scenario manually...");
            this._shouldStopScenarioExecution = true;
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.SAVE_NEW_REMOTE_SETTINGS, (r) => {
            remoteSettingsService_1.remoteSettingsService.onGotNewRemoteSettings(r);
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.CONNECT_ERROR, (err) => {
            (0, helperFunctions_1.codebudConsoleWarn)(`Socket connect_error: ${err.message}`);
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.ERROR, (error) => {
            (0, helperFunctions_1.codebudConsoleWarn)('Socket send error:', error);
        });
        this._socket.on(api_1.SOCKET_EVENTS_LISTEN.DISCONNECT, async () => {
            (0, helperFunctions_1.codebudConsoleLog)('Socket disconnected.');
            setTimeout(() => {
                this._socket.connect();
            }, config_1.CONFIG.SOCKET_RECONNECTION_DELAY);
        });
    }
    createReduxStoreChangeHandler(store, selectFn, batchingTimeMs) {
        try {
            return () => {
                const previousReduxStateCopyStr = JSON.stringify(this._currentReduxStateCopy);
                this._currentReduxStateCopy = selectFn(store.getState());
                if (this._socket.connected && previousReduxStateCopyStr !== JSON.stringify(this._currentReduxStateCopy)) {
                    if (this._sendReduxStateBatchingTimer)
                        clearTimeout(this._sendReduxStateBatchingTimer);
                    this._sendReduxStateBatchingTimer = setTimeout(() => {
                        const encryptedData = this._encryptData({ state: this._currentReduxStateCopy });
                        this._socket.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_REDUX_STATE_COPY, encryptedData);
                    }, batchingTimeMs);
                }
            };
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleWarn)(`Error while trying to create ReduxStoreChangeHandler`, e);
            return () => { };
        }
    }
    handleDispatchedReduxAction(action, batchingTimeMs) {
        if (this._socket.connected) {
            const timestamp = (0, moment_1.default)().valueOf();
            const actionId = Connector._currentInterceptedReduxActionId++;
            this._currentReduxActionsBatch.push({ actionId: `RA_${actionId}`, action, timestamp });
            if (this._sendReduxActionsBatchingTimer)
                clearTimeout(this._sendReduxActionsBatchingTimer);
            this._sendReduxActionsBatchingTimer = setTimeout(() => {
                const encryptedData = this._encryptData({ actions: this._currentReduxActionsBatch });
                this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_REDUX_ACTIONS_BATCH, encryptedData);
                this._currentReduxActionsBatch = [];
            }, batchingTimeMs);
        }
    }
    // AsyncStorage / localStorage
    // used in asyncStoragePlugin & localStoragePlugin, (binded context)
    _handleInterceptedStorageAction(action, data) {
        if (this._socket.connected) {
            const timestamp = (0, moment_1.default)().valueOf();
            const storageActionId = Connector._currentInterceptedStorageActionId++;
            this._currentStorageActionsBatch.push({ storageActionId: `SA_${storageActionId}`, action, data, timestamp });
            if (this._sendStorageActionsBatchingTimer)
                clearTimeout(this._sendStorageActionsBatchingTimer);
            this._sendStorageActionsBatchingTimer = setTimeout(() => {
                const encryptedData = this._encryptData({ storageActions: this._currentStorageActionsBatch });
                this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_STORAGE_ACTIONS_BATCH, encryptedData);
                this._currentStorageActionsBatch = [];
            }, this._storageActionsBatchingTimeMs);
        }
    }
    enableAsyncStorageMonitor(asyncStorage, ignoreKeys, batchingTimeMs) {
        this._asyncStorageHandler = asyncStorage;
        this._storageActionsBatchingTimeMs = batchingTimeMs;
        // passing Connector class context to asyncStoragePlugin function
        const controlFunctions = asyncStorage_1.asyncStoragePlugin.bind(this)(ignoreKeys);
        this._trackAsyncStorage = controlFunctions.trackAsyncStorage;
        this._untrackAsyncStorage = controlFunctions.untrackAsyncStorage;
    }
    enableLocalStorageMonitor(localStorage, ignoreKeys, batchingTimeMs) {
        this._localStorageHandler = localStorage;
        this._storageActionsBatchingTimeMs = batchingTimeMs;
        // passing Connector class context to localStoragePlugin function
        const controlFunctions = localStorage_1.localStoragePlugin.bind(this)(ignoreKeys);
        this._trackLocalStorage = controlFunctions.trackLocalStorage;
        this._untrackLocalStorage = controlFunctions.untrackLocalStorage;
    }
    captureEvent(title, data) {
        if (this._socket.connected) {
            const timestamp = (0, moment_1.default)().valueOf();
            const capturedEventId = Connector._currentCapturedEventId++;
            const encryptedData = this._encryptData({ timestamp, capturedEventId: `UCE_${capturedEventId}`, title, data });
            this._socket?.emit(api_1.SOCKET_EVENTS_EMIT.CAPTURE_EVENT, encryptedData);
        }
    }
    // Метод для "чистки" данных нашего пакета
    disconnect() {
        this._socket.disconnect();
        this._apiKey = "";
        this._projectInfo = null;
        this._instructionsTable = {};
        this._onEventUsersCustomCallback = () => { };
        this._lastEventLog = undefined;
        this._dataToForward = null;
        this._currentReduxStateCopy = null;
        this._currentReduxActionsBatch = [];
        this._encryption = null;
        if (this._networkInterceptor) {
            this._networkInterceptor.dispose();
            this._networkInterceptor = null;
        }
        if (this._asyncStorageHandler) {
            this._untrackAsyncStorage && this._untrackAsyncStorage();
            this._asyncStorageHandler = null;
        }
        if (this._localStorageHandler) {
            this._untrackLocalStorage && this._untrackLocalStorage();
            this._localStorageHandler = null;
        }
        this._unsubscribeFromAppStateChanges && this._unsubscribeFromAppStateChanges();
        // Think about it later
        Connector.lastEvent = null;
        Connector._eventListenersTable = {};
    }
}
exports.Connector = Connector;
