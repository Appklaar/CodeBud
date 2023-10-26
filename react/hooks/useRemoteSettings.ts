import { useEffect, useState } from 'react';
import { RemoteSettings } from '../../types';
import { remoteSettingsService } from "./../../services/remoteSettingsService";
import { getId } from './../../helpers/random';

export const useRemoteSettings = (): RemoteSettings | null => {
  const [remoteSettings, setRemoteSettings] = useState<RemoteSettings | null>(remoteSettingsService.remoteSettings);

  // ComponentDidMount
  useEffect(() => {
    const listenerKey = getId();

    const innerHandler = (r: RemoteSettings) => {
      setRemoteSettings(r);
    };

    remoteSettingsService.addRemoteSettingsListener(listenerKey, innerHandler);
    
    // ComponentWillUnmount
    return () => {
      remoteSettingsService.removeRemoteSettingsListener(listenerKey);
    };
  }, []);

  return remoteSettings;
};