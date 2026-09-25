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
  accent: "#F9EFE9",
  warning: "#FDF3E3",
  info: "#EAF0FB",
};
const TONE_ICON: Record<string, string> = {
  accent: "#9A3B26",
  warning: "#9A6A14",
  info: "#2F54B8",
};
const TONE_BORDER: Record<string, string> = {
  accent: "#EFD9CC",
  warning: "#F0DFB8",
  info: "#CCD9F2",
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
      <View className="bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden">
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
              <View className="bg-[#F4F2EE] self-start px-2.5 py-1 rounded-full mb-2 border border-[#E8E6E1]">
                <Text className="text-[#6E6E73] text-[11px] font-semibold">
                  {role.pill}
                </Text>
              </View>
              <Text className="text-[#1C1C1E] text-[17px] font-bold tracking-tight">
                {role.title}
              </Text>
              <Text className="text-[#6E6E73] text-[14px] leading-[20px] mt-1">
                {role.subtitle}
              </Text>
            </View>
            <View className="pt-1">
              <AppIcon name="chevron-right" size={16} color="#A7A7AB" />
            </View>
          </View>
          <Text className="text-[#A7A7AB] text-[12px] mt-3">
            {role.note}
          </Text>
        </TouchableOpacity>

        <View className="flex-row items-center px-5 py-4 gap-3 border-t border-[#EFEEEA] bg-[#FAFAF8]">
          <TouchableOpacity
            className="flex-1 bg-[#1C1C1E] rounded-xl py-3 items-center"
            onPress={() => router.push(role.href as any)}
            activeOpacity={0.85}
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
              <Text className="text-[#1C1C1E] text-[14px] font-semibold">
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
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingTop: 32, paddingBottom: 32, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View className="items-start mb-8" style={headerStyle}>
            <BrandMark size={52} />
            <Text className="text-[#1C1C1E] text-[32px] font-bold tracking-tight mt-5">
              CelebrateHub
            </Text>
            <Text className="text-[#6E6E73] text-[15px] leading-[22px] mt-2 max-w-[320px]">
              India event services marketplace. Book trusted vendors for weddings, birthdays and corporate events.
            </Text>
            <View className="flex-row items-center gap-4 mt-5">
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="check-circle" size={15} color="#1E7A3C" />
                <Text className="text-[#3A3A3C] text-[12px] font-medium">Verified vendors</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="star" size={14} color="#9A6A14" />
                <Text className="text-[#3A3A3C] text-[12px] font-medium">4.9 rated</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <AppIcon name="map-pin" size={15} color="#6E6E73" />
                <Text className="text-[#3A3A3C] text-[12px] font-medium">Pan-India</Text>
              </View>
            </View>
          </Animated.View>

          <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-widest mb-3">
            Continue as
          </Text>

          <View>
            {ROLES.map((role, i) => (
              <RoleCard key={role.key} role={role} index={i} />
            ))}
          </View>

          <Text className="text-[#A7A7AB] text-[12px] text-center mt-4 leading-[18px]">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
