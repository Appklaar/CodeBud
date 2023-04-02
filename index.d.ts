declare module '@appklaar/appklaar_sdk' {
  export type ObjectT<T> = {[key: string]: T};

  export type PackageConfig = {
    Interceptor?: any;
    EncryptionPlugin?: any;
    ReactNativePlugin?: any;
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
    responseHeaders?: ObjectT<any> | undefined;
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
  
  export type RemoteScenario = {
    id: string;
    events: RemoteEvent[];
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

  export interface AppKlaarSdk {
    /**
     * Initialize the module.
     * @param {String} apiKey The api key of yours.
     * @param {Instruction[]} instructions Instructions that will be available from remote testing panel.
     * @param {PackageConfig | undefined} config Package config (if needed)
     */
    init: (apiKey: string, instructions: Instruction[], config?: PackageConfig) => void;
    /**
     * Set custom callback that will be called on every action.
     * @param {OnEventUsersCustomCallback} usersCustomCallback Callback.
     */
    onEvent: (usersCustomCallback: OnEventUsersCustomCallback) => void;
    /**
     * @returns {boolean} True if the module has been initiated. False otherwise.
     */
    isInit: boolean;
    /**
     * @returns {string} Description of current module state.
     */
    state: string;
    /**
     * @returns {RemoteSettings | null} Last fetched remote settings object.
     */
    remoteSettings: RemoteSettings | null;
    /**
     * Function for refreshing remote settings.
     * @param {RefreshRemoteSettingsCallback} callbackFn Function that will be called if request succeeded.
     */
    refreshRemoteSettings: (callbackFn?: RefreshRemoteSettingsCallback) => void;
    /**
     * Function that creates Redux Store Change Handler, that you can use to subscribe to Store Changes.
     * @param {any} store Your store.
     * @param {SelectFn} selectFn select function that returns part of the store.
     * @param {number} [batchingTimeMs = 500] batching time of sending new redux state copy
     * @returns {Function} Store change handler function.
     */
    createReduxStoreChangeHandler: (store: any, selectFn: (state: any) => any, batchingTimeMs: number) => (() => void);
    /**
     * Close the connection.
     */
    disconnect: () => void;
  }

  export const AppKlaarSdk: AppKlaarSdk;
}

declare module '@appklaar/appklaar_sdk/react' {
  export type RemoteEvent = {
    id: string;
    eventType: "default" | "special";
    instructionId: string;
    args?: any[];
  };

  export type RemoteSettings = {[key: string]: string};

  export function useEvent(
    handler: (event: RemoteEvent) => any, 
    instructionIds: ReadonlyArray<string>
  ): void;

  export function useRemoteSettings(): RemoteSettings | null;
}

declare module '@appklaar/appklaar_sdk/Network/NetworkInterceptorClassic' {
  export class NetworkInterceptorClassic {}
}

declare module '@appklaar/appklaar_sdk/Network/NetworkInterceptorRN' {
  export class NetworkInterceptorRN {}
}

declare module '@appklaar/appklaar_sdk/Network/NetworkInterceptorXMLHttp' {
  export class NetworkInterceptorXMLHttp {}
}

declare module '@appklaar/appklaar_sdk/rn' {
  export const ReactNativePlugin: any;
}

declare module '@appklaar/appklaar_sdk/encryption' {
  export class EncryptionPlugin {}
}