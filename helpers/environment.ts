import { ObjectT } from "../types/types";

export const getProcessEnv = (): ObjectT<any> => {
  try {
    const data = process.env;
    return data;
  } catch (e) {
    return {};
  }
}