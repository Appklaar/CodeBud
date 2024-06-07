import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { ApiKeyModal } from "./../ApiKeyModal/ApiKeyModal";
import { codebudConsoleWarn } from './../../../helpers/helperFunctions';

type InitModalProps = {
  onInit: (apiKey: string) => void;
};

type WrapperProps = {
  children: any;
  initModalProps?: InitModalProps;
};

type WrapperMethods = {
  showInitModal: () => void;
  hideInitModal: () => void;
};

const Wrapper: React.FC<WrapperProps> = forwardRef(({
  children,
  initModalProps
}, ref) => {
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);

  useImperativeHandle(ref, (): WrapperMethods => ({
    showInitModal: () => {
      setApiKeyModalVisible(true);
    },
    hideInitModal: () => {
      setApiKeyModalVisible(false);
    }
  }));

  const handleInitWithApiKey = (apiKey: string) => {
    setApiKeyModalVisible(false);

    if (!initModalProps) {
      codebudConsoleWarn("initModalProps missing. Make sure to pass it as props to Wrapper");
      return;
    }

    initModalProps.onInit(apiKey);
  }
  
  return (
    <>
      {children}

      <ApiKeyModal 
        visible={apiKeyModalVisible}
        onClose={() => setApiKeyModalVisible(false)}
        onApiKeyEntered={(key) => handleInitWithApiKey(key)}
      />
    </>
  );
});

Wrapper.defaultProps={}

export { Wrapper };