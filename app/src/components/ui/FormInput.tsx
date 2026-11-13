import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  Animated,
} from "react-native";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function FormInput({
  label,
  error,
  hint,
  isPassword = false,
  containerStyle,
  leftIcon,
  rightAction,
  onFocus,
  onBlur,
  ...inputProps
}: FormInputProps) {
  const [visible, setVisible] = React.useState(false);

  /**
   * Use Animated.Value instead of useState for focus tracking.
   *
   * With useState, calling setFocused(true) triggers a React re-render
   * that changes the container View's className and style. On iOS, this
   * layout recalculation happens during the keyboard opening animation
   * and causes the keyboard to immediately dismiss.
   *
   * Animated.Value drives the border/shadow change directly on the native
   * side via setNativeProps — zero React re-renders, zero layout passes
   * from React's side, keyboard stays open.
   */
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(
    (e: any) => {
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
      onFocus?.(e);
    },
    [onFocus, focusAnim]
  );

  const handleBlur = useCallback(
    (e: any) => {
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
      onBlur?.(e);
    },
    [onBlur, focusAnim]
  );

  const borderColor = error
    ? "#FF8FA3"
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#322C63", "#7C5CFF"],
      });

  const shadowOpacity = error
    ? 0
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.2],
      });

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            color: "#B8B3E0",
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        {rightAction}
      </View>

      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1E1A3F",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: borderColor as any,
          shadowColor: "#7C5CFF",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shadowOpacity as any,
          shadowRadius: 8,
          elevation: 1,
        }}
      >
        {leftIcon && (
          <View style={{ paddingLeft: 14, justifyContent: "center" }}>
            {leftIcon}
          </View>
        )}

        <RNTextInput
          style={{
            flex: 1,
            color: "#FFFFFF",
            fontSize: 15,
            paddingVertical: 14,
            paddingLeft: leftIcon ? 8 : 16,
            paddingRight: isPassword ? 0 : 16,
          }}
          placeholderTextColor="#7C77A6"
          secureTextEntry={isPassword && !visible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          {...inputProps}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={{ paddingHorizontal: 16, paddingVertical: 14 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: "#B8B3E0", fontSize: 13, fontWeight: "600" }}>
              {visible ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {!!error && (
        <Text style={{ color: "#FF8FA3", fontSize: 12, marginTop: 6 }}>
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text style={{ color: "#7C77A6", fontSize: 12, marginTop: 6 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}
