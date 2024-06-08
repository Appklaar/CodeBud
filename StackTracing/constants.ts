export const CALLEE_EXCLUDE = [
  'Object.dispatch',
  'dispatch',
  'HTMLUnknownElement.callCallback',
  'Object.invokeGuardedCallbackDev',
  'invokeGuardedCallback',
  'invokeGuardedCallbackAndCatchFirstError',
  'invokeGuardedCallbackProd',
  'executeDispatch',
  'processDispatchQueueItemsInOrder',
  'processDispatchQueue',
  'dispatchEventsForPlugins',
  'batchedEventUpdates$1',
  'batchedEventUpdates',
  'scheduler.development.js',
  'trace',
  'logger.ts',
  'unstable_runWithPriority',
  'Object.captureEvent',
  'codebudHandleDispatchedReduxAction',
  '_handleInterceptedStorageAction'
];

export const FILE_NAME_EXCLUDE = [
  'logger.ts',
  'react-dom.development.js',
  'serializableStateInvariantMiddleware.ts',
  'Connector.ts'
];