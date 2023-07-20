type ConnectorContext = {
  _asyncStorageHandler: any;
  _handleInterceptedStorageAction: (action: string, data?: any) => void;
}

type Key = string;

type Keys = string[];

type KeyValuePairs = [string, string][];

type Value = string;

type Callback = () => void;

export function asyncStoragePlugin (this: ConnectorContext, ignoreKeys: string[]) {
  let swizzSetItem: (key: Key, value: Value, callback?: Callback) => any;
  let swizzGetItem: (key: Key, callback?: Callback) => any;
  let swizzMultiGet: (keys: Keys, callback?: Callback) => any;
  let swizzRemoveItem: (key: Key, callback?: Callback) => any;
  let swizzMergeItem: (key: Key, value: Value, callback?: Callback) => any;
  let swizzClear: (callback?: Callback) => any;
  let swizzMultiSet: (pairs: KeyValuePairs, callback?: Callback) => any;
  let swizzMultiRemove: (keys: Keys, callback?: Callback) => any;
  let swizzMultiMerge: (pairs: KeyValuePairs, callback?: Callback) => any;
  let isSwizzled = false;

  const setItem = async (key: Key, value: Value, callback?: Callback) => {
    try {
      if (ignoreKeys.indexOf(key) < 0) {
        this._handleInterceptedStorageAction("setItem", { key, value });
      }
    } catch (e) {}
    return swizzSetItem(key, value, callback)
  }

  const getItem = async (key: Key, callback?: Callback) => {
    try {
      if (ignoreKeys.indexOf(key) < 0) {
        const value = await swizzGetItem(key);
        this._handleInterceptedStorageAction("getItem", { key, value });
      }
    } catch (e) {}
    return swizzGetItem(key, callback);
  }

  const multiGet = async (keys: Keys, callback?: Callback) => {
    try {
      const shippableKeys = (keys || []).filter(key => ignoreKeys.indexOf(key) < 0);
      if (shippableKeys.length > 0) {
        const value = await swizzMultiGet(keys);
        this._handleInterceptedStorageAction("multiGet", { keys: shippableKeys, value });
      }
    } catch (e) {}
    return swizzMultiGet(keys, callback);
  }

  const removeItem = async (key: Key, callback?: Callback) => {
    try {
      if (ignoreKeys.indexOf(key) < 0) {
        this._handleInterceptedStorageAction("removeItem", { key });
      }
    } catch (e) {}
    return swizzRemoveItem(key, callback)
  }

  const mergeItem = async (key: Key, value: Value, callback?: Callback) => {
    try {
      if (ignoreKeys.indexOf(key) < 0) {
        this._handleInterceptedStorageAction("mergeItem", { key, value })
      }
    } catch (e) {}
    return swizzMergeItem(key, value, callback)
  }

  const clear = async (callback?: Callback) => {
    try {
      this._handleInterceptedStorageAction("clear");
    } catch (e) {}
    return swizzClear(callback)
  }

  const multiSet = async (pairs: KeyValuePairs, callback?: Callback) => {
    try {
      const shippablePairs = (pairs || []).filter(
        pair => pair && pair[0] && ignoreKeys.indexOf(pair[0]) < 0
      )
      if (shippablePairs.length > 0) {
        this._handleInterceptedStorageAction("multiSet", { pairs: shippablePairs });
      }
    } catch (e) {}
    return swizzMultiSet(pairs, callback)
  }

  const multiRemove = async (keys: Keys, callback?: Callback) => {
    try {
      const shippableKeys = (keys || []).filter(key => ignoreKeys.indexOf(key) < 0);
      if (shippableKeys.length > 0) {
        this._handleInterceptedStorageAction("multiRemove", { keys: shippableKeys });
      }
    } catch (e) {}
    return swizzMultiRemove(keys, callback)
  }

  const multiMerge = async (pairs: KeyValuePairs, callback?: Callback) => {
    try {
      const shippablePairs = (pairs || []).filter(
        pair => pair && pair[0] && ignoreKeys.indexOf(pair[0]) < 0
      )
      if (shippablePairs.length > 0) {
        this._handleInterceptedStorageAction("multiMerge", { pairs: shippablePairs });
      }
    } catch (e) {}
    return swizzMultiMerge(pairs, callback)
  }

  const trackAsyncStorage = () => {
    if (isSwizzled) 
      return;

    swizzSetItem = this._asyncStorageHandler.setItem;
    this._asyncStorageHandler.setItem = setItem;

    swizzGetItem = this._asyncStorageHandler.getItem;
    this._asyncStorageHandler.getItem = getItem;

    swizzMultiGet = this._asyncStorageHandler.multiGet;
    this._asyncStorageHandler.multiGet = multiGet;

    swizzRemoveItem = this._asyncStorageHandler.removeItem;
    this._asyncStorageHandler.removeItem = removeItem;

    swizzMergeItem = this._asyncStorageHandler.mergeItem;
    this._asyncStorageHandler.mergeItem = mergeItem;

    swizzClear = this._asyncStorageHandler.clear;
    this._asyncStorageHandler.clear = clear;

    swizzMultiSet = this._asyncStorageHandler.multiSet;
    this._asyncStorageHandler.multiSet = multiSet;

    swizzMultiRemove = this._asyncStorageHandler.multiRemove;
    this._asyncStorageHandler.multiRemove = multiRemove;

    swizzMultiMerge = this._asyncStorageHandler.multiMerge;
    this._asyncStorageHandler.multiMerge = multiMerge;

    isSwizzled = true;
  }

  const untrackAsyncStorage = () => {
    if (!isSwizzled) 
      return;

    this._asyncStorageHandler.setItem = swizzSetItem;
    this._asyncStorageHandler.getItem = swizzGetItem;
    this._asyncStorageHandler.multiGet = swizzMultiGet;
    this._asyncStorageHandler.removeItem = swizzRemoveItem;
    this._asyncStorageHandler.mergeItem = swizzMergeItem;
    this._asyncStorageHandler.clear = swizzClear;
    this._asyncStorageHandler.multiSet = swizzMultiSet;
    this._asyncStorageHandler.multiRemove = swizzMultiRemove;
    this._asyncStorageHandler.multiMerge = swizzMultiMerge;

    isSwizzled = false;
  }

  // Enable tracking by default if _asyncStorageHandler is already set
  if (this._asyncStorageHandler) {
    trackAsyncStorage();
  }

  return {
    trackAsyncStorage,
    untrackAsyncStorage
  };
}