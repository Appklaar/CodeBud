import { CONFIG } from "./config";

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const stringifyIfNotString = (data: any) => {
  if (typeof data === "string") {
    data = data.replace(/'/g, `"`).replace(/\s/g, "");
    return data;
  }

  return JSON.stringify(data);
}

const memo = {
  warn: {
    data: "",
    identicalInARow: 0
  }
}

export const codebudConsoleWarn = (...data: any[]) => {
  const dataStr = JSON.stringify(data);

  if (dataStr === memo.warn.data) {
    if (memo.warn.identicalInARow++ < CONFIG.MAX_IDENTICAL_CONSOLE_WARNINGS_IN_A_ROW)
      console.warn(`${CONFIG.PRODUCT_NAME}:`, ...data);
  } else {
    memo.warn.data = dataStr;
    memo.warn.identicalInARow = 1;
    console.warn(`${CONFIG.PRODUCT_NAME}:`, ...data);
  }
}

export const codebudConsoleLog = (...data: any[]) => {
  console.log(`${CONFIG.PRODUCT_NAME}:`, ...data);
}