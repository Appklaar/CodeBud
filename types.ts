import { EventHandleError, ScenarioHandleError } from "./Errors";

export type ObjectT<T> = {[key: string]: T};

export type ProjectInfo = {
  projectId: string;
};

export type PackageMode = "dev" | "prod";

export type PackageConfig = {
  mode?: PackageMode;
  Interceptor?: any;
  EncryptionPlugin?: any;
  ReactNativePlugin?: any;
  projectInfo?: ProjectInfo;
  remoteSettingsAutoUpdateInterval?: number;
};

export type NetworkInterceptorInstance = {
  dispose: () => void;
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

export type InterceptedReduxActionPreparedData = {
  actionId: string;
  action: InterceptedReduxAction;
  timestamp: number;
}

export type InterceptedStorageActionPreparedData = {
  storageActionId: string;
  action: string;
  data?: any;
  timestamp: number;
}

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

type ParamType = "number" | "string" | "object" | "array" | "boolean";

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

export type RemoteSettings = ObjectT<string>;

export type RemoteSettingsListenersTable = ListenersTable<RemoteSettings>;

export type GetRemoteSettingsResponse = {
  remoteSettings: RemoteSettings 
} & ErrorResponse;

export type GetRemoteSettingsRequest = {
  projectId: string;
};

export type RefreshRemoteSettingsCallback = (r: RemoteSettings) => void;