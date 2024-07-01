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

// JSON.stringify replacer function constructor that adds full path to current position as last arg of replacer
// Explanation fo replacerWithPath decorator:
// > 'this' inside 'return function' point to field parent object
//   (JSON.stringify execute replacer like that)
// > 'path' contains path to current field based on parent ('this') path
//   previously saved in Map
// > during path generation we check is parent ('this') array or object
//   and chose: "[field]" or ".field"
// > in Map we store current 'path' for given 'field' only if it 
//   is obj or arr in this way path to each parent is stored in Map. 
//   We don't need to store path to simple types (number, bool, ...) because they never will have children
// > value === Object(value) -> is true if value is object or array
// > path for main object parent is set as 'undefined.' so we cut out that
//   prefix at the end ad call replacer with that path
// Test example:
// let a = { a1: 1, a2: 1 };
// let b = { b1: 2, b2: [1, a] };
// let c = { c1: 3, c2: b };

// let s = JSON.stringify(c, replacerWithPath(function(field, value, path) {
//   // "this" has same value as in replacer without decoration
//   console.log(path);
//   return value;
// })); 
export const jsonReplacerWithPath = (replacer: ((this: any, key: string, value: any, path: string) => any)) => {
  const m = new Map();

  return function(this: any, field: string, value: any) {
    const path = m.get(this) + (Array.isArray(this) ? `[${field}]` : '.' + field); 

    if (value === Object(value)) 
      m.set(value, path);

    // @ts-ignore (4th arg is additional one, thats a whole point)
    return replacer.call(this, field, value, path.replace(/undefined\.\.?/,''));
  }
}

// JSON.stringify replacer function constructor for ref replacing (uses same idea as replacerWithPathDecorator)
export const jsonRefReplacer = () => {
  const m = new Map();
  const v = new Map();
  let init: any = null;

  return function(this: any, field: string, value: any) {
    const p = m.get(this) + (Array.isArray(this) ? `[${field}]` : '.' + field); 
    const isComplex = value === Object(value);
    
    if (isComplex) 
      m.set(value, p);  
    
    const pp = v.get(value) || '';
    const path = p.replace(/undefined\.\.?/,'');
    let val = pp ? `#REF:${pp[0] == '[' ? '$' : '$.'}${pp}` : value;
    
    !init ? (init = value) : (val === init ? val = "#REF:$" : 0);
    if (!pp && isComplex)
      v.set(value, path);
   
    return val;
  }
}

// JSON.parse but for objects that were stringified with jsonRefReplacer
export const parseRefJSON = (json: string) => {
  const objToPath = new Map();
  const pathToObj = new Map();
  let o = JSON.parse(json);
  
  const traverse = (parent: any, field?: string) => {
    let obj = parent;
    let path = '#REF:$';

    if (field !== undefined) {
      obj = parent[field];
      path = objToPath.get(parent) + (Array.isArray(parent) ? `[${field}]` : `${field ? '.' + field : ''}`);
    }

    objToPath.set(obj, path);
    pathToObj.set(path, obj);
    
    let ref = pathToObj.get(obj);
    // @ts-ignore
    if (ref) parent[field] = ref;

    for (let f in obj)
      if (obj === Object(obj))
        traverse(obj, f);
  }
  
  traverse(o);

  return o;
}


export const jsonStringifyPossiblyCircular = (data: ObjectT<any>) => {
  return JSON.stringify(
    data, 
    jsonRefReplacer()
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