"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenarioHandleError = void 0;
class ScenarioHandleError extends Error {
    scenario;
    eventCausedError;
    providedMessage;
    constructor(scenario, eventCausedError, msg) {
        super(msg);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ScenarioHandleError.prototype);
        this.scenario = scenario;
        this.eventCausedError = eventCausedError;
        this.providedMessage = msg;
    }
}
exports.ScenarioHandleError = ScenarioHandleError;
