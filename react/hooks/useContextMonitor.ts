import { useContext, Context, useEffect, useRef } from "react";
import { getId } from './../../helpers/random';
import { connector } from './../../Connector';

export const useContextMonitor = (SomeContext: Context<any>, label: string = "", wait: number = 500) => {
  const contextId = useRef(label || getId());
  const value = useContext(SomeContext);

  useEffect(() => {
    console.log("SomeContext.displayName", SomeContext.displayName);
    connector.handleMonitoredContextValueUpdated(contextId.current, value, wait);
  }, [value]);
};