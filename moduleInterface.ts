import { Connector } from './Connector';
import { OnEventUsersCustomCallback, RefreshRemoteSettingsCallback, RemoteSettings, PackageConfig, Instruction } from './types';
import { ModuleState } from './States';

export type AppKlaarSdk = {
  _apiKey: null | string;
  _connector: null | Connector;
  _currentState: ModuleState;
  _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  /**
   * Initialize the module.
   * @param {String} apiKey The api key of yours.
   * @param {Instruction[]} instructions Instructions that will be available from remote testing panel.
   * @param {PackageConfig | undefined} config Package config (if needed)
   */
  init: (apiKey: string, instructions: Instruction[], config?: PackageConfig) => void;
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
   * @returns {RemoteSettings | null} Last fetched remote settings object.
   */
  remoteSettings: RemoteSettings | null;
  /**
   * Function for refreshing remote settings.
   * @param {RefreshRemoteSettingsCallback} callbackFn Function that will be called if request succeeded.
   */
  refreshRemoteSettings: (callbackFn?: RefreshRemoteSettingsCallback) => void;
  /**
   * Function that creates Redux Store Change Handler, that you can use to subscribe to Store Changes.
   * @param {any} store Your store.
   * @param {SelectFn} selectFn select function that returns part of the store.
   * @returns {Function} Store change handler function.
   */
  createReduxStoreChangeHandler: (store: any, selectFn: (state: any) => any) => (() => void);
  /**
   * Close the connection.
   */
  disconnect: () => void;
}