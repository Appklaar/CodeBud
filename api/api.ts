import { create } from "apisauce";
import { CONFIG } from './../config';
import { 
  GetRemoteSettingsRequest,
  GetRemoteSettingsResponse
} from "./../types";

const SOCKET_EVENTS_LISTEN = {
  CONNECT: "connect",
  EVENT: "event",
  SCENARIO: "scenario",
  STOP_SCENARIO_EXECUTION: "stopScenarioExecution",
  ERROR: "error",
  CONNECT_ERROR: "connect_error",
  DISCONNECT: "disconnect",
  SAVE_NEW_REMOTE_SETTINGS: "saveNewRemoteSettings",
  ADMIN_CONNECTED: "ADMIN_CONNECTED",
};

const SOCKET_EVENTS_EMIT = {
  SET_CONNECTION_INFO: "setConnectionInfo",
  EXECUTING_EVENT: "executingEvent",
  SAVE_EVENT_LOG: "saveEventLog",
  EXECUTING_SCENARIO: "executingScenario",
  SAVE_SCENARIO_LOG: "saveScenarioLog",
  SAVE_REDUX_STATE_COPY: "saveReduxStateCopy",
  SAVE_REDUX_ACTIONS_BATCH: "saveReduxActionsBatch",
  SAVE_INTERCEPTED_REQUEST: "saveInterceptedRequest",
  SAVE_INTERCEPTED_RESPONSE: "saveInterceptedResponse",
  SAVE_MOBILE_APP_STATE: "saveMobileAppState",
  SAVE_INTERCEPTED_STORAGE_ACTIONS_BATCH: "saveInterceptedStorageActionsBatch",
  CAPTURE_EVENT: "captureEvent"
};

const sauce = create({
  baseURL: CONFIG.BASE_URL,
  headers: { Accept: "application/json" },
});

const sauceAuthorizedApiKey = create({
  baseURL: CONFIG.BASE_URL,
  headers: {
    Accept: 'application/json'
  },
});

// Updates sauceAuthorizedApiKey instance (puts new ApiKey into headers)
const updateAuthorizationHeaderWithApiKey = (apiKey: string) => {
  sauceAuthorizedApiKey.setHeader('Authorization', apiKey);
};

const api = {
  sauce,
  getRemoteSettingsGet: (params: GetRemoteSettingsRequest) => sauceAuthorizedApiKey.get<GetRemoteSettingsResponse>(`/project/${params.projectId}/remotesettings`)
};

export { 
  api, 
  updateAuthorizationHeaderWithApiKey,
  SOCKET_EVENTS_LISTEN, 
  SOCKET_EVENTS_EMIT 
};