import { test, expect } from '@jest/globals';
import { getId } from './../../helpers/random';

test("getId test", () => {
  const id1 = getId();
  const id2 = getId(10);

  const test3 = () => getId(11);

  expect(id1.length).toBe(8);
  expect(id2.length).toBe(10);
  expect(test3).toThrow();
});