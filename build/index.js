"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBud = void 0;
const Connector_1 = require("./Connector");
const States_1 = require("./States");
const events_1 = require("./constants/events");
const regex_1 = require("./constants/regex");
const config_1 = require("./config");
const helperFunctions_1 = require("./helpers/helperFunctions");
const instructionsHelpers_1 = require("./helpers/instructionsHelpers");
const api_1 = require("./api/api");
const remoteSettingsService_1 = require("./services/remoteSettingsService");
exports.CodeBud = {
    _apiKey: null,
    _connector: null,
    _mode: "dev",
    _currentState: "NOT_INITIATED",
    _onEventUsersCustomCallback: () => { },
    init(apiKey, instructions, config) {
        if (this._currentState === "WORKING") {
            (0, helperFunctions_1.codebudConsoleWarn)(`${config_1.CONFIG.PRODUCT_NAME} already initiated!`);
            return;
        }
        if (!(0, regex_1.validateApiKey)(apiKey)) {
            (0, helperFunctions_1.codebudConsoleWarn)(`Wrong API_KEY format!`);
            this._currentState = "INVALID_PARAMETERS";
            return;
        }
        // Из переданного массива инструкций и групп инструкций формируется чистый массив инструкций
        const processedInstructions = [];
        for (let el of instructions) {
            if ("groupId" in el) { // el is InstructionGroup
                processedInstructions.push(...(0, instructionsHelpers_1.prepareInstructionsFromGroup)(el));
            }
            else { // el is Instruction
                processedInstructions.push(el);
            }
        }
        // Валидация инструкций
        // В т.ч. проверка на коллизии id(шников)
        const instructionIds = new Set();
        const instructionPrototypes = new Set();
        for (let el of processedInstructions) {
            if (events_1.EXISTING_SPECIAL_INSTRUCTION_IDS.has(el.id)) {
                (0, helperFunctions_1.codebudConsoleWarn)(`Instruction id: ${el.id} is reserved for special instruction. You should change it for something else.`);
                this._currentState = "INVALID_PARAMETERS";
                return;
            }
            if (instructionIds.has(el.id)) {
                (0, helperFunctions_1.codebudConsoleWarn)(`Duplicate instruction id passed; InstructionId: ${el.id}`);
                this._currentState = "INVALID_PARAMETERS";
                return;
            }
            else {
                instructionIds.add(el.id);
            }
            if (el.handler.length > 1) {
                (0, helperFunctions_1.codebudConsoleWarn)(`Instruction id: ${el.id} handler takes ${el.handler.length} args. Your handler should accept max 1 object as arguement. Number of fields is not limited.`);
                this._currentState = "INVALID_PARAMETERS";
                return;
            }
            if (el.prototype)
                instructionPrototypes.add(el.prototype);
        }
        if (!(instructionPrototypes.has("login") && instructionPrototypes.has("logout"))) {
            if (!instructionPrototypes.has("login"))
                (0, helperFunctions_1.codebudConsoleWarn)(`Login instruction is required. Please, provide at least one instruction with prototype "login"`);
            if (!instructionPrototypes.has("logout"))
                (0, helperFunctions_1.codebudConsoleWarn)(`Logout instruction is required. Please, provide at least one instruction with prototype "logout"`);
            this._currentState = "INVALID_PARAMETERS";
            return;
        }
        this._apiKey = apiKey;
        (0, api_1.updateAuthorizationHeaderWithApiKey)(this._apiKey);
        if (config?.projectInfo) {
            remoteSettingsService_1.remoteSettingsService.init(config.projectInfo.projectId, config.remoteSettingsAutoUpdateInterval);
        }
        if (config?.mode === "prod") {
            this._mode = "prod";
            this._currentState = "WORKING_PRODUCTION";
        }
        else {
            this._mode = "dev";
            this._connector = new Connector_1.Connector(apiKey, processedInstructions, (event) => this._onEventUsersCustomCallback(event), config);
            this._currentState = "WORKING";
        }
    },
    onEvent(cb) {
        this._onEventUsersCustomCallback = cb;
    },
    get isInit() {
        return !!this._apiKey;
    },
    get state() {
        return `Current state is ${this._currentState}. ${States_1.MODULE_STATES[this._currentState]}`;
    },
    get remoteSettings() {
        return remoteSettingsService_1.remoteSettingsService.remoteSettings;
    },
    async refreshRemoteSettings(callbackFn) {
        remoteSettingsService_1.remoteSettingsService.refreshRemoteSettings(callbackFn);
    },
    createReduxStoreChangeHandler(store, selectFn, batchingTimeMs = 500) {
        try {
            if (!this._connector)
                throw new Error(`Something went wrong while creating ReduxStoreChangeHandler. Double check that you initialized ${config_1.CONFIG.PRODUCT_NAME}`);
            return this._connector.createReduxStoreChangeHandler(store, selectFn, batchingTimeMs);
        }
        catch (e) {
            if (this._mode === "dev")
                (0, helperFunctions_1.codebudConsoleWarn)(e);
            return () => { };
        }
    },
    createReduxActionMonitorMiddleware(batchingTimeMs = 200) {
        // @ts-ignore
        return () => next => action => {
            if (this._connector)
                this._connector.handleDispatchedReduxAction(action, batchingTimeMs);
            return next(action);
        };
    },
    enableAsyncStorageMonitor(asyncStorage, ignoreKeys = [], batchingTimeMs = 500) {
        try {
            if (!this._connector)
                throw new Error(`Something went wrong while creating AsyncStorage monitor. Double check that you initialized ${config_1.CONFIG.PRODUCT_NAME}`);
            return this._connector.enableAsyncStorageMonitor(asyncStorage, ignoreKeys, batchingTimeMs);
        }
        catch (e) {
            if (this._mode === "dev")
                (0, helperFunctions_1.codebudConsoleWarn)(e);
        }
    },
    enableLocalStorageMonitor(localStorage, ignoreKeys = [], batchingTimeMs = 500) {
        try {
            if (!this._connector)
                throw new Error(`Something went wrong while creating localStorage monitor. Double check that you initialized ${config_1.CONFIG.PRODUCT_NAME}`);
            return this._connector.enableLocalStorageMonitor(localStorage, ignoreKeys, batchingTimeMs);
        }
        catch (e) {
            if (this._mode === "dev")
                (0, helperFunctions_1.codebudConsoleWarn)(e);
        }
    },
    captureEvent(title, data) {
        try {
            if (!this._connector)
                throw new Error(`Unable to capture event. Double check that you initialized ${config_1.CONFIG.PRODUCT_NAME}`);
            return this._connector.captureEvent(title, data);
        }
        catch (e) {
            if (this._mode === "dev")
                (0, helperFunctions_1.codebudConsoleWarn)(e);
        }
    },
    disconnect() {
        this._mode = "dev";
        this._connector && this._connector.disconnect();
        this._connector = null;
        remoteSettingsService_1.remoteSettingsService.clear();
        this._apiKey = null;
        (0, api_1.updateAuthorizationHeaderWithApiKey)("");
        this._currentState = "NOT_INITIATED";
        this._onEventUsersCustomCallback = () => { };
    }
};
