import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";

const { height } = Dimensions.get("window");

const ROLES = [
  {
    key: "customer",
    emoji: "🎉",
    title: "I'm Planning an Event",
    subtitle: "Find caterers, venues, photographers & more for your celebration",
    href: "/(auth)/register" as const,
    ctaLabel: "Create Account",
    secondaryHref: "/(auth)/login" as const,
    secondaryLabel: "Sign in instead",
  },
  {
    key: "provider",
    emoji: "🛎️",
    title: "I'm a Service Provider",
    subtitle: "Receive qualified leads from customers looking for your services",
    href: "/(auth)/login" as const,
    ctaLabel: "Provider Login",
    secondaryHref: null,
    secondaryLabel: null,
  },
  {
    key: "admin",
    emoji: "⚙️",
    title: "Admin Portal",
    subtitle: "Manage platform users, providers and platform settings",
    href: "/(auth)/login" as const,
    ctaLabel: "Admin Login",
    secondaryHref: null,
    secondaryLabel: null,
  },
];

function RoleCard({ role, index }: { role: (typeof ROLES)[0]; index: number }) {
  const router = useRouter();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(300 + index * 120, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      300 + index * 120,
      withSpring(0, { damping: 16, stiffness: 100 })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle} className="mb-3.5">
      <View className="bg-bg-card rounded-[18px] border border-border-subtle overflow-hidden">
        {/* Card body */}
        <TouchableOpacity
          activeOpacity={0.88}
          className="flex-row items-center p-[18px] gap-3.5"
          onPress={() => router.push(role.href as any)}
        >
          <Text className="text-3xl">{role.emoji}</Text>
          <View className="flex-1">
            <Text className="text-text-primary text-[15px] font-bold mb-[3px]">
              {role.title}
            </Text>
            <Text className="text-text-muted text-xs leading-[17px]">
              {role.subtitle}
            </Text>
          </View>
          <View className="w-7 h-7 rounded-full bg-rose-dim items-center justify-center">
            <Text className="text-rose-brand text-[14px] font-bold">→</Text>
          </View>
        </TouchableOpacity>

        {/* Card footer actions */}
        <View className="flex-row items-center px-[18px] py-3.5 gap-3 border-t border-border-subtle">
          <TouchableOpacity
            className="flex-1 bg-rose-brand rounded-[10px] py-[11px] items-center"
            onPress={() => router.push(role.href as any)}
            activeOpacity={0.85}
          >
            <Text className="text-bg text-[13px] font-bold tracking-[0.2px]">
              {role.ctaLabel}
            </Text>
          </TouchableOpacity>

          {role.secondaryHref && (
            <TouchableOpacity
              onPress={() => router.push(role.secondaryHref as any)}
              activeOpacity={0.7}
              className="px-1"
            >
              <Text className="text-text-muted text-[13px] font-medium">
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
  const headerTranslateY = useSharedValue(-20);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    headerTranslateY.value = withSpring(0, { damping: 18, stiffness: 90 });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      {/* Background blobs — only animated values need inline style */}
      <View
        className="absolute rounded-full bg-rose-brand opacity-[0.12]"
        style={{ width: 320, height: 320, top: -80, right: -80 }}
      />
      <View
        className="absolute rounded-full bg-purple-brand opacity-[0.12]"
        style={{ width: 240, height: 240, bottom: height * 0.15, left: -60 }}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo / Brand */}
        <Animated.View className="items-center mb-10" style={headerStyle}>
          <View
            className="w-[72px] h-[72px] rounded-[22px] bg-rose-brand items-center justify-center mb-4"
            style={{
              shadowColor: "#E8956D",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Text className="text-bg text-[26px] font-black tracking-tight">CH</Text>
          </View>
          <Text className="text-text-primary text-[30px] font-extrabold tracking-tight mb-2">
            CelebrateHub
          </Text>
          <Text className="text-text-muted text-[14px] text-center leading-[21px]">
            India's event services marketplace —{"\n"}connect, celebrate, create memories.
          </Text>
        </Animated.View>

        {/* Divider */}
        <View className="flex-row items-center mb-6 gap-3">
          <View className="flex-1 h-px bg-border-subtle" />
          <Text className="text-text-dim text-[11px] font-semibold tracking-[0.5px] uppercase">
            Who are you?
          </Text>
          <View className="flex-1 h-px bg-border-subtle" />
        </View>

        {/* Role cards */}
        <View>
          {ROLES.map((role, i) => (
            <RoleCard key={role.key} role={role} index={i} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
