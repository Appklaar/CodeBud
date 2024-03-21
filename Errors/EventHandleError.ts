import { RemoteEvent } from "../types/types";

export class EventHandleError extends Error {
  public event: RemoteEvent;
  public providedMessage: string;

  constructor(event: RemoteEvent, msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, EventHandleError.prototype);

    this.providedMessage = msg;
    this.event = event;
  }
}