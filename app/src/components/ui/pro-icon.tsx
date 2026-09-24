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
  color = "#1C1C1E",
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
    neutral: { bg: "#F1EFEC", icon: "#3A3A3C", border: "#E8E6E1" },
    dark: { bg: "#1C1C1E", icon: "#FFFFFF", border: "#1C1C1E" },
    accent: { bg: "#F9EFE9", icon: "#9A3B26", border: "#EFD9CC" },
    success: { bg: "#EAF6EE", icon: "#1E7A3C", border: "#CDE8D5" },
    warning: { bg: "#FDF3E3", icon: "#9A6A14", border: "#F0DFB8" },
    danger: { bg: "#FBECEB", icon: "#B3261E", border: "#F2C7C3" },
    info: { bg: "#EAF0FB", icon: "#2F54B8", border: "#CCD9F2" },
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
