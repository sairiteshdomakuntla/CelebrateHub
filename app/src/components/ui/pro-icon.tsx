import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

type IconName = SymbolViewProps["name"];

/**
 * Professional system icon wrapper. Uses SF Symbols / Material symbols
 * via expo-symbols — no emojis anywhere in the UI.
 */
export function ProIcon({
  name,
  size = 18,
  color = "#1C1C1E",
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ width: size + 4, height: size + 4, alignItems: "center", justifyContent: "center" }, style]}>
      <SymbolView name={name} size={size} tintColor={color} />
    </View>
  );
}

/** Small square tile used behind icons in list rows and cards. */
export function IconTile({
  name,
  tone = "neutral",
  size = 44,
}: {
  name: IconName;
  tone?: "neutral" | "dark" | "accent" | "success" | "warning" | "danger" | "info";
  size?: number;
}) {
  const tones: Record<string, { bg: string; icon: string; border: string }> = {
    neutral: { bg: "#F1EFEC", icon: "#3A3A3C", border: "#E8E6E1" },
    dark: { bg: "#1C1C1E", icon: "#FFFFFF", border: "#1C1C1E" },
    accent: { bg: "#F9EFE9", icon: "#9A3B26", border: "#EFD9CC" },
    success: { bg: "#EAF6EE", icon: "#1E7A3C", border: "#CDE8D5" },
    warning: { bg: "#FDF3E3", icon: "#9A6A14", border: "#F0DFB8" },
    danger: { bg: "#FBECEB", icon: "#B3261E", border: "#F2C7C3" },
    info: { bg: "#EAF0FB", icon: "#2F54B8", border: "#CCD9F2" },
  };
  const t = tones[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: t.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SymbolView name={name} size={21} tintColor={t.icon} />
    </View>
  );
}

/** Brand monogram — replaces the old "CH" glow box. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: "#1C1C1E",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: size * 0.34,
          fontWeight: "700",
          letterSpacing: -0.5,
        }}
      >
        CH
      </Text>
    </View>
  );
}
