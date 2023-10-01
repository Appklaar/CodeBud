import { Connector } from './Connector';
import { Instruction, OnEventUsersCustomCallback, RefreshRemoteSettingsCallback, RemoteSettings } from './types';
import { MODULE_STATES } from './States';
import { EXISTING_SPECIAL_INSTRUCTION_IDS } from './constants/events';
import { validateApiKey } from './constants/regex';
import { AppKlaarSdk as ModuleInterface } from './moduleInterface';
import { CONFIG } from './config';
import { codebudConsoleWarn } from './helpers/helperFunctions';
import { prepareInstructionsFromGroup } from './helpers/instructionsHelpers';

export type { Instruction, InstructionGroup } from './types';

export const CodeBud: ModuleInterface = {
  _apiKey : null,
  _connector: null,
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

    // Из переданного массива инструкций и групп инструкций формируется чистый массив инструкций
    const processedInstructions: Instruction[] = [];

    for (let el of instructions) {
      if ("groupId" in el) { // el is InstructionGroup
        processedInstructions.push(...prepareInstructionsFromGroup(el));
      } else { // el is Instruction
        processedInstructions.push(el);
      }
    }

    // Валидация инструкций
    // В т.ч. проверка на коллизии id(шников)
    const instructionIds = new Set<string>();
    const instructionPrototypes = new Set<string>();
    for (let el of processedInstructions) {
      if (EXISTING_SPECIAL_INSTRUCTION_IDS.has(el.id as any)) {
        codebudConsoleWarn(`Instruction id: ${el.id} is reserved for special instruction. You should change it for something else.`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      }

      if (instructionIds.has(el.id)) {
        codebudConsoleWarn(`Duplicate instruction id passed; InstructionId: ${el.id}`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      } else {
        instructionIds.add(el.id);
      }

      if (el.handler.length > 1) {
        codebudConsoleWarn(`Instruction id: ${el.id} handler takes ${el.handler.length} args. Your handler should accept max 1 object as arguement. Number of fields is not limited.`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      }

      if (el.prototype)
        instructionPrototypes.add(el.prototype);
    }

    if (!(instructionPrototypes.has("login") && instructionPrototypes.has("logout"))) {
      if (!instructionPrototypes.has("login"))
        codebudConsoleWarn(`Login instruction is required. Please, provide at least one instruction with prototype "login"`);
      if (!instructionPrototypes.has("logout"))
        codebudConsoleWarn(`Logout instruction is required. Please, provide at least one instruction with prototype "logout"`);
        
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    this._apiKey = apiKey;
    this._connector = new Connector(apiKey, processedInstructions, (event) => this._onEventUsersCustomCallback(event), config);
    this._currentState = "WORKING";
  },

  onEvent(cb: OnEventUsersCustomCallback) {
    this._onEventUsersCustomCallback = cb;
  },

  get isInit(): boolean {
		return !!this._apiKey;
	},

  get state(): string {
    return `Current state is ${this._currentState}. ${MODULE_STATES[this._currentState]}`;
  },

  get remoteSettings(): RemoteSettings | null {
    if (this._connector)
      return Connector.remoteSettings;

    return null;
  },

  async refreshRemoteSettings(callbackFn?: RefreshRemoteSettingsCallback) {
    if (this._connector)
      this._connector.refreshRemoteSettings(callbackFn);
    else 
      codebudConsoleWarn(`${CONFIG.PRODUCT_NAME} not initiated.`);
  },

  createReduxStoreChangeHandler(store, selectFn, batchingTimeMs = 500) {
    try {
      if (!this._connector)
        throw new Error(`Something went wrong while creating ReduxStoreChangeHandler. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return this._connector.createReduxStoreChangeHandler(store, selectFn, batchingTimeMs);
    } catch (e) {
      codebudConsoleWarn(e);
      return () => {};
    }
  },

  createReduxActionMonitorMiddleware(batchingTimeMs = 200) {
    // @ts-ignore
    return () => next => action => {
      if (this._connector)
        this._connector.handleDispatchedReduxAction(action, batchingTimeMs);

      return next(action);
    }
  },

  enableAsyncStorageMonitor(asyncStorage, ignoreKeys = [], batchingTimeMs = 500) {
    try {
      if (!this._connector)
        throw new Error(`Something went wrong while creating AsyncStorage monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return this._connector.enableAsyncStorageMonitor(asyncStorage, ignoreKeys, batchingTimeMs);
    } catch (e) {
      codebudConsoleWarn(e);
    }
  },

  enableLocalStorageMonitor(localStorage, ignoreKeys = [], batchingTimeMs = 500) {
    try {
      if (!this._connector)
        throw new Error(`Something went wrong while creating localStorage monitor. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return this._connector.enableLocalStorageMonitor(localStorage, ignoreKeys, batchingTimeMs);
    } catch (e) {
      codebudConsoleWarn(e);
    }
  },

  captureEvent(title: string, data: any) {
    try {
      if (!this._connector)
        throw new Error(`Unable to capture event. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return this._connector.captureEvent(title, data);
    } catch (e) {
      codebudConsoleWarn(e);
    }
  },
 
  disconnect() {
    this._connector && this._connector.disconnect();
    this._connector = null;
    this._apiKey = null;
    this._currentState = "NOT_INITIATED";
    this._onEventUsersCustomCallback = () => {};
  }
};