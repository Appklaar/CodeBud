import { ObjectT } from "../../types";

export abstract class Singleton {
  private static _classHasInstanceTable: ObjectT<boolean> = {};

  constructor() {
    if (Singleton._classHasInstanceTable[this.constructor.name])
      throw new Error("Attempted to create second instance of a Singleton class!");

    Singleton._classHasInstanceTable[this.constructor.name] = true;
  }
};