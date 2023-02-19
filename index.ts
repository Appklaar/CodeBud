import { Connector } from './Connector';
import { isValidApiKey } from './helperFunctions';
import { Instruction, OnEventUsersCustomCallback } from './types';
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
	 * Close the connection.
	 */
  disconnect: () => void;
};

export const Sdk: SdkModule = {
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
    const instructionIds = new Set<string>([]);
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

  disconnect() {
    this._connector && this._connector.disconnect();
    this._apiKey = null;
    this._connector = null;
    this._currentState = "NOT_INITIATED";
    this._onEventUsersCustomCallback = () => {};
  }
};