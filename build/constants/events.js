"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_INSTRUCTIONS = exports.SPECIAL_INSTRUCTIONS_TABLE = exports.EXISTING_SPECIAL_INSTRUCTION_IDS = void 0;
const helperFunctions_1 = require("../helpers/helperFunctions");
exports.EXISTING_SPECIAL_INSTRUCTION_IDS = new Set([
    "condition", "delay", "forwardData"
]);
exports.SPECIAL_INSTRUCTIONS_TABLE = {
    condition: {
        id: "condition",
        description: "Condition statement. Next event will be executed only if previous event result matches condition.",
        parametersDescription: {
            param: "string",
            equalsTo: "string"
        },
        handler: (data) => { }
    },
    delay: {
        id: "delay",
        description: "Adds delay between events. Has 1 parameter - delay in ms",
        parametersDescription: {
            delayInMs: "number"
        },
        handler: async (data) => {
            await (0, helperFunctions_1.delay)(data.delayInMs);
        }
    },
    forwardData: {
        id: "forwardData",
        description: "Forwards chosen fields from previous event result to next event params. Takes 1 param - array of params to forward",
        parametersDescription: {
            paramsToForward: "array"
        },
        handler: (data) => { }
    }
};
exports.SPECIAL_INSTRUCTIONS = Object.values(exports.SPECIAL_INSTRUCTIONS_TABLE);
