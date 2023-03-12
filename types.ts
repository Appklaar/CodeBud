import { EventHandleError, ScenarioHandleError } from "./Errors";

export type ObjectT<T> = {[key: string]: T};

export type PackageConfig = {
  enableNetworkMonitor?: boolean;
  enableReactNative?: boolean;
};

export type NetworkInterceptorInstance = {
  dispose: () => void;
};

export type InterceptedRequest = {
  method: string;
  body: ObjectT<string> | undefined;
  url: string;
};

export type InterceptedResponse = {
  status: number;
  statusText: string;
  data: ObjectT<any> | undefined;
};

export type NetworkInterceptorOnRequestPayload = {
  request: InterceptedRequest;
  requestId: string;
};

export type NetworkInterceptorOnResponsePayload = {
  response: InterceptedResponse;
  request?: InterceptedRequest; 
  requestId: string
};

export type NetworkInterceptorCallbacksTable = {
  onRequest: (data: NetworkInterceptorOnRequestPayload) => void;
  onResponse: (data: NetworkInterceptorOnResponsePayload) => void;
};

export type ErrorResponse = {
  message?: string;
  invalidParameters?: string[];
};

type InstructionPrototype = "login" | "logout";

type ParamType = "number" | "string" | "object" | "array";

type InstructionPublicFields = {
  id: string;
  prototype?: InstructionPrototype;
  parametersDescription?: {[key: string]: ParamType};
  description?: string;
}

export type Instruction = InstructionPublicFields & {
  handler: (...args: any[]) => any;
};

export type InstructionsTable = {[key: string]: Instruction};

export type SpecialInstructionId = "condition" | "delay" | "forwardData";

export type SpecialInstructionsTable = {[id in SpecialInstructionId]: Instruction};

export type RemoteEvent = {
  id: string;
  eventType: "default" | "special";
  instructionId: string | SpecialInstructionId;
  args?: any[];
};

export type OnEventUsersCustomCallback = (event: RemoteEvent) => void;

export type ClientType = "CLIENT" | "ADMIN_PANEL";

export type ConnectionInfoPacket = {
  apiKey: string; 
  clientType: ClientType;
  availableInstructions: InstructionPublicFields[];
  specialInstructions: InstructionPublicFields[];
};

export type EventLog = {
  event: RemoteEvent;
  ok: boolean;
  result?: any;
  error?: EventHandleError;
  startTimestamp?: number;
  endTimestamp?: number;
  elapsedTime?: number;
};

export type RemoteScenario = {
  id: string;
  events: RemoteEvent[];
};

export type ScenarioLog = {
  scenario: RemoteScenario;
  ok: boolean;
  error?: ScenarioHandleError;
  startTimestamp?: number;
  endTimestamp?: number;
  elapsedTime?: number;
};

export type ListenersTable<T> = {[key: string]: (data: T) => any};

export type EventListenersTable = ListenersTable<RemoteEvent>;

export type SelectFn = (state: any) => any;

export type RemoteSettings = ObjectT<string>;

export type RemoteSettingsListenersTable = ListenersTable<RemoteSettings>;

export type GetRemoteSettingsResponse = {
  remoteSettings: RemoteSettings 
} & ErrorResponse;

export type RefreshRemoteSettingsCallback = (r: RemoteSettings) => void;