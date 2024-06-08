import { GetStackTraceFunction } from "../types";
import { getEnvironmentPlatform } from "../helpers/platform";
import { codebudConsoleWarn } from "../helpers/helperFunctions";
import { CONFIG } from "../config";
import { CALLEE_EXCLUDE, FILE_NAME_EXCLUDE } from "./constants";
import { filterStack, prepareStack } from "./stackTraceyHelpers";
import StackTracey from 'stacktracey';

export const getStackTraceStackTracey: GetStackTraceFunction = async (errorOrStack) => {
  const environmentPlatform = getEnvironmentPlatform();
  const stackStr = (errorOrStack instanceof Error) ? errorOrStack.stack : errorOrStack;

  switch (environmentPlatform) {
    case "nodejs": {
      const stack = new StackTracey(stackStr);
      const stackWithSource = stack.withSources();

      const filteredStack = filterStack(stackWithSource, CALLEE_EXCLUDE, FILE_NAME_EXCLUDE);
      const preparedStack = prepareStack(filteredStack);

      return { stack: preparedStack };
    }
    case "web": {
      const stack = new StackTracey(stackStr);
      const stackWithSource = await stack.withSourcesAsync();

      const filteredStack = filterStack(stackWithSource, CALLEE_EXCLUDE, FILE_NAME_EXCLUDE);
      const preparedStack = prepareStack(filteredStack);

      return { stack: preparedStack };
    }
    case "react-native": {
      codebudConsoleWarn(`getStackTraceStackTracey function does not work for this platform: ${environmentPlatform}. Consider reading ${CONFIG.PRODUCT_NAME} docs.`);
      return { stack: [] };
    }
  }
};