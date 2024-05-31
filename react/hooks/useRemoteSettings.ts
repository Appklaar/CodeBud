import { useEffect, useState } from 'react';
import { ObjectT, RemoteSettings, RemoteSettingsEnv } from '../../types/types';
import { remoteSettingsService } from "./../../services/remoteSettingsService";
import { getId } from './../../helpers/random';

export const useRemoteSettings = (env: RemoteSettingsEnv): ObjectT<string> | null => {
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

  return remoteSettings?.[env] ?? null;
};