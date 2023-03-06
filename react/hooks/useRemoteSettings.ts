import { useEffect, useState } from 'react';
import { RemoteSettings } from '../../types';
import { Connector } from './../../Connector';
import { v4 as uuid } from 'uuid';

export const useRemoteSettings = (): RemoteSettings | null => {
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettings | null>(Connector.remoteSettings);

  // ComponentDidMount
  useEffect(() => {
    const listenerKey = uuid();

    const innerHandler = (r: RemoteSettings) => {
      setRemoteSettings(r);
    };

    Connector.addRemoteSettingsListener(listenerKey, innerHandler);
    
    // ComponentWillUnmount
    return () => {
      Connector.removeRemoteSettingsListener(listenerKey);
    };
  }, []);

  return remoteSettings;
};