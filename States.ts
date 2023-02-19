export const MODULE_STATES = {
  NOT_INITIATED: "This is default state. Module hasn't been initiated yet. ApiKey check is ongoing.",
  INVALID_PARAMETERS: "Parameters are invalid. Double check that apiKey is correct.",
  WORKING: "Everything works as it should."
};

export type ModuleState = keyof typeof MODULE_STATES;