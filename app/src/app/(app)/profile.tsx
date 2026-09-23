import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/pro-icon";
import { useAuthStore } from "@/store/auth.store";
import { authApi, type AuthUser } from "@/lib/auth.api";

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: "#EAF0FB", text: "#2F54B8", border: "#CCD9F2" },
  PROVIDER: { bg: "#FDF3E3", text: "#8A5E10", border: "#F0DFB8" },
  CUSTOMER: { bg: "#EAF6EE", text: "#1E7A3C", border: "#CDE8D5" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "#EAF6EE", text: "#1E7A3C" },
  INACTIVE: { bg: "#F1EFEC", text: "#6E6E73" },
  SUSPENDED: { bg: "#FBECEB", text: "#B3261E" },
};

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? "" : "border-b border-[#EFEEEA]"}`}>
      <Text className="text-[#6E6E73] text-[14px]">{label}</Text>
      <Text className="text-[#1C1C1E] text-[14px] font-medium">{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user: storeUser, logout } = useAuthStore();
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
      useAuthStore.getState().setUser(data);
    } catch {
      setProfile(storeUser as any);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  }

  const user = profile ?? storeUser;
  const roleStyle = ROLE_STYLE[user?.role ?? "CUSTOMER"] ?? ROLE_STYLE.CUSTOMER;
  const statusStyle = STATUS_STYLE[user?.status ?? "ACTIVE"] ?? STATUS_STYLE.ACTIVE;

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center">
        <ActivityIndicator color="#1C1C1E" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-8 pb-6">
            <View className="w-20 h-20 rounded-full bg-[#1C1C1E] items-center justify-center mb-4">
              <Text className="text-white text-[28px] font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>

            <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight">{user?.name}</Text>
            <Text className="text-[#6E6E73] text-[14px] mt-1">{user?.email ?? user?.phone}</Text>

            <View className="flex-row gap-2 mt-3">
              <View
                style={{ backgroundColor: roleStyle.bg, borderColor: roleStyle.border }}
                className="px-3 py-1.5 rounded-full border"
              >
                <Text style={{ color: roleStyle.text }} className="text-[12px] font-semibold">
                  {user?.role}
                </Text>
              </View>
              <View style={{ backgroundColor: statusStyle.bg }} className="px-3 py-1.5 rounded-full">
                <Text style={{ color: statusStyle.text }} className="text-[12px] font-semibold">
                  {user?.status}
                </Text>
              </View>
            </View>
          </View>

          {profile?.provider && (
            <View className="bg-white border border-[#E8E6E1] rounded-2xl p-5 mb-3">
              <View className="flex-row items-center gap-2 mb-3">
                <AppIcon name="briefcase" size={15} color="#6E6E73" />
                <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-widest">
                  Business
                </Text>
              </View>
              <Text className="text-[#1C1C1E] text-[16px] font-bold">
                {profile.provider.businessName}
              </Text>
              {profile.provider.serviceArea && (
                <Text className="text-[#6E6E73] text-[14px] mt-0.5">{profile.provider.serviceArea}</Text>
              )}
              <View className="flex-row items-center gap-3 mt-3">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="star" size={14} color="#9A6A14" />
                  <Text className="text-[#1C1C1E] text-[14px] font-semibold">
                    {Number(profile.provider.ratingAvg).toFixed(1)}
                  </Text>
                  <Text className="text-[#A7A7AB] text-[12px]">({profile.provider.ratingCount} reviews)</Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${profile.provider.isAvailable ? "bg-[#EAF6EE]" : "bg-[#F1EFEC]"}`}>
                  <Text className={`text-[12px] font-semibold ${profile.provider.isAvailable ? "text-[#1E7A3C]" : "text-[#6E6E73]"}`}>
                    {profile.provider.isAvailable ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View className="bg-white border border-[#E8E6E1] rounded-2xl px-5 py-2 mb-3">
            <InfoRow label="Email" value={user?.email ?? "—"} />
            <InfoRow label="Phone" value={user?.phone ?? "—"} />
            <InfoRow label="Email verified" value={user?.emailVerified ? "Yes" : "No"} />
            <InfoRow
              label="Member since"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            />
            {user?.lastLoginAt ? (
              <InfoRow
                label="Last login" last
                value={new Date(user.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              />
            ) : (
              <View className="py-1" />
            )}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 bg-white border border-[#EAD9D2] rounded-2xl py-4 mt-1"
          >
            {loggingOut ? (
              <ActivityIndicator color="#B3261E" size="small" />
            ) : (
              <View className="flex-row items-center gap-2">
                <AppIcon name="log-out" size={16} color="#B3261E" />
                <Text className="text-[#B3261E] text-[15px] font-semibold">Sign out</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text className="text-[#A7A7AB] text-[12px] text-center mt-6">
            CelebrateHub · v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
