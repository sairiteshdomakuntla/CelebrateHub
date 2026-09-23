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
    ? "border-[#B3261E]"
    : focused
    ? "border-[#1C1C1E]"
    : "border-[#E3E1DC]";

  return (
    <View className="mb-4" style={containerStyle}>
      <Text className="text-[#3A3A3C] text-[13px] font-semibold mb-2">
        {label}
      </Text>

      <View
        className={`flex-row items-center bg-white rounded-xl border-[1px] ${borderClass}`}
        style={
          focused && !error
            ? {
                shadowColor: "#1C1C1E",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 1,
              }
            : undefined
        }
      >
        {leftIcon && (
          <View className="pl-3.5 justify-center">{leftIcon}</View>
        )}

        <RNTextInput
          className={`flex-1 text-[#1C1C1E] text-[15px] py-3.5 ${leftIcon ? "pl-2 pr-4" : "px-4"}`}
          placeholderTextColor="#A7A7AB"
          secureTextEntry={isPassword && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          {...inputProps}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            className="px-4 py-3.5"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-[#6E6E73] text-[13px] font-semibold">
              {visible ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text className="text-[#B3261E] text-xs mt-1.5">{error}</Text>
      )}
      {!error && !!hint && (
        <Text className="text-[#A7A7AB] text-xs mt-1.5">{hint}</Text>
      )}
    </View>
  );
}
