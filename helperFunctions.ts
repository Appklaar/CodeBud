export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const stringifyIfNotString = (data: any) => {
  if (typeof data === "string") {
    data = data.replace(/'/g, `"`).replace(/\s/g, "");
    return data;
  }

  return JSON.stringify(data);
}