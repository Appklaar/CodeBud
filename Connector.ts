import { 
  Instruction, 
  InstructionsTable,
  RemoteEvent,
  OnEventUsersCustomCallback,
  ConnectionInfoPacket,
  EventLog,
  RemoteScenario,
  ScenarioLog,
  EventListenersTable
} from './types';
import { CONFIG } from './config';
import { EventHandleError, ScenarioHandleError } from './Errors';
import { SOCKET_EVENTS_LISTEN, SOCKET_EVENTS_EMIT } from './api/api';
import { SPECIAL_INSTRUCTIONS_TABLE, SPECIAL_INSTRUCTIONS } from './constants/events';
import { io, Socket } from "socket.io-client";
import { stringifyIfNotString } from './helperFunctions';
import moment from 'moment';

export class Connector {
  private static _currentInstanceId = 0;
  private static _eventListenersTable: EventListenersTable = {};
  private _apiKey: string;
  private _instructionsTable: InstructionsTable = {};
  private _onEventUsersCustomCallback: OnEventUsersCustomCallback;
  private _connectionInfoPacket: ConnectionInfoPacket;
  private _lastEventLog: undefined | EventLog;
  private _dataToForward: null | {[key: string]: any} = null;
  private _socket: Socket;
  private _currentReduxStateCopy: any = null;

  public static lastEvent: RemoteEvent | null = null;
  public readonly instanceId: number;

  public static addEventListener(key: string, handler: (event: RemoteEvent) => any) {
    Connector._eventListenersTable[key] = handler;
  };

  public static removeEventListener(key: string) {
    delete Connector._eventListenersTable[key];
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

  private serveAllExternalListeners(event: RemoteEvent) {
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

      this.serveAllExternalListeners(event);

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
 
  constructor(apiKey: string, instructions: Instruction[], usersCustomCallback: OnEventUsersCustomCallback) {
    this.instanceId = Connector._currentInstanceId++;

    this._apiKey = apiKey;
    this._fillInstructionsTable(instructions);
    this._onEventUsersCustomCallback = usersCustomCallback;
    this._connectionInfoPacket = {
      apiKey,
      clientType: "CLIENT",
      availableInstructions: this._getInstructionsPublicFields(instructions),
      specialInstructions: this._getInstructionsPublicFields(SPECIAL_INSTRUCTIONS)
    };

    this._socket = io(CONFIG.MAIN_SOCKET_ADDRESS, {
      withCredentials: true,
      path: CONFIG.SOCKET_PATH, 
      transports: ['websocket'],
      query: {apiKey: this._apiKey}
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.CONNECT, () => {
      console.log('Socket connected:', this._socket.connected);
      this._socket.emit(SOCKET_EVENTS_EMIT.SET_CONNECTION_INFO, this._connectionInfoPacket);
    });

    this._socket.on(SOCKET_EVENTS_LISTEN.EVENT, (event: RemoteEvent) => this._innerHandleEvent(event));

    this._socket.on(SOCKET_EVENTS_LISTEN.SCENARIO, (scenario: RemoteScenario) => this._innerHandleScenario(scenario));

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

        if (previousReduxStateCopyStr !== JSON.stringify(this._currentReduxStateCopy) && this._socket.connected) {
          this._socket.emit(SOCKET_EVENTS_EMIT.SAVE_REDUX_STATE_COPY, {state: this._currentReduxStateCopy});
        }
      }
    } catch (e) {
      console.warn(`Error while trying to create ReduxStoreChangeHandler`, e);
      return () => {};
    }
  }

  // Метод для "чистки" процессов нашего Sdk
  public disconnect() {
    this._socket.disconnect();
    this._apiKey = "";
    this._instructionsTable = {};
    this._onEventUsersCustomCallback = () => {};
    this._lastEventLog = undefined;
    this._dataToForward = null;
    
    // Think about it later
    Connector._eventListenersTable = {};
    Connector.lastEvent = null;
  }
}