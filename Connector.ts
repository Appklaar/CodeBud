import * as T from './types';
import { CONFIG } from './config';
import { singletonClass } from './decorators';
import { EventHandleError, ScenarioHandleError } from './Errors';
import { SOCKET_EVENTS_LISTEN, SOCKET_EVENTS_EMIT } from './api/api';
import { SPECIAL_INSTRUCTIONS_TABLE, SPECIAL_INSTRUCTIONS } from './constants/events';
import { io, Socket } from "socket.io-client";
import { codebudConsoleLog, codebudConsoleWarn, jsonStringifyKeepMeta, stringifyIfNotString, errorToJSON, jsonStringifyPossiblyCircular, emptyMobxStoreMonitor, removeCircularReferencesFromObject } from './helpers/helperFunctions';
import { getProcessEnv } from './helpers/environment';
import { getBrowserInfo } from './helpers/browserInfo';
import { getEnvironmentPlatform } from './helpers/platform';
import { getOS } from './helpers/os';
import { remoteSettingsService } from './services/remoteSettingsService';
import { idService } from './services/idService';
import { asyncStoragePlugin } from './asyncStorage/asyncStorage';
import { localStoragePlugin } from './localStorage/localStorage';
import moment from 'moment';

@singletonClass
class Connector {
  private _eventListenersTable: T.EventListenersTable = {};
  private _connectorInitiated: boolean = false;
  private _apiKey: string = "";
  private _projectInfo: T.ProjectInfo | null = null;
  private _getStackTraceFn: T.GetStackTraceFunction | undefined;
  private _stackTraceOptions: T.GetStackTraceFunctionOptions | undefined;
  private _instructionsTable: T.InstructionsTable = {};
  private _onEventUsersCustomCallback: T.OnEventUsersCustomCallback | undefined;
  private _networkInterceptor: T.NetworkInterceptorInstance | null = null;
  private _connectionInfoPacket: T.ConnectionInfoPacket | undefined;
  private _shouldStopScenarioExecution: boolean = false;
  private _lastEventLog: undefined | T.EventLog;
  private _dataToForward: T.ObjectT<any> | null = null;
  private _socket: Socket | undefined;
  private _sendReduxStateBatchingTimer: NodeJS.Timeout | null = null;
  private _currentReduxStateCopy: any = null;
  private _sendReduxActionsBatchingTimer: NodeJS.Timeout | null = null;
  private _sendZustandStateBatchingTimer: NodeJS.Timeout | null = null;
  private _currentReduxActionsBatch: T.InterceptedReduxActionPreparedData[] = [];
  private _encryption: any = null;
  private _asyncStorageHandler: any = null;
  private _trackAsyncStorage: (() => void) | undefined;
  private _getEntireAsyncStorageAsObject: (() => Promise<T.ObjectT<any>>) | undefined;
  private _untrackAsyncStorage: (() => void) | undefined;
  private _localStorageHandler: any = null;
  private _trackLocalStorage: (() => void) | undefined;
  private _getEntireLocalStorageAsObject: (() => T.ObjectT<any>) | undefined;
  private _untrackLocalStorage: (() => void) | undefined;
  private _storageActionsBatchingTimeMs: number = 500;
  private _sendStorageActionsBatchingTimer: NodeJS.Timeout | null = null;
  private _currentStorageActionsBatch: T.InterceptedStorageActionPreparedData[] = [];
  private _unsubscribeFromAppStateChanges: (() => void) | undefined;
  private _tanStackQueriesDataMonitorInterval: NodeJS.Timer | null = null;
  private _sendTanStackQueriesDataBatchingTimer: NodeJS.Timeout | null = null;
  private _currentTanStackQueriesDataCopy: any = null;
  private _unsubscribeFromTanStackQueryEvents: (() => void) | undefined;
  private _sendTanStackQueryEventsBatchingTimer: NodeJS.Timeout | null = null;
  private _currentTanStackQueryEventsBatch: T.InterceptedTanStackQueryEventPreparedData[] = [];
  private _contextValueCopiesTable: T.ObjectT<any> = {};
  private _sendContextValueThrottleTimersTable: T.ObjectT<NodeJS.Timeout | null> = {};
  private _processUnhandledRejectionListener: ((reason: unknown) => any) | undefined;
  private _processUncaughtExceptionListener: ((err: Error) => any) | undefined;
  private _swizzledWindowUnhandledListeners: boolean = false;
  private _windowInitialOnunhandledrejection: any;
  private _windowInitialOnerror: any;
  private _sendMobxStateBatchingTimer: NodeJS.Timeout | null = null;
  private _currentMobxStateCopy: any = null;
  private _sendMobxEventsBatchingTimer: NodeJS.Timeout | null = null;
  private _currentMobxEventsBatch: T.InterceptedMobxEventPreparedData[] = [];

