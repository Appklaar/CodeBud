import { Singleton } from "./../helpers/classes";
import { validateHexId24Symbols } from "../constants/regex";
import { codebudConsoleWarn } from "../helpers/helperFunctions";
import { PersonalProjectsSetting, RefreshPersonalProjectsSettingCallback, RefreshRemoteSettingsCallback, RemoteSettings, RemoteSettingsListenersTable } from "../types/types";
import { api } from './../api/api';
import { classicApiResponseValidator } from './../helpers/apiResponseValidators';

class RemoteSettingsService extends Singleton {
  private _projectId: string = "";
  private _apiKey: string = "";
  private _isInit: boolean = false;
  private _remoteSettings: RemoteSettings | null = null;
  private _remoteSettingsListenersTable: RemoteSettingsListenersTable = {};
  private _personalProjectsSetting: PersonalProjectsSetting | null = null;
  private _autoUpdateTimer: NodeJS.Timer | null = null;

  public addRemoteSettingsListener(key: string, handler: (r: RemoteSettings) => any) {
    this._remoteSettingsListenersTable[key] = handler;
  };

  public removeRemoteSettingsListener(key: string) {
    delete this._remoteSettingsListenersTable[key];
  };

  constructor() {
    super("RemoteSettingsService");
  }

  public onGotNewRemoteSettings(r: RemoteSettings) {
    if (!this._isInit)
      return;

    this._remoteSettings = r;
    for (const key of Object.keys(this._remoteSettingsListenersTable))
      this._remoteSettingsListenersTable[key](r);
  }

  private _onGotNewPersonalProjectsSetting(s: PersonalProjectsSetting) {
    if (!this._isInit)
      return;

    this._personalProjectsSetting = s;
  }

  public async refreshPersonalProjectsSetting(callbackFn?: RefreshPersonalProjectsSettingCallback) {
    try {
      if (!this._isInit) {
        throw new Error("Remote settings service is not initiated. Please make sure that you've passed correct projectId and check console for related errors.");
      }

      const personalProjectsSetting = await api.personalSettingGet({apiKey: this._apiKey})
      .then((response) => {
        if (classicApiResponseValidator(response)) {
          return response.data!.client.projectsSetting;
        } else {
          throw new Error("Server returned an error (personalSettingGet)");
        }
      });

      this._onGotNewPersonalProjectsSetting(personalProjectsSetting);
      callbackFn?.(personalProjectsSetting);
    } catch (e) {
      codebudConsoleWarn("Error while trying to fetch personal projects settings", e);
    }
  }

  public async refreshRemoteSettings(callbackFn?: RefreshRemoteSettingsCallback) {
    try {
      if (!this._isInit) {
        throw new Error("Remote settings service is not initiated. Please make sure that you've passed correct projectId and check console for related errors.");
      }

      this.refreshPersonalProjectsSetting();

      const remoteSettings = await api.getRemoteSettingsGet({projectId: this._projectId})
      .then((response) => {
        if (classicApiResponseValidator(response)) {
          return response.data!.remoteSettings;
        } else {
          throw new Error("Server returned an error (getRemoteSettingsGet)");
        }
      });

      this.onGotNewRemoteSettings(remoteSettings);
      callbackFn?.(remoteSettings);
    } catch (e) {
      codebudConsoleWarn("Error while trying to fetch remote settings", e);
    }
  }

  public init(projectId: string, apiKey: string, autoUpdateInterval?: number) {
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
      this._apiKey = apiKey; // We assume that apiKey has already been validated

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

  public isRemoteSettingsPreferable() {
    if (!this._isInit)
      return false;

    return !!this._personalProjectsSetting?.[this._projectId]?.remoteSettingsEnabled;
  }

  public getPreferableValue(valueA: any, valueB: any) {
    return this.isRemoteSettingsPreferable() ? valueA : valueB;
  }

  public clear() {
    if (this._autoUpdateTimer !== null)
      clearInterval(this._autoUpdateTimer);

    this._projectId = "";
    this._apiKey = "";
    this._remoteSettings = null;
    this._remoteSettingsListenersTable = {};
    this._personalProjectsSetting = null;
    this._isInit = false;
  }
};

export const remoteSettingsService = new RemoteSettingsService();