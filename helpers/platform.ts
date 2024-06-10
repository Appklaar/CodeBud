export type EnvironmentPlatform = "nodejs" | "web" | "react-native";

// https://stackoverflow.com/questions/39468022/how-do-i-know-if-my-code-is-running-as-react-native
// note: navigator.product is deprecated - maybe should be reworked later
export const getEnvironmentPlatform = (): EnvironmentPlatform => {
  if (typeof document !== 'undefined')
    return "web";
  else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative')
    return "react-native";
  
  return "nodejs";
}