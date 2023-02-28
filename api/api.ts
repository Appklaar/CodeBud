export const SOCKET_EVENTS_LISTEN = {
  CONNECT: "connect",
  EVENT: "event",
  SCENARIO: "scenario",
  ERROR: "error",
  CONNECT_ERROR: "connect_error",
  DISCONNECT: "disconnect",
};

export const SOCKET_EVENTS_EMIT = {
  SET_CONNECTION_INFO: "setConnectionInfo",
  EXECUTING_EVENT: "executingEvent",
  SAVE_EVENT_LOG: "saveEventLog",
  EXECUTING_SCENARIO: "executingScenario",
  SAVE_SCENARIO_LOG: "saveScenarioLog",
  SAVE_REDUX_STATE_COPY: "saveReduxStateCopy"
};