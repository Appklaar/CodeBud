import { Connector } from './Connector';
import { isValidApiKey } from './helperFunctions';
import { Instruction, OnEventUsersCustomCallback, SelectFn } from './types';
import { MODULE_STATES, ModuleState } from './States';
import { EXISTING_SPECIAL_INSTRUCTION_IDS } from './constants/events';
import { validateApiKey } from './constants/regex';

export { 
  Instruction,
  InstructionsTable
} from './types';

type SdkModule = {
  _apiKey: null | string;
  _connector: null | Connector;
  _currentState: ModuleState;
  _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  /**
	 * Initialize the module.
	 * @param {String} apiKey The api key of yours.
	 * @param {Instruction[]} instructions Instructions that will be available from remote testing panel.
	 */
  init: (apiKey: string, instructions: Instruction[]) => void;
  /**
	 * Set custom callback that will be called on every action.
	 * @param {OnEventUsersCustomCallback} usersCustomCallback Callback.
	 */
  onEvent: (usersCustomCallback: OnEventUsersCustomCallback) => void;
  /**
	 * @returns {boolean} True if the module has been initiated. False otherwise.
	 */
  isInit: boolean;
  /**
	 * @returns {string} Description of current module state.
	 */
  state: string;
  /**
	 * Function that creates Redux Store Change Handler, that you can use to subscribe to Store Changes.
   * @param {any} store Your store.
   * @param {SelectFn} selectFn select function that returns part of the store.
   * @returns {Function} Store change handler function.
	 */
  createReduxStoreChangeHandler: (store: any, selectFn: (state: any) => any) => (() => void),
  /**
	 * Close the connection.
	 */
  disconnect: () => void;
};

export const AppKlaarSdk: SdkModule = {
  _apiKey : null,
  _connector: null,
  _currentState: "NOT_INITIATED",
  _onEventUsersCustomCallback: () => {},

  init(apiKey: string, instructions: Instruction[]) {
    if (this._currentState === "WORKING") {
      console.warn("Sdk already initiated!");
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
        console.warn(`Login instruction is requied. Please, provide at least one instruction with prototype "login"`);
      if (!instructionPrototypes.has("logout"))
        console.warn(`Logout instruction is requied. Please, provide at least one instruction with prototype "logout"`);
        
      this._currentState = "INVALID_PARAMETERS";
      return;
    }

    this._apiKey = apiKey;
    this._connector = new Connector(apiKey, instructions, (event) => this._onEventUsersCustomCallback(event));
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

  createReduxStoreChangeHandler(store, selectFn) {
    return this._connector.createReduxStoreChangeHandler(store, selectFn);
  },

  disconnect() {
    this._connector && this._connector.disconnect();
    this._apiKey = null;
    this._connector = null;
    this._currentState = "NOT_INITIATED";
    this._onEventUsersCustomCallback = () => {};
  }
};