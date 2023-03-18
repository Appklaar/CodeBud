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
  RefreshRemoteSettingsCallback,
  RemoteSettingsListenersTable,
  PackageConfig,
  NetworkInterceptorInstance,
  NetworkInterceptorOnRequestPayload,
  NetworkInterceptorOnResponsePayload,
  AdminConnectedData
} from './types';
import { CONFIG } from './config';
import { EventHandleError, ScenarioHandleError } from './Errors';
import { api, SOCKET_EVENTS_LISTEN, SOCKET_EVENTS_EMIT } from './api/api';
import { SPECIAL_INSTRUCTIONS_TABLE, SPECIAL_INSTRUCTIONS } from './constants/events';
import { io, Socket } from "socket.io-client";
import { stringifyIfNotString } from './helperFunctions';
import { box, randomBytes } from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import moment from 'moment';

export class Connector {
  private static _currentInstanceId = 0;
  private static _remoteSettings: RemoteSettings | null = null;
  private static _eventListenersTable: EventListenersTable = {};
  private static _remoteSettingsListenersTable: RemoteSettingsListenersTable = {};
  private _apiKey: string;
  private _instructionsTable: InstructionsTable = {};
  private _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  private _networkInterceptor: NetworkInterceptorInstance | null = null;
  private _connectionInfoPacket: ConnectionInfoPacket;
  private _lastEventLog: undefined | EventLog;
  private _dataToForward: null | {[key: string]: any} = null;
  private _socket: Socket;
  private _currentReduxStateCopy: any = null;
  private _keyPair: nacl.BoxKeyPair;
  private _adminPanelPublicKey: Uint8Array | null = null;
  private _sharedKey: Uint8Array | null = null;

  public static lastEvent: RemoteEvent | null = null;
  public readonly instanceId: number;

  public static addEventListener(key: string, handler: (event: RemoteEvent) => any) {
    Connector._eventListenersTable[key] = handler;
  };

  public static removeEventListener(key: string) {
    delete Connector._eventListenersTable[key];
  };

  public static addRemoteSettingsListener(key: string, handler: (r: RemoteSettings) => any) {
    Connector._remoteSettingsListenersTable[key] = handler;
  };

  public static removeRemoteSettingsListener(key: string) {
    delete Connector._remoteSettingsListenersTable[key];
  };

  private _newNonce() {
    return randomBytes(box.nonceLength);
  };