  public lastEvent: T.RemoteEvent | null = null;

  public addEventListener(key: string, handler: (event: T.RemoteEvent) => any) {
    this._eventListenersTable[key] = handler;
  };

  public removeEventListener(key: string) {
    delete this._eventListenersTable[key];
  };

  private _prepareEnvironmentInfo(config?: T.PackageConfig): T.ObjectT<any> {
    try {
      const envInfo = getProcessEnv();
      const osInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getOS() : getOS();
      const browserInfo = getBrowserInfo();
      const additionalInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getPlatformInfo() : {};

      return {
        ...envInfo,
        ...osInfo,
        ...browserInfo,
        ...additionalInfo
      };
    } catch (e) {
      return {};
    }
  };

  private _encryptData(json: any, removeCircularReferences?: boolean): {result: string, ok: boolean} {
    if (!this._encryption)
      return jsonStringifyKeepMeta(json, removeCircularReferences);

    return this._encryption.encryptData(json, removeCircularReferences);
  };
  
  private _fillInstructionsTable(instructions: T.Instruction[]) {
    this._instructionsTable = {};
    instructions.forEach((ins) => this._instructionsTable[ins.id] = ins);
  }

  private _getInstructionsPublicFields(instructions: T.Instruction[]) {
    return instructions.map((el) => (({ handler, ...o }) => o)(el)); // removing "handler" field
  }

  private serveAllExternalListenersWithNewEvent(event: T.RemoteEvent) {
    this.lastEvent = event;
    this._onEventUsersCustomCallback?.(event);

    for (const key of Object.keys(this._eventListenersTable))
      this._eventListenersTable[key](event);
  };

  private async _innerHandleEvent(event: T.RemoteEvent, isPartOfScenario: boolean = false) {
    const startTimestamp = moment().valueOf();

    try {
      const correspondingInstructionsTable: T.InstructionsTable = event.eventType === "default" ? this._instructionsTable: SPECIAL_INSTRUCTIONS_TABLE;
      const correspondingInstruction: T.Instruction = correspondingInstructionsTable[event.instructionId];
      if (!correspondingInstruction)
        throw new EventHandleError(event, `No instruction with id ${event.instructionId} found.`);

      event.args = event.args ?? [];

      if (this._dataToForward && event.args[0]) {
        Object.keys(this._dataToForward).forEach((key) => {
          event.args![0][key] = this._dataToForward![key];
        });
        this._dataToForward = null;
      }

      this.serveAllExternalListenersWithNewEvent(event);

      if (event.args.length !== correspondingInstruction.handler.length)
        throw new EventHandleError(event, `Instruction handler takes ${correspondingInstruction.handler.length} args, but ${event.args.length} were passed.`);

      this._socket?.emit(SOCKET_EVENTS_EMIT.EXECUTING_EVENT, event.id);

      let result = await correspondingInstruction.handler(...event.args);

      if (event.instructionId === "condition" && this._lastEventLog?.result) {
        const { param, equalsTo } = event.args[0];

        if (stringifyIfNotString(this._lastEventLog.result[param]) != stringifyIfNotString(equalsTo))
          result = {conditionEvaluatedTo: 0, shouldSkipNextEvent: 1};
        else
          result = {conditionEvaluatedTo: 1, shouldSkipNextEvent: 0};
      } else if (event.instructionId === "forwardData" && this._lastEventLog?.result) {
        const dataToForward: T.ObjectT<any> = {};
        for (const key of event.args[0].paramsToForward)
          dataToForward[key] = this._lastEventLog.result[key];

        this._dataToForward = dataToForward;
      }

      const endTimestamp = moment().valueOf();
      const eventLog: T.EventLog = {
        event,
        ok: true,
        result,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
     
      const encryptedData = this._encryptData(eventLog);
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, encryptedData.result);

      return eventLog;
    } catch (error: EventHandleError | unknown) {
      codebudConsoleLog(`Error while trying to handle event.`, error);

      // If current event was part of scenario then throw error so it would be processed inside _innerHandleScenario's catch block
      if (isPartOfScenario)
        throw error;

      const endTimestamp = moment().valueOf();
      const eventLog: T.EventLog = {
        event,
        ok: false,
        error,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
      
      const encryptedData = this._encryptData(eventLog);
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, encryptedData.result);
    }
  }

