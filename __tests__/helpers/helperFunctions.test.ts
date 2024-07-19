import { test, expect } from '@jest/globals';
import { stringifyIfNotString, jsonStringifyKeepMeta, wrapInObjectIfNotObject, jsonReplacerWithPath, jsonRefReplacer, parseRefJSON, jsonStringifyPossiblyCircular, removeCircularReferencesFromObject, stringIsJson } from './../../helpers/helperFunctions';
import { makeRandomString } from './../../helpers/random';
import { CONFIG } from '../../config';

const getTestObjectWithCircularReference = () => {
  const circularObject: any = {data: "123"};
  circularObject.circ = circularObject;

  return circularObject;
};

test("stringifyIfNotString test", () => {
  const userStr = `{"name":"Alex","id":330,"numberOfCars":2}`;
  const userStrSingleQuote = `{'name':'Alex','id':330,'numberOfCars':2}`;
  const user = {name: "Alex", id: 330, numberOfCars: 2};
  const address2 = {street: "Pushkina", house: "Kolotushkina"};

  const company = {
    ceo: undefined,
    projects: {
      a: {
        user,
        employee: {
          name: "Roonie", id: 21, age: 28, salary: 2500,
          address: [
            {street: "Lenina", house: "20"},
            address2
          ],
        }
      },
      b: null
    },
    address: {
      street: "Centr", 
      house: "2"
    },
    info: ""
  };

  const test1 = stringifyIfNotString(userStr);
  const test2 = stringifyIfNotString(userStrSingleQuote);
  const test3 = stringifyIfNotString(user);
  const test4 = stringifyIfNotString(company);

  expect(test1).toEqual(userStr);
  expect(test2).toEqual(userStr);
  expect(test3).toEqual(JSON.stringify(user));
  expect(test4).toEqual(JSON.stringify(company));
});

test("wrapInObjectIfNotObject test", () => {
  const test1 = wrapInObjectIfNotObject(undefined);
  const test2 = wrapInObjectIfNotObject("");
  const test3 = wrapInObjectIfNotObject(123, "nums");
  const test4 = wrapInObjectIfNotObject(null);
  const test5 = wrapInObjectIfNotObject([]);
  const test6 = wrapInObjectIfNotObject({});
  const test7 = wrapInObjectIfNotObject({a: 1, b: 2, c: 3});

  expect(test1).toEqual({data: undefined});
  expect(test2).toEqual({data: ""});
  expect(test3).toEqual({nums: 123});
  expect(test4).toEqual(null);
  expect(test5).toEqual([]);
  expect(test6).toEqual({});
  expect(test7).toEqual({a: 1, b: 2, c: 3});
});

test("stringIsJson test", () => {
  const test1 = stringIsJson("");
  const test2 = stringIsJson("123");
  const test3 = stringIsJson("undefined");
  const test4 = stringIsJson("true");
  const test5 = stringIsJson(JSON.stringify([]));
  const test6 = stringIsJson(JSON.stringify({}));
  const test7 = stringIsJson(JSON.stringify([1, 2, "3", true, false, null, {}]));
  const test8 = stringIsJson(JSON.stringify({a: "x", b: "y", c: "z", d: {e: "."}}));

  expect(test1).toBe(false);
  expect(test2).toBe(false);
  expect(test3).toBe(false);
  expect(test4).toBe(false);
  expect(test5).toBe(true);
  expect(test6).toBe(true);
  expect(test7).toBe(true);
  expect(test8).toBe(true);
});

test("jsonReplacerWithPath test", () => {
  const a = { a1: 1, a2: 1 };
  const b = { b1: 2, b2: [1, a] };
  const c = { c1: 3, c2: b };

  const test1: string[] = [];
  const s = JSON.stringify(c, jsonReplacerWithPath(function(this: any, field: string, value: any, path: string) {
    test1.push(path);
    return value;
  }));

  expect(test1).toEqual(["", "c1", "c2", "c2.b1", "c2.b2", "c2.b2[0]", "c2.b2[1]", "c2.b2[1].a1", "c2.b2[1].a2"])
  expect(s).toEqual(JSON.stringify(c));
});

test("jsonRefReplacer test", () => {
  // Creating object with duplicate references
  const a: any = { a1: 1, a2: 2 };
  const b: any = { b1: 3, b2: "4" };
  const obj: any = { o1: { o2:  a  }, b, a }; // duplicate reference
  a.a3 = [1 ,2, b]; // circular reference
  b.b3 = a; // circular reference

  const test1 = JSON.stringify(obj, jsonRefReplacer());
  expect(test1).toEqual(`{"o1":{"o2":{"a1":1,"a2":2,"a3":[1,2,{"b1":3,"b2":"4","b3":"#REF:$.o1.o2"}]}},"b":"#REF:$.o1.o2.a3[2]","a":"#REF:$.o1.o2"}`);
});

