import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useAuthStore } from "@/store/auth.store";
import { authApi, adminApi, type AuthUser } from "@/lib/auth.api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ROLE_BADGE: Record<string, { label: string; badgeCls: string; textCls: string }> = {
  ADMIN:    { label: "Admin",    badgeCls: "bg-purple-500/20 border border-purple-500/30", textCls: "text-purple-400" },
  PROVIDER: { label: "Provider", badgeCls: "bg-amber-500/20 border border-amber-500/30",   textCls: "text-amber-400"  },
  CUSTOMER: { label: "Customer", badgeCls: "bg-sky-500/20 border border-sky-500/30",       textCls: "text-sky-400"    },
};

// ─── Action Card Component ───────────────────────────────────────────────────

function ActionCard({
  emoji,
  title,
  subtitle,
  badgeText,
  accent = false,
  onPress,
  delay = 0,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  accent?: boolean;
  onPress?: () => void;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-3">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className={`flex-row items-center gap-3.5 p-4 rounded-2xl border ${
          accent
            ? "bg-rose-brand/10 border-rose-brand/30"
            : "bg-bg-card border-border-subtle"
        }`}
      >
        <View
          className={`w-12 h-12 rounded-xl items-center justify-center ${
            accent ? "bg-rose-brand/20" : "bg-white/[0.06]"
          }`}
        >
          <Text className="text-2xl">{emoji}</Text>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text
              className={`text-[15px] font-bold ${
                accent ? "text-rose-brand" : "text-text-primary"
              }`}
            >
              {title}
            </Text>
            {badgeText && (
              <View className="bg-rose-brand/20 px-2 py-0.5 rounded-full">
                <Text className="text-rose-brand text-[10px] font-bold uppercase">
                  {badgeText}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-text-muted text-xs leading-4">{subtitle}</Text>
        </View>

        <Text className="text-text-dim text-lg font-bold">›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────────────

function StatCard({
  emoji,
  value,
  label,
  loading = false,
}: {
  emoji: string;
  value: string | number;
  label: string;
  loading?: boolean;
}) {
  return (
    <View className="flex-1 bg-bg-card border border-border-subtle rounded-2xl p-3.5 items-center gap-1">
      <Text className="text-2xl">{emoji}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#E8956D" />
      ) : (
        <Text className="text-text-primary text-xl font-black">{value}</Text>
      )}
      <Text className="text-text-dim text-[11px] text-center font-medium">{label}</Text>
    </View>
  );
}

// ─── Main Screen Component ───────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user: storeUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Admin stats
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [providersCount, setProvidersCount] = useState<number | null>(null);
  const [customersCount, setCustomersCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const headerOpacity = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  const user = profile ?? storeUser;
  const role = user?.role ?? "CUSTOMER";
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.CUSTOMER;

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
          const provs = res.users.filter((u) => u.role === "PROVIDER").length;
          const custs = res.users.filter((u) => u.role === "CUSTOMER").length;
          setProvidersCount(provs);
          setCustomersCount(custs);
        } catch {
          // silently continue
        } finally {
          setLoadingStats(false);
        }
      }
    } catch {
      // offline or unauth
    }
  }, []);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Sign out confirmation dialog
  function confirmLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of CelebrateHub?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace("/(auth)/welcome" as any);
            } catch (err: any) {
              Alert.alert("Logout Error", err.message ?? "Could not complete logout");
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      {/* Background ambient lighting */}
      <View
        className="absolute rounded-full bg-rose-brand opacity-[0.06]"
        style={{ width: 340, height: 340, top: -100, right: -80 }}
      />
      <View
        className="absolute rounded-full bg-purple-brand opacity-[0.05]"
        style={{ width: 280, height: 280, bottom: 80, left: -90 }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E8956D"
              colors={["#E8956D"]}
            />
          }
        >
          {/* ── Top Header ────────────────────────────────────────── */}
          <Animated.View
            style={headerStyle}
            className="flex-row items-center justify-between pt-4 mb-6"
          >
            {/* Left: Greeting & Profile Trigger */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/profile" as any)}
              className="flex-row items-center gap-3 flex-1 mr-3"
            >
              <View className="w-11 h-11 rounded-full bg-rose-brand/20 border border-rose-brand/40 items-center justify-center">
                <Text className="text-rose-brand font-black text-lg">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-text-muted text-[13px]">{getGreeting()} 👋</Text>
                <Text
                  className="text-text-primary text-[20px] font-extrabold tracking-tight"
                  numberOfLines={1}
                >
                  {user?.name?.split(" ")[0] ?? "Welcome"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Right: Role Badge & Sign Out Button */}
            <View className="flex-row items-center gap-2">
              <View className={`px-3 py-1.5 rounded-full ${badge.badgeCls}`}>
                <Text className={`text-xs font-bold ${badge.textCls}`}>
                  {badge.label}
                </Text>
              </View>

              <TouchableOpacity
                onPress={confirmLogout}
                disabled={loggingOut}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 items-center justify-center"
                accessibilityLabel="Sign out"
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text className="text-red-400 text-base font-bold">⎋</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Hero Banner ───────────────────────────────────────── */}
          <View
            className="rounded-3xl p-6 mb-6 overflow-hidden relative"
            style={{
              backgroundColor: "#161212",
              borderWidth: 1,
              borderColor: "rgba(232,149,109,0.25)",
            }}
          >
            {/* Glow blob */}
            <View
              className="absolute rounded-full bg-rose-brand opacity-15"
              style={{ width: 180, height: 180, top: -50, right: -50 }}
            />

            <View className="flex-row items-center justify-between mb-4">
              <View
                className="w-12 h-12 rounded-2xl bg-rose-brand items-center justify-center"
                style={{
                  shadowColor: "#E8956D",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text className="text-bg text-xl font-black">CH</Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-emerald-400 text-[11px] font-semibold">
                  API Connected
                </Text>
              </View>
            </View>

            <Text className="text-text-primary text-xl font-extrabold mb-1">
              {role === "ADMIN"
                ? "Admin Command Center"
                : role === "PROVIDER"
                ? "Service Provider Portal"
                : "CelebrateHub Marketplace"}
            </Text>
            <Text className="text-text-muted text-xs leading-5">
              {role === "ADMIN"
                ? "Full platform oversight, role-based user management, provider verification, and system control."
                : role === "PROVIDER"
                ? "Receive qualified leads, manage your business profile, and accept booking requests."
                : "Discover and book trusted caterers, photographers, venues, and decorators for your special day."}
            </Text>
          </View>

          {/* ── Live Stats Grid ───────────────────────────────────── */}
          <View className="flex-row gap-2.5 mb-6">
            {role === "ADMIN" ? (
              <>
                <StatCard
                  emoji="👥"
                  value={totalUsers !== null ? totalUsers : "5"}
                  label="Total Users"
                  loading={loadingStats}
                />
                <StatCard
                  emoji="🛎️"
                  value={providersCount !== null ? providersCount : "2"}
                  label="Providers"
                  loading={loadingStats}
                />
                <StatCard
                  emoji="🎉"
                  value={customersCount !== null ? customersCount : "2"}
                  label="Customers"
                  loading={loadingStats}
                />
              </>
            ) : role === "PROVIDER" ? (
              <>
                <StatCard emoji="📥" value="12" label="New Leads" />
                <StatCard emoji="✅" value="8" label="Bookings" />
                <StatCard emoji="⭐" value="4.9" label="Rating" />
              </>
            ) : (
              <>
                <StatCard emoji="🎉" value="3" label="My Events" />
                <StatCard emoji="🛎️" value="4" label="Bookings" />
                <StatCard emoji="💌" value="45" label="Invited" />
              </>
            )}
          </View>

          {/* ── Section Title: Quick Actions ───────────────────────── */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 h-px bg-border-subtle" />
            <Text className="text-text-dim text-[11px] font-bold uppercase tracking-wider">
              Management & Operations
            </Text>
            <View className="flex-1 h-px bg-border-subtle" />
          </View>

          {/* ── Role Specific Operations ──────────────────────────── */}
          {role === "ADMIN" && (
            <>
              <ActionCard
                emoji="👥"
                title="Manage All Users"
                subtitle="View, create, change status (ACTIVE/SUSPENDED), and delete accounts"
                badgeText="Admin"
                accent
                delay={150}
                onPress={() => router.push("/admin-users" as any)}
              />
              <ActionCard
                emoji="👤"
                title="My Admin Profile"
                subtitle="View security details, tokens, and account information"
                delay={250}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionCard
                emoji="🛡️"
                title="Provider Verifications"
                subtitle="Review vendor business licenses, KYC, and documents"
                delay={350}
                onPress={() =>
                  Alert.alert(
                    "Provider Verifications",
                    "Provider verification queue is up to date. You can also manage providers in Manage All Users."
                  )
                }
              />
              <ActionCard
                emoji="📊"
                title="Platform Activity"
                subtitle="Monitor active leads, quotes, and event transactions"
                delay={450}
                onPress={() =>
                  Alert.alert(
                    "Platform Activity",
                    "Database and server are operating normally. Real-time event analytics active."
                  )
                }
              />
            </>
          )}

          {role === "PROVIDER" && (
            <>
              <ActionCard
                emoji="📥"
                title="Qualified Leads"
                subtitle="Accept incoming event requests on first-come basis"
                accent
                delay={150}
                onPress={() =>
                  Alert.alert("Leads", "You have no pending inquiries right now.")
                }
              />
              <ActionCard
                emoji="👤"
                title="Business Profile & Portfolio"
                subtitle="Manage pricing, services offered, and bio"
                delay={250}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionCard
                emoji="📅"
                title="Booking Calendar"
                subtitle="Track confirmed event dates and scheduled times"
                delay={350}
                onPress={() =>
                  Alert.alert("Calendar", "Your upcoming bookings will appear here.")
                }
              />
              <ActionCard
                emoji="⭐"
                title="Reviews & Ratings"
                subtitle="See testimonials from satisfied celebration hosts"
                delay={450}
                onPress={() =>
                  Alert.alert("Reviews", "Your provider profile currently has a 4.9 rating!")
                }
              />
            </>
          )}

          {role === "CUSTOMER" && (
            <>
              <ActionCard
                emoji="🎉"
                title="Plan New Event"
                subtitle="Birthday, Wedding, Anniversary, or Corporate Gala"
                accent
                delay={150}
                onPress={() =>
                  Alert.alert(
                    "Plan Event",
                    "Event wizard is ready. Choose your category, location, and guest count."
                  )
                }
              />
              <ActionCard
                emoji="🔍"
                title="Find Event Providers"
                subtitle="Browse top-rated caterers, decorators, and photographers"
                delay={250}
                onPress={() =>
                  Alert.alert(
                    "Find Providers",
                    "Explore verified local providers tailored to your budget."
                  )
                }
              />
              <ActionCard
                emoji="👤"
                title="My Profile & Security"
                subtitle="Manage phone, email, and password credentials"
                delay={350}
                onPress={() => router.push("/profile" as any)}
              />
              <ActionCard
                emoji="💌"
                title="Send Guest Invitations"
                subtitle="WhatsApp, SMS, and Email RSVP management"
                delay={450}
                onPress={() =>
                  Alert.alert(
                    "Guest Invitations",
                    "Digital invitation templates are ready for dispatch."
                  )
                }
              />
            </>
          )}

          {/* ── Sign Out Direct Action ───────────────────────────── */}
          <View className="mt-4 mb-6">
            <TouchableOpacity
              onPress={confirmLogout}
              disabled={loggingOut}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-red-500/10 border border-red-500/25"
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Text className="text-red-400 text-sm font-bold">⎋</Text>
                  <Text className="text-red-400 text-sm font-bold">Sign Out of CelebrateHub</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Footer ────────────────────────────────────────────── */}
          <View className="items-center gap-1.5 pt-2">
            <Text className="text-text-dim text-xs text-center">
              Signed in as{" "}
              <Text className="text-rose-brand font-semibold">
                {user?.email ?? user?.phone ?? "User"}
              </Text>
            </Text>
            <Text className="text-text-dim text-[11px]">
              CelebrateHub • Mobile Platform v1.0.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
