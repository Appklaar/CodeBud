import { GetStackTraceFunction } from "../types";
import { parseRawStack, filterStack as filterSimpleStack, prepareStack as prepareSimpleStack } from "./simpleTracing";
import { CALLEE_EXCLUDE, FILE_NAME_EXCLUDE } from "./constants";

export const getStackTraceSimple: GetStackTraceFunction = async (errorOrStack) => {
  const stackStr = (errorOrStack instanceof Error) ? errorOrStack.stack : errorOrStack;
  
  const stack = parseRawStack(stackStr);
  const filteredStack = filterSimpleStack(stack, CALLEE_EXCLUDE, FILE_NAME_EXCLUDE);
  const preparedStack = prepareSimpleStack(filteredStack);

  return { stack: preparedStack };
};