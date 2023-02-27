import { useEffect } from 'react';
import { RemoteEvent } from '../../types';
import { Connector } from './../../Connector';
import { v4 as uuid } from 'uuid';

export const useEvent = (
  handler: (event: RemoteEvent) => any, 
  instructionIds: ReadonlyArray<string>
) => {
  // ComponentDidMount
  useEffect(() => {
    const listenerKey = uuid();

    const innerHandler = (event: RemoteEvent) => {
      if (instructionIds.includes(event.instructionId))
        handler(event);
    };

    Connector.addEventListener(listenerKey, innerHandler);
    
    return () => {
      Connector.removeEventListener(listenerKey);
    };
  }, []);
};