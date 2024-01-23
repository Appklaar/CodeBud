import { CONFIG } from "../config";
import { ObjectT } from "../types";
import { payloadSizeValidator } from "./payloadSizeValidator";

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

// @ts-ignore
export const emptyMiddleware = () => next => action => {
  return next(action);
}

export const getFormDataMeta = (fData: FormData) => {
  try {
    const fDataMeta: {[key: string]: any} = {};

    fData.forEach((value, key) => {
      if (value instanceof File) { 
        fDataMeta[key] = {
          "lastModified": value.lastModified,
          // @ts-ignore
          "lastModifiedDate": value.lastModifiedDate,
          "name": value.name,
          "size": value.size,
          "type": value.type,
          "webkitRelativePath": value.webkitRelativePath
        }; 
      } else {
        fDataMeta[key] = value;
      }
    });

    return fDataMeta;
  } catch (e) {
    return {};
  }
}

// Custom JSON.stringify wrapper that keeps as much metadata as possible
export const jsonStringifyKeepMeta = (data: ObjectT<any>) => {
  const dataStringified = JSON.stringify(
    data,
    function(key, value) {
      const type = typeof value;

      switch (type) {
        case "object":
          return (value instanceof FormData) ? getFormDataMeta(value) : value;
        case "function":
          return "Function (...)";
        default:
          return value;
      }
    }
  );

  if (payloadSizeValidator(dataStringified))
    return dataStringified;

  const message = `Payload data was skipped (${CONFIG.PAYLOAD_LIMITS.MAX_KB_SIZE} Kb limit exceeded)`;
  codebudConsoleWarn(message);
  
  return JSON.stringify({message});
}