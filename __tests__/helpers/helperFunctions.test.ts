import { test, expect } from '@jest/globals';
import { stringifyIfNotString, jsonStringifyKeepMeta } from './../../helpers/helperFunctions';
import { makeRandomString } from './../../helpers/random';
import { CONFIG } from '../../config';

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
});