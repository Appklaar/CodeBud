import { connector } from './Connector';
import { OnEventUsersCustomCallback, RefreshRemoteSettingsCallback, RemoteSettingsEnv } from './types';
import { MODULE_STATES } from './States';
import { validateApiKey } from './constants/regex';
import { AppKlaarSdk as ModuleInterface } from './moduleInterface';
import { CONFIG } from './config';
import { codebudConsoleWarn } from './helpers/helperFunctions';
import { prepareInstructionsFromInstructionsAndGroups, validateInstructions } from './helpers/instructionsHelpers';
import { updateAuthorizationHeaderWithApiKey } from './api/api';
import { remoteSettingsService } from './services/remoteSettingsService';

export type { Instruction, InstructionGroup } from './types/types';

export const CodeBud: ModuleInterface = {
  _mode: "dev",
  _currentState: "NOT_INITIATED",
  _onEventUsersCustomCallback: () => {},

  init(apiKey, instructions, config) {
    if (this._currentState === "WORKING") {
      codebudConsoleWarn(`${CONFIG.PRODUCT_NAME} already initiated!`);
      return;
    }

    if (!validateApiKey(apiKey)) {
      codebudConsoleWarn(`Wrong API_KEY format!`);
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    const processedInstructions = prepareInstructionsFromInstructionsAndGroups(instructions);

    const validationResult = validateInstructions(processedInstructions);
    if (!validationResult.ok) {
      codebudConsoleWarn(validationResult.message);
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    updateAuthorizationHeaderWithApiKey(apiKey);
    if (config?.projectInfo) {
      remoteSettingsService.init(config.projectInfo.projectId, config.remoteSettingsAutoUpdateInterval);
    }

    if (config?.mode === "prod") {
      this._mode = "prod";
      this._currentState = "WORKING_PRODUCTION";
    } else {
      this._mode = "dev";
      connector.init(apiKey, processedInstructions, (event) => this._onEventUsersCustomCallback(event), config);
      this._currentState = "WORKING";
    }
  },

  onEvent(cb: OnEventUsersCustomCallback) {
    this._onEventUsersCustomCallback = cb;
  },

  get isInit() {
		return connector.isInit;
	},

  get state() {
    return `Current state is ${this._currentState}. ${MODULE_STATES[this._currentState]}`;
  },

  get remoteSettings() {
    return remoteSettingsService.remoteSettings;
  },

  getRemoteSettingsByEnv(env: RemoteSettingsEnv) {
    return remoteSettingsService.remoteSettings?.[env] ?? null;
  },

  async refreshRemoteSettings(callbackFn?: RefreshRemoteSettingsCallback) {
    remoteSettingsService.refreshRemoteSettings(callbackFn);
  },

  createReduxStoreChangeHandler(store, selectFn, batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while creating ReduxStoreChangeHandler. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.createReduxStoreChangeHandler(store, selectFn, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);

      return () => {};
    }
  },

  createReduxActionMonitorMiddleware(batchingTimeMs = 200) {
    return () => (next: any) => (action: any) => {
      if (connector.isInit)
        connector.handleDispatchedReduxAction(action, batchingTimeMs);

      return next(action);
    }
  },

  createZustandStoreChangeHandler(selectFn, batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while creating ZustandStoreChangeHandler. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.createZustandStoreChangeHandler(selectFn, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);

      return () => {};
    }
  },

  enableAsyncStorageMonitor(asyncStorage, ignoreKeys = [], batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while creating AsyncStorage monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.enableAsyncStorageMonitor(asyncStorage, ignoreKeys, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);
    }
  },

  enableLocalStorageMonitor(localStorage, ignoreKeys = [], batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while creating localStorage monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.enableLocalStorageMonitor(localStorage, ignoreKeys, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);
    }
  },

  captureEvent(title: string, data: any) {
    try {
      if (!connector.isInit)
        throw new Error(`Unable to capture event. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.captureEvent(title, data);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);
    }
  },

  monitorTanStackQueriesData(queryClient, updateIntervalMs = 1000, batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while enabling TanStack queries data monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.monitorTanStackQueriesData(queryClient, updateIntervalMs, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);

      return () => {};
    }
  },

  monitorTanStackQueryEvents(queryClient, batchingTimeMs = 500) {
    try {
      if (!connector.isInit)
        throw new Error(`Something went wrong while enabling TanStack Query events monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return connector.monitorTanStackQueryEvents(queryClient, batchingTimeMs);
    } catch (e) {
      if (this._mode === "dev")
        codebudConsoleWarn(e);

      return () => {};
    }
  },
 
  disconnect() {
    this._mode = "dev";
    connector.isInit && connector.disconnect();
    remoteSettingsService.clear();
    updateAuthorizationHeaderWithApiKey("");
    this._currentState = "NOT_INITIATED";
    this._onEventUsersCustomCallback = () => {};
  }
};