import React from "react";
import { View, Text, ViewStyle, StyleProp } from "react-native";
import { Feather } from "@expo/vector-icons";

export type AppIconName = React.ComponentProps<typeof Feather>["name"];

const ICON_FALLBACKS: Record<string, AppIconName> = {
  car: "truck",
  utensils: "coffee",
  sparkles: "star",
  brush: "edit-3",
  cake: "gift",
  "indian-rupee": "dollar-sign",
  rupee: "dollar-sign",
  currency: "dollar-sign",
  party: "gift",
  celebration: "gift",
  ring: "heart",
  wallet: "credit-card",
  laptop: "monitor",
};

export function resolveIconName(name: string): AppIconName {
  if (!name) return "circle";
  const lower = name.toLowerCase().trim();
  if (ICON_FALLBACKS[lower]) {
    return ICON_FALLBACKS[lower];
  }
  return (name as AppIconName) || "circle";
}

/**
 * App-wide icon component backed by bundled vector fonts.
 * Renders identically on Android, iOS and web — no native symbol
 * dependencies, no emojis.
 */
export function AppIcon({
  name,
  size = 18,
  color = "#FFFFFF",
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const iconName = resolveIconName(name);
  return (
    <View
      style={[
        {
          width: size + 4,
          height: size + 4,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Feather name={iconName} size={size} color={color} />
    </View>
  );
}

/** Small square tile used behind icons in list rows and cards. */
export function IconTile({
  name,
  tone = "neutral",
  size = 44,
}: {
  name: string;
  tone?: "neutral" | "dark" | "accent" | "success" | "warning" | "danger" | "info";
  size?: number;
}) {
  const tones: Record<string, { bg: string; icon: string; border: string }> = {
    neutral: { bg: "#2A2460", icon: "#B8B3E0", border: "#322C63" },
    dark: { bg: "#7C5CFF", icon: "#FFFFFF", border: "#7C5CFF" },
    accent: { bg: "#3D2F0F", icon: "#FFC53D", border: "#5A4510" },
    success: { bg: "#123B34", icon: "#6EE7B7", border: "#1A5447" },
    warning: { bg: "#3D2F0F", icon: "#FFC53D", border: "#5A4510" },
    danger: { bg: "#3F1420", icon: "#FF8FA3", border: "#5A1C2E" },
    info: { bg: "#1B2A55", icon: "#8FB4FF", border: "#263D6E" },
  };
  const t = tones[tone];
  const iconName = resolveIconName(name);
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
      <Feather name={iconName} size={21} color={t.icon} />
    </View>
  );
}

/** Brand monogram. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: "#7C5CFF",
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
