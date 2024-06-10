import { getEnvironmentPlatform } from "../helpers/platform";
import { StackTraceCallData } from "../types";

export const nixSlashes = (x: string) => x.replace (/\\/g, '/');

type SimpleParsedStack = {
  beforeParse: string;
  callee: string;
  native: boolean;
  file: string;
  line: number | undefined;
  column: number | undefined;
}[];

// Based on stacktracey rawParse method
export const parseRawStack = (str: string = ""): SimpleParsedStack => {
  const lines = str.split('\n');

  // Preposition that refers to where in code is called. Usually is "at", but, for example, in RN can be "in"
  const at = "(in|at)";

  const regexp1 = new RegExp(`${at} (.+) \\(eval ${at} .+ \\((.+)\\), .+\\)`);
  const regexp2 = new RegExp(`${at} (.+) \\((.+)\\)`);
  const regexp3 = new RegExp(`^(${at}\\s+)*(.+):(\\d+):(\\d+)`);

  const entries = lines.map(line => {
    line = line.trim();

    let callee, fileLineColumn = [], native, planA, planB;

    if ((planA = line.match (regexp1)) || // eval calls
      (planA = line.match (regexp2)) ||
      ((line.slice (0, 3) !== `${at} `) && (planA = line.match (/(.*)@(.*)/)))) {

      callee = planA[1];
      native = (planA[2] === 'native');
      fileLineColumn = (planA[2].match (/(.*):(\d+):(\d+)/) || planA[2].match (/(.*):(\d+)/) || []).slice(1);

    } else if ((planB = line.match(regexp3))) {
      fileLineColumn = (planB).slice (2)
    } else {
      return undefined
    }
    
    if (callee && !fileLineColumn[0]) {
      const type = callee.split ('.')[0];
      if (type === 'Array') {
        native = true;
      }
    }

    return {
      beforeParse: line,
      callee: callee || '',
      native: native || false,
      file: nixSlashes(fileLineColumn[0] || ''),
      line: parseInt(fileLineColumn[1] || '', 10) || undefined,
      column: parseInt(fileLineColumn[2] || '', 10) || undefined
    }
  });

  return entries.filter(x => (x !== undefined)) as SimpleParsedStack;
};

export const filterStack = (stack: SimpleParsedStack, calleeExclude: string[], fileNameExclude: string[]) => {
  return stack.filter((a) => {
    let fileExcluded = false;

    for (const fileName of fileNameExclude) {
      if (a.file.includes(fileName)) {
        fileExcluded = true;
        break;
      }
    }

    return !calleeExclude.includes(a.callee) && !fileExcluded && !a.file.includes('node_modules');
  });
}

export const prepareStack = (stack: SimpleParsedStack): StackTraceCallData[] => {
  return stack.map((a) => ({
    beforeParse: a.beforeParse,
    callee: a.callee,
    native: a.native,
    file: a.file,
    line: a.line
  }));
}