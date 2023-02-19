import { RemoteEvent, RemoteScenario } from "../types";

export class ScenarioHandleError extends Error {
  public scenario: RemoteScenario;
  public eventCausedError: RemoteEvent | undefined;
  public providedMessage: string;

  constructor(scenario: RemoteScenario, eventCausedError: RemoteEvent | undefined, msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ScenarioHandleError.prototype);

    this.scenario = scenario;
    this.eventCausedError = eventCausedError;
    this.providedMessage = msg;
  }
}