import { CONFIG } from "./config";

export const MODULE_STATES = {
  NOT_INITIATED: `This is default ${CONFIG.PRODUCT_NAME} state. ${CONFIG.PRODUCT_NAME} hasn't been initiated yet.`,
  INVALID_PARAMETERS: `Invalid ${CONFIG.PRODUCT_NAME} parameters were passed. Double check that provided apiKey is correct.`,
  WORKING: `${CONFIG.PRODUCT_NAME} works correctly (DEVELOPMENT MODE).`,
  WORKING_PRODUCTION: `${CONFIG.PRODUCT_NAME} works correctly (PRODUCTION MODE).`,
};

export type ModuleState = keyof typeof MODULE_STATES;