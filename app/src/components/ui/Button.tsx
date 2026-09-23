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
  primary: "bg-rose-brand",
  secondary: "bg-transparent border border-rose-brand",
  ghost:    "bg-transparent",
  danger:   "bg-red-500",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-[18px] py-[10px] min-h-[40px] rounded-xl",
  md: "px-6 py-[14px] min-h-[52px] rounded-[14px]",
  lg: "px-8 py-[18px] min-h-[60px] rounded-[14px]",
};

const labelVariant: Record<Variant, string> = {
  primary:   "text-bg font-bold",
  secondary: "text-rose-brand font-bold",
  ghost:     "text-text-muted font-semibold",
  danger:    "text-white font-bold",
};

const labelSize: Record<Size, string> = {
  sm: "text-[13px]",
  md: "text-[15px]",
  lg: "text-[17px]",
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
      activeOpacity={0.82}
      className={[
        "items-center justify-center flex-row",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-40" : "",
      ].join(" ")}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#0D0D0D" : "#E8956D"}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon && <View className="mr-0.5">{icon}</View>}
          <Text
            className={[
              "tracking-[0.3px]",
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
