import { InterceptedRequest, InterceptedResponse } from "../types/types";

export abstract class NetworkInterceptorApi {
  protected abstract formatRequest(request: any): Promise<InterceptedRequest>;
  protected abstract formatResponse(response: any): Promise<InterceptedResponse>;
  public abstract dispose(): void;
};