import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { AppIcon, type AppIconName } from "@/components/ui/pro-icon";
import { useAuthStore } from "@/store/auth.store";
import { authApi, adminApi, type AuthUser } from "@/lib/auth.api";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ROLE_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ADMIN: { label: "Admin", bg: "#EAF0FB", text: "#2F54B8", border: "#CCD9F2" },
  PROVIDER: { label: "Provider", bg: "#FDF3E3", text: "#8A5E10", border: "#F0DFB8" },
  CUSTOMER: { label: "Customer", bg: "#EAF6EE", text: "#1E7A3C", border: "#CDE8D5" },
};

type IconName = AppIconName;

function ActionRow({
  icon,
  tone,
  title,
  subtitle,
  badge,
  onPress,
  delay = 0,
}: {
  icon: IconName;
  tone: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress?: () => void;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 350 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const tones: Record<string, { bg: string; icon: string; border: string }> = {
    dark: { bg: "#1C1C1E", icon: "#FFFFFF", border: "#1C1C1E" },
    neutral: { bg: "#F1EFEC", icon: "#3A3A3C", border: "#E8E6E1" },
    accent: { bg: "#F9EFE9", icon: "#9A3B26", border: "#EFD9CC" },
    success: { bg: "#EAF6EE", icon: "#1E7A3C", border: "#CDE8D5" },
    info: { bg: "#EAF0FB", icon: "#2F54B8", border: "#CCD9F2" },
    warning: { bg: "#FDF3E3", icon: "#8A5E10", border: "#F0DFB8" },
  };
  const t = tones[tone] ?? tones.neutral;

  return (
    <Animated.View style={animatedStyle} className="mb-2.5">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        className="flex-row items-center bg-white rounded-2xl border border-[#E8E6E1] p-4"
      >
        <View
          style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: t.bg, borderWidth: 1, borderColor: t.border,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <AppIcon name={icon} size={20} color={t.icon} />
        </View>

        <View className="flex-1 ml-3.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-[#1C1C1E] text-[15px] font-semibold">
              {title}
            </Text>
            {badge && (
              <View className="bg-[#1C1C1E] px-2 py-0.5 rounded-full">
                <Text className="text-white text-[10px] font-semibold uppercase tracking-wide">
                  {badge}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-[#6E6E73] text-[13px] leading-[18px] mt-0.5">{subtitle}</Text>
        </View>

        <AppIcon name="chevron-right" size={15} color="#C7C7CC" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function StatCard({
  icon,
  value,
  label,
  loading = false,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  loading?: boolean;
}) {
  return (
    <View className="flex-1 bg-white border border-[#E8E6E1] rounded-2xl p-4">
      <AppIcon name={icon} size={18} color="#6E6E73" />
      {loading ? (
        <ActivityIndicator size="small" color="#1C1C1E" style={{ marginTop: 10 }} />
      ) : (
        <Text className="text-[#1C1C1E] text-[22px] font-bold mt-2 tracking-tight">{value}</Text>
      )}
      <Text className="text-[#6E6E73] text-[12px] mt-0.5">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user: storeUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [providersCount, setProvidersCount] = useState<number | null>(null);
  const [customersCount, setCustomersCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  // True once the profile has been resolved at least once. When the store has
  // no cached user (fresh install / cleared storage), we hold a loader instead
  // of rendering a default-role dashboard that would visibly flip moments later.
  const [resolving, setResolving] = useState(!storeUser);

  const headerOpacity = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  const user = profile ?? storeUser;
  const role = user?.role ?? "CUSTOMER";
  const roleMeta = ROLE_META[role] ?? ROLE_META.CUSTOMER;

  const loadData = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setProfile(me);
      useAuthStore.getState().setUser(me);

      if (me.role === "ADMIN") {
        setLoadingStats(true);
        try {
          const res = await adminApi.listUsers({ page: 1 });
          setTotalUsers(res.pagination.total);
          setProvidersCount(res.users.filter((u) => u.role === "PROVIDER").length);
          setCustomersCount(res.users.filter((u) => u.role === "CUSTOMER").length);
        } catch {
          // ignore
        } finally {
          setLoadingStats(false);
        }
      }
    } catch {
      // offline — fall back to the cached store user
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400 });
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  function confirmLogout() {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of CelebrateHub?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace("/(auth)/welcome" as any);
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Could not sign out");
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  if (resolving && !user) {
    return (
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center">
        <StatusBar style="dark" />
        <View className="w-14 h-14 rounded-2xl bg-[#1C1C1E] items-center justify-center mb-4">
          <Text className="text-white text-[18px] font-bold">CH</Text>
        </View>
        <ActivityIndicator size="small" color="#1C1C1E" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1C1C1E"
            />
          }
        >
          <Animated.View
            style={headerStyle}
            className="flex-row items-center justify-between pt-4 mb-5"
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/profile" as any)}
              className="flex-row items-center gap-3 flex-1 mr-3"
            >
              <View className="w-11 h-11 rounded-full bg-[#1C1C1E] items-center justify-center">
                <Text className="text-white font-bold text-[17px]">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[#6E6E73] text-[13px]">{getGreeting()}</Text>
                <Text
                  className="text-[#1C1C1E] text-[20px] font-bold tracking-tight"
                  numberOfLines={1}
                >
                  {user?.name?.split(" ")[0] ?? "Welcome"}
                </Text>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <View
                style={{ backgroundColor: roleMeta.bg, borderColor: roleMeta.border }}
                className="px-3 py-1.5 rounded-full border"
              >
                <Text style={{ color: roleMeta.text }} className="text-[12px] font-semibold">
                  {roleMeta.label}
                </Text>
              </View>
              <TouchableOpacity
                onPress={confirmLogout}
                disabled={loggingOut}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-white border border-[#E8E6E1] items-center justify-center"
                accessibilityLabel="Sign out"
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#1C1C1E" />
                ) : (
                  <AppIcon name="log-out" size={17} color="#3A3A3C" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Summary card */}
          <View className="rounded-2xl bg-[#1C1C1E] p-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-[10px] bg-white/10 items-center justify-center">
                  <Text className="text-white text-[13px] font-bold">CH</Text>
                </View>
                <Text className="text-white/70 text-[12px] font-medium">
                  {role === "ADMIN" ? "Operations overview" : role === "PROVIDER" ? "Business overview" : "CelebrateHub"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-[#2E7D46]/25 border border-[#2E7D46]/40 px-2.5 py-1 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                <Text className="text-[#B7E4C7] text-[11px] font-semibold">
                  Systems normal
                </Text>
              </View>
            </View>

            <Text className="text-white text-[22px] font-bold tracking-tight">
              {role === "ADMIN"
                ? "Admin command centre"
                : role === "PROVIDER"
                ? "Provider workspace"
                : "Plan your next celebration"}
            </Text>
            <Text className="text-white/60 text-[13px] leading-[19px] mt-1.5">
              {role === "ADMIN"
                ? "User management, provider verification and platform controls in one place."
                : role === "PROVIDER"
                ? "Track incoming leads, manage your profile and confirm bookings."
                : "Browse verified caterers, photographers, venues and decorators."}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-2.5 mb-6">
            {role === "ADMIN" ? (
              <>
                <StatCard icon="users" value={totalUsers ?? "—"} label="Total users" loading={loadingStats} />
                <StatCard icon="briefcase" value={providersCount ?? "—"} label="Providers" loading={loadingStats} />
                <StatCard icon="user" value={customersCount ?? "—"} label="Customers" loading={loadingStats} />
              </>
            ) : role === "PROVIDER" ? (
              <>
                <StatCard icon="inbox" value="12" label="New leads" />
                <StatCard icon="check-circle" value="8" label="Bookings" />
                <StatCard icon="star" value="4.9" label="Rating" />
              </>
            ) : (
              <>
                <StatCard icon="calendar" value="3" label="My events" />
                <StatCard icon="bookmark" value="4" label="Bookings" />
                <StatCard icon="mail" value="45" label="Invites sent" />
              </>
            )}
          </View>

          <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-widest mb-3">
            {role === "ADMIN" ? "Management" : "Quick actions"}
          </Text>

          {role === "ADMIN" && (
            <>
              <ActionRow
                icon="users" tone="dark" title="Manage users" badge="Admin"
                subtitle="Search, create, suspend and delete accounts"
                delay={80}
                onPress={() => router.push("/admin-users" as any)}
              />
              <ActionRow
                icon="user" tone="neutral" title="My profile"
                subtitle="Account details and security"
                delay={140}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionRow
                icon="check-circle" tone="success" title="Provider verifications"
                subtitle="Review licences, KYC and documents"
                delay={200}
                onPress={() => Alert.alert("Verifications", "The verification queue is up to date.")}
              />
              <ActionRow
                icon="bar-chart-2" tone="info" title="Platform activity"
                subtitle="Leads, quotes and transactions"
                delay={260}
                onPress={() => Alert.alert("Activity", "All systems operating normally.")}
              />
            </>
          )}

          {role === "PROVIDER" && (
            <>
              <ActionRow
                icon="inbox" tone="dark" title="Qualified leads"
                subtitle="Review incoming event requests"
                delay={80}
                onPress={() => Alert.alert("Leads", "You have no pending enquiries right now.")}
              />
              <ActionRow
                icon="briefcase" tone="neutral" title="Business profile"
                subtitle="Pricing, services and portfolio"
                delay={140}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionRow
                icon="calendar" tone="neutral" title="Booking calendar"
                subtitle="Confirmed dates and schedules"
                delay={200}
                onPress={() => Alert.alert("Calendar", "Your upcoming bookings will appear here.")}
              />
              <ActionRow
                icon="star" tone="warning" title="Reviews"
                subtitle="Client feedback and ratings"
                delay={260}
                onPress={() => Alert.alert("Reviews", "Your profile holds a 4.9 rating.")}
              />
            </>
          )}

          {role === "CUSTOMER" && (
            <>
              <ActionRow
                icon="plus-circle" tone="dark" title="Plan new event"
                subtitle="Wedding, birthday, anniversary, corporate"
                delay={80}
                onPress={() => Alert.alert("Plan event", "Choose a category, location and guest count to begin.")}
              />
              <ActionRow
                icon="search" tone="neutral" title="Find providers"
                subtitle="Caterers, decorators, photographers"
                delay={140}
                onPress={() => Alert.alert("Providers", "Verified local providers matched to your budget.")}
              />
              <ActionRow
                icon="user" tone="neutral" title="Profile and security"
                subtitle="Contact details and password"
                delay={200}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionRow
                icon="mail" tone="neutral" title="Guest invitations"
                subtitle="WhatsApp, SMS and email RSVPs"
                delay={260}
                onPress={() => Alert.alert("Invitations", "Invitation templates are ready to send.")}
              />
            </>
          )}

          <TouchableOpacity
            onPress={confirmLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white border border-[#EAD9D2] mt-3"
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#B3261E" />
            ) : (
              <View className="flex-row items-center gap-2">
                <AppIcon name="log-out" size={16} color="#B3261E" />
                <Text className="text-[#B3261E] text-[14px] font-semibold">Sign out</Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="items-center mt-6">
            <Text className="text-[#A7A7AB] text-[12px]">
              Signed in as {user?.email ?? user?.phone ?? "user"}
            </Text>
            <Text className="text-[#C7C7CC] text-[11px] mt-1">
              CelebrateHub · v1.0.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

