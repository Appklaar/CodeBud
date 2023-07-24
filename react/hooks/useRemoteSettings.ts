import { useEffect, useState } from 'react';
import { RemoteSettings } from '../../types';
import { Connector } from './../../Connector';
import { getId } from './../../helpers/random';

export const useRemoteSettings = (): RemoteSettings | null => {
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettings | null>(Connector.remoteSettings);

  // ComponentDidMount
  useEffect(() => {
    const listenerKey = getId();

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