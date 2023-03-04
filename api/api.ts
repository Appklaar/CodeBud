import { create } from "apisauce";
import { CONFIG } from './../config';
import { 
  GetRemoteSettingsResponse
} from "./../types";

const SOCKET_EVENTS_LISTEN = {
  CONNECT: "connect",
  EVENT: "event",
  SCENARIO: "scenario",
  ERROR: "error",
  CONNECT_ERROR: "connect_error",
  DISCONNECT: "disconnect",
};

const SOCKET_EVENTS_EMIT = {
  SET_CONNECTION_INFO: "setConnectionInfo",
  EXECUTING_EVENT: "executingEvent",
  SAVE_EVENT_LOG: "saveEventLog",
  EXECUTING_SCENARIO: "executingScenario",
  SAVE_SCENARIO_LOG: "saveScenarioLog",
  SAVE_REDUX_STATE_COPY: "saveReduxStateCopy"
};

const sauce = create({
  baseURL: CONFIG.BASE_URL,
  headers: { Accept: "application/json" },
});

// Creates an authorized instance of our API using the configuration,
// (puts API_KEY into headers)
const createSauceAuthorized = (apiKey: string) => {
  return create({
    baseURL: CONFIG.BASE_URL,
    headers: {
      Accept: 'application/json',
      Authorization: apiKey
    },
  });
}

const api = {
  sauce,
  getRemoteSettingsGet: function (apiKey: string) {
    const sauceAuthorized = createSauceAuthorized(apiKey);
    return sauceAuthorized.get<GetRemoteSettingsResponse>(`/client/remotesettings`);
  },
};

export { api, SOCKET_EVENTS_LISTEN, SOCKET_EVENTS_EMIT };