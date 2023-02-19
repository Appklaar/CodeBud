export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const isValidApiKey = (apiKey: string) => {
  return true;
};