test("parseRefJSON test", () => {
  // Creating object with duplicate references
  const a: any = { a1: 1, a2: 2 };
  const b: any = { b1: 3, b2: "4" };
  const obj: any = { o1: { o2:  a  }, b, a }; // duplicate reference
  a.a3 = [1, 2, b]; // circular reference
  b.b3 = a; // circular reference

  const s = JSON.stringify(obj, jsonRefReplacer());

  const test1 = parseRefJSON(s);
  expect(test1).toEqual(obj);
});

test("jsonStringifyPossiblyCircular test", () => {
  const test1 = jsonStringifyPossiblyCircular([]);
  const test2 = jsonStringifyPossiblyCircular({});
  const test3 = jsonStringifyPossiblyCircular({a: 1, b: 2, c: 3});
  const data4 = {a: {x: 1, y: 2}, b: {x: 0, y: -1}};
  const test4 = jsonStringifyPossiblyCircular(data4);
  const test4Reversed = JSON.parse(test4);

  const circularObject = getTestObjectWithCircularReference();

  const test5 = jsonStringifyPossiblyCircular(circularObject);

  expect(test1).toEqual("[]");
  expect(test2).toEqual("{}");
  expect(test3).toEqual(`{"a":1,"b":2,"c":3}`);
  expect(test4).toEqual(`{"a":{"x":1,"y":2},"b":{"x":0,"y":-1}}`);
  expect(test4Reversed).toEqual(data4);
  expect(test5).toEqual(`{"data":"123","circ":"#REF:$"}`);
});

test("removeCircularReferencesFromObject test", () => {
  const a: any = [];
  const b = {};
  const c = {a: 1, b: 2, c: 3};
  const d = {a: {x: 1, y: 2}, b: {x: 0, y: -1}};

  const test1 = removeCircularReferencesFromObject(a);
  const test2 = removeCircularReferencesFromObject(b);
  const test3 = removeCircularReferencesFromObject(c);
  const test4 = removeCircularReferencesFromObject(d);

  const circularObject = getTestObjectWithCircularReference();

  const test5 = removeCircularReferencesFromObject(circularObject);

  const aRefersToB: any = {x: 10};
  const bRefersToA: any = {y: 100};
  aRefersToB.linkB = bRefersToA;
  bRefersToA.linkA = aRefersToB;
  const innerRecursiveLinksObject = {aRefersToB, bRefersToA};

  const test6 = removeCircularReferencesFromObject(innerRecursiveLinksObject);

  // console.log("test6", test6);

  expect(test1).toEqual(a);
  expect(test2).toEqual(b);
  expect(test3).toEqual(c);
  expect(test4).toEqual(d);
  expect(test5).toEqual({data: "123", circ: "#REF:$"});
  expect(test6).toEqual({
    aRefersToB: { x: 10, linkB: { linkA: "#REF:$.aRefersToB", y: 100 } },
    bRefersToA: "#REF:$.aRefersToB.linkB"
  });
});

test("jsonStringifyKeepMeta test", () => {
  const data1 = {
    a: 101,
    b: "abc",
    c: true,
    d: null,
    e: undefined,
    f: [1, 2, 3],
    g: {x: 10, y: 12},
    h: () => {console.log("Hi")}
  };

  const test1 = jsonStringifyKeepMeta(data1);
  expect(test1.ok).toBe(true);
  expect(test1.result).toEqual(`{"a":101,"b":"abc","c":true,"d":null,"f":[1,2,3],"g":{"x":10,"y":12},"h":"Function (...)"}`);

  const data2 = {
    s1: makeRandomString(CONFIG.PAYLOAD_LIMITS.MAX_BYTE_SIZE),
    s2: makeRandomString(CONFIG.PAYLOAD_LIMITS.MAX_BYTE_SIZE)
  };
  
  const test2 = jsonStringifyKeepMeta(data2);
  expect(test2.ok).toBe(false);
  expect(test2.result).toEqual(`{\"message\":\"Payload data was skipped (1024 Kb limit exceeded)\"}`);

  const data3 = {
    ...data1,
    circularObject: getTestObjectWithCircularReference()
  };

  const test3 = () => jsonStringifyKeepMeta(data3);
  expect(test3).toThrow();

  const test4 = jsonStringifyKeepMeta(data3, true);
  expect(test4.ok).toBe(true);
  expect(test4.result).toEqual(`{"a":101,"b":"abc","c":true,"d":null,"f":[1,2,3],"g":{"x":10,"y":12},"circularObject":{"data":"123","circ":"#REF:$.circularObject"}}`);
});