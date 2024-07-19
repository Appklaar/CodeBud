export const singletonClass = <T extends { new (...args: any[]): {} }>(cls: T): T => {
  let _instanceId = 0;

  return class extends cls {
    public constructor(...args: any[]) {
      if (_instanceId === 1)
        throw new Error("Attempted to create second instance of a Singleton class!");

      super(...args);
      _instanceId++;
    }
  };
}