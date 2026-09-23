import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { authApi, type AuthUser } from "@/lib/auth.api";

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PROVIDER: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CUSTOMER: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  INACTIVE: "bg-slate-500/20 text-slate-400",
  SUSPENDED: "bg-red-500/20 text-red-400",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-white/[0.06]">
      <Text className="text-slate-500 text-sm">{label}</Text>
      <Text className="text-slate-200 text-sm font-medium">{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user: storeUser, logout, refreshToken } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const data = await authApi.getMe();
      setProfile(data);
      // Sync store user with fresh data
      useAuthStore.getState().setUser(data);
    } catch {
      // Fall back to store user if API fails
      setProfile(storeUser as any);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  }

  const user = profile ?? storeUser;
  const rolePill = ROLE_COLOR[user?.role ?? "CUSTOMER"] ?? ROLE_COLOR.CUSTOMER;
  const statusPill = STATUS_COLOR[user?.status ?? "ACTIVE"] ?? STATUS_COLOR.ACTIVE;

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#E8956D" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      {/* Background blob */}
      <View
        className="absolute rounded-full bg-rose-brand opacity-[0.07]"
        style={{ width: 300, height: 300, top: -80, right: -60 }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="items-center pt-8 pb-6">
            {/* Avatar */}
            <View
              className="w-24 h-24 rounded-full bg-rose-brand items-center justify-center mb-4"
              style={{ shadowColor: "#E8956D", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 }}
            >
              <Text className="text-bg text-3xl font-black">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>

            <Text className="text-text-primary text-2xl font-bold mb-1">{user?.name}</Text>
            <Text className="text-text-muted text-sm mb-3">{user?.email ?? user?.phone}</Text>

            {/* Role + status badges */}
            <View className="flex-row gap-2">
              <View className={`px-3 py-1 rounded-full border ${rolePill.split(" ").slice(0, 2).join(" ")} border-purple-500/30`}>
                <Text className={`text-xs font-semibold ${rolePill.split(" ")[1]}`}>
                  {user?.role}
                </Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${statusPill}`}>
                <Text className={`text-xs font-semibold ${statusPill.split(" ")[1]}`}>
                  {user?.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Provider business card (if provider) */}
          {profile?.provider && (
            <View className="bg-bg-card border border-border-subtle rounded-2xl p-5 mb-4">
              <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
                Business
              </Text>
              <Text className="text-text-primary text-base font-bold mb-1">
                {profile.provider.businessName}
              </Text>
              {profile.provider.serviceArea && (
                <Text className="text-text-muted text-sm mb-3">{profile.provider.serviceArea}</Text>
              )}
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-amber-400 text-sm">★</Text>
                  <Text className="text-text-secondary text-sm font-medium">
                    {Number(profile.provider.ratingAvg).toFixed(1)}
                  </Text>
                  <Text className="text-text-dim text-xs">({profile.provider.ratingCount})</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-full ${profile.provider.isAvailable ? "bg-emerald-500/20" : "bg-slate-500/20"}`}>
                  <Text className={`text-xs font-semibold ${profile.provider.isAvailable ? "text-emerald-400" : "text-slate-400"}`}>
                    {profile.provider.isAvailable ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Account details */}
          <View className="bg-bg-card border border-border-subtle rounded-2xl p-5 mb-4">
            <Text className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1">
              Account Details
            </Text>
            <InfoRow
              label="Email"
              value={user?.email ?? "—"}
            />
            <InfoRow
              label="Phone"
              value={user?.phone ?? "—"}
            />
            <InfoRow
              label="Email verified"
              value={user?.emailVerified ? "✓ Yes" : "✗ No"}
            />
            <InfoRow
              label="Member since"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            />
            {user?.lastLoginAt && (
              <InfoRow
                label="Last login"
                value={new Date(user.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              />
            )}
          </View>

          {/* Logout button */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.82}
            className="flex-row items-center justify-center gap-2 bg-red-500/10 border border-red-500/25 rounded-2xl py-4 mt-2"
          >
            {loggingOut ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <>
                <Text className="text-2xl">🚪</Text>
                <Text className="text-red-400 text-base font-bold">Sign Out</Text>
              </>
            )}
          </TouchableOpacity>

          {/* App version */}
          <Text className="text-text-dim text-xs text-center mt-6">
            CelebrateHub v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
