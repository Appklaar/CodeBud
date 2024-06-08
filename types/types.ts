import { EventHandleError, ScenarioHandleError } from "../Errors";
import { TanStackQueryCacheEvent } from "./tanstackQueryCacheNotifyEventTypes";

export type ObjectT<T> = {[key: string]: T};

export type ProjectInfo = {
  projectId: string;
};

export type PackageMode = "dev" | "prod";

export type StackTraceCallData = {
  sourceLine?: string;
  beforeParse: string;
  callee: string;
  calleeShort?: string;
  native: boolean;
  file?: string;
  fileRelative?: string;
  fileShort?: string;
  fileName?: string;
  line?: number;
};

export type StackTraceData = {
  stack?: StackTraceCallData[];
};

export type GetStackTraceFunctionOptions = {
  calleeExclude?: string[];
  fileNameExclude?: string[];
};

export type GetStackTraceFunction = (errorOrStack: Error | string | undefined, options?: GetStackTraceFunctionOptions) => Promise<StackTraceData>;

export type PackageConfig = {
  mode?: PackageMode;
  Interceptor?: any;
  EncryptionPlugin?: any;
  ReactNativePlugin?: any;
  projectInfo?: ProjectInfo;
  remoteSettingsAutoUpdateInterval?: number;
  getStackTraceFn?: GetStackTraceFunction;
  stackTraceOptions?: GetStackTraceFunctionOptions;
};

export type NetworkInterceptorInstance = {
  dispose: () => void;
};

export type WithStackTrace<T> = T & {
  _stackTraceData?: StackTraceData;
};

export type InterceptedRequest = {
  method: string;
  body: ObjectT<any> | undefined;
  url: string;
  requestHeaders?: ObjectT<any> | undefined;
};

export type InterceptedResponse = {
  status: number;
  statusText: string;
  data: ObjectT<any> | undefined;
  responseHeaders?: ObjectT<any> | undefined;
};

export type InterceptedReduxAction = {
  type: string;
  payload?: any;
}

export type InterceptedReduxActionPreparedData = WithStackTrace<{
  actionId: string;
  action: InterceptedReduxAction;
  timestamp: number;
}>;

export type InterceptedStorageActionPreparedData = WithStackTrace<{
  storageActionId: string;
  action: string;
  data?: any;
  timestamp: number;
}>;

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

type BaseParamType = "number" | "string" | "object" | "array" | "boolean";
type OptionalParamType = `?${BaseParamType}`;
type ParamType = BaseParamType | OptionalParamType;

type InstructionPublicFields = {
  id: string;
  prototype?: InstructionPrototype;
  parametersDescription?: {[key: string]: ParamType};
  description?: string;
  _groupId?: string;
  _groupDescription?: string;
  _groupColor?: string;
}

export type Instruction = InstructionPublicFields & {
  handler: (...args: any[]) => any;
};

export type InstructionGroup = {
  groupId: string;
  groupDescription?: string;
  groupColor?: string;
  groupInstructions: Instruction[];
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
  projectId?: string;
  environmentInfo: ObjectT<any>;
  clientType: ClientType;
  publicKey?: Uint8Array;
  availableInstructions: InstructionPublicFields[];
  specialInstructions: InstructionPublicFields[];
};

export type AdminConnectedData = {
  isAdmin: boolean;
  publicKey: {
    type: string;
    data: number[];
  };
  personalKey: string;
};

export type EventLog = {
  event: RemoteEvent;
  ok: boolean;
  result?: any;
  error?: EventHandleError | unknown;
  startTimestamp: number;
  endTimestamp: number;
  elapsedTime: number;
};

export type RemoteScenario = {
  id: string;
  events: RemoteEvent[];
};

export type ScenarioLog = {
  scenario: RemoteScenario;
  ok: boolean;
  executionWasStoppedManually?: boolean;
  error?: ScenarioHandleError;
  startTimestamp: number;
  endTimestamp: number;
  elapsedTime: number;
};

export type ListenersTable<T> = {[key: string]: (data: T) => any};

export type EventListenersTable = ListenersTable<RemoteEvent>;

export type SelectFn = (state: any) => any;

export type RemoteSettingsEnv = "dev" | "stg" | "prod";

export type RemoteSettings = {[env in RemoteSettingsEnv]: ObjectT<string>};

export type RemoteSettingsListenersTable = ListenersTable<RemoteSettings>;

export type GetRemoteSettingsResponse = {
  remoteSettings: RemoteSettings 
} & ErrorResponse;

export type GetRemoteSettingsRequest = {
  projectId: string;
};

export type RefreshRemoteSettingsCallback = (r: RemoteSettings) => void;

export type TanStackQueryKey = readonly unknown[];

export type TanStackQueryFnData = unknown | undefined;

export type TanStackGetQueriesDataReturnType = ([TanStackQueryKey, TanStackQueryFnData])[];

export type InterceptedTanStackQueryEventPreparedData = WithStackTrace<{
  tanStackQueryEventId: string;
  event: TanStackQueryCacheEvent;
  timestamp: number;
}>;