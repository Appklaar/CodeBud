import { OnEventUsersCustomCallback, RefreshRemoteSettingsCallback, RemoteSettings, PackageConfig, Instruction, InstructionGroup, PackageMode, ObjectT, RemoteSettingsEnv } from './types/types';
import { ModuleState } from './States';

export interface AppKlaarSdk {
  _mode: PackageMode;
  _currentState: ModuleState;
  _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  /**
   * Initialize the module.
   * @param {String} apiKey The api key of yours.
   * @param {(Instruction | InstructionGroup)[]} instructions Instructions that will be available from remote testing panel.
   * @param {PackageConfig | undefined} config Package config (if needed)
   */
  init: (apiKey: string, instructions: (Instruction | InstructionGroup)[], config?: PackageConfig) => void;
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
   * @returns {RemoteSettings | null} Last fetched remote settings object (all environments).
   */
  remoteSettings: RemoteSettings | null;
  /**
   * @param {string} env Remote settings environment.
   * @returns {ObjectT<string> | null} Last fetched remote settings object (selected environment).
   */
  getRemoteSettingsByEnv: (env: RemoteSettingsEnv) => ObjectT<string> | null,
  /**
   * Function for refreshing remote settings.
   * @param {RefreshRemoteSettingsCallback} callbackFn Function that will be called if request succeeded.
   */
  refreshRemoteSettings: (callbackFn?: RefreshRemoteSettingsCallback) => void;
  /**
   * Function that creates Redux Store Change Handler, that you can use to subscribe to Store Changes.
   * @param {any} store Your store.
   * @param {SelectFn} selectFn select function that returns part of the store.
   * @param {number} [batchingTimeMs = 500] batching time of sending new redux state copy (in ms). Defaults to 500
   * @returns {Function} Store change handler function.
   */
  createReduxStoreChangeHandler: (store: any, selectFn: (state: any) => any, batchingTimeMs?: number) => (() => void);
  /**
   * Function that creates Redux middleware for actions monitoring.
   * @param {number} [batchingTimeMs = 200] batching time of sending dispatched redux actions (in ms). Defaults to 200. This param only affects logging delay and does not slow down your redux flow.
   * @returns {Function} Middleware
   */
  createReduxActionMonitorMiddleware: (batchingTimeMs?: number) => any;
  /**
   * Function that creates Zustand Store Change Handler, that you can use to subscribe to Store Changes.
   * @param {SelectFn} selectFn select function that returns part of the store.
   * @param {number} [batchingTimeMs = 500] batching time of sending new zustand state copy (in ms). Defaults to 500
   * @returns {Function} Store change handler function.
   */
  createZustandStoreChangeHandler: (selectFn: (state: any) => any, batchingTimeMs?: number) => ((state: any, prevState: any) => void);
  /**
   * Function that enables AsyncStorage monitor.
   * @param {any} asyncStorage your AsyncStorage
   * @param {string[]} [ignoreKeys = []] storage keys that should be ignored. Defaults to empty array.
   * @param {number} [batchingTimeMs = 500] batching time of sending intercepted storage actions (in ms). Defaults to 500.
   */
  enableAsyncStorageMonitor: (asyncStorage: any, ignoreKeys?: string[], batchingTimeMs?: number) => void;
  /**
   * Function that enables localStorage monitor.
   * @param {any} localStorage your localStorage
   * @param {string[]} [ignoreKeys = []] storage keys that should be ignored. Defaults to empty array.
   * @param {number} [batchingTimeMs = 500] batching time of sending intercepted storage actions (in ms). Defaults to 500.
   */
  enableLocalStorageMonitor: (localStorage: any, ignoreKeys?: string[], batchingTimeMs?: number) => void;
  /**
   * Send custom event that will be shown in timeline on network tab.
   * @param {string} title Title of the event
   * @param {any} data Data that you want to share
   */
  captureEvent: (title: string, data: any) => void;
  /**
   * Enable intercepting of crash signals and unhandled exceptions to send crash reports to GUI timeline.
   */
  enableApplicationCrashInterception: () => void;
  /**
   * Function that enables TanStack queries data monitor.
   * @param {any} queryClient Your queryClient
   * @param {number} [updateIntervalMs = 1000] Interval of re-checking TanStack queries data (in ms). Defaults to 1000.
   * @param {number} [batchingTimeMs = 500] Batching time of sending new TanStack queries data copy (in ms). Defaults to 500
   * @returns {Function} Unsubscribe function.
   */
  monitorTanStackQueriesData: (queryClient: any, updateIntervalMs?: number, batchingTimeMs?: number) => (() => void),
  /**
   * Function that enables TanStack Query events monitor.
   * @param {any} queryClient Your queryClient
   * @param {number} [batchingTimeMs = 500] Batching time of sending TanStack Query events (in ms). Defaults to 500
   * @returns {Function} Unsubscribe function.
   */
  monitorTanStackQueryEvents: (queryClient: any, batchingTimeMs?: number) => (() => void),
  /**
   * Close the connection.
   */
  disconnect: () => void;
}