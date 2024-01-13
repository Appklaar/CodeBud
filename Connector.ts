import { 
  Instruction, 
  InstructionsTable,
  RemoteEvent,
  OnEventUsersCustomCallback,
  ConnectionInfoPacket,
  EventLog,
  RemoteScenario,
  ScenarioLog,
  EventListenersTable,
  RemoteSettings,
  PackageConfig,
  NetworkInterceptorInstance,
  NetworkInterceptorOnRequestPayload,
  NetworkInterceptorOnResponsePayload,
  AdminConnectedData,
  InterceptedReduxAction,
  InterceptedReduxActionPreparedData,
  InterceptedStorageActionPreparedData,
  ProjectInfo,
  ObjectT
} from './types';
import { CONFIG } from './config';
import { EventHandleError, ScenarioHandleError } from './Errors';
import { SOCKET_EVENTS_LISTEN, SOCKET_EVENTS_EMIT } from './api/api';
import { SPECIAL_INSTRUCTIONS_TABLE, SPECIAL_INSTRUCTIONS } from './constants/events';
import { io, Socket } from "socket.io-client";
import { codebudConsoleLog, codebudConsoleWarn, jsonStringifyKeepMeta, stringifyIfNotString } from './helpers/helperFunctions';
import { getProcessEnv } from './helpers/environment';
import { getOS } from './helpers/os';
import { remoteSettingsService } from './services/remoteSettingsService';
import { asyncStoragePlugin } from './asyncStorage/asyncStorage';
import { localStoragePlugin } from './localStorage/localStorage';
import moment from 'moment';

export class Connector {
  private static _currentInstanceId = 0;
  private static _eventListenersTable: EventListenersTable = {};
  private static _currentInterceptedReduxActionId = 0;
  private static _currentInterceptedStorageActionId = 0;
  private static _currentCapturedEventId = 0;
  private _apiKey: string;
  private _projectInfo: ProjectInfo | null = null;
  private _instructionsTable: InstructionsTable = {};
  private _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  private _networkInterceptor: NetworkInterceptorInstance | null = null;
  private _connectionInfoPacket: ConnectionInfoPacket;
  private _shouldStopScenarioExecution: boolean = false;
  private _lastEventLog: undefined | EventLog;
  private _dataToForward: null | {[key: string]: any} = null;
  private _socket: Socket;
  private _sendReduxStateBatchingTimer: NodeJS.Timeout | null = null;
  private _currentReduxStateCopy: any = null;
  private _sendReduxActionsBatchingTimer: NodeJS.Timeout | null = null;
  private _currentReduxActionsBatch: InterceptedReduxActionPreparedData[] = [];
  private _encryption: any = null;
  private _asyncStorageHandler: any = null;
  private _trackAsyncStorage: (() => void) | undefined;
  private _untrackAsyncStorage: (() => void) | undefined;
  private _localStorageHandler: any = null;
  private _trackLocalStorage: (() => void) | undefined;
  private _untrackLocalStorage: (() => void) | undefined;
  private _storageActionsBatchingTimeMs: number = 500;
  private _sendStorageActionsBatchingTimer: NodeJS.Timeout | null = null;
  private _currentStorageActionsBatch: InterceptedStorageActionPreparedData[] = [];
  private _unsubscribeFromAppStateChanges: (() => void) | undefined;

  public static lastEvent: RemoteEvent | null = null;
  public readonly instanceId: number;

  public static addEventListener(key: string, handler: (event: RemoteEvent) => any) {
    Connector._eventListenersTable[key] = handler;
  };

  public static removeEventListener(key: string) {
    delete Connector._eventListenersTable[key];
  };

  private _prepareEnvironmentInfo(config?: PackageConfig): ObjectT<any> {
    try {
      const envInfo = getProcessEnv();
      const osInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getOS() : getOS();
      const additionalInfo = config?.ReactNativePlugin ? config.ReactNativePlugin.getPlatformInfo() : {};

      return {
        ...envInfo,
        ...osInfo,
        ...additionalInfo
      };
    } catch (e) {
      return {};
    }
  };

  private _encryptData(json: any) {
    if (!this._encryption)
      return jsonStringifyKeepMeta(json);

    return this._encryption.encryptData(json);
  };
  
  private _fillInstructionsTable(instructions: Instruction[]) {
    const table: InstructionsTable = {};

    instructions.forEach((ins: Instruction) => {
      table[ins.id] = ins;
    });

    this._instructionsTable = table;
  }

  private _getInstructionsPublicFields(instructions: Instruction[]) {
    const instructionsPublic = instructions.map((el: Instruction) => {
      const publicData = (({ handler, ...o }) => o)(el); // remove "handler" field
      return publicData;
    });

    return instructionsPublic;
  }

  private serveAllExternalListenersWithNewEvent(event: RemoteEvent) {
    Connector.lastEvent = event;
    this._onEventUsersCustomCallback(event);

    for (const key of Object.keys(Connector._eventListenersTable))
      Connector._eventListenersTable[key](event);
  };

