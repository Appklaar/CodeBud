import { test, expect } from '@jest/globals';
import { Singleton } from './../../../helpers/classes';

class A extends Singleton {};
class B extends Singleton {};
class C extends Singleton {
  private x: number;
  constructor() {
    super();
    this.x = 123;
  }
  public printX() {
    console.log(this.x);
  }
};

test("Singleton class protection test", () => {
  const test1 = () => {
    const instanceA = new A();
    const instanceB = new B();
    const instanceC = new C();
  };

  const test2 = () => {
    const instanceA1 = new A();
    const instanceA2 = new A();
    const instanceB = new B();
    const instanceC = new C();
  };

  const test3 = () => {
    const instanceA = new A();
    const instanceB = new B();
    const instanceC1 = new C();
    const instanceC2 = new C();
  };

  expect(test1).not.toThrow();
  expect(test2).toThrow();
  expect(test3).toThrow();
});