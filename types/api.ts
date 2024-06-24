import { RemoteSettings, UserProfilePublicData } from "./types";

export type ErrorResponse = {
  message?: string;
  invalidParameters?: string[];
};

export type GetRemoteSettingsResponse = {
  remoteSettings: RemoteSettings 
} & ErrorResponse;

export type GetRemoteSettingsRequest = {
  projectId: string;
};

export type PersonalSettingRequest = {
  apiKey: string;
};

export type PersonalSettingResponse = {
  client: UserProfilePublicData;
} & ErrorResponse;