  private async _innerHandleEvent(event: RemoteEvent, isPartOfScenario: boolean = false) {
    const startTimestamp = moment().valueOf();

    try {
      const correspondingInstructionsTable = event.eventType === "default" ? this._instructionsTable: SPECIAL_INSTRUCTIONS_TABLE;
      // @ts-ignore
      const correspondingInstruction: Instruction = correspondingInstructionsTable[event.instructionId];
      if (!correspondingInstruction)
        throw new EventHandleError(event, `No instruction with id ${event.instructionId} found.`);

      event.args = event.args ?? [];

      if (this._dataToForward && event.args[0]) {
        Object.keys(this._dataToForward).forEach((key) => {
          // @ts-ignore
          event.args[0][key] = this._dataToForward[key];
        });
        this._dataToForward = null;
      }

      this.serveAllExternalListenersWithNewEvent(event);

      if (event.args.length !== correspondingInstruction.handler.length)
        throw new EventHandleError(event, `Instruction handler takes ${correspondingInstruction.handler.length} args, but ${event.args.length} were passed.`);

      this._socket.emit(SOCKET_EVENTS_EMIT.EXECUTING_EVENT, event.id);

      let result = await correspondingInstruction.handler(...event.args);

      if (event.instructionId === "condition" && this._lastEventLog?.result) {
        const { param, equalsTo } = event.args[0];

        if (stringifyIfNotString(this._lastEventLog.result[param]) != stringifyIfNotString(equalsTo))
          result = {conditionEvaluatedTo: 0, shouldSkipNextEvent: 1};
        else
          result = {conditionEvaluatedTo: 1, shouldSkipNextEvent: 0};
      } else if (event.instructionId === "forwardData" && this._lastEventLog?.result) {
        const dataToForward: {[key: string]: any} = {};
        for (const key of event.args[0].paramsToForward)
          dataToForward[key] = this._lastEventLog.result[key];

        this._dataToForward = dataToForward;
      }

      const endTimestamp = moment().valueOf();
      const eventLog: EventLog = {
        event,
        ok: true,
        result,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
     
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, eventLog);

      return eventLog;
    } catch (error: EventHandleError | unknown) {
      codebudConsoleLog(`Error while trying to handle event.`, error);

      // If current event was part of scenario then throw error so it would be processed inside _innerHandleScenario's catch block
      if (isPartOfScenario)
        throw error;

      const endTimestamp = moment().valueOf();
      const eventLog: EventLog = {
        event,
        ok: false,
        error,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
      
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, eventLog);
    }
  }

  private async _innerHandleScenario(scenario: RemoteScenario) {
    var eventIndex = 0;
    this._lastEventLog = undefined;
    this._dataToForward = null;

    const startTimestamp = moment().valueOf();
    try {
      this._socket.emit(SOCKET_EVENTS_EMIT.EXECUTING_SCENARIO, scenario.id);

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
      const scenarioLog: ScenarioLog = {
        scenario,
        ok: true,
        executionWasStoppedManually,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, scenarioLog);
    } catch (error) {
      codebudConsoleLog(`Error while trying to handle scenario.`, error);

      const scenarioError = new ScenarioHandleError(scenario, scenario.events[eventIndex], "Scenario execution failed.");
      const endTimestamp = moment().valueOf();
      const scenarioLog: ScenarioLog = {
        scenario,
        ok: false,
        error: scenarioError,
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };

      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, scenarioLog);
    }
  }

  private async _setupNetworkMonitor(config: PackageConfig) {
    this._networkInterceptor = new config.Interceptor({
      onRequest: ({ request, requestId }: NetworkInterceptorOnRequestPayload) => {
        // codebudConsoleLog(`Intercepted request ${requestId}`, request);
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({request, requestId, timestamp});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_REQUEST, encryptedData);
      },
      onResponse: ({ response, request, requestId }: NetworkInterceptorOnResponsePayload) => {
        // codebudConsoleLog(`Intercepted response ${requestId}`, response);
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({response, request, requestId, timestamp});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_RESPONSE, encryptedData);
      }
    });
  };

  private async _setupRN(config: PackageConfig) {
    this._unsubscribeFromAppStateChanges = config.ReactNativePlugin.subscribeForAppStateChanges(
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: true}), 
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: false}),
    );
  };
 
  constructor(apiKey: string, instructions: Instruction[], usersCustomCallback: OnEventUsersCustomCallback, config?: PackageConfig) {
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
      specialInstructions: this._getInstructionsPublicFields(SPECIAL_INSTRUCTIONS)
    };

    this._socket = io(CONFIG.MAIN_SOCKET_ADDRESS, {
      withCredentials: true,
      path: CONFIG.SOCKET_PATH, 
      transports: ['websocket'],
      query: {apiKey: this._apiKey}
    });

    if (config?.Interceptor) {
      this._setupNetworkMonitor(config);
    }
    if (config?.ReactNativePlugin) {
      this._setupRN(config);
    }

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT, () => {
      codebudConsoleLog('Socket connected:', this._socket.connected);
      this._socket.emit(SOCKET_EVENTS_EMIT.SET_CONNECTION_INFO, this._connectionInfoPacket);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ADMIN_CONNECTED, (data: AdminConnectedData) => {
      codebudConsoleLog("AdminConnected");
      if (!data.isAdmin) {
        return;
      }

      if (this._encryption)
        this._encryption.setAdminPanelPublicKey(data.publicKey.data);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.EVENT, (event: RemoteEvent) => this._innerHandleEvent(event));

    this._socket.on(SOCKET_EVENTS_LISTEN.SCENARIO, (scenario: RemoteScenario) => this._innerHandleScenario(scenario));

    this._socket.on(SOCKET_EVENTS_LISTEN.STOP_SCENARIO_EXECUTION, () => {
      codebudConsoleLog("Stopping scenario manually...");
      this._shouldStopScenarioExecution = true;
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.SAVE_NEW_REMOTE_SETTINGS, (r: RemoteSettings) => {
      remoteSettingsService.onGotNewRemoteSettings(r);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT_ERROR, (err) => {
      codebudConsoleWarn(`Socket connect_error: ${err.message}`);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ERROR, (error) => {
      codebudConsoleWarn('Socket send error:', error);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.DISCONNECT, async () => {
      codebudConsoleLog('Socket disconnected.');
      setTimeout(() => {
        this._socket.connect();
      }, CONFIG.SOCKET_RECONNECTION_DELAY);
    });
  }

  public createReduxStoreChangeHandler(store: any, selectFn: (state: any) => any, batchingTimeMs: number): () => void {
    try {
      return () => {
        const previousReduxStateCopyStr = JSON.stringify(this._currentReduxStateCopy);
        this._currentReduxStateCopy = selectFn(store.getState());

        if (this._socket.connected && previousReduxStateCopyStr !== JSON.stringify(this._currentReduxStateCopy)) {
          if (this._sendReduxStateBatchingTimer)
            clearTimeout(this._sendReduxStateBatchingTimer);

          this._sendReduxStateBatchingTimer = setTimeout(() => {
            const encryptedData = this._encryptData({state: this._currentReduxStateCopy});
            this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_STATE_COPY, encryptedData);
          }, batchingTimeMs);
        }
      }
    } catch (e) {
      codebudConsoleWarn(`Error while trying to create ReduxStoreChangeHandler`, e);
      return () => {};
    }
  }

  public handleDispatchedReduxAction(action: InterceptedReduxAction, batchingTimeMs: number) {
    if (this._socket.connected) {
      const timestamp = moment().valueOf();
      const actionId = Connector._currentInterceptedReduxActionId++;
      this._currentReduxActionsBatch.push({actionId: `RA_${actionId}`, action, timestamp});

      if (this._sendReduxActionsBatchingTimer) 
        clearTimeout(this._sendReduxActionsBatchingTimer);

      this._sendReduxActionsBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({actions: this._currentReduxActionsBatch});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_ACTIONS_BATCH, encryptedData);
        this._currentReduxActionsBatch = [];
      }, batchingTimeMs);
    }
  }

  // AsyncStorage / localStorage
  // used in asyncStoragePlugin & localStoragePlugin, (binded context)
  private _handleInterceptedStorageAction(action: string, data?: any) {
    if (this._socket.connected) {
      const timestamp = moment().valueOf();
      const storageActionId = Connector._currentInterceptedStorageActionId++;
      this._currentStorageActionsBatch.push({storageActionId: `SA_${storageActionId}`, action, data, timestamp});

      if (this._sendStorageActionsBatchingTimer) 
        clearTimeout(this._sendStorageActionsBatchingTimer);

      this._sendStorageActionsBatchingTimer = setTimeout(() => {
        const encryptedData = this._encryptData({storageActions: this._currentStorageActionsBatch});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_STORAGE_ACTIONS_BATCH, encryptedData);
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
    this._untrackAsyncStorage = controlFunctions.untrackAsyncStorage;
  }

  public enableLocalStorageMonitor(localStorage: any, ignoreKeys: string[], batchingTimeMs: number) {
    this._localStorageHandler = localStorage;
    this._storageActionsBatchingTimeMs = batchingTimeMs;
    // passing Connector class context to localStoragePlugin function
    const controlFunctions = localStoragePlugin.bind(this as any)(ignoreKeys);
    this._trackLocalStorage = controlFunctions.trackLocalStorage;
    this._untrackLocalStorage = controlFunctions.untrackLocalStorage;
  }

  public captureEvent(title: string, data: any) {
    if (this._socket.connected) {
      const timestamp = moment().valueOf();
      const capturedEventId = Connector._currentCapturedEventId++;

      const encryptedData = this._encryptData({timestamp, capturedEventId: `UCE_${capturedEventId}`, title, data});
      this._socket?.emit(SOCKET_EVENTS_EMIT.CAPTURE_EVENT, encryptedData);
    }
  }

  // Метод для "чистки" данных нашего пакета
  public disconnect() {
    this._socket.disconnect();
    this._apiKey = "";
    this._projectInfo = null;
    this._instructionsTable = {};
    this._onEventUsersCustomCallback = () => {};
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