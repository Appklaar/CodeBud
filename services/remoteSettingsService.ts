import { validateHexId24Symbols } from "../constants/regex";
import { codebudConsoleWarn } from "../helpers/helperFunctions";
import { RefreshRemoteSettingsCallback, RemoteSettings, RemoteSettingsListenersTable } from "../types/types";
import { api } from './../api/api';

class RemoteSettingsService {
  private _projectId: string = "";
  private _isInit: boolean = false;
  private _remoteSettings: RemoteSettings | null = null;
  private _remoteSettingsListenersTable: RemoteSettingsListenersTable = {};
  private _autoUpdateTimer: NodeJS.Timer | null = null;

  public addRemoteSettingsListener(key: string, handler: (r: RemoteSettings) => any) {
    this._remoteSettingsListenersTable[key] = handler;
  };

  public removeRemoteSettingsListener(key: string) {
    delete this._remoteSettingsListenersTable[key];
  };

  constructor() {}

  public onGotNewRemoteSettings(r: RemoteSettings) {
    if (!this._isInit)
      return;

    this._remoteSettings = r;
    for (const key of Object.keys(this._remoteSettingsListenersTable))
      this._remoteSettingsListenersTable[key](r);
  }

  public async refreshRemoteSettings(callbackFn?: RefreshRemoteSettingsCallback) {
    try {
      if (!this._isInit) {
        throw new Error("Remote settings service is not initiated. Please make sure that you've passed correct projectId and check console for related errors.");
      }

      const remoteSettings = await api.getRemoteSettingsGet({projectId: this._projectId})
      .then((response) => {
        if (response.ok && response.data) {
          return response.data?.remoteSettings
        } else {
          throw new Error("Response returned an error");
        }
      });

      this.onGotNewRemoteSettings(remoteSettings);
      callbackFn?.(remoteSettings);
    } catch (e) {
      codebudConsoleWarn("Error while trying to fetch remote settings", e);
    }
  }

  public init(projectId: string, autoUpdateInterval?: number) {
    try {
      if (this._isInit)
        throw new Error("Already initiated!");
      if (!validateHexId24Symbols(projectId))
        throw new Error("Invalid projectId");

      this._isInit = true;

      if (autoUpdateInterval !== undefined && autoUpdateInterval < 6e4) {
        codebudConsoleWarn("Remote settings service: autoUpdateInterval must be at least 60000ms. Minimum value will be applied.");
        autoUpdateInterval = 6e4;
      }

      this._projectId = projectId;

      this.refreshRemoteSettings();
      if (autoUpdateInterval !== undefined)
        this._autoUpdateTimer = setInterval(() => this.refreshRemoteSettings(), autoUpdateInterval);
    } catch (e) {
      codebudConsoleWarn("Remote settings service cannot be initiated: ", e);
    }
  }

  public get remoteSettings(): RemoteSettings | null {
    return this._remoteSettings;
  }

  public clear() {
    if (this._autoUpdateTimer !== null)
      clearInterval(this._autoUpdateTimer);

    this._projectId = "";
    this._remoteSettings = null;
    this._remoteSettingsListenersTable = {};
    this._isInit = false;
  }
};

export const remoteSettingsService = new RemoteSettingsService();