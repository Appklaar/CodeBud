import { useEffect } from 'react';
import { RemoteEvent } from '../../types';
import { Connector } from './../../Connector';
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

    Connector.addEventListener(listenerKey, innerHandler);
    
    // ComponentWillUnmount
    return () => {
      Connector.removeEventListener(listenerKey);
    };
  }, []);
};