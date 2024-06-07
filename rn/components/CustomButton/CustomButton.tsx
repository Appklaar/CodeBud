import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { s } from "./CustomButtonStyles";
import { COLORS } from "./../../../constants/colors";

type CustomButtonProps = {
  title?: string;
  spinner?: boolean;
  spinnerSize?: "large" | "small";
  bgColorActive?: string;
  bgColorUnactive?: string;
  titleColor?: string;
  spinnerColor?: string;
  disabled?: boolean;
  borderWidth?: number;
  borderRadius?: number;
  borderColorActive?: string;
  borderColorUnactive?: string;
  onPress?: () => void;
};

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  spinner,
  spinnerSize,
  bgColorActive,
  bgColorUnactive,
  titleColor,
  spinnerColor,
  disabled,
  borderWidth,
  borderRadius,
  borderColorActive,
  borderColorUnactive,
  onPress
}) => {
  
  return (
    <TouchableOpacity
      style={[
        s.button, {
          backgroundColor: disabled? bgColorUnactive: bgColorActive, 
          borderColor: disabled? borderColorUnactive: borderColorActive, 
          borderWidth: borderWidth,
          borderRadius: borderRadius,
        }
      ]}
      disabled={disabled || spinner}
      onPress={onPress}
    >
      {spinner ? (
        <ActivityIndicator color={spinnerColor} size={spinnerSize}/>
      ) : (
        title ?
          <View style={s.row}>
            <Text style={{color: titleColor, fontSize: 18, fontWeight: "600"}}>
              {title}
            </Text>
          </View>
        :
        null
      )}
    </TouchableOpacity>
  );
};

CustomButton.defaultProps={
  spinner: false,
  titleColor: COLORS.white,
  spinnerColor: COLORS.white,
  bgColorActive: COLORS.azure,
  bgColorUnactive: COLORS.dustyGray,
  disabled: false,
  borderWidth: 0,
  borderRadius: 60,
  spinnerSize: "large"
}

export { CustomButton };