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

export default function AdminAnalyticsScreen() {
  const router = useRouter();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setStats(statsRes);
      setAnalytics(analyticsRes);
      setSettings(settingsRes);

      // Hydrate local controls
      const maxP = settingsRes.find((s) => s.key === "MAX_PROVIDERS_PER_LEAD");
      if (maxP?.value) {
        const val = parseInt(maxP.value, 10);
        if (!isNaN(val)) setMaxProviders(val);
      }

      const comm = settingsRes.find((s) => s.key === "PLATFORM_COMMISSION_PCT");
      if (comm?.value) {
        const val = parseFloat(comm.value);
        if (!isNaN(val)) setCommissionRate(val);
      }

      const instant = settingsRes.find((s) => s.key === "INSTANT_LEAD_MATCHING");
      if (instant) setInstantMatching(instant.value === "true");

      const auto = settingsRes.find((s) => s.key === "AUTO_APPROVE_VERIFIED_PROVIDERS");
      if (auto) setAutoApprove(auto.value === "true");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to load analytics");
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

  return (
    <SafeAreaView className="flex-1 bg-[#0D0D12]" edges={["top", "bottom"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-5 pt-3 pb-4 border-b border-[#22222E] flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#1A1A24] items-center justify-center border border-[#2D2D3E]"
          >
            <AppIcon name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text className="text-[20px] font-bold text-white tracking-tight">Platform Analytics</Text>
            <Text className="text-[12px] text-[#8E8E93]">Financials, conversion & dispatch rules</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          className="w-10 h-10 rounded-full bg-[#1A1A24] items-center justify-center border border-[#2D2D3E]"
        >
          <AppIcon name="refresh-cw" size={16} color="#A78BFA" />
        </TouchableOpacity>
      </View>

      {/* View Switcher Tabs */}
      <View className="flex-row px-5 pt-3 pb-2 gap-2 bg-[#12121A] border-b border-[#22222E]">
        <TouchableOpacity
          onPress={() => setActiveTab("METRICS")}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            activeTab === "METRICS" ? "bg-[#8B5CF6]" : "bg-[#1A1A24]"
          }`}
        >
          <AppIcon name="trending-up" size={14} color={activeTab === "METRICS" ? "#FFFFFF" : "#8E8E93"} />
          <Text className={`text-[12px] font-bold ${activeTab === "METRICS" ? "text-white" : "text-[#8E8E93]"}`}>
            Financials & KPIs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("CONTROLS")}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            activeTab === "CONTROLS" ? "bg-[#8B5CF6]" : "bg-[#1A1A24]"
          }`}
        >
          <AppIcon name="sliders" size={14} color={activeTab === "CONTROLS" ? "#FFFFFF" : "#8E8E93"} />
          <Text className={`text-[12px] font-bold ${activeTab === "CONTROLS" ? "text-white" : "text-[#8E8E93]"}`}>
            Platform Controls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("FUNNEL")}
          className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
            activeTab === "FUNNEL" ? "bg-[#8B5CF6]" : "bg-[#1A1A24]"
          }`}
        >
          <AppIcon name="activity" size={14} color={activeTab === "FUNNEL" ? "#FFFFFF" : "#8E8E93"} />
          <Text className={`text-[12px] font-bold ${activeTab === "FUNNEL" ? "text-white" : "text-[#8E8E93]"}`}>
            Funnel & Demand
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="text-[#8E8E93] text-[13px] mt-3">Compiling platform metrics...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        >
          {/* ============================================================ */}
          {/* TAB 1: FINANCIALS & KPIS */}
          {/* ============================================================ */}
          {activeTab === "METRICS" && (
            <View className="gap-4">
              {/* Highlight Hero Card: Gross Marketplace Volume */}
              <View className="bg-gradient-to-r from-[#2E1065] to-[#1E1B4B] p-5 rounded-3xl border border-[#4C1D95]/40 shadow-xl">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-[#8B5CF6]/30 items-center justify-center">
                      <AppIcon name="dollar-sign" size={16} color="#DDD6FE" />
                    </View>
                    <Text className="text-[#DDD6FE] text-[13px] font-medium uppercase tracking-wider">
                      Gross Marketplace Volume (GMV)
                    </Text>
                  </View>
                  <View className="bg-[#10B981]/20 px-2.5 py-1 rounded-full border border-[#10B981]/30">
                    <Text className="text-[#34D399] text-[11px] font-bold">100% SECURE</Text>
                  </View>
                </View>

                <Text className="text-white text-[32px] font-extrabold tracking-tight">
                  ₹{(stats?.grossMerchandiseValue || 0).toLocaleString("en-IN")}
                </Text>
                <Text className="text-[#A78BFA] text-[12px] mt-1">
                  Cumulative celebration service booking value agreed on CelebrateHub
                </Text>

                {/* Sub-metrics breakdown */}
                <View className="flex-row items-center justify-between mt-5 pt-4 border-t border-[#8B5CF6]/20">
                  <View>
                    <Text className="text-[#9CA3AF] text-[11px]">Platform Commission Earned</Text>
                    <Text className="text-[#34D399] text-[16px] font-bold">
                      ₹{(stats?.totalCommissions || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[#9CA3AF] text-[11px]">Subscription MRR</Text>
                    <Text className="text-[#FBBF24] text-[16px] font-bold">
                      ₹{(stats?.mrr || 0).toLocaleString("en-IN")}/mo
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[#9CA3AF] text-[11px]">Active Plans</Text>
                    <Text className="text-white text-[16px] font-bold">
                      {stats?.activeSubscriptions || 0} active
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2x2 Grid of Core Metrics */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="calendar" size={16} color="#60A5FA" />
                    <Text className="text-[#60A5FA] text-[11px] font-bold">EVENTS</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalEvents || 0}</Text>
                  <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
                    {stats?.activeEvents || 0} in progress
                  </Text>
                </View>

                <View className="flex-1 bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="inbox" size={16} color="#F59E0B" />
                    <Text className="text-[#F59E0B] text-[11px] font-bold">LEAD CONV.</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">
                    {stats?.leadConversionRate || 0}%
                  </Text>
                  <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
                    {stats?.acceptedLeads || 0} of {stats?.totalLeads || 0} accepted
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="check-circle" size={16} color="#10B981" />
                    <Text className="text-[#10B981] text-[11px] font-bold">BOOKINGS</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalBookings || 0}</Text>
                  <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
                    {stats?.completedBookings || 0} fulfilled
                  </Text>
                </View>

                <View className="flex-1 bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E]">
                  <View className="flex-row items-center justify-between mb-2">
                    <AppIcon name="users" size={16} color="#A78BFA" />
                    <Text className="text-[#A78BFA] text-[11px] font-bold">COMMUNITY</Text>
                  </View>
                  <Text className="text-white text-[22px] font-bold">{stats?.totalUsers || 0}</Text>
                  <Text className="text-[#9CA3AF] text-[11px] mt-0.5">
                    {stats?.providersCount || 0} providers / {stats?.customersCount || 0} hosts
                  </Text>
                </View>
              </View>

              {/* Recent High-Value Bookings & Commission Ledger */}
              <View className="bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E] mt-2">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white text-[15px] font-bold">Recent Bookings & Commissions</Text>
                  <Text className="text-[#8E8E93] text-[11px]">Latest transactions</Text>
                </View>

                {(!analytics?.recentBookings || analytics.recentBookings.length === 0) ? (
                  <View className="py-8 items-center justify-center">
                    <AppIcon name="inbox" size={28} color="#4B5563" />
                    <Text className="text-[#6B7280] text-[13px] mt-2">No bookings recorded yet</Text>
                  </View>
                ) : (
                  analytics.recentBookings.slice(0, 5).map((b) => (
                    <View
                      key={b.id}
                      className="py-3 border-b border-[#252535] last:border-b-0 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-white text-[13px] font-semibold">{b.providerName}</Text>
                        <Text className="text-[#9CA3AF] text-[11px]">Host: {b.customerName}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white text-[14px] font-bold">
                          ₹{b.agreedPrice.toLocaleString("en-IN")}
                        </Text>
                        <Text className="text-[#34D399] text-[11px] font-medium">
                          +₹{b.commissionAmount.toLocaleString("en-IN")} commission
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
              <View className="bg-[#1E1B4B]/40 p-4 rounded-2xl border border-[#8B5CF6]/30">
                <View className="flex-row items-center gap-2 mb-1">
                  <AppIcon name="shield" size={16} color="#A78BFA" />
                  <Text className="text-white text-[14px] font-bold">Admin Platform Policy Engine</Text>
                </View>
                <Text className="text-[#C4B5FD] text-[12px] leading-4">
                  Adjust dispatch quotas, take rates, and automation rules in real time. Changes take effect on all upcoming leads and bookings immediately.
                </Text>
              </View>

              {/* CONTROL 1: Max Providers Per Lead */}
              <View className="bg-[#161622] p-5 rounded-2xl border border-[#2D2D3E]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-white text-[15px] font-bold">Max Providers Per Lead</Text>
                    <Text className="text-[#9CA3AF] text-[12px] mt-0.5">
                      How many eligible vendors receive each instant lead dispatch notification.
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/20 items-center justify-center border border-[#8B5CF6]/30">
                    <Text className="text-[#A78BFA] text-[20px] font-extrabold">{maxProviders}</Text>
                  </View>
                </View>

                {/* Stepper Buttons */}
                <View className="flex-row items-center gap-3 mt-3">
                  <TouchableOpacity
                    onPress={() => setMaxProviders((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-11 rounded-xl bg-[#222230] items-center justify-center border border-[#333345]"
                  >
                    <AppIcon name="minus" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View className="flex-1 bg-[#1A1A24] h-11 rounded-xl items-center justify-center border border-[#2D2D3E]">
                    <Text className="text-white text-[14px] font-bold">
                      {maxProviders} {maxProviders === 1 ? "vendor" : "vendors"} alerted
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setMaxProviders((prev) => Math.min(20, prev + 1))}
                    className="w-12 h-11 rounded-xl bg-[#222230] items-center justify-center border border-[#333345]"
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
                    className="px-4 h-11 rounded-xl bg-[#8B5CF6] items-center justify-center"
                  >
                    {savingSetting === "MAX_PROVIDERS_PER_LEAD" ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-[13px] font-bold">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="text-[#6B7280] text-[11px] mt-2 italic">
                  Default: 5 providers. First vendor to accept wins the celebration lead.
                </Text>
              </View>

              {/* CONTROL 2: Platform Commission Rate (%) */}
              <View className="bg-[#161622] p-5 rounded-2xl border border-[#2D2D3E]">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-white text-[15px] font-bold">Platform Commission Rate (%)</Text>
                    <Text className="text-[#9CA3AF] text-[12px] mt-0.5">
                      Take-rate retained by CelebrateHub on confirmed customer service bookings.
                    </Text>
                  </View>
                  <View className="w-12 h-12 rounded-2xl bg-[#10B981]/20 items-center justify-center border border-[#10B981]/30">
                    <Text className="text-[#34D399] text-[18px] font-extrabold">{commissionRate}%</Text>
                  </View>
                </View>

                {/* Preset Chips */}
                <View className="flex-row gap-2 mt-3 mb-3">
                  {[5, 8, 10, 12, 15, 20].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      onPress={() => setCommissionRate(rate)}
                      className={`flex-1 py-2 rounded-lg items-center justify-center border ${
                        commissionRate === rate
                          ? "bg-[#10B981] border-[#10B981]"
                          : "bg-[#1F1F2E] border-[#2E2E40]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          commissionRate === rate ? "text-white" : "text-[#9CA3AF]"
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
                  className="w-full h-11 rounded-xl bg-[#10B981] items-center justify-center mt-1"
                >
                  {savingSetting === "PLATFORM_COMMISSION_PCT" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-[13px] font-bold">
                      Apply {commissionRate}% Commission Rate
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-[#6B7280] text-[11px] mt-2 italic">
                  Example: On a ₹50,000 catering booking, platform takes ₹
                  {((50000 * commissionRate) / 100).toLocaleString("en-IN")}, provider receives ₹
                  {(50000 - (50000 * commissionRate) / 100).toLocaleString("en-IN")}.
                </Text>
              </View>

              {/* CONTROL 3: Instant Dispatch Toggle */}
              <View className="bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E] flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[14px] font-semibold">Instant Lead Distribution</Text>
                  <Text className="text-[#9CA3AF] text-[11px]">
                    Alert matching vendors within 3 seconds of customer posting.
                  </Text>
                </View>
                <Switch
                  value={instantMatching}
                  onValueChange={(val) => {
                    setInstantMatching(val);
                    handleSaveSetting("INSTANT_LEAD_MATCHING", String(val), "Instant Lead Matching");
                  }}
                  trackColor={{ false: "#333344", true: "#8B5CF6" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* CONTROL 4: Auto Approve Verified KYC */}
              <View className="bg-[#161622] p-4 rounded-2xl border border-[#2D2D3E] flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[14px] font-semibold">Auto-Approve Verified KYC</Text>
                  <Text className="text-[#9CA3AF] text-[11px]">
                    Skip manual review if business GSTIN and bank proofs match.
                  </Text>
                </View>
                <Switch
                  value={autoApprove}
                  onValueChange={(val) => {
                    setAutoApprove(val);
                    handleSaveSetting("AUTO_APPROVE_VERIFIED_PROVIDERS", String(val), "Auto-Approve Verified KYC");
                  }}
                  trackColor={{ false: "#333344", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 3: FUNNEL & CATEGORY DEMAND */}
          {/* ============================================================ */}
          {activeTab === "FUNNEL" && (
            <View className="gap-4">
              {/* Lead Conversion Funnel */}
              <View className="bg-[#161622] p-5 rounded-2xl border border-[#2D2D3E]">
                <Text className="text-white text-[15px] font-bold mb-1">Lead Conversion Funnel</Text>
                <Text className="text-[#9CA3AF] text-[12px] mb-4">
                  Provider response lifecycle from lead dispatch to confirmed booking
                </Text>

                <View className="gap-3">
                  {/* Step 1: Dispatched */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#C4B5FD] text-[12px] font-medium">1. Leads Dispatched</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel.totalDispatched || 0}
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#272738] overflow-hidden">
                      <View className="h-full bg-[#8B5CF6] rounded-full w-full" />
                    </View>
                  </View>

                  {/* Step 2: Viewed */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#93C5FD] text-[12px] font-medium">2. Viewed by Vendor</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel.viewedCount || 0} (
                        {analytics?.funnel.totalDispatched
                          ? Math.round(
                              ((analytics?.funnel.viewedCount || 0) /
                                analytics.funnel.totalDispatched) *
                                100
                            )
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#272738] overflow-hidden">
                      <View
                        className="h-full bg-[#3B82F6] rounded-full"
                        style={{
                          width: `${
                            analytics?.funnel.totalDispatched
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
                      <Text className="text-[#34D399] text-[12px] font-medium">3. Accepted (Winner)</Text>
                      <Text className="text-white text-[12px] font-bold">
                        {analytics?.funnel.acceptedCount || 0} (
                        {analytics?.funnel.totalDispatched
                          ? Math.round(
                              ((analytics?.funnel.acceptedCount || 0) /
                                analytics.funnel.totalDispatched) *
                                100
                            )
                          : 0}
                        %)
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#272738] overflow-hidden">
                      <View
                        className="h-full bg-[#10B981] rounded-full"
                        style={{
                          width: `${
                            analytics?.funnel.totalDispatched
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
              <View className="bg-[#161622] p-5 rounded-2xl border border-[#2D2D3E]">
                <Text className="text-white text-[15px] font-bold mb-1">Category Demand & Supply</Text>
                <Text className="text-[#9CA3AF] text-[12px] mb-4">
                  Event service requests vs registered providers across categories
                </Text>

                {(!analytics?.categoryStats || analytics.categoryStats.length === 0) ? (
                  <View className="py-6 items-center">
                    <Text className="text-[#6B7280] text-[13px]">No categories catalogued</Text>
                  </View>
                ) : (
                  analytics.categoryStats.map((cat) => {
                    const isHighDemand = cat.leadsCount > cat.providersCount;

                    return (
                      <View
                        key={cat.slug}
                        className="py-3 border-b border-[#252535] last:border-b-0 flex-row items-center justify-between"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-white text-[14px] font-medium">{cat.name}</Text>
                          <Text className="text-[#9CA3AF] text-[11px]">
                            {cat.leadsCount} requests • {cat.providersCount} providers
                          </Text>
                        </View>

                        <View
                          className={`px-2.5 py-1 rounded-full border ${
                            isHighDemand
                              ? "bg-[#EF4444]/20 border-[#EF4444]/40"
                              : "bg-[#10B981]/20 border-[#10B981]/40"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isHighDemand ? "text-[#F87171]" : "text-[#34D399]"
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
