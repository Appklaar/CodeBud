import { Connector } from './Connector';
import { OnEventUsersCustomCallback, RefreshRemoteSettingsCallback, RemoteSettings } from './types';
import { MODULE_STATES } from './States';
import { EXISTING_SPECIAL_INSTRUCTION_IDS } from './constants/events';
import { validateApiKey } from './constants/regex';
import { AppKlaarSdk as ModuleInterface } from './moduleInterface';
import { CONFIG } from './config';

export type { Instruction } from './types';

export const CodeBud: ModuleInterface = {
  _apiKey : null,
  _connector: null,
  _currentState: "NOT_INITIATED",
  _onEventUsersCustomCallback: () => {},

  init(apiKey, instructions, config) {
    if (this._currentState === "WORKING") {
      console.warn(`${CONFIG.PRODUCT_NAME} already initiated!`);
      return;
    }

    if (!validateApiKey(apiKey)) {
      console.warn(`Wrong API_KEY format!`);
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    // Валидация инструкций
    // В т.ч. проверка на коллизии id(шников) среди переданных инструкций
    const instructionIds = new Set<string>();
    const instructionPrototypes = new Set<string>();
    for (let el of instructions) {
      if (EXISTING_SPECIAL_INSTRUCTION_IDS.has(el.id as any)) {
        console.warn(`Instruction id: ${el.id} is reserved for special instruction. You should change it for something else.`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      }

      if (instructionIds.has(el.id)) {
        console.warn(`Duplicate instruction id passed; InstructionId: ${el.id}`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      } else {
        instructionIds.add(el.id);
      }

      if (el.handler.length > 1) {
        console.warn(`Instruction id: ${el.id} handler takes ${el.handler.length} args. Your handler should accept max 1 object as arguement. Number of fields is not limited.`);
        this._currentState = "INVALID_PARAMETERS";
        return;
      }

      // if (el.prototype === "login") {
      //   if (!el.parametersDescription?.login || !el.parametersDescription.pass)
      //     console.warn(`Instruction with id ${el.id} is marked with login prototype, but its parameters dont match the prototype. We recommend to pass parametersDescription with "login" and "pass" fields, where "login" means user identifier (such as phone number or email). You can ignore this warning if you are sure what you are doing.`);
      // }

      if (el.prototype)
        instructionPrototypes.add(el.prototype);
    }

    if (!(instructionPrototypes.has("login") && instructionPrototypes.has("logout"))) {
      if (!instructionPrototypes.has("login"))
        console.warn(`Login instruction is required. Please, provide at least one instruction with prototype "login"`);
      if (!instructionPrototypes.has("logout"))
        console.warn(`Logout instruction is required. Please, provide at least one instruction with prototype "logout"`);
        
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    this._apiKey = apiKey;
    this._connector = new Connector(apiKey, instructions, (event) => this._onEventUsersCustomCallback(event), config);
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
      console.warn(`${CONFIG.PRODUCT_NAME} not initiated.`);
  },

  createReduxStoreChangeHandler(store, selectFn, batchingTimeMs = 500) {
    try {
      if (!this._connector)
        throw new Error(`Something went wrong while creating ReduxStoreChangeHandler. Double check that you initialized ${CONFIG.PRODUCT_NAME}`);

      return this._connector.createReduxStoreChangeHandler(store, selectFn, batchingTimeMs);
    } catch (e) {
      console.warn(e);
      return () => {};
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