import React, { useState } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from "react-native";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export function FormInput({
  label,
  error,
  hint,
  isPassword = false,
  containerStyle,
  leftIcon,
  ...inputProps
}: FormInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? "border-red-500"
    : focused
    ? "border-rose-brand"
    : "border-border-subtle";

  return (
    <View className="mb-4" style={containerStyle}>
      <Text className="text-text-secondary text-[13px] font-semibold tracking-[0.5px] uppercase mb-2">
        {label}
      </Text>

      <View
        className={`flex-row items-center bg-bg-input rounded-xl border-[1.5px] overflow-hidden ${borderClass}`}
      >
        {leftIcon && (
          <View className="pl-3.5 justify-center">{leftIcon}</View>
        )}

        <RNTextInput
          className={`flex-1 text-text-primary text-[15px] py-3.5 ${leftIcon ? "pl-2 pr-4" : "px-4"}`}
          placeholderTextColor="#4B4B4B"
          secureTextEntry={isPassword && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...inputProps}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            className="px-3.5 py-3.5"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-rose-brand text-[13px] font-semibold">
              {visible ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text className="text-text-error text-xs mt-1.5 font-medium">{error}</Text>
      )}
      {!error && !!hint && (
        <Text className="text-text-dim text-xs mt-1.5">{hint}</Text>
      )}
    </View>
  );
}
