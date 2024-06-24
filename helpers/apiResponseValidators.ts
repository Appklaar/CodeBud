import { ApiResponse } from "apisauce";

export type ApiResponseValidator = (apiResponse: ApiResponse<any>) => boolean;

export const classicApiResponseValidator = (apiResponse: ApiResponse<any>) => {
  return Boolean(apiResponse.ok && apiResponse.data);
};