declare module '@appklaar/codebud' {
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
  
  export type RemoteSettingsEnv = "dev" | "stg" | "prod";

  export type RemoteSettings = {[env in RemoteSettingsEnv]: ObjectT<string>};
  
  export type RemoteSettingsListenersTable = ListenersTable<RemoteSettings>;
  
  export type GetRemoteSettingsResponse = {
    remoteSettings: RemoteSettings 
  } & ErrorResponse;
  
  export type RefreshRemoteSettingsCallback = (r: RemoteSettings) => void;

  export interface AppKlaarSdk {
    /**
     * Initialize the module.
     * @param {String} apiKey The api key of yours.
     * @param {(Instruction | InstructionGroup)[]} instructions Instructions that will be available from remote testing panel.
     * @param {PackageConfig | undefined} config Package config (if needed)
     */
    init: (apiKey: string, instructions: (Instruction | InstructionGroup)[], config?: PackageConfig) => void;
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
     * @returns {RemoteSettings | null} Last fetched remote settings object (all environments).
     */
    remoteSettings: RemoteSettings | null;
    /**
     * @param {string} env Remote settings environment.
     * @returns {ObjectT<string> | null} Last fetched remote settings object (selected environment).
     */
    getRemoteSettingsByEnv: (env: RemoteSettingsEnv) => ObjectT<string> | null,
    /**
     * Function for refreshing remote settings.
     * @param {RefreshRemoteSettingsCallback} callbackFn Function that will be called if request succeeded.
     */
    refreshRemoteSettings: (callbackFn?: RefreshRemoteSettingsCallback) => void;
    /**
     * Function that creates Redux Store Change Handler, that you can use to subscribe to Store Changes.
     * @param {any} store Your store.
     * @param {SelectFn} selectFn select function that returns part of the store.
     * @param {number} [batchingTimeMs = 500] batching time of sending new redux state copy (in ms). Defaults to 500
     * @returns {Function} Store change handler function.
     */
    createReduxStoreChangeHandler: (store: any, selectFn: (state: any) => any, batchingTimeMs?: number) => (() => void);
    /**
     * Function that creates Redux middleware for actions monitoring.
     * @param {number} [batchingTimeMs = 200] batching time of sending dispatched redux actions (in ms). Defaults to 200. This param only affects logging delay and does not slow down your redux flow.
     * @returns {Function} Middleware
     */
    createReduxActionMonitorMiddleware: (batchingTimeMs?: number) => any;
    /**
     * Function that creates Zustand Store Change Handler, that you can use to subscribe to Store Changes.
     * @param {SelectFn} selectFn select function that returns part of the store.
     * @param {number} [batchingTimeMs = 500] batching time of sending new zustand state copy (in ms). Defaults to 500
     * @returns {Function} Store change handler function.
     */
    createZustandStoreChangeHandler: (selectFn: (state: any) => any, batchingTimeMs?: number) => ((state: any, prevState: any) => void);
    /**
     * Function that enables AsyncStorage monitor.
     * @param {any} asyncStorage your AsyncStorage
     * @param {string[]} [ignoreKeys = []] storage keys that should be ignored. Defaults to empty array.
     * @param {number} [batchingTimeMs = 500] batching time of sending intercepted storage actions (in ms). Defaults to 500.
     */
    enableAsyncStorageMonitor: (asyncStorage: any, ignoreKeys?: string[], batchingTimeMs?: number) => void;
    /**
     * Function that enables localStorage monitor.
     * @param {any} localStorage your localStorage
     * @param {string[]} [ignoreKeys = []] storage keys that should be ignored. Defaults to empty array.
     * @param {number} [batchingTimeMs = 500] batching time of sending intercepted storage actions (in ms). Defaults to 500.
     */
    enableLocalStorageMonitor: (localStorage: any, ignoreKeys?: string[], batchingTimeMs?: number) => void;
    /**
     * Send custom event that will be shown in timeline on network tab.
     * @param {string} title Title of the event
     * @param {any} data Data that you want to share
     */
    captureEvent: (title: string, data: any) => void;
    /**
     * Enable intercepting of crash signals and unhandled exceptions to send crash reports to GUI timeline.
     */
    enableApplicationCrashInterception: () => void;
    /**
     * Function that enables TanStack queries data monitor.
     * @param {any} queryClient Your queryClient
     * @param {number} [updateIntervalMs = 1000] Interval of re-checking TanStack queries data (in ms). Defaults to 1000.
     * @param {number} [batchingTimeMs = 500] Batching time of sending new TanStack queries data copy (in ms). Defaults to 500
     * @returns {Function} Unsubscribe function.
     */
    monitorTanStackQueriesData: (queryClient: any, updateIntervalMs?: number, batchingTimeMs?: number) => (() => void),
    /**
     * Function that enables TanStack Query events monitor.
     * @param {any} queryClient Your queryClient
     * @param {number} [batchingTimeMs = 500] Batching time of sending TanStack Query events (in ms). Defaults to 500
     * @returns {Function} Unsubscribe function.
     */
    monitorTanStackQueryEvents: (queryClient: any, batchingTimeMs?: number) => (() => void),
    /**
     * Close the connection.
     */
    disconnect: () => void;
  }

