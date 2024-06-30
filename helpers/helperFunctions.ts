import { CONFIG } from "../config";
import { ObjectT, MobxStoreMonitor } from "../types/types";
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

export const wrapInObjectIfNotObject = (obj: any, fallbackDataKey: string = "data") => {
  if (typeof obj === "object")
    return obj;

  return {[fallbackDataKey]: obj};
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

export const emptyMobxStoreMonitor: MobxStoreMonitor = [
  () => "",
  () => {}
];

export const jsonStringifyPossiblyCircular = (data: ObjectT<any>) => {
  const seen = new WeakSet();

  return JSON.stringify(
    data, 
    (k, v) => {
      if (typeof v === 'object' && v) {
        if (seen.has(v)) 
          return;
        seen.add(v);
      }
      return v;
    }
  );
}

export const removeCircularReferencesFromObject = (data: ObjectT<any>) => {
  return JSON.parse(jsonStringifyPossiblyCircular(data));
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
export const jsonStringifyKeepMeta = (data: ObjectT<any>, removeCircularReferences: boolean = false): {result: string, ok: boolean} => {
  const dataStringified = JSON.stringify(
    data,
    function(key, value) {
      const type = typeof value;

      switch (type) {
        case "object":
          if (value instanceof FormData)
            return getFormDataMeta(value);

          if (removeCircularReferences && value)
            return removeCircularReferencesFromObject(value);

          return value;
        case "function":
          return "Function (...)";
        default:
          return value;
      }
    }
  );

  if (payloadSizeValidator(dataStringified))
    return {result: dataStringified, ok: true};

  const message = `Payload data was skipped (${CONFIG.PAYLOAD_LIMITS.MAX_KB_SIZE} Kb limit exceeded)`;
  codebudConsoleWarn(message);

  return {result: JSON.stringify({message}), ok: false};
}

export const errorToJSON = (error: any) => {
  if (error instanceof Error) {
    var alt: ObjectT<any> = {};

    // @ts-ignore
    Object.getOwnPropertyNames(error).forEach((key) => alt[key] = error[key]);

    return alt;
  }

  return {error: error};
}

export const countOccurrences = (searchFor: string, searchIn: string) => {
  const regex = new RegExp(searchFor, 'g');
  const matches = searchIn.match(regex);
  return matches ? matches.length : 0;
}