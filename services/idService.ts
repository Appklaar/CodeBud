class IdService {
  private static _hasInstance = false;
  private _currentInterceptedReduxActionId = 0;
  private _currentInterceptedStorageActionId = 0;
  private _currentCapturedEventId = 0;
  private _currentCrashReportId = 0;
  private _currentInterceptedTanStackQueryEventId = 0;
  private _currentInterceptedMobxEventId = 0;

  constructor() {
    if (IdService._hasInstance)
      throw new Error("Attempted to create second instance of a Singleton class!");

    IdService._hasInstance = true;
  }

  public get currentInterceptedReduxActionId() {
    return `RA_${this._currentInterceptedReduxActionId++}`;
  }

  public get currentInterceptedStorageActionId() {
    return `SA_${this._currentInterceptedStorageActionId++}`;
  }

  public get currentCapturedEventId() {
    return `UCE_${this._currentCapturedEventId++}`;
  }

  public get currentCrashReportId() {
    return `ACR_${this._currentCrashReportId++}`;
  }

  public get currentInterceptedTanStackQueryEventId() {
    return `TQE_${this._currentInterceptedTanStackQueryEventId++}`;
  }

  public get currentInterceptedMobxEventId() {
    return `MXE_${this._currentInterceptedMobxEventId++}`;
  }
};

export const idService = new IdService();