  private async _innerHandleScenario(scenario: T.RemoteScenario) {
    var eventIndex = 0;
    this._lastEventLog = undefined;
    this._dataToForward = null;

    const startTimestamp = moment().valueOf();
    try {
      this._socket?.emit(SOCKET_EVENTS_EMIT.EXECUTING_SCENARIO, scenario.id);

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

      const endTimestamp = moment().valueOf();
      const scenarioLog: T.ScenarioLog = {
        scenario,
        ok: true,
        executionWasStoppedManually,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };

      const encryptedData = this._encryptData(scenarioLog);
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, encryptedData.result);
    } catch (error) {
      codebudConsoleLog(`Error while trying to handle scenario.`, error);

      const scenarioError = new ScenarioHandleError(scenario, scenario.events[eventIndex], "Scenario execution failed.");
      const endTimestamp = moment().valueOf();
      const scenarioLog: T.ScenarioLog = {
        scenario,
        ok: false,
        error: scenarioError,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };

      const encryptedData = this._encryptData(scenarioLog);
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, encryptedData.result);
    }
  }

  private async _setupNetworkMonitor(config: T.PackageConfig) {
    this._networkInterceptor = new config.Interceptor({
      onRequest: ({ request, requestId }: T.NetworkInterceptorOnRequestPayload) => {
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({request, requestId, timestamp});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_REQUEST, encryptedData.result);
      },
      onResponse: ({ response, request, requestId }: T.NetworkInterceptorOnResponsePayload) => {
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({response, request, requestId, timestamp});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_RESPONSE, encryptedData.result);
      }
    });
  };

  private async _setupRN(config: T.PackageConfig) {
    this._unsubscribeFromAppStateChanges = config.ReactNativePlugin.subscribeForAppStateChanges(
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: true}), 
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: false}),
    );
  };

  private async _getEntireStorageAsObject() {
    let obj: T.ObjectT<any>;
    let storageType: T.StorageType = "unknown";

    if (this._getEntireLocalStorageAsObject) {
      obj = this._getEntireLocalStorageAsObject();
      storageType = "localStorage";
    } else if (this._getEntireAsyncStorageAsObject) {
      obj = await this._getEntireAsyncStorageAsObject();
      storageType = "AsyncStorage";
    } else {
      const info = "Unable to get entire storage as object: No AsyncStorage / localStorage monitor set up";
      codebudConsoleWarn(info);
      obj = {info};
    }

    const storageSnapshot: T.StorageSnapshot = {
      timestamp: moment().valueOf(),
      storageType,
      storageAsObject: obj
    };

    const encryptedData = this._encryptData(storageSnapshot);
    encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_FULL_STORAGE_SNAPSHOT, encryptedData.result);
  };

  public init(apiKey: string, instructions: T.Instruction[], usersCustomCallback: T.OnEventUsersCustomCallback, config?: T.PackageConfig) {
    this._apiKey = apiKey;
    this._fillInstructionsTable(instructions);
    this._onEventUsersCustomCallback = usersCustomCallback;

    if (config?.EncryptionPlugin)
      this._encryption = new config.EncryptionPlugin();
    if (config?.projectInfo)
      this._projectInfo = config.projectInfo;
    if (config?.getStackTraceFn)
      this._getStackTraceFn = config.getStackTraceFn;
    if (config?.stackTraceOptions)
      this._stackTraceOptions = config.stackTraceOptions;

    this._connectionInfoPacket = {
      apiKey,
      projectId: this._projectInfo?.projectId,
      environmentInfo: this._prepareEnvironmentInfo(config),
      clientType: "CLIENT",
      publicKey: this._encryption?.publicKey,
      availableInstructions: this._getInstructionsPublicFields(instructions),
      specialInstructions: this._getInstructionsPublicFields(SPECIAL_INSTRUCTIONS)
    };

    this._socket = io(CONFIG.MAIN_SOCKET_ADDRESS, {
      withCredentials: true,
      path: CONFIG.SOCKET_PATH, 
      transports: ['websocket'],
      query: {apiKey: this._apiKey},
      reconnectionDelay: 3e3,
    });

    if (config?.Interceptor)
      this._setupNetworkMonitor(config);
    if (config?.ReactNativePlugin)
      this._setupRN(config);

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT, () => {
      codebudConsoleLog('Socket connected:', this._socket?.connected);
      this._socket?.emit(SOCKET_EVENTS_EMIT.SET_CONNECTION_INFO, this._connectionInfoPacket);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ADMIN_CONNECTED, (data: T.AdminConnectedData) => {
      if (!data.isAdmin)
        return;

      this._encryption?.setAdminPanelPublicKey(data.publicKey.data);

      codebudConsoleLog("GUI Connected");
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.EVENT, (event: T.RemoteEvent) => this._innerHandleEvent(event));

    this._socket.on(SOCKET_EVENTS_LISTEN.SCENARIO, (scenario: T.RemoteScenario) => this._innerHandleScenario(scenario));

    this._socket.on(SOCKET_EVENTS_LISTEN.STOP_SCENARIO_EXECUTION, () => {
      codebudConsoleLog("Stopping scenario manually...");
      this._shouldStopScenarioExecution = true;
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.SAVE_NEW_REMOTE_SETTINGS, (r: T.RemoteSettings) => remoteSettingsService.onGotNewRemoteSettings(r));

    this._socket.on(SOCKET_EVENTS_LISTEN.FORCE_REFRESH, (data: T.ForceRefreshPayload) => {
      switch (data.type) {
        case "storage":
          this._getEntireStorageAsObject();
          break;
        default:
          break;
      }
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT_ERROR, (err) => {
      codebudConsoleWarn(`Socket connect_error: ${err.message}`);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ERROR, (error) => {
      codebudConsoleWarn('Socket sent an error:', error);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.DISCONNECT, async () => {
      codebudConsoleLog('Socket disconnected.');
      setTimeout(() => {
        this._socket?.connect();
      }, CONFIG.SOCKET_RECONNECTION_DELAY);
    });

    this._connectorInitiated = true;
  };

  public get isInit(): boolean {
    return this._connectorInitiated;
  }

  public createReduxStoreChangeHandler(store: any, selectFn: (state: any) => any, batchingTimeMs: number): () => void {
    try {
      return () => {
        const previousReduxStateCopyStr = JSON.stringify(this._currentReduxStateCopy);
        this._currentReduxStateCopy = selectFn(store.getState());

        if (this._socket?.connected && previousReduxStateCopyStr !== JSON.stringify(this._currentReduxStateCopy)) {
          if (this._sendReduxStateBatchingTimer)
            clearTimeout(this._sendReduxStateBatchingTimer);

          this._sendReduxStateBatchingTimer = setTimeout(() => {
            const encryptedData = this._encryptData({state: this._currentReduxStateCopy, timestamp: moment().valueOf()});
            encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_STATE_COPY, encryptedData.result);
          }, batchingTimeMs);
        }
      }
    } catch (e) {
      codebudConsoleWarn(`Error while trying to create ReduxStoreChangeHandler`, e);
      return () => {};
    }
  }

  // Method name starts with codebud in order to filter it from stacktrace
  public async codebudHandleDispatchedReduxAction(action: T.InterceptedReduxAction, batchingTimeMs: number) {
    if (this._socket?.connected) {
      const timestamp = moment().valueOf();
      const actionId = idService.currentInterceptedReduxActionId;
      const _stackTraceData = await this._getStackTraceFn?.(new Error(''), this._stackTraceOptions);
      const reduxActionData = {actionId, action, timestamp, _stackTraceData};
      jsonStringifyKeepMeta(reduxActionData).ok && this._currentReduxActionsBatch.push(reduxActionData);

      if (this._sendReduxActionsBatchingTimer) 
        clearTimeout(this._sendReduxActionsBatchingTimer);

      this._sendReduxActionsBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({actions: this._currentReduxActionsBatch});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_ACTIONS_BATCH, encryptedData.result);
        this._currentReduxActionsBatch = [];
      }, batchingTimeMs);
    }
  }

  public createZustandStoreChangeHandler(selectFn: (state: any) => any, batchingTimeMs: number): (state: any, prevState: any) => void {
    try {
      return (state: any, prevState: any) => {
        const prevStateSelected = selectFn(prevState);
        const currentStateSelected = selectFn(state);

        if (this._socket?.connected && JSON.stringify(prevStateSelected) !== JSON.stringify(currentStateSelected)) {
          if (this._sendZustandStateBatchingTimer)
            clearTimeout(this._sendZustandStateBatchingTimer);

          this._sendZustandStateBatchingTimer = setTimeout(() => {
            const encryptedData = this._encryptData({state: currentStateSelected, timestamp: moment().valueOf()});
            encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_ZUSTAND_STATE_COPY, encryptedData.result);
          }, batchingTimeMs);
        }
      }
    } catch (e) {
      codebudConsoleWarn(`Error while trying to create ZustandStoreChangeHandler`, e);
      return () => {};
    }
  }

  // AsyncStorage / localStorage
  // used in asyncStoragePlugin & localStoragePlugin, (binded context)
  private async _handleInterceptedStorageAction(action: string, data?: any) {
    if (this._socket?.connected) {
      const timestamp = moment().valueOf();
      const storageActionId = idService.currentInterceptedStorageActionId;
      const _stackTraceData = await this._getStackTraceFn?.(new Error(''), this._stackTraceOptions);
      const storageActionData = {storageActionId, action, data, timestamp, _stackTraceData};
      jsonStringifyKeepMeta(storageActionData).ok && this._currentStorageActionsBatch.push(storageActionData);

      if (this._sendStorageActionsBatchingTimer) 
        clearTimeout(this._sendStorageActionsBatchingTimer);

      this._sendStorageActionsBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({storageActions: this._currentStorageActionsBatch});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_STORAGE_ACTIONS_BATCH, encryptedData.result);
        this._currentStorageActionsBatch = [];
      }, this._storageActionsBatchingTimeMs);
    }
  }

  public enableAsyncStorageMonitor(asyncStorage: any, ignoreKeys: string[], batchingTimeMs: number) {
    this._asyncStorageHandler = asyncStorage;
    this._storageActionsBatchingTimeMs = batchingTimeMs;
    // passing Connector class context to asyncStoragePlugin function
    const controlFunctions = asyncStoragePlugin.bind(this as any)(ignoreKeys);
    this._trackAsyncStorage = controlFunctions.trackAsyncStorage;
    this._getEntireAsyncStorageAsObject = controlFunctions.getEntireAsyncStorageAsObject;
    this._untrackAsyncStorage = controlFunctions.untrackAsyncStorage;
  }

  public enableLocalStorageMonitor(localStorage: any, ignoreKeys: string[], batchingTimeMs: number) {
    this._localStorageHandler = localStorage;
    this._storageActionsBatchingTimeMs = batchingTimeMs;
    // passing Connector class context to localStoragePlugin function
    const controlFunctions = localStoragePlugin.bind(this as any)(ignoreKeys);
    this._trackLocalStorage = controlFunctions.trackLocalStorage;
    this._getEntireLocalStorageAsObject = controlFunctions.getEntireLocalStorageAsObject;
    this._untrackLocalStorage = controlFunctions.untrackLocalStorage;
  }

  public async captureEvent(title: string, data: any) {
    if (this._socket?.connected) {
      const timestamp = moment().valueOf();
      const capturedEventId = idService.currentCapturedEventId;

      const _stackTraceData = await this._getStackTraceFn?.(new Error(''), this._stackTraceOptions);

      const encryptedData = this._encryptData({timestamp, capturedEventId, title, data, _stackTraceData});
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.CAPTURE_EVENT, encryptedData.result);
    }
  }

  public async captureCrashReport(type: T.AppCrashReportType, data: any) {
    codebudConsoleWarn(`${CONFIG.PRODUCT_NAME} has captured important exception:`, type, data);

    if (this._socket?.connected) {
      const timestamp = moment().valueOf();
      const crashReportId = idService.currentCrashReportId;

      let _stackTraceData;
      if (this._getStackTraceFn) {
        if ((data instanceof Error) || data?.stack || (data?.error instanceof Error) || data?.error?.stack)
          _stackTraceData = await this._getStackTraceFn(data.stack ?? data.error.stack, this._stackTraceOptions);
        else if (type === "React ErrorBoundary" && data.componentStack)
          _stackTraceData = await this._getStackTraceFn(data.componentStack, this._stackTraceOptions);
      }
      const encryptedData = this._encryptData({timestamp, crashReportId, type, data, _stackTraceData});
      encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.CAPTURE_CRASH_REPORT, encryptedData.result);
    }
  }

  public enableApplicationCrashInterception() {
    const environmentPlatform = getEnvironmentPlatform();

    switch (environmentPlatform) {
      case "nodejs": {
        this._processUnhandledRejectionListener = function(this: Connector, reason: unknown) {
          this.captureCrashReport('unhandledRejection', reason);
        }.bind(this);
        process.addListener('unhandledRejection', this._processUnhandledRejectionListener);

        this._processUncaughtExceptionListener = function(this: Connector, err: Error) {
          this.captureCrashReport('uncaughtException', errorToJSON(err)).then(() => process.exit(1));
        }.bind(this);
        process.addListener('uncaughtException', this._processUncaughtExceptionListener);
        break;
      }
      case "web": {
        this._windowInitialOnunhandledrejection = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
          this.captureCrashReport('window.onunhandledrejection', {reason: event.reason});
          event.preventDefault(); // Prevent the default handling (such as outputting the error to the console)
        }

        this._windowInitialOnerror = window.onerror;
        window.onerror = (message, source, line, col, error) => {
          this.captureCrashReport('window.onerror', {message, source, line, col, error: errorToJSON(error)});
          return true; // Return true to prevent the default browser error handling
        };
        
        this._swizzledWindowUnhandledListeners = true;

        break;
      }
      default:
        codebudConsoleWarn(`enableApplicationCrashInterception method does not do anything for this platform: ${environmentPlatform}. Consider reading ${CONFIG.PRODUCT_NAME} docs.`);
        break;
    }
  }

  private _disableApplicationCrashInterception() {
    const environmentPlatform = getEnvironmentPlatform();

    switch (environmentPlatform) {
      case "nodejs": {
        if (this._processUnhandledRejectionListener) {
          process.removeListener('unhandledRejection', this._processUnhandledRejectionListener);
          this._processUnhandledRejectionListener = undefined;
        }
        if (this._processUncaughtExceptionListener) {
          process.removeListener('uncaughtException', this._processUncaughtExceptionListener);
          this._processUncaughtExceptionListener = undefined;
        }
        break;
      }
      case "web": {
        if (this._swizzledWindowUnhandledListeners) {
          window.onunhandledrejection = this._windowInitialOnunhandledrejection;
          this._windowInitialOnunhandledrejection = undefined;

          window.onerror = this._windowInitialOnerror;
          this._windowInitialOnerror = undefined;

          this._swizzledWindowUnhandledListeners = false;
        }
        break;
      }
      default:
        break;
    }
  }

  private _proceedNewTanStackQueriesData(queriesData: T.TanStackGetQueriesDataReturnType, batchingTimeMs: number) {
    const previousTanStackQueriesDataCopyStr = JSON.stringify(this._currentTanStackQueriesDataCopy);
    this._currentTanStackQueriesDataCopy = queriesData;

    if (this._socket?.connected && previousTanStackQueriesDataCopyStr !== JSON.stringify(this._currentTanStackQueriesDataCopy)) {
      if (this._sendTanStackQueriesDataBatchingTimer)
        clearTimeout(this._sendTanStackQueriesDataBatchingTimer);

      this._sendTanStackQueriesDataBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({queriesData: this._currentTanStackQueriesDataCopy, timestamp: moment().valueOf()});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_TANSTACK_QUERIES_DATA_COPY, encryptedData.result);
      }, batchingTimeMs);
    }
  }

  public monitorTanStackQueriesData(queryClient: any, updateIntervalMs: number, batchingTimeMs: number) {
    try {
      this._tanStackQueriesDataMonitorInterval = setInterval(() => {
        const queriesData: T.TanStackGetQueriesDataReturnType = queryClient.getQueriesData({type: "all"});
        this._proceedNewTanStackQueriesData(queriesData, batchingTimeMs);
      }, updateIntervalMs);

      // Return unsubscribe function
      return () => {
        if (this._tanStackQueriesDataMonitorInterval)
          clearInterval(this._tanStackQueriesDataMonitorInterval);
      }
    } catch (e) {
      codebudConsoleWarn(`Error while trying to monitor TanStack queries data`, e);
      return () => {};
    }
  }

  private async _proceedInterceptedTanStackQueryEvent(event: T.TanStackQueryCacheEvent, batchingTimeMs: number) {
    if (this._socket?.connected) {
      const timestamp = moment().valueOf();
      const tanStackQueryEventId = idService.currentInterceptedTanStackQueryEventId;
      // const _stackTraceData = await this._getStackTraceFn?.(new Error(''), this._stackTraceOptions);
      const tanStackQueryEventData: T.InterceptedTanStackQueryEventPreparedData = {tanStackQueryEventId, event, timestamp};
      jsonStringifyKeepMeta(tanStackQueryEventData).ok && this._currentTanStackQueryEventsBatch.push(tanStackQueryEventData);

      if (this._sendTanStackQueryEventsBatchingTimer)
        clearTimeout(this._sendTanStackQueryEventsBatchingTimer);

      this._sendTanStackQueryEventsBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({tanStackQueryEvents: this._currentTanStackQueryEventsBatch});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_TANSTACK_QUERY_EVENTS_BATCH, encryptedData.result);
        this._currentTanStackQueryEventsBatch = [];
      }, batchingTimeMs);
    }
  }

  public monitorTanStackQueryEvents(queryClient: any, batchingTimeMs: number) {
    try {
      this._unsubscribeFromTanStackQueryEvents = queryClient.getQueryCache().subscribe((event: T.TanStackQueryCacheEvent) => {
        if (event.type === "added" || event.type === "updated" || event.type === "removed")
          this._proceedInterceptedTanStackQueryEvent(event, batchingTimeMs);
      });

      return this._unsubscribeFromTanStackQueryEvents!;
    } catch (e) {
      codebudConsoleWarn(`Error while trying to monitor TanStack Query events`, e);
      return () => {};
    }
  }

  public handleMonitoredContextValueUpdated(contextId: string, value: any, waitMs: number) {
    if (!this._connectorInitiated)
      return;

    const previousValueOfContextCopyStr = JSON.stringify(this._contextValueCopiesTable[contextId]);
    this._contextValueCopiesTable[contextId] = value;

    if (this._socket?.connected && previousValueOfContextCopyStr !== JSON.stringify(this._contextValueCopiesTable[contextId])) {
      if (this._sendContextValueThrottleTimersTable[contextId])
        clearTimeout(this._sendContextValueThrottleTimersTable[contextId]!);

      this._sendContextValueThrottleTimersTable[contextId] = setTimeout(() => {
        const encryptedData = this._encryptData({contextId, value: this._contextValueCopiesTable[contextId], timestamp: moment().valueOf()});
        encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_CONTEXT_VALUE_COPY, encryptedData.result);
      }, waitMs);
    }
  }

  public createMobxStoreMonitor(store: any, batchingTimeMs: number): T.MobxStoreMonitor {
    try {
      return [
        () => jsonStringifyPossiblyCircular(store),
        (currentMobxStateCopyStr: string) => {
          const previousMobxStateCopyStr = jsonStringifyPossiblyCircular(this._currentMobxStateCopy);
          this._currentMobxStateCopy = JSON.parse(currentMobxStateCopyStr);

          if (this._socket?.connected && previousMobxStateCopyStr !== currentMobxStateCopyStr) {
            if (this._sendMobxStateBatchingTimer)
              clearTimeout(this._sendMobxStateBatchingTimer);
  
            this._sendMobxStateBatchingTimer = setTimeout(() => {
              const encryptedData = this._encryptData({state: this._currentMobxStateCopy, timestamp: moment().valueOf()}); // Here we aren't passing removeCircularReferences flag because to this moment they are already removed
              encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBX_STATE_COPY, encryptedData.result);
            }, batchingTimeMs);
          }
        }
      ];
    } catch (e) {
      codebudConsoleWarn(`Error while trying to create MobxStoreMonitor`, e);
      return emptyMobxStoreMonitor;
    }
  }

  public createMobxEventHandler(batchingTimeMs: number) {
    return async (event: T.MobxSpyEvent) => {
      if (event.type !== "action" || (event.name ?? "").includes("Reaction"))
        return;

      if (this._socket?.connected) {
        const timestamp = moment().valueOf();
        const mobxEventId = idService.currentInterceptedMobxEventId;
        const _stackTraceData = await this._getStackTraceFn?.(new Error(''), this._stackTraceOptions);
        const mobxEventData = {mobxEventId, event: removeCircularReferencesFromObject(event), timestamp, _stackTraceData};
        jsonStringifyKeepMeta(mobxEventData).ok && this._currentMobxEventsBatch.push(mobxEventData);
  
        if (this._sendMobxEventsBatchingTimer) 
          clearTimeout(this._sendMobxEventsBatchingTimer);
  
        this._sendMobxEventsBatchingTimer = setTimeout(() => {
          const encryptedData = this._encryptData({events: this._currentMobxEventsBatch});
          encryptedData.ok && this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBX_EVENTS_BATCH, encryptedData.result);
          this._currentMobxEventsBatch = [];
        }, batchingTimeMs);
      }
    };
  }

  public disconnect() {
    this._connectorInitiated = false;
    this._disableApplicationCrashInterception();
    this._socket?.disconnect();
    this._socket = undefined;
    this._apiKey = "";
    this._projectInfo = null;
    this._getStackTraceFn = undefined;
    this._stackTraceOptions = undefined;
    this._instructionsTable = {};
    this._onEventUsersCustomCallback = undefined;
    this._connectionInfoPacket = undefined;
    this._shouldStopScenarioExecution = false;
    this._lastEventLog = undefined;
    this._dataToForward = null;

    if (this._sendReduxStateBatchingTimer) 
      clearTimeout(this._sendReduxStateBatchingTimer);

    this._currentReduxStateCopy = null;

    if (this._sendReduxActionsBatchingTimer) 
      clearTimeout(this._sendReduxActionsBatchingTimer);

    this._currentReduxActionsBatch = [];

    if (this._sendZustandStateBatchingTimer)
      clearTimeout(this._sendZustandStateBatchingTimer);

    this._encryption = null;

    this._networkInterceptor?.dispose();
    this._networkInterceptor = null;

    if (this._asyncStorageHandler) {
      this._untrackAsyncStorage?.();
      this._untrackAsyncStorage = undefined;
      this._getEntireAsyncStorageAsObject = undefined;
      this._trackAsyncStorage = undefined;
      this._asyncStorageHandler = null;
    }

    if (this._localStorageHandler) {
      this._untrackLocalStorage?.();
      this._untrackLocalStorage = undefined;
      this._getEntireLocalStorageAsObject = undefined;
      this._trackLocalStorage = undefined;
      this._localStorageHandler = null;
    }

    this._storageActionsBatchingTimeMs = 500;

    if (this._sendStorageActionsBatchingTimer) 
      clearTimeout(this._sendStorageActionsBatchingTimer);

    this._currentStorageActionsBatch = [];

    this._unsubscribeFromAppStateChanges?.();
    this._unsubscribeFromAppStateChanges = undefined;

    if (this._tanStackQueriesDataMonitorInterval)
      clearInterval(this._tanStackQueriesDataMonitorInterval);

    if (this._sendTanStackQueriesDataBatchingTimer)
      clearTimeout(this._sendTanStackQueriesDataBatchingTimer);

    this._currentTanStackQueriesDataCopy = null;

    if (this._sendMobxStateBatchingTimer)
      clearTimeout(this._sendMobxStateBatchingTimer);
  
    this._currentMobxStateCopy = null;

    if (this._sendMobxEventsBatchingTimer)
      clearTimeout(this._sendMobxEventsBatchingTimer);

    this._currentMobxEventsBatch = [];
      
    this._unsubscribeFromTanStackQueryEvents?.();
    this._unsubscribeFromTanStackQueryEvents = undefined;

    if (this._sendTanStackQueryEventsBatchingTimer)
      clearTimeout(this._sendTanStackQueryEventsBatchingTimer);
    
    this._currentTanStackQueryEventsBatch = [];
    this._contextValueCopiesTable = {};
    
    for (const contextId of Object.keys(this._sendContextValueThrottleTimersTable))
      if (this._sendContextValueThrottleTimersTable[contextId])
        clearTimeout(this._sendContextValueThrottleTimersTable[contextId]!);

    this._sendContextValueThrottleTimersTable = {};

    this.lastEvent = null;
    this._eventListenersTable = {};
  }
}

export const connector = new Connector();