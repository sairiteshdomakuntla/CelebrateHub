import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-[#1C1C1E]",
  secondary: "bg-white border border-[#E0DED8]",
  ghost: "bg-transparent",
  danger: "bg-[#B3261E]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-2.5 min-h-[40px] rounded-xl",
  md: "px-5 py-3.5 min-h-[52px] rounded-xl",
  lg: "px-6 py-4 min-h-[56px] rounded-xl",
};

const labelVariant: Record<Variant, string> = {
  primary: "text-white font-semibold",
  secondary: "text-[#1C1C1E] font-semibold",
  ghost: "text-[#6E6E73] font-medium",
  danger: "text-white font-semibold",
};

const labelSize: Record<Size, string> = {
  sm: "text-[13px]",
  md: "text-[15px]",
  lg: "text-[16px]",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      className={[
        "items-center justify-center flex-row",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50" : "",
      ].join(" ")}
      style={[
        variant === "primary"
          ? {
              shadowColor: "#1C1C1E",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 2,
            }
          : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" ? "#1C1C1E" : "#FFFFFF"}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && <View className="mr-0.5">{icon}</View>}
          <Text
            className={[
              "tracking-[0.1px]",
              labelVariant[variant],
              labelSize[size],
            ].join(" ")}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
