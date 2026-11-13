import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { BrandMark, AppIcon } from "@/components/ui/pro-icon";

const ROLES = [
  {
    key: "customer",
    icon: "user" as const,
    tone: "accent" as const,
    pill: "Public registration",
    title: "Plan an event",
    subtitle: "Find caterers, venues, photographers and more for your celebration.",
    href: "/(auth)/register" as const,
    ctaLabel: "Create account",
    secondaryHref: "/(auth)/login?role=customer" as any,
    secondaryLabel: "Sign in",
    note: "Instant signup for customers and hosts.",
  },
  {
    key: "provider",
    icon: "briefcase" as const,
    tone: "warning" as const,
    pill: "Vendor Partner",
    title: "Offer services",
    subtitle: "Grow your business and receive real-time leads from celebration hosts.",
    href: "/(auth)/register?role=provider" as any,
    ctaLabel: "Join as Vendor",
    secondaryHref: "/(auth)/login?role=provider" as any,
    secondaryLabel: "Vendor sign in",
    note: "Instant onboarding: set up your business profile and services.",
  },
  {
    key: "admin",
    icon: "shield" as const,
    tone: "info" as const,
    pill: "Restricted",
    title: "Manage platform",
    subtitle: "Manage users, providers and platform settings.",
    href: "/(auth)/login?role=admin" as any,
    ctaLabel: "Admin sign in",
    secondaryHref: null,
    secondaryLabel: null,
    note: "Authorised administrators and staff only.",
  },
];

const TONE_BG: Record<string, string> = {
  accent: "#3D2F0F",
  warning: "#3D2F0F",
  info: "#1B2A55",
};
const TONE_ICON: Record<string, string> = {
  accent: "#FFC53D",
  warning: "#FFC53D",
  info: "#8FB4FF",
};
const TONE_BORDER: Record<string, string> = {
  accent: "#5A4510",
  warning: "#5A4510",
  info: "#263D6E",
};

function RoleCard({ role, index }: { role: (typeof ROLES)[0]; index: number }) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(150 + index * 100, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(150 + index * 100, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle} className="mb-3">
      <View className="bg-[#1E1A3F] rounded-2xl border border-[#322C63] overflow-hidden">
        <TouchableOpacity
          activeOpacity={0.85}
          className="p-5"
          onPress={() => router.push(role.href as any)}
        >
          <View className="flex-row items-start gap-4">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: TONE_BG[role.tone],
                borderWidth: 1,
                borderColor: TONE_BORDER[role.tone],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name={role.icon} size={22} color={TONE_ICON[role.tone]} />
            </View>
            <View className="flex-1">
              <View className="bg-[#2A2460] self-start px-2.5 py-1 rounded-full mb-2 border border-[#322C63]">
                <Text className="text-[#B8B3E0] text-[11px] font-semibold">
                  {role.pill}
                </Text>
              </View>
              <Text className="text-white text-[17px] font-bold tracking-tight">
                {role.title}
              </Text>
              <Text className="text-[#B8B3E0] text-[14px] leading-[20px] mt-1">
                {role.subtitle}
              </Text>
            </View>
            <View className="pt-1">
              <AppIcon name="chevron-right" size={16} color="#7C77A6" />
            </View>
          </View>
          <Text className="text-[#7C77A6] text-[12px] mt-3">
            {role.note}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center px-5 py-4 gap-3 border-t border-[#322C63] bg-[#17143A]">
          <TouchableOpacity
            className="flex-1 bg-[#7C5CFF] rounded-xl py-3 items-center"
            onPress={() => router.push(role.href as any)}
            activeOpacity={0.85}
            style={{
              shadowColor: "#7C5CFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text className="text-white text-[14px] font-semibold">
              {role.ctaLabel}
            </Text>
          </TouchableOpacity>

          {role.secondaryHref && (
            <TouchableOpacity
              onPress={() => router.push(role.secondaryHref as any)}
              activeOpacity={0.7}
              className="px-2"
            >
              <Text className="text-[#B8B3E0] text-[14px] font-semibold">
                {role.secondaryLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingTop: 32, paddingBottom: 32, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View className="items-start mb-8" style={headerStyle}>
            <BrandMark size={52} />
            <Text className="text-white text-[32px] font-bold tracking-tight mt-5">
              CelebrateHub
            </Text>
            <Text className="text-[#B8B3E0] text-[15px] leading-[22px] mt-2 max-w-[320px]">
              India event services marketplace. Book trusted vendors for weddings, birthdays and corporate events.
            </Text>
            <View className="flex-row items-center gap-4 mt-5">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="check-circle" size={15} color="#6EE7B7" />
                <Text className="text-[#B8B3E0] text-[12px] font-medium">Verified vendors</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="star" size={14} color="#FFC53D" />
                <Text className="text-[#B8B3E0] text-[12px] font-medium">Ratings & reviews</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="map-pin" size={15} color="#B8B3E0" />
                <Text className="text-[#B8B3E0] text-[12px] font-medium">Pan-India</Text>
              </View>
            </View>
          </Animated.View>

          <Text className="text-[#7C77A6] text-[12px] font-semibold uppercase tracking-widest mb-3">
            Continue as
          </Text>

          <View>
            {ROLES.map((role, i) => (
              <RoleCard key={role.key} role={role} index={i} />
            ))}
          </View>

          <Text className="text-[#7C77A6] text-[12px] text-center mt-4 leading-[18px]">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
