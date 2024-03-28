import { useEffect } from 'react';
import { RemoteEvent } from '../../types/types';
import { connector } from './../../Connector';
import { getId } from './../../helpers/random';

export const useEvent = (
  handler: (event: RemoteEvent) => any, 
  instructionIds: ReadonlyArray<string>
) => {
  // ComponentDidMount
  useEffect(() => {
    const listenerKey = getId();

    const innerHandler = (event: RemoteEvent) => {
      if (instructionIds.includes(event.instructionId))
        handler(event);
    };

    connector.addEventListener(listenerKey, innerHandler);
    
    // ComponentWillUnmount
    return () => {
      connector.removeEventListener(listenerKey);
    };
  }, []);
};