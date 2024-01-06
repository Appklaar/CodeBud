"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandleError = void 0;
class EventHandleError extends Error {
    event;
    providedMessage;
    constructor(event, msg) {
        super(msg);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, EventHandleError.prototype);
        this.providedMessage = msg;
        this.event = event;
    }
}
exports.EventHandleError = EventHandleError;
