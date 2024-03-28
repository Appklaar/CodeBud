import { useContext, Context, useEffect, useRef } from "react";
import { getId } from './../../helpers/random';
import { Connector } from './../../Connector';

export const useContextMonitor = (SomeContext: Context<any>) => {
  const contextId = useRef(getId());
  const value = useContext(SomeContext);

  useEffect(() => {
    console.log("SomeContext.displayName", SomeContext.displayName);
    Connector.handleMonitoredContextValueUpdated(contextId.current, value);
  }, [value]);
};