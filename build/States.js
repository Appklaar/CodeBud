"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_STATES = void 0;
const config_1 = require("./config");
exports.MODULE_STATES = {
    NOT_INITIATED: `This is default ${config_1.CONFIG.PRODUCT_NAME} state. ${config_1.CONFIG.PRODUCT_NAME} hasn't been initiated yet.`,
    INVALID_PARAMETERS: `Invalid ${config_1.CONFIG.PRODUCT_NAME} parameters were passed. Double check that provided apiKey is correct.`,
    WORKING: `${config_1.CONFIG.PRODUCT_NAME} works as it should (DEVELOPMENT MODE).`,
    WORKING_PRODUCTION: `${config_1.CONFIG.PRODUCT_NAME} works as it should (PRODUCTION MODE).`,
};
