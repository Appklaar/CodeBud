import { getEnvironmentPlatform } from "../helpers/platform";
import { StackTraceData } from "../types";
import { CALLEE_EXCLUDE, FILE_NAME_EXCLUDE } from "./constants";
import { filterStack, prepareStack } from "./stackTraceyHelpers";
import { parseRawStack, filterStack as filterSimpleStack, prepareStack as prepareSimpleStack } from "./simpleTracing";
import StackTracey from 'stacktracey';

export const getStackTrace = async (errorOrStack: Error | string | undefined): Promise<StackTraceData> => {
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
      const stack = parseRawStack(stackStr);
      const filteredStack = filterSimpleStack(stack, CALLEE_EXCLUDE, FILE_NAME_EXCLUDE);
      const preparedStack = prepareSimpleStack(filteredStack);

      return { stack: preparedStack };
    }
  }
}