  export const CodeBud: AppKlaarSdk;
}

declare module '@appklaar/codebud/react' {
  export type ObjectT<T> = {[key: string]: T};

  export type RemoteEvent = {
    id: string;
    eventType: "default" | "special";
    instructionId: string;
    args?: any[];
  };

  export type RemoteSettingsEnv = "dev" | "stg" | "prod";

  export type RemoteSettings = {[env in RemoteSettingsEnv]: ObjectT<string>};

  export function useEvent(
    handler: (event: RemoteEvent) => any, 
    instructionIds: ReadonlyArray<string>
  ): void;

  export function useRemoteSettings(env: RemoteSettingsEnv): ObjectT<string> | null;

  export function useContextMonitor(
    SomeContext: any, 
    label?: string, 
    waitMs?: number
  ): void;

  class Component<P, S> {
    static contextType?: any | undefined;
    context: unknown;
  
    constructor(props: Readonly<P> | P);
  
    setState<K extends keyof S>(
      state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;
    forceUpdate(callback?: () => void): void;
    render(): any;
    readonly props: Readonly<P>;
    state: Readonly<S>;

    refs: {[key: string]: any};
  }

  export type ErrorBoundaryProps = {
    fallback?: any;
    children: any;
  };
  
  export type ErrorBoundaryState = {
    componentStack: null | string;
    error: null | Error;
  };

  export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {}
}

declare module '@appklaar/codebud/Network/NetworkInterceptorClassic' {
  export class NetworkInterceptorClassic {}
}

declare module '@appklaar/codebud/Network/NetworkInterceptorRN' {
  export class NetworkInterceptorRN {}
}

declare module '@appklaar/codebud/Network/NetworkInterceptorXMLHttp' {
  export class NetworkInterceptorXMLHttp {}
}

declare module '@appklaar/codebud/Network/NetworkInterceptorXHR' {
  export class NetworkInterceptorXHR {}
}

declare module '@appklaar/codebud/rn' {
  type ReactFunctionalComponent<T> = (props: T) => any | null;

  export type InitModalProps = {
    animationType?: "fade" | "none" | "slide";
    onInit: (apiKey: string) => void;
  };

  export type ReactNativeWrapperProps = {
    ref?: any;
    children: any;
    initModalProps?: InitModalProps;
  }

  export type ReactNativeWrapperMethods = {
    showInitModal: () => void;
    hideInitModal: () => void;
  };

  export const ReactNativePlugin: any;
  export const ReactNativeWrapper: ReactFunctionalComponent<ReactNativeWrapperProps>;
}

declare module '@appklaar/codebud/encryption' {
  export class EncryptionPlugin {}
}

declare module '@appklaar/codebud/StackTracing/getStackTraceStackTracey' {
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

  export const getStackTraceStackTracey: GetStackTraceFunction;
}

declare module '@appklaar/codebud/StackTracing/getStackTraceSimple' {
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

  export const getStackTraceSimple: GetStackTraceFunction;
}