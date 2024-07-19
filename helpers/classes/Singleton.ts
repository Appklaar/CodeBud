import { ObjectT } from "../../types";

export abstract class Singleton {
  private static _classHasInstanceTable: ObjectT<boolean> = {};

  constructor(classId: string) {
    if (classId.length < 1)
      throw new Error("Non-empty classId required for Singleton class protection!");

    if (Singleton._classHasInstanceTable[classId])
      throw new Error("Attempted to create second instance of a Singleton class!");

    Singleton._classHasInstanceTable[classId] = true;
  }
};