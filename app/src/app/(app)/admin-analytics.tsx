import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  adminApi,
  type AdminDashboardStats,
  type AdminAnalyticsResponse,
  type PlatformSettingItem,
} from "@/lib/auth.api";

const TABS = [
  { key: "METRICS", label: "Financials & KPIs", icon: "trending-up" },
  { key: "CONTROLS", label: "Platform Controls", icon: "sliders" },
  { key: "FUNNEL", label: "Funnel & Demand", icon: "activity" },
] as const;

export default function AdminAnalyticsScreen() {
  const router = useRouter();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Settings form state
  const [maxProviders, setMaxProviders] = useState(5);
  const [commissionRate, setCommissionRate] = useState(10);
  const [instantMatching, setInstantMatching] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);

  // Active tab in analytics view
  const [activeTab, setActiveTab] = useState<"METRICS" | "CONTROLS" | "FUNNEL">("METRICS");

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, settingsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getAnalytics(),
        adminApi.getSettings(),
      ]);
      setStats(statsRes ?? null);
      setAnalytics(analyticsRes ?? null);

      const settingList = Array.isArray(settingsRes) ? settingsRes : [];
      setSettings(settingList);

      // Hydrate local controls
      const maxP = settingList.find((s) => s?.key === "MAX_PROVIDERS_PER_LEAD");
      if (maxP?.value) {
        const val = parseInt(maxP.value, 10);
        if (!isNaN(val)) setMaxProviders(val);
      }

      const comm = settingList.find((s) => s?.key === "PLATFORM_COMMISSION_PCT");
      if (comm?.value) {
        const val = parseFloat(comm.value);
        if (!isNaN(val)) setCommissionRate(val);
      }

      const instant = settingList.find((s) => s?.key === "INSTANT_LEAD_MATCHING");
      if (instant) setInstantMatching(instant.value === "true");

      const auto = settingList.find((s) => s?.key === "AUTO_APPROVE_VERIFIED_PROVIDERS");
      if (auto) setAutoApprove(auto.value === "true");

      setLoadError(null);
    } catch (err: any) {
      // Never Alert here: a popup on mount is hostile on mobile. Show an
      // inline card with a retry action instead.
      setLoadError(
        err?.response?.data?.message ||
          "Could not load platform analytics. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const retry = () => {
    setLoadError(null);
    setLoading(true);
    loadData();
  };

  // ─── Update Setting ─────────────────────────────────────────────────────────

  const handleSaveSetting = async (key: string, value: string, label: string) => {
    try {
      setSavingSetting(key);
      await adminApi.updateSetting(key, value);
      Alert.alert("Saved", `${label} has been updated to ${value}.`);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to update setting");
    } finally {
      setSavingSetting(null);
    }
  };

  const hasData = Boolean(stats || analytics);

  return (
    <SafeAreaView className="flex-1 bg-[#120F2B]" edges={["top", "bottom"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-5 pt-3 pb-4 border-b border-[#322C63] flex-row items-center justify-between bg-[#120F2B]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#1E1A3F] items-center justify-center border border-[#322C63]"
            activeOpacity={0.7}
          >
            <AppIcon name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-[20px] font-bold text-white tracking-tight">Platform Analytics</Text>
            <Text className="text-[12px] text-[#B8B3E0]">Financials, conversion & dispatch rules</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          className="w-10 h-10 rounded-full bg-[#1E1A3F] items-center justify-center border border-[#322C63]"
          activeOpacity={0.7}
        >
          <AppIcon name="refresh-cw" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* View Switcher Tabs */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row p-1 bg-[#1E1A3F] border border-[#322C63] rounded-2xl">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  active ? "bg-[#7C5CFF]" : "bg-transparent"
                }`}
              >
                <AppIcon name={tab.icon} size={14} color={active ? "#FFFFFF" : "#B8B3E0"} />
                <Text
                  className={`text-[12px] font-bold ${active ? "text-white" : "text-[#B8B3E0]"}`}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7C5CFF" />
          <Text className="text-[#B8B3E0] text-[13px] mt-3">Compiling platform metrics...</Text>
        </View>
      ) : loadError && !hasData ? (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <View className="w-14 h-14 rounded-2xl bg-[#3F1420] border border-[#FF8FA3]/30 items-center justify-center mb-1">
            <AppIcon name="info" size={22} color="#FF8FA3" />
          </View>
          <Text className="text-white text-[16px] font-semibold text-center">
            Could not load platform analytics
          </Text>
          <Text className="text-[#B8B3E0] text-[13px] text-center mb-2">{loadError}</Text>
          <TouchableOpacity
            onPress={retry}
            activeOpacity={0.8}
            className="bg-[#7C5CFF] px-5 py-3 rounded-xl"
          >
            <Text className="text-white text-[14px] font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />
          }
        >
          {loadError && (
            <TouchableOpacity
              onPress={retry}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#3F1420] border border-[#FF8FA3]/30 mb-4"
            >
              <AppIcon name="info" size={14} color="#FF8FA3" />
              <Text className="text-[#FF8FA3] text-[12px] font-semibold">
                Refresh failed — tap to retry
              </Text>
            </TouchableOpacity>
          )}

          {/* ============================================================ */}
          {/* TAB 1: FINANCIALS & KPIS */}
          {/* ============================================================ */}
          {activeTab === "METRICS" && (
            <View className="gap-4">
              {/* Highlight Hero Card: Gross Marketplace Volume */}
              <View className="bg-[#1E1A3F] p-5 rounded-3xl border border-[#322C63] shadow-md">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center">
                      <AppIcon name="dollar-sign" size={16} color="#FFC53D" />
                    </View>
                    <Text className="text-[#B8B3E0] text-[13px] font-medium uppercase tracking-wider">
                      Gross Marketplace Volume (GMV)
                    </Text>
                  </View>
                  <View className="bg-[#123B34] px-2.5 py-1 rounded-full border border-[#6EE7B7]/40">
                    <Text className="text-[#6EE7B7] text-[11px] font-bold">100% SECURE</Text>
                  </View>
                </View>

                <Text className="text-white text-[32px] font-extrabold tracking-tight">
                  ₹{(stats?.grossMerchandiseValue || 0).toLocaleString("en-IN")}
                </Text>
                <Text className="text-[#B8B3E0] text-[12px] mt-1">
                  Cumulative celebration service booking value agreed on CelebrateHub
                </Text>

                {/* Sub-metrics breakdown */}
                <View className="flex-row items-center justify-between mt-5 pt-4 border-t border-[#322C63]">
                  <View>
                    <Text className="text-[#B8B3E0] text-[11px]">Platform Commission Earned</Text>
                    <Text className="text-[#6EE7B7] text-[16px] font-bold">
                      ₹{(stats?.totalCommissions || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[#B8B3E0] text-[11px]">Subscription MRR</Text>
                    <Text className="text-[#FFC53D] text-[16px] font-bold">
                      ₹{(stats?.mrr || 0).toLocaleString("en-IN")}/mo
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[#B8B3E0] text-[11px]">Active Plans</Text>
                    <Text className="text-white text-[16px] font-bold">
                      {stats?.activeSubscriptions || 0} active
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2x2 Grid of Core Metrics */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="calendar" size={16} color="#7C5CFF" />
                    <Text className="text-[#7C5CFF] text-[11px] font-bold">EVENTS</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalEvents || 0}</Text>
                  <Text className="text-[#B8B3E0] text-[11px] mt-0.5">
                    {stats?.activeEvents || 0} in progress
                  </Text>
                </View>

                <View className="flex-1 bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="inbox" size={16} color="#FFC53D" />
                    <Text className="text-[#FFC53D] text-[11px] font-bold">LEAD CONV.</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">
                    {stats?.leadConversionRate || 0}%
                  </Text>
                  <Text className="text-[#B8B3E0] text-[11px] mt-0.5">
                    {stats?.acceptedLeads || 0} of {stats?.totalLeads || 0} accepted
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="check-circle" size={16} color="#6EE7B7" />
                    <Text className="text-[#6EE7B7] text-[11px] font-bold">BOOKINGS</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalBookings || 0}</Text>
                  <Text className="text-[#B8B3E0] text-[11px] mt-0.5">
                    {stats?.completedBookings || 0} fulfilled
                  </Text>
                </View>

                <View className="flex-1 bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="users" size={16} color="#D6307F" />
                    <Text className="text-[#D6307F] text-[11px] font-bold">COMMUNITY</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalUsers || 0}</Text>
                  <Text className="text-[#B8B3E0] text-[11px] mt-0.5">
                    {stats?.providersCount || 0} providers / {stats?.customersCount || 0} hosts
                  </Text>
                </View>
              </View>

              {/* Recent High-Value Bookings & Commission Ledger */}
              <View className="bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63] mt-2">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white text-[15px] font-bold">Recent Bookings & Commissions</Text>
                  <Text className="text-[#B8B3E0] text-[11px]">Latest transactions</Text>
                </View>

                {!analytics?.recentBookings || analytics.recentBookings.length === 0 ? (
                  <View className="py-8 items-center justify-center">
                    <AppIcon name="inbox" size={28} color="#7C77A8" />
                    <Text className="text-[#B8B3E0] text-[13px] mt-2">No bookings recorded yet</Text>
                  </View>
                ) : (
                  analytics.recentBookings.slice(0, 5).map((b, idx, arr) => (
                    <View
                      key={b.id}
                      className={`py-3 flex-row items-center justify-between ${
                        idx < arr.length - 1 ? "border-b border-[#322C63]" : ""
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-white text-[13px] font-semibold">
                          {b.providerName || "Provider"}
                        </Text>
                        <Text className="text-[#B8B3E0] text-[11px]">
                          Host: {b.customerName || "Customer"}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white text-[14px] font-bold">
                          ₹{Number(b.agreedPrice || 0).toLocaleString("en-IN")}
                        </Text>
                        <Text className="text-[#6EE7B7] text-[11px] font-medium">
                          +₹{Number(b.commissionAmount || 0).toLocaleString("en-IN")} commission
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 2: PLATFORM CONTROLS & POLICY ENGINE */}
          {/* ============================================================ */}
          {activeTab === "CONTROLS" && (
            <View className="gap-4">
              <View className="bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63]">
                <View className="flex-row items-center gap-2 mb-1">
                  <AppIcon name="shield" size={16} color="#7C5CFF" />
                  <Text className="text-white text-[14px] font-bold">Admin Platform Policy Engine</Text>
                </View>
                <Text className="text-[#B8B3E0] text-[12px] leading-4">
                  Adjust dispatch quotas, take rates, and automation rules in real time. Changes take
                  effect on all upcoming leads and bookings immediately.
                </Text>
              </View>

              {/* CONTROL 1: Max Providers Per Lead */}
              <View className="bg-[#1E1A3F] p-5 rounded-2xl border border-[#322C63]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-white text-[15px] font-bold">Max Providers Per Lead</Text>
                    <Text className="text-[#B8B3E0] text-[12px] mt-0.5">
                      How many eligible vendors receive each instant lead dispatch notification.
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-[#2A2460] items-center justify-center border border-[#322C63]">
                    <Text className="text-white text-[20px] font-extrabold">{maxProviders}</Text>
                  </View>
                </View>

                {/* Stepper Buttons */}
                <View className="flex-row items-center gap-3 mt-3">
                  <TouchableOpacity
                    onPress={() => setMaxProviders((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-11 rounded-xl bg-[#2A2460] items-center justify-center border border-[#322C63]"
                    activeOpacity={0.7}
                  >
                    <AppIcon name="minus" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View className="flex-1 bg-[#2A2460] h-11 rounded-xl items-center justify-center border border-[#322C63]">
                    <Text className="text-white text-[14px] font-bold">
                      {maxProviders} {maxProviders === 1 ? "vendor" : "vendors"} alerted
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setMaxProviders((prev) => Math.min(20, prev + 1))}
                    className="w-12 h-11 rounded-xl bg-[#2A2460] items-center justify-center border border-[#322C63]"
                    activeOpacity={0.7}
                  >
                    <AppIcon name="plus" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={savingSetting === "MAX_PROVIDERS_PER_LEAD"}
                    onPress={() =>
                      handleSaveSetting(
                        "MAX_PROVIDERS_PER_LEAD",
                        String(maxProviders),
                        "Max Providers Per Lead"
                      )
                    }
                    className="px-4 h-11 rounded-xl bg-[#7C5CFF] items-center justify-center"
                    activeOpacity={0.85}
                  >
                    {savingSetting === "MAX_PROVIDERS_PER_LEAD" ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-[13px] font-bold">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="text-[#7C77A8] text-[11px] mt-2 italic">
                  Default: 5 providers. First vendor to accept wins the celebration lead.
                </Text>
              </View>

              {/* CONTROL 2: Platform Commission Rate (%) */}
              <View className="bg-[#1E1A3F] p-5 rounded-2xl border border-[#322C63]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-white text-[15px] font-bold">Platform Commission Rate (%)</Text>
                    <Text className="text-[#B8B3E0] text-[12px] mt-0.5">
                      Take-rate retained by CelebrateHub on confirmed customer service bookings.
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-[#123B34] items-center justify-center border border-[#6EE7B7]/40">
                    <Text className="text-[#6EE7B7] text-[18px] font-extrabold">{commissionRate}%</Text>
                  </View>
                </View>

                {/* Preset Chips */}
                <View className="flex-row gap-2 mt-3 mb-3">
                  {[5, 8, 10, 12, 15, 20].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      onPress={() => setCommissionRate(rate)}
                      activeOpacity={0.8}
                      className={`flex-1 py-2 rounded-lg items-center justify-center border ${
                        commissionRate === rate
                          ? "bg-[#7C5CFF] border-[#7C5CFF]"
                          : "bg-[#2A2460] border-[#322C63]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          commissionRate === rate ? "text-white" : "text-[#B8B3E0]"
                        }`}
                      >
                        {rate}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  disabled={savingSetting === "PLATFORM_COMMISSION_PCT"}
                  onPress={() =>
                    handleSaveSetting(
                      "PLATFORM_COMMISSION_PCT",
                      String(commissionRate),
                      "Platform Commission Rate"
                    )
                  }
                  className="w-full h-11 rounded-xl bg-[#7C5CFF] items-center justify-center mt-1"
                  activeOpacity={0.85}
                >
                  {savingSetting === "PLATFORM_COMMISSION_PCT" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-[13px] font-bold">
                      Apply {commissionRate}% Commission Rate
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-[#7C77A8] text-[11px] mt-2 italic">
                  Example: On a ₹50,000 catering booking, platform takes ₹
                  {((50000 * commissionRate) / 100).toLocaleString("en-IN")}, provider receives ₹
                  {(50000 - (50000 * commissionRate) / 100).toLocaleString("en-IN")}.
                </Text>
              </View>

              {/* CONTROL 3: Instant Dispatch Toggle */}
              <View className="bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63] flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[14px] font-semibold">Instant Lead Distribution</Text>
                  <Text className="text-[#B8B3E0] text-[11px]">
                    Alert matching vendors within 3 seconds of customer posting.
                  </Text>
                </View>
                <Switch
                  value={instantMatching}
                  onValueChange={(val) => {
                    setInstantMatching(val);
                    handleSaveSetting("INSTANT_LEAD_MATCHING", String(val), "Instant Lead Matching");
                  }}
                  trackColor={{ false: "#322C63", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* CONTROL 4: Auto Approve Verified KYC */}
              <View className="bg-[#1E1A3F] p-4 rounded-2xl border border-[#322C63] flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[14px] font-semibold">Auto-Approve Verified KYC</Text>
                  <Text className="text-[#B8B3E0] text-[11px]">
                    Skip manual review if business GSTIN and bank proofs match.
                  </Text>
                </View>
                <Switch
                  value={autoApprove}
                  onValueChange={(val) => {
                    setAutoApprove(val);
                    handleSaveSetting(
                      "AUTO_APPROVE_VERIFIED_PROVIDERS",
                      String(val),
                      "Auto-Approve Verified KYC"
                    );
                  }}
                  trackColor={{ false: "#322C63", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {settings.length === 0 && (
                <Text className="text-[#7C77A8] text-[11px] text-center italic mt-1">
                  No saved platform settings found — defaults are in effect.
                </Text>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 3: FUNNEL & CATEGORY DEMAND */}
          {/* ============================================================ */}
          {activeTab === "FUNNEL" && (
            <View className="gap-4">
              {/* Lead Conversion Funnel */}
              <View className="bg-[#1E1A3F] p-5 rounded-2xl border border-[#322C63]">
                <Text className="text-white text-[15px] font-bold mb-1">Lead Conversion Funnel</Text>
                <Text className="text-[#B8B3E0] text-[12px] mb-4">
                  Provider response lifecycle from lead dispatch to confirmed booking
                </Text>

                <View className="gap-3">
                  {/* Step 1: Dispatched */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#B8B3E0] text-[12px] font-medium">1. Leads Dispatched</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel?.totalDispatched || 0}
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#2A2460] overflow-hidden">
                      <View className="h-full bg-[#7C5CFF] rounded-full w-full" />
                    </View>
                  </View>

                  {/* Step 2: Viewed */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#B8B3E0] text-[12px] font-medium">2. Viewed by Vendor</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel?.viewedCount || 0} (
                        {analytics?.funnel?.totalDispatched
                          ? Math.round(
                              ((analytics.funnel.viewedCount || 0) /
                                analytics.funnel.totalDispatched) *
                                100
                            )
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#2A2460] overflow-hidden">
                      <View
                        className="h-full bg-[#FFC53D] rounded-full"
                        style={{
                          width: `${
                            analytics?.funnel?.totalDispatched
                              ? Math.min(
                                  100,
                                  Math.round(
                                    ((analytics.funnel.viewedCount || 0) /
                                      analytics.funnel.totalDispatched) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </View>
                  </View>

                  {/* Step 3: Accepted */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#B8B3E0] text-[12px] font-medium">3. Accepted (Winner)</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel?.acceptedCount || 0} (
                        {analytics?.funnel?.totalDispatched
                          ? Math.round(
                              ((analytics.funnel.acceptedCount || 0) /
                                analytics.funnel.totalDispatched) *
                                100
                            )
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#2A2460] overflow-hidden">
                      <View
                        className="h-full bg-[#6EE7B7] rounded-full"
                        style={{
                          width: `${
                            analytics?.funnel?.totalDispatched
                              ? Math.min(
                                  100,
                                  Math.round(
                                    ((analytics.funnel.acceptedCount || 0) /
                                      analytics.funnel.totalDispatched) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Category Demand vs Supply Balance */}
              <View className="bg-[#1E1A3F] p-5 rounded-2xl border border-[#322C63]">
                <Text className="text-white text-[15px] font-bold mb-1">Category Demand & Supply</Text>
                <Text className="text-[#B8B3E0] text-[12px] mb-4">
                  Event service requests vs registered providers across categories
                </Text>

                {!analytics?.categoryStats || analytics.categoryStats.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-[#B8B3E0] text-[13px]">No categories catalogued</Text>
                  </View>
                ) : (
                  analytics.categoryStats.map((cat, idx, arr) => {
                    const isHighDemand = (cat.leadsCount || 0) > (cat.providersCount || 0);

                    return (
                      <View
                        key={cat.slug || cat.name}
                        className={`py-3 flex-row items-center justify-between ${
                          idx < arr.length - 1 ? "border-b border-[#322C63]" : ""
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-white text-[14px] font-medium">{cat.name}</Text>
                          <Text className="text-[#B8B3E0] text-[11px]">
                            {cat.leadsCount || 0} requests • {cat.providersCount || 0} providers
                          </Text>
                        </View>

                        <View
                          className={`px-2.5 py-1 rounded-full border ${
                            isHighDemand
                              ? "bg-[#3F1420] border-[#FF8FA3]/30"
                              : "bg-[#123B34] border-[#6EE7B7]/40"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isHighDemand ? "text-[#FF8FA3]" : "text-[#6EE7B7]"
                            }`}
                          >
                            {isHighDemand ? "HIGH DEMAND" : "BALANCED"}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
