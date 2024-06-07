import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { s } from './ApiKeyModalStyles';
import { CustomButton } from "./../CustomButton/CustomButton";
import { COLORS } from "./../../../constants/colors";
import { validateApiKey } from "./../../../constants/regex";
import { CONFIG } from "./../../../config";

type ApiKeyModalProps = {
  animationType?: "fade" | "none" | "slide";
  visible: boolean;
  onClose: () => void;
  onApiKeyEntered: (key: string) => void;
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  animationType,
  visible,
  onClose,
  onApiKeyEntered
}) => {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const onPressInit = () => {
    if (validateApiKey(apiKey))
      onApiKeyEntered(apiKey);
    else 
      setError("Wrong API Key format!");
  }
  
  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.modalContainer}>
        <View style={s.contentContainer}>
          <View style={s.modalHeader}>
            <Text style={s.boldText}>
              {CONFIG.PRODUCT_NAME}
            </Text>

            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.actionText}>
                {"Close"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.mainContent}>
            <View>
              <TextInput 
                placeholder={"Enter your API key"}
                style={s.textinput}
                placeholderTextColor={COLORS.emperor}
                value={apiKey}
                onChangeText={(t: string) => {
                  setApiKey(t);
                  setError("");
                }}
              />
              {!!error &&
                <Text style={s.errorText}>
                  {error}
                </Text>
              }
            </View>

            <View style={s?.bottomBtn}>
              <CustomButton 
                title={`Init ${CONFIG.PRODUCT_NAME}`}
                disabled={!apiKey}
                onPress={onPressInit}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

ApiKeyModal.defaultProps={
  animationType: "slide"
}

export { ApiKeyModal };