type ConnectorContext = {
  _localStorageHandler: any;
  _handleInterceptedStorageAction: (action: string, data?: any) => void;
}

type Key = string;

type Value = string;

type LocalStorageDefaultReturnValueType = string | null;

export function localStoragePlugin (this: ConnectorContext, ignoreKeys: string[]) {
  let swizzGetItem: (key: Key) => LocalStorageDefaultReturnValueType;
  let swizzSetItem: (key: Key, value: Value) => void;
  let swizzClear: () => void;
  let swizzRemoveItem: (key: Key) => void;
  let isSwizzled = false;

  const getItem = (key: Key) => {
    const value = swizzGetItem(key);
    if (ignoreKeys.indexOf(key) < 0) {
      this._handleInterceptedStorageAction("getItem", { key, value });
    }
    return value;
  }

  const setItem = (key: Key, value: Value) => {
    if (ignoreKeys.indexOf(key) < 0) {
      this._handleInterceptedStorageAction("setItem", { key, value });
    }
    swizzSetItem(key, value);
  }

  const clear = () => {
    this._handleInterceptedStorageAction("clear");
    swizzClear();
  }

  const removeItem = (key: Key) => {
    if (ignoreKeys.indexOf(key) < 0) {
      this._handleInterceptedStorageAction("removeItem", { key });
    }
    swizzRemoveItem(key);
  }

  const trackLocalStorage = () => {
    if (isSwizzled) 
      return;
      
    swizzGetItem = this._localStorageHandler.getItem.bind(this._localStorageHandler);
    this._localStorageHandler.getItem = getItem;

    swizzSetItem = this._localStorageHandler.setItem.bind(this._localStorageHandler);
    this._localStorageHandler.setItem = setItem;

    swizzClear = this._localStorageHandler.clear.bind(this._localStorageHandler);
    this._localStorageHandler.clear = clear;

    swizzRemoveItem = this._localStorageHandler.removeItem.bind(this._localStorageHandler);
    this._localStorageHandler.removeItem = removeItem;
    
    isSwizzled = true;
  }

  const untrackLocalStorage = () => {
    if (!isSwizzled) 
      return;

    this._localStorageHandler.getItem = swizzGetItem;
    this._localStorageHandler.setItem = swizzSetItem;
    this._localStorageHandler.clear = swizzClear;
    this._localStorageHandler.removeItem = swizzRemoveItem;

    isSwizzled = false;
  }

  // Enable tracking by default if _localStorageHandler is already set
  if (this._localStorageHandler) {
    trackLocalStorage();
  }

  return {
    trackLocalStorage,
    untrackLocalStorage
  };
}