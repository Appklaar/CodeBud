import { useContext, Context, useEffect, useRef } from "react";
import { getId } from './../../helpers/random';
import { connector } from './../../Connector';

export const useContextMonitor = (SomeContext: Context<any>, label: string = "", waitMs: number = 500) => {
  const contextId = useRef(label || getId());
  const value = useContext(SomeContext);

  useEffect(() => {
    connector.handleMonitoredContextValueUpdated(contextId.current, value, waitMs);
  }, [value]);
};