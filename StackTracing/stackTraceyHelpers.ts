import StackTracey from "stacktracey";
import { StackTraceCallData } from "../types";

export const filterStack = (stackWithSource: StackTracey, calleeExclude: string[], fileNameExclude: string[]): StackTracey => {
  return stackWithSource.filter((a) => !calleeExclude.includes(a.callee) && !fileNameExclude.includes(a.fileName) && !a.file.includes('node_modules'));
};

export const prepareStack = (stackWithSource: StackTracey): StackTraceCallData[] => {
  return stackWithSource.items.map((a) => ({
    sourceLine: a.sourceLine,
    beforeParse: a.beforeParse,
    callee: a.callee,
    calleeShort: a.calleeShort,
    native: a.native,
    fileRelative: a.fileRelative,
    fileShort: a.fileShort,
    fileName: a.fileName,
    line: a.line
  }));
}