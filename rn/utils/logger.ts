import { CONFIG } from "../../config";

export const warn = (message: string) =>
  console.warn(`${CONFIG.PRODUCT_NAME}: react-native-network-logger: ${message}`);