  private _encryptData(json: any) {
    try {
      if (!this._sharedKey)
        throw new Error("Shared key not generated");

      const nonce = this._newNonce();
      const messageUint8 = decodeUTF8(JSON.stringify(json));

      const encrypted = box.after(messageUint8, nonce, this._sharedKey);

      const fullMessage = new Uint8Array(nonce.length + encrypted.length);
      fullMessage.set(nonce);
      fullMessage.set(encrypted, nonce.length);

      const base64FullMessage = encodeBase64(fullMessage);
      return base64FullMessage;
    } catch (e) {
      console.log(e);
      return JSON.stringify({msg: "Data encryption error"});
    }
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
    console.log('On event:', event);

    try {
      const correspondingInstructionsTable = event.eventType === "default" ? this._instructionsTable: SPECIAL_INSTRUCTIONS_TABLE;
      if (!correspondingInstructionsTable[event.instructionId])
        throw new EventHandleError(event, `No instruction with id ${event.instructionId} found.`);

      event.args = event.args ?? [];

      const startTimestamp = moment().valueOf();
      if (this._dataToForward && event.args[0]) {
        Object.keys(this._dataToForward).forEach((key) => {
          // @ts-ignore
          event.args[0][key] = this._dataToForward[key];
        });
        this._dataToForward = null;
      }

      this.serveAllExternalListenersWithNewEvent(event);

      if (event.args.length !== correspondingInstructionsTable[event.instructionId].handler.length)
        throw new EventHandleError(event, `Instruction handler takes ${correspondingInstructionsTable[event.instructionId].handler.length} args, but ${event.args.length} were passed.`);

      this._socket.emit(SOCKET_EVENTS_EMIT.EXECUTING_EVENT, event.id);

      let result = await correspondingInstructionsTable[event.instructionId].handler(...event.args);

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
    } catch (error) {
      console.log(`Error while trying to handle event.`, error);

      // If current event was part of scenario then throw error so it would be processed inside _innerHandleScenario's catch block
      if (isPartOfScenario)
        throw error;
      
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_EVENT_LOG, {event, ok: false, error});
    }
  }

  private async _innerHandleScenario(scenario: RemoteScenario) {
    console.log('On scenario:', scenario);

    var eventIndex = 0;
    this._lastEventLog = undefined;
    this._dataToForward = null;

    try {
      this._socket.emit(SOCKET_EVENTS_EMIT.EXECUTING_SCENARIO, scenario.id);

      const startTimestamp = moment().valueOf();
      for (const event of scenario.events) {
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
        startTimestamp,
        endTimestamp,
        elapsedTime: endTimestamp - startTimestamp
      };
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, scenarioLog);
    } catch (error) {
      console.log(`Error while trying to handle scenario.`, error);
      const scenarioError = new ScenarioHandleError(scenario, scenario.events[eventIndex], "Scenario execution failed.");
      this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_SCENARIO_LOG, {scenario, ok: false, error: scenarioError});
    }
  }

  public async refreshRemoteSettings(callbackFn?: RefreshRemoteSettingsCallback) {
    try {
      const remoteSettings = await api.getRemoteSettingsGet(this._apiKey)
      .then((response) => {
        if (response.ok && response.data) {
          return response.data?.remoteSettings
        } else {
          throw new Error("Response returned an error");
        }
      });

      Connector._remoteSettings = remoteSettings;
      callbackFn && callbackFn(remoteSettings);
    } catch (e) {
      console.warn("Error while trying to fetch remote settings", e);
    }
  }

  private async _setupNetworkMonitor(config: PackageConfig) {
    if (!config.Interceptor) {
      console.warn("Error: no network interceptor passed!");
    }

    this._networkInterceptor = new config.Interceptor({
      onRequest: ({ request, requestId }: NetworkInterceptorOnRequestPayload) => {
        // console.log(`Intercepted request ${requestId}`, request);
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({request, requestId, timestamp});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_REQUEST, encryptedData);
      },
      onResponse: ({ response, request, requestId }: NetworkInterceptorOnResponsePayload) => {
        // console.log(`Intercepted response ${requestId}`, response);
        const timestamp = moment().valueOf();
        const encryptedData = this._encryptData({response, request, requestId, timestamp});
        this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_INTERCEPTED_RESPONSE, encryptedData);
      }
    });
  };

  private async _setupRN(config: PackageConfig) {
    config.ReactNativePlugin.subscribeForAppStateChanges(
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: true}), 
      () => this._socket?.emit(SOCKET_EVENTS_EMIT.SAVE_MOBILE_APP_STATE, {foreground: false}),
    );
  };
 
  constructor(apiKey: string, instructions: Instruction[], usersCustomCallback: OnEventUsersCustomCallback, config?: PackageConfig) {
    this.instanceId = Connector._currentInstanceId++;

    this._apiKey = apiKey;
    this._fillInstructionsTable(instructions);
    this._onEventUsersCustomCallback = usersCustomCallback;

    this._keyPair = box.keyPair();

    this._connectionInfoPacket = {
      apiKey,
      clientType: "CLIENT",
      publicKey: this._keyPair.publicKey,
      availableInstructions: this._getInstructionsPublicFields(instructions),
      specialInstructions: this._getInstructionsPublicFields(SPECIAL_INSTRUCTIONS)
    };

    this._socket = io(CONFIG.MAIN_SOCKET_ADDRESS, {
      withCredentials: true,
      path: CONFIG.SOCKET_PATH, 
      transports: ['websocket'],
      query: {apiKey: this._apiKey}
    });

    if (config?.enableNetworkMonitor) {
      this._setupNetworkMonitor(config);
    }
    if (config?.ReactNativePlugin) {
      this._setupRN(config);
    }

    this.refreshRemoteSettings();

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT, () => {
      console.log('Socket connected:', this._socket.connected);
      this._socket.emit(SOCKET_EVENTS_EMIT.SET_CONNECTION_INFO, this._connectionInfoPacket);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ADMIN_CONNECTED, (data: AdminConnectedData) => {
      if (!data.isAdmin) {
        console.warn('Warning: client connected');
        return;
      }

      this._adminPanelPublicKey = new Uint8Array(data.publicKey.data);
      this._sharedKey = box.before(this._adminPanelPublicKey, this._keyPair.secretKey);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.EVENT, (event: RemoteEvent) => this._innerHandleEvent(event));

    this._socket.on(SOCKET_EVENTS_LISTEN.SCENARIO, (scenario: RemoteScenario) => this._innerHandleScenario(scenario));

    this._socket.on(SOCKET_EVENTS_LISTEN.SAVE_NEW_REMOTE_SETTINGS, (r: RemoteSettings) => {
      Connector._remoteSettings = r;
      for (const key of Object.keys(Connector._remoteSettingsListenersTable))
        Connector._remoteSettingsListenersTable[key](r);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT_ERROR, (err) => {
      console.warn(`Socket connect_error: ${err.message}`);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.ERROR, (error) => {
      console.log('Socket send error:', error);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.DISCONNECT, async () => {
      console.log('Socket disconnected.');
      setTimeout(() => {
        this._socket.connect();
      }, CONFIG.SOCKET_RECONNECTION_DELAY);
    });
  }

  public createReduxStoreChangeHandler(store: any, selectFn: (state: any) => any): () => void {
    try {
      return () => {
        const previousReduxStateCopyStr = JSON.stringify(this._currentReduxStateCopy);
        this._currentReduxStateCopy = selectFn(store.getState());

        if (this._socket.connected && previousReduxStateCopyStr !== JSON.stringify(this._currentReduxStateCopy)) {
          const encryptedData = this._encryptData({state: this._currentReduxStateCopy});
          this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_STATE_COPY, encryptedData);
        }
      }
    } catch (e) {
      console.warn(`Error while trying to create ReduxStoreChangeHandler`, e);
      return () => {};
    }
  }

  public static get remoteSettings(): RemoteSettings | null {
    return Connector._remoteSettings;
  }

  // Метод для "чистки" данных нашего SDK
  public disconnect() {
    this._socket.disconnect();
    this._apiKey = "";
    this._instructionsTable = {};
    this._onEventUsersCustomCallback = () => {};
    this._lastEventLog = undefined;
    this._dataToForward = null;
    this._currentReduxStateCopy = null;
    this._adminPanelPublicKey = null;
    this._sharedKey = null;

    if (this._networkInterceptor) {
      this._networkInterceptor.dispose();
      this._networkInterceptor = null;
    }
    
    // Think about it later
    Connector.lastEvent = null;
    Connector._remoteSettings = null;
    Connector._eventListenersTable = {};
    Connector._remoteSettingsListenersTable = {};
  }
}