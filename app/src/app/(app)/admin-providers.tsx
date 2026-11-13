import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  providersApi,
  type ProviderProfile,
  type VerificationStatus,
  VERIFICATION_META,
} from "@/lib/providers.api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminProvider = ProviderProfile & {
  user: { id: string; name: string; email: string; phone: string | null; status: string };
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const TABS: { key: string; label: string; icon: string }[] = [
  { key: "ALL",       label: "All",       icon: "list" },
  { key: "PENDING",   label: "Pending",   icon: "clock" },
  { key: "VERIFIED",  label: "Verified",  icon: "check-circle" },
  { key: "REJECTED",  label: "Rejected",  icon: "x-circle" },
  { key: "SUSPENDED", label: "Suspended", icon: "slash" },
];

// ─── Detail bottom sheet ──────────────────────────────────────────────────────

function ProviderDetailSheet({
  provider,
  visible,
  onClose,
  onUpdated,
}: {
  provider: AdminProvider | null;
  visible: boolean;
  onClose: () => void;
  onUpdated: (p: AdminProvider) => void;
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    if (provider) setNotes(provider.verificationNotes || "");
  }, [provider]);

  if (!provider) return null;

  const verMeta = VERIFICATION_META[provider.verificationStatus];

  async function handleAction(status: VerificationStatus) {
    setLoading(status);
    try {
      const updated = (await providersApi.updateVerification(provider!.id, status, notes.trim() || undefined)) as AdminProvider;
      onUpdated(updated);
      onClose();
      Alert.alert(
        "Done ✓",
        `${provider!.user.name} is now marked as ${VERIFICATION_META[status].label}.`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not update verification status.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-end">
        <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl max-h-[90%]">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1.5 rounded-full bg-[#322C63]" />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between py-4 border-b border-[#322C63] mb-4">
              <View className="flex-1 mr-3">
                <Text className="text-white text-[18px] font-bold">{provider.businessName}</Text>
                <Text className="text-[#B8B3E0] text-[13px] mt-0.5">{provider.user.name}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#B8B3E0" />
              </TouchableOpacity>
            </View>

            {/* Status badge */}
            <View
              style={{ backgroundColor: verMeta.bg }}
              className="self-start px-3 py-1.5 rounded-full mb-4"
            >
              <Text style={{ color: verMeta.text }} className="text-[12px] font-bold">
                {verMeta.label}
              </Text>
            </View>

            {/* Provider info */}
            <View className="bg-[#2A2460] border border-[#322C63] rounded-2xl p-4 gap-3 mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                  <AppIcon name="mail" size={14} color="#B8B3E0" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#B8B3E0] text-[10px] uppercase font-bold tracking-wider">Email</Text>
                  <Text className="text-white text-[13px] font-medium">{provider.user.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${provider.user.email}`)}
                  className="w-8 h-8 rounded-full bg-[#7C5CFF] items-center justify-center"
                >
                  <AppIcon name="send" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {provider.user.phone && (
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                    <AppIcon name="phone" size={14} color="#B8B3E0" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#B8B3E0] text-[10px] uppercase font-bold tracking-wider">Phone</Text>
                    <Text className="text-white text-[13px] font-medium">{provider.user.phone}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${provider.user.phone}`)}
                    className="w-8 h-8 rounded-full bg-[#123B34] border border-[#6EE7B7]/40 items-center justify-center"
                  >
                    <AppIcon name="phone" size={12} color="#6EE7B7" />
                  </TouchableOpacity>
                </View>
              )}

              {provider.serviceArea && (
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                    <AppIcon name="map-pin" size={14} color="#B8B3E0" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#B8B3E0] text-[10px] uppercase font-bold tracking-wider">Service Area</Text>
                    <Text className="text-white text-[13px] font-medium">{provider.serviceArea}</Text>
                  </View>
                </View>
              )}

              {(provider.pricingMin || provider.pricingMax) && (
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                    <AppIcon name="dollar-sign" size={14} color="#B8B3E0" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#B8B3E0] text-[10px] uppercase font-bold tracking-wider">Pricing Range</Text>
                    <Text className="text-white text-[13px] font-medium">
                      ₹{provider.pricingMin?.toLocaleString("en-IN") ?? "—"} –{" "}
                      ₹{provider.pricingMax?.toLocaleString("en-IN") ?? "—"}
                    </Text>
                  </View>
                </View>
              )}

              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                  <AppIcon name="star" size={14} color="#FFC53D" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#B8B3E0] text-[10px] uppercase font-bold tracking-wider">Rating</Text>
                  <Text className="text-white text-[13px] font-medium">
                    {provider.ratingCount > 0
                      ? `${Number(provider.ratingAvg).toFixed(1)} / 5.0 (${provider.ratingCount} reviews)`
                      : "No reviews yet"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Service categories */}
            {provider.categories && provider.categories.length > 0 && (
              <View className="mb-4">
                <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-wider mb-2">
                  Service Categories
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {provider.categories.map((c) => (
                    <View
                      key={c.id}
                      className="flex-row items-center gap-1.5 bg-[#2A2460] border border-[#322C63] rounded-full px-3 py-1.5"
                    >
                      <AppIcon
                        name={(c.category.icon as any) || "briefcase"}
                        size={11}
                        color="#B8B3E0"
                      />
                      <Text className="text-[#E0DCFF] text-[12px] font-medium">{c.category.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {provider.description && (
              <View className="mb-4">
                <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-wider mb-2">
                  About
                </Text>
                <Text className="text-[#E0DCFF] text-[13px] leading-[20px]">{provider.description}</Text>
              </View>
            )}

            {/* Audit notes */}
            <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-wider mb-2">
              Admin Notes (Audit)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add reason for approval, rejection, or any compliance notes..."
              placeholderTextColor="#7C77A8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3 text-[13px] text-white min-h-[72px] mb-5"
            />

            {/* Action buttons */}
            <View className="gap-2.5">
              {provider.verificationStatus !== "VERIFIED" && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Verify Provider",
                      `Approve ${provider.user.name} as a verified service provider on CelebrateHub?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Verify", onPress: () => handleAction("VERIFIED") },
                      ]
                    )
                  }
                  disabled={!!loading}
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-[#123B34] border border-[#6EE7B7]/40 active:opacity-80"
                >
                  {loading === "VERIFIED" ? (
                    <ActivityIndicator color="#6EE7B7" />
                  ) : (
                    <>
                      <AppIcon name="check-circle" size={16} color="#6EE7B7" />
                      <Text className="text-[#6EE7B7] font-bold text-[14px]">Verify Provider</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {provider.verificationStatus !== "REJECTED" && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Reject Provider",
                      `Reject ${provider.user.name}'s provider application? They will not receive new leads.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Reject", style: "destructive", onPress: () => handleAction("REJECTED") },
                      ]
                    )
                  }
                  disabled={!!loading}
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-[#3F1420] border border-[#FF8FA3]/30 active:opacity-80"
                >
                  {loading === "REJECTED" ? (
                    <ActivityIndicator color="#FF8FA3" />
                  ) : (
                    <>
                      <AppIcon name="x-circle" size={16} color="#FF8FA3" />
                      <Text className="text-[#FF8FA3] font-bold text-[14px]">Reject Application</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {provider.verificationStatus !== "SUSPENDED" && provider.verificationStatus !== "PENDING" && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Suspend Provider",
                      `Temporarily suspend ${provider.user.name}? They will lose access to leads immediately.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Suspend",
                          style: "destructive",
                          onPress: () => handleAction("SUSPENDED"),
                        },
                      ]
                    )
                  }
                  disabled={!!loading}
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-[#2A2460] border border-[#322C63] active:opacity-80"
                >
                  {loading === "SUSPENDED" ? (
                    <ActivityIndicator color="#B8B3E0" />
                  ) : (
                    <>
                      <AppIcon name="slash" size={16} color="#B8B3E0" />
                      <Text className="text-[#B8B3E0] font-bold text-[14px]">Suspend Provider</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {(provider.verificationStatus === "REJECTED" ||
                provider.verificationStatus === "SUSPENDED") && (
                <TouchableOpacity
                  onPress={() => handleAction("PENDING")}
                  disabled={!!loading}
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-[#3D2F0F] border border-[#FFC53D]/40 active:opacity-80"
                >
                  {loading === "PENDING" ? (
                    <ActivityIndicator color="#FFC53D" />
                  ) : (
                    <>
                      <AppIcon name="refresh-cw" size={16} color="#FFC53D" />
                      <Text className="text-[#FFC53D] font-bold text-[14px]">Reset to Pending</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onPress,
}: {
  provider: AdminProvider;
  onPress: () => void;
}) {
  const verMeta = VERIFICATION_META[provider.verificationStatus];
  const initial = provider.businessName?.[0]?.toUpperCase() ?? "P";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center gap-3">
        {/* Avatar */}
        <View className="w-12 h-12 rounded-2xl bg-[#2A2460] border border-[#322C63] items-center justify-center">
          <Text className="text-[#7C5CFF] text-[16px] font-bold">{initial}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-white text-[15px] font-bold">{provider.businessName}</Text>
            <View
              style={{ backgroundColor: verMeta.bg }}
              className="px-2 py-0.5 rounded-full"
            >
              <Text style={{ color: verMeta.text }} className="text-[10px] font-bold">
                {verMeta.label}
              </Text>
            </View>
          </View>
          <Text className="text-[#B8B3E0] text-[12px] mt-0.5">{provider.user.name}</Text>
          {provider.serviceArea && (
            <View className="flex-row items-center gap-1 mt-1">
              <AppIcon name="map-pin" size={10} color="#B8B3E0" />
              <Text className="text-[#B8B3E0] text-[11px]">{provider.serviceArea}</Text>
            </View>
          )}
        </View>

        <AppIcon name="chevron-right" size={16} color="#7C77A8" />
      </View>

      {/* Category chips */}
      {provider.categories && provider.categories.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#322C63]">
          {provider.categories.slice(0, 4).map((c) => (
            <View
              key={c.id}
              className="flex-row items-center gap-1 bg-[#2A2460] border border-[#322C63]/60 rounded-full px-2.5 py-0.5"
            >
              <AppIcon
                name={(c.category.icon as any) || "briefcase"}
                size={9}
                color="#B8B3E0"
              />
              <Text className="text-[#B8B3E0] text-[11px]">{c.category.name}</Text>
            </View>
          ))}
          {provider.categories.length > 4 && (
            <View className="flex-row items-center bg-[#2A2460] border border-[#322C63]/60 rounded-full px-2.5 py-0.5">
              <Text className="text-[#B8B3E0] text-[11px]">
                +{provider.categories.length - 4} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Rating row */}
      {provider.ratingCount > 0 && (
        <View className="flex-row items-center gap-1 mt-2">
          <AppIcon name="star" size={11} color="#FFC53D" />
          <Text className="text-[#B8B3E0] text-[11px] font-medium">
            {provider.ratingCount > 0
              ? `${Number(provider.ratingAvg).toFixed(1)} (${provider.ratingCount})`
              : "No reviews"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminProvidersScreen() {
  const router = useRouter();

  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Status counts
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Detail sheet
  const [selectedProvider, setSelectedProvider] = useState<AdminProvider | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchProviders = useCallback(
    async (tab: string, search: string, pageNum: number, append = false) => {
      try {
        const result = await providersApi.listAll({
          verificationStatus: tab === "ALL" ? undefined : tab,
          search: search.trim() || undefined,
          page: pageNum,
        });

        const list = (result.providers as AdminProvider[]) || [];
        setProviders((prev) => (append ? [...prev, ...list] : list));
        setTotalPages(result.pagination.totalPages);
      } catch (err: any) {
        Alert.alert("Error", err?.response?.data?.message || "Could not load providers.");
      }
    },
    []
  );

  const fetchAllCounts = useCallback(async () => {
    try {
      const statuses = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];
      const results = await Promise.all(
        statuses.map((s) =>
          providersApi.listAll({ verificationStatus: s, page: 1 }).then((r) => ({
            status: s,
            count: r.pagination.total,
          }))
        )
      );
      const map: Record<string, number> = {};
      results.forEach((r) => (map[r.status] = r.count));
      const allCount = results.reduce((sum, r) => sum + r.count, 0);
      map["ALL"] = allCount;
      setCounts(map);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    Promise.all([fetchProviders(activeTab, searchText, 1), fetchAllCounts()]).finally(() =>
      setLoading(false)
    );
  }, [activeTab, searchText]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([fetchProviders(activeTab, searchText, 1), fetchAllCounts()]);
    setRefreshing(false);
  }, [activeTab, searchText]);

  async function loadMore() {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    await fetchProviders(activeTab, searchText, next, true);
    setLoadingMore(false);
  }

  function openDetail(p: AdminProvider) {
    setSelectedProvider(p);
    setDetailVisible(true);
  }

  function handleUpdated(updated: AdminProvider) {
    setProviders((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    setSelectedProvider(null);
    fetchAllCounts();
  }

  const pendingCount = counts["PENDING"] || 0;

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        {/* Top nav */}
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center mr-3"
          >
            <AppIcon name="arrow-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-[18px] font-bold">Provider Verification</Text>
            {pendingCount > 0 && (
              <Text className="text-[#FFC53D] text-[12px] font-medium mt-0.5">
                {pendingCount} awaiting review
              </Text>
            )}
          </View>
        </View>

        {/* Search bar */}
        <View className="mx-5 mb-3">
          <View className="flex-row items-center gap-3 bg-[#1E1A3F] border border-[#322C63] rounded-xl px-3.5 py-2.5">
            <AppIcon name="search" size={15} color="#B8B3E0" />
            <TextInput
              value={searchText}
              onChangeText={(t) => {
                setSearchText(t);
                setPage(1);
              }}
              placeholder="Search by business, name, or area..."
              placeholderTextColor="#7C77A8"
              className="flex-1 text-[14px] text-white"
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <AppIcon name="x" size={14} color="#B8B3E0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
          className="flex-grow-0 mb-2"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            const hasBadge = tab.key === "PENDING" && count > 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                  isActive
                    ? "bg-[#7C5CFF] border-[#7C5CFF]"
                    : "bg-[#1E1A3F] border-[#322C63]"
                }`}
              >
                <AppIcon
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? "#FFFFFF" : "#B8B3E0"}
                />
                <Text
                  className={`text-[12px] font-semibold ${
                    isActive ? "text-white" : "text-[#B8B3E0]"
                  }`}
                >
                  {tab.label}
                </Text>
                {count !== undefined && (
                  <View
                    className={`min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 ${
                      hasBadge ? "bg-[#FFC53D]" : isActive ? "bg-white/25" : "bg-[#2A2460]"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        hasBadge ? "text-[#120F2B]" : isActive ? "text-white" : "text-[#B8B3E0]"
                      }`}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C5CFF" />
            <Text className="text-[#B8B3E0] text-[13px] mt-3">Loading providers...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 60) {
                loadMore();
              }
            }}
            scrollEventThrottle={16}
          >
            {providers.length === 0 ? (
              <View className="items-center py-16">
                <View className="w-16 h-16 rounded-2xl bg-[#1E1A3F] border border-[#322C63] items-center justify-center mb-3">
                  <AppIcon name="users" size={28} color="#B8B3E0" />
                </View>
                <Text className="text-white text-[15px] font-semibold">No providers found</Text>
                <Text className="text-[#B8B3E0] text-[13px] text-center mt-1 px-8 leading-5">
                  {activeTab === "PENDING"
                    ? "Great news — the verification queue is clear!"
                    : "No providers match the selected filter."}
                </Text>
              </View>
            ) : (
              <>
                {/* Summary bar */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[#B8B3E0] text-[12px]">
                    {providers.length} of {counts[activeTab] ?? "?"} providers
                  </Text>
                  {activeTab === "PENDING" && pendingCount > 0 && (
                    <View className="flex-row items-center gap-1.5 bg-[#3D2F0F] border border-[#FFC53D]/30 px-2.5 py-1 rounded-full">
                      <AppIcon name="alert-circle" size={11} color="#FFC53D" />
                      <Text className="text-[#FFC53D] text-[11px] font-bold">Action required</Text>
                    </View>
                  )}
                </View>

                {providers.map((p) => (
                  <ProviderCard key={p.id} provider={p} onPress={() => openDetail(p)} />
                ))}

                {loadingMore && (
                  <View className="items-center py-4">
                    <ActivityIndicator color="#7C5CFF" />
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <ProviderDetailSheet
        provider={selectedProvider}
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedProvider(null);
        }}
        onUpdated={handleUpdated}
      />
    </View>
  );
}
