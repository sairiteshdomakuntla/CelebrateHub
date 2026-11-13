import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Share,
  Linking,
  Switch,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import { BASE_URL } from "@/lib/api";
import * as WebBrowser from "expo-web-browser";
import {
  giftsApi,
  type GiftItem,
  type GiftContribution,
  type GiftCircleResponse,
  type GiftPriority,
  GIFT_CATEGORIES,
} from "@/lib/gifts.api";

// ─── Visual Priority & Status Helpers ────────────────────────────────────────

const PRIORITY_META: Record<GiftPriority, { label: string; bg: string; text: string; icon: string }> = {
  HIGH:   { label: "Most Wanted",   bg: "#3D2F0F", text: "#FFC53D", icon: "star" },
  MEDIUM: { label: "Recommended",   bg: "#1B2A55", text: "#8FB4FF", icon: "bookmark" },
  LOW:    { label: "Nice to Have",  bg: "#2A2460", text: "#B8B3E0", icon: "heart" },
};

const CATEGORY_MAP = Object.fromEntries(
  GIFT_CATEGORIES.map((c) => [c.key, c])
);

export default function GiftCircleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
  const eventId = params.id || params.eventId || "";

  const [data, setData] = useState<GiftCircleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState("");

  // Target item for claim / contribution
  const [selectedItem, setSelectedItem] = useState<GiftItem | null>(null);

  // Form states - Add Item
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemCategory, setItemCategory] = useState("GENERAL");
  const [itemTargetAmount, setItemTargetAmount] = useState("");
  const [itemIsGroup, setItemIsGroup] = useState(false);
  const [itemPriority, setItemPriority] = useState<GiftPriority>("MEDIUM");
  const [itemExternalUrl, setItemExternalUrl] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Form states - Contribute / Cash Fund
  const [contribAmount, setContribAmount] = useState("1000");
  const [contribName, setContribName] = useState("");
  const [contribMessage, setContribMessage] = useState("");
  const [contribAnonymous, setContribAnonymous] = useState(false);
  const [submittingContrib, setSubmittingContrib] = useState(false);

  // Form states - Claim Item
  const [claimantName, setClaimantName] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // ─── Fetch data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await giftsApi.getCircle(eventId);
      setData(res);
    } catch (err: any) {
      Alert.alert("Registry Error", err?.response?.data?.message || err.message || "Failed to load Gift Circle");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─── Filtered Items ─────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (!data) return [];
    if (activeTab === "ALL") return data.items;
    if (activeTab === "CASH_FUND") return data.items.filter((i) => i.isGroupGift || i.category === "CASH_FUND");
    if (activeTab === "CLAIMED") return data.items.filter((i) => i.status === "CLAIMED" || i.status === "COMPLETED");
    if (activeTab === "WISHLIST") return data.items.filter((i) => !i.isGroupGift && i.status === "AVAILABLE");
    return data.items.filter((i) => i.category === activeTab);
  }, [data, activeTab]);

  // ─── Share Registry ─────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!data) return;
    const hostName = data.event.customer?.name || "Host";
    const eventName = data.event.title || `${data.event.type} Celebration`;
    const eventDate = new Date(data.event.eventDate).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const publicUrl = `${BASE_URL}/registry/${eventId}`;
    const message =
      `🎁 *Gift Circle & Registry for ${eventName}* 🎉\n\n` +
      `We warmly invite you to view our celebration registry & wishlist organized by ${hostName}!\n` +
      `You can view items, promise a gift, or send sweet blessings directly online:\n\n` +
      `📅 ${eventDate}\n` +
      `📍 ${data.event.location}\n\n` +
      `👉 View & Contribute Online (No app needed):\n${publicUrl}\n\n` +
      `Let's celebrate together! ✨`;

    try {
      await Share.share({
        message,
        title: `Gift Circle for ${eventName}`,
      });
    } catch {
      // User cancelled
    }
  };

  // ─── Add Item Handler ───────────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!itemTitle.trim()) {
      Alert.alert("Validation", "Please enter a gift title");
      return;
    }

    setSavingItem(true);
    try {
      const target = itemTargetAmount ? parseInt(itemTargetAmount.replace(/[^0-9]/g, ""), 10) : undefined;
      await giftsApi.addItem(eventId, {
        title: itemTitle.trim(),
        description: itemDesc.trim() || undefined,
        category: itemCategory,
        targetAmount: target,
        isGroupGift: itemIsGroup || itemCategory === "CASH_FUND",
        priority: itemPriority,
        externalUrl: itemExternalUrl.trim() || undefined,
      });

      setShowAddModal(false);
      setItemTitle("");
      setItemDesc("");
      setItemTargetAmount("");
      setItemExternalUrl("");
      setItemIsGroup(false);
      loadData();
      Alert.alert("Success", "Gift item added to your registry!");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to add item");
    } finally {
      setSavingItem(false);
    }
  };

  // ─── Contribute Handler ─────────────────────────────────────────────────────

  const handleContribute = async () => {
    const amountNum = parseInt(contribAmount.replace(/[^0-9]/g, ""), 10);
    if (!amountNum || amountNum < 10) {
      Alert.alert("Validation", "Please enter an amount of at least ₹10");
      return;
    }
    if (!contribName.trim() && !contribAnonymous) {
      Alert.alert("Validation", "Please enter your name or toggle 'Anonymous'");
      return;
    }

    setSubmittingContrib(true);
    try {
      await giftsApi.contribute(eventId, {
        giftItemId: selectedItem?.id || undefined,
        contributorName: contribAnonymous ? "Well-Wisher" : contribName.trim(),
        amount: amountNum,
        message: contribMessage.trim() || undefined,
        isAnonymous: contribAnonymous,
      });

      setShowContributeModal(false);
      setCelebrationMsg(
        `Thank you for contributing ₹${amountNum.toLocaleString("en-IN")}! Your warm blessing has been sent to the host.`
      );
      setShowCelebration(true);
      setContribMessage("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to record contribution");
    } finally {
      setSubmittingContrib(false);
    }
  };

  // ─── Claim Item Handler ─────────────────────────────────────────────────────

  const handleClaim = async () => {
    if (!selectedItem) return;
    if (!claimantName.trim()) {
      Alert.alert("Validation", "Please enter your name so the host knows who to thank!");
      return;
    }

    setSubmittingClaim(true);
    try {
      await giftsApi.claimItem(selectedItem.id, claimantName.trim());
      setShowClaimModal(false);
      setCelebrationMsg(
        `Wonderful! You have promised to gift "${selectedItem.title}". The host has been notified with your sweet gesture.`
      );
      setShowCelebration(true);
      setClaimantName("");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to claim item");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // ─── Unclaim Handler ───────────────────────────────────────────────────────

  const handleUnclaim = (item: GiftItem) => {
    Alert.alert(
      "Unclaim Item",
      `Are you sure you want to make "${item.title}" available again?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Make Available",
          style: "destructive",
          onPress: async () => {
            try {
              await giftsApi.unclaimItem(item.id);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to unclaim");
            }
          },
        },
      ]
    );
  };

  // ─── Delete Item Handler ───────────────────────────────────────────────────

  const handleDeleteItem = (item: GiftItem) => {
    Alert.alert(
      "Remove Item",
      `Remove "${item.title}" from your Gift Circle?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await giftsApi.deleteItem(item.id);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  // ─── Thank Contributor Handler ─────────────────────────────────────────────

  const handleThank = async (contribution: GiftContribution) => {
    try {
      await giftsApi.thankContribution(contribution.id);
      loadData();
      Alert.alert("Thank You Sent", `Thank-you note marked for ${contribution.contributorName}! ❤️`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to thank");
    }
  };

  // ─── Render Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#120F2B] items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C5CFF" />
        <Text className="text-[#B8B3E0] text-[14px] font-medium mt-3">Loading Gift Circle...</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const isHost = data?.isHost ?? false;

  return (
    <SafeAreaView className="flex-1 bg-[#120F2B]" edges={["top"]}>
      <StatusBar style="light" />

      {/* ─── Top Navigation Header ────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#1E1A3F] border-b border-[#322C63]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
          activeOpacity={0.7}
        >
          <AppIcon name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="items-center flex-1 px-2">
          <Text className="text-white text-[16px] font-bold" numberOfLines={1}>
            {data?.event.title || `${data?.event.type || "Event"} Registry`}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <AppIcon name="gift" size={11} color="#FFC53D" />
            <Text className="text-[#FFC53D] text-[11px] font-semibold tracking-wide uppercase">
              Gift Circle & Registry
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          className="w-10 h-10 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center"
          activeOpacity={0.7}
        >
          <AppIcon name="share-2" size={17} color="#7C5CFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Festive Banner Card ────────────────────────────────────── */}
        <View className="m-4 p-5 rounded-3xl bg-[#1E1A3F] border border-[#322C63] shadow-md relative overflow-hidden">
          {/* Subtle glow decorative background */}
          <View className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#7C5CFF]/20 blur-2xl" />
          <View className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#D6307F]/20 blur-xl" />

          {/* Header Tag */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 bg-[#2A2460] px-3 py-1 rounded-full border border-[#322C63]">
              <AppIcon name="star" size={12} color="#FFC53D" />
              <Text className="text-[#FFC53D] text-[12px] font-medium tracking-wide">
                CELEBRATION REGISTRY
              </Text>
            </View>
            {isHost && (
              <View className="bg-[#7C5CFF] px-2.5 py-0.5 rounded-full">
                <Text className="text-white text-[11px] font-semibold">Host View</Text>
              </View>
            )}
          </View>

          {/* Title & Host info */}
          <Text className="text-white text-[22px] font-extrabold mt-3.5 leading-tight">
            {data?.event.title || "Celebration Registry"}
          </Text>
          <Text className="text-[#B8B3E0] text-[13px] mt-1">
            Organized by <Text className="text-white font-medium">{data?.event.customer.name}</Text>
          </Text>

          {/* Raised progress / target counter */}
          <View className="mt-4 pt-4 border-t border-[#322C63]">
            <View className="flex-row items-baseline justify-between mb-1.5">
              <View>
                <Text className="text-[#B8B3E0] text-[11px] font-semibold uppercase tracking-wider">
                  Total Blessings & Funds
                </Text>
                <Text className="text-[#FFC53D] text-[24px] font-black mt-0.5">
                  ₹{(stats?.totalCollectedAmount || 0).toLocaleString("en-IN")}
                </Text>
              </View>
              {stats?.totalTargetAmount ? (
                <View className="items-end">
                  <Text className="text-[#B8B3E0] text-[11px]">Goal</Text>
                  <Text className="text-white text-[15px] font-semibold">
                    ₹{stats.totalTargetAmount.toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Progress bar per color-palette.md: track border, fill accent, height 10, radius 5 */}
            {stats && stats.totalTargetAmount > 0 && (
              <View className="w-full h-2.5 bg-[#322C63] rounded-[5px] overflow-hidden mt-1.5 mb-2">
                <View
                  className="h-full bg-[#FFC53D] rounded-[5px]"
                  style={{ width: `${Math.min(100, stats.percentageFunded)}%` }}
                />
              </View>
            )}
          </View>

          {/* Quick Metrics Bar */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#322C63]">
            <View className="items-center flex-1">
              <Text className="text-[#B8B3E0] text-[11px]">Gifts</Text>
              <Text className="text-white text-[16px] font-bold mt-0.5">
                {stats?.totalItems || 0}
              </Text>
            </View>
            <View className="h-6 w-px bg-[#322C63]" />
            <View className="items-center flex-1">
              <Text className="text-[#B8B3E0] text-[11px]">Claimed</Text>
              <Text className="text-[#6EE7B7] text-[16px] font-bold mt-0.5">
                {stats?.claimedItems || 0}
              </Text>
            </View>
            <View className="h-6 w-px bg-[#322C63]" />
            <View className="items-center flex-1">
              <Text className="text-[#B8B3E0] text-[11px]">Blessings</Text>
              <Text className="text-[#FFC53D] text-[16px] font-bold mt-0.5">
                {stats?.contributionsCount || 0}
              </Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View className="flex-row items-center gap-2.5 mt-5">
            <TouchableOpacity
              onPress={() => {
                setSelectedItem(null);
                setContribAmount("1000");
                setShowContributeModal(true);
              }}
              className="flex-1 flex-row items-center justify-center gap-2 py-3 bg-[#7C5CFF] rounded-xl active:opacity-90 shadow-sm"
            >
              <AppIcon name="dollar-sign" size={16} color="#FFFFFF" />
              <Text className="text-white text-[14px] font-bold">Chip In / Bless</Text>
            </TouchableOpacity>

            {isHost && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="flex-row items-center justify-center gap-1.5 px-4 py-3 bg-[#2A2460] border border-[#322C63] rounded-xl active:opacity-90"
              >
                <AppIcon name="plus" size={16} color="#FFFFFF" />
                <Text className="text-white text-[14px] font-semibold">Add Gift</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Public Guest Registry Share Banner (No login needed) ────────── */}
        <View className="mx-4 mb-4 p-4 rounded-2xl bg-[#1E1A3F] border border-[#322C63] flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <AppIcon name="globe" size={13} color="#7C5CFF" />
              <Text className="text-[#7C5CFF] text-[11px] font-bold uppercase tracking-wider">
                Public Guest Registry
              </Text>
            </View>
            <Text className="text-[#B8B3E0] text-[12px] font-medium leading-relaxed">
              Guests can view, claim gifts, and send cash blessings directly from any browser — no app or account required!
            </Text>
          </View>
          <View className="gap-1.5">
            <TouchableOpacity
              onPress={handleShare}
              className="bg-[#7C5CFF] px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-xs active:opacity-90"
            >
              <AppIcon name="share-2" size={13} color="#FFFFFF" />
              <Text className="text-white text-[12px] font-bold">Share Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => WebBrowser.openBrowserAsync(`${BASE_URL}/registry/${eventId}`)}
              className="bg-[#2A2460] border border-[#322C63] px-3 py-1.5 rounded-xl items-center active:opacity-90"
            >
              <Text className="text-[#B8B3E0] text-[11px] font-semibold">Preview Web</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Category Filter Tabs ────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 mb-3"
          contentContainerStyle={{ gap: 8, paddingRight: 24 }}
        >
          {GIFT_CATEGORIES.map((cat) => {
            const isSelected = activeTab === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setActiveTab(cat.key)}
                className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
                  isSelected
                    ? "bg-[#7C5CFF] border-[#7C5CFF]"
                    : "bg-[#1E1A3F] border-[#322C63]"
                }`}
                activeOpacity={0.7}
              >
                <AppIcon
                  name={cat.icon as any}
                  size={13}
                  color={isSelected ? "#FFFFFF" : cat.color}
                />
                <Text
                  className={`text-[12px] font-semibold ${
                    isSelected ? "text-white" : "text-[#B8B3E0]"
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Registry Items List ─────────────────────────────────────────── */}
        <View className="px-4 mt-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-[16px] font-bold">
              Registry Items ({filteredItems.length})
            </Text>
            {isHost && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="flex-row items-center gap-1 py-1 px-2.5 rounded-lg bg-[#2A2460] border border-[#322C63]"
              >
                <AppIcon name="plus" size={12} color="#7C5CFF" />
                <Text className="text-[#7C5CFF] text-[12px] font-semibold">Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View className="p-8 rounded-2xl bg-[#1E1A3F] border border-[#322C63] items-center justify-center my-2">
              <View className="w-14 h-14 rounded-2xl bg-[#2A2460] items-center justify-center mb-3">
                <AppIcon name="gift" size={26} color="#7C5CFF" />
              </View>
              <Text className="text-white text-[16px] font-bold text-center">
                No items in this category yet
              </Text>
              <Text className="text-[#B8B3E0] text-[13px] text-center mt-1 px-6">
                {isHost
                  ? "Tap 'Add Gift' above to add wishlist items or group cash funds for your guests!"
                  : "Check other categories or send a cash blessing directly!"}
              </Text>
              {isHost && (
                <TouchableOpacity
                  onPress={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-[#7C5CFF] rounded-xl flex-row items-center gap-2 shadow-sm"
                >
                  <AppIcon name="plus" size={14} color="#FFFFFF" />
                  <Text className="text-white text-[13px] font-semibold">Add First Item</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredItems.map((item) => {
              const catMeta = CATEGORY_MAP[item.category] || CATEGORY_MAP.GENERAL;
              const priority = PRIORITY_META[item.priority] || PRIORITY_META.MEDIUM;
              const isClaimed = item.status === "CLAIMED" || item.status === "COMPLETED";
              const isFund = item.isGroupGift || item.category === "CASH_FUND";

              return (
                <View
                  key={item.id}
                  className={`p-4 mb-3 rounded-2xl bg-[#1E1A3F] border ${
                    isClaimed
                      ? "border-[#322C63] opacity-85"
                      : "border-[#322C63] shadow-xs"
                  }`}
                >
                  {/* Top category chip + priority badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View
                      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md"
                      style={{ backgroundColor: "#2A2460" }}
                    >
                      <AppIcon name={catMeta.icon as any} size={11} color={catMeta.color} />
                      <Text
                        className="text-[11px] font-bold tracking-tight"
                        style={{ color: catMeta.color }}
                      >
                        {catMeta.label}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      {item.priority === "HIGH" && (
                        <View
                          className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: priority.bg }}
                        >
                          <AppIcon name="star" size={10} color={priority.text} />
                          <Text
                            className="text-[10px] font-bold"
                            style={{ color: priority.text }}
                          >
                            {priority.label}
                          </Text>
                        </View>
                      )}

                      {/* Status indicator */}
                      {isClaimed ? (
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-[#123B34]">
                          <AppIcon name="check" size={10} color="#6EE7B7" />
                          <Text className="text-[#6EE7B7] text-[10px] font-bold">
                            {item.status === "COMPLETED" ? "Funded" : "Claimed"}
                          </Text>
                        </View>
                      ) : (
                        <View className="px-2 py-0.5 rounded-full bg-[#1B2A55]">
                          <Text className="text-[#8FB4FF] text-[10px] font-bold">Available</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Title & description */}
                  <Text className="text-white text-[16px] font-bold leading-snug">
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text className="text-[#B8B3E0] text-[13px] mt-1 line-clamp-2">
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Cash fund progress or target price */}
                  {isFund ? (
                    <View className="mt-3 p-3 rounded-xl bg-[#2A2460] border border-[#322C63]">
                      <View className="flex-row items-baseline justify-between mb-1">
                        <Text className="text-[#B8B3E0] text-[11px] font-semibold uppercase">
                          Group Fund Progress
                        </Text>
                        <Text className="text-[#FFC53D] text-[13px] font-bold">
                          ₹{item.collectedAmount.toLocaleString("en-IN")}
                          {item.targetAmount ? ` / ₹${item.targetAmount.toLocaleString("en-IN")}` : ""}
                        </Text>
                      </View>

                      {item.targetAmount ? (
                        <View className="w-full h-2 bg-[#322C63] rounded-full overflow-hidden mt-1">
                          <View
                            className="h-full bg-[#6EE7B7] rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((item.collectedAmount / item.targetAmount) * 100)
                              )}%`,
                            }}
                          />
                        </View>
                      ) : null}

                      <Text className="text-[#B8B3E0] text-[11px] mt-1.5">
                        Multiple guests can chip in any amount!
                      </Text>
                    </View>
                  ) : item.targetAmount ? (
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <Text className="text-[#B8B3E0] text-[12px]">Target Price:</Text>
                      <Text className="text-[#FFC53D] text-[14px] font-bold">
                        ₹{item.targetAmount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  ) : null}

                  {/* Claimed by banner */}
                  {item.claimedBy ? (
                    <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#322C63]">
                      <View className="flex-row items-center gap-1.5">
                        <AppIcon name="heart" size={12} color="#D6307F" />
                        <Text className="text-[#B8B3E0] text-[12px] font-medium">
                          Promised by <Text className="font-bold text-white">{item.claimedBy}</Text>
                        </Text>
                      </View>
                      {isHost && (
                        <TouchableOpacity
                          onPress={() => handleUnclaim(item)}
                          className="px-2 py-1 rounded bg-[#2A2460] border border-[#322C63]"
                        >
                          <Text className="text-[#B8B3E0] text-[11px] font-semibold">Reset</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-[#322C63]">
                    {item.externalUrl && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(item.externalUrl!)}
                        className="flex-row items-center gap-1 py-2 px-3 rounded-xl bg-[#2A2460] border border-[#322C63]"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="external-link" size={12} color="#FFFFFF" />
                        <Text className="text-white text-[12px] font-semibold">Store Link</Text>
                      </TouchableOpacity>
                    )}

                    {isFund ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(item);
                          setContribAmount("1000");
                          setShowContributeModal(true);
                        }}
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#7C5CFF] active:opacity-90 shadow-sm"
                      >
                        <AppIcon name="dollar-sign" size={14} color="#FFFFFF" />
                        <Text className="text-white text-[13px] font-bold">Chip In</Text>
                      </TouchableOpacity>
                    ) : !isClaimed ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(item);
                          setShowClaimModal(true);
                        }}
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#7C5CFF] active:opacity-90 shadow-sm"
                      >
                        <AppIcon name="gift" size={14} color="#FFFFFF" />
                        <Text className="text-white text-[13px] font-bold">I Will Gift This</Text>
                      </TouchableOpacity>
                    ) : null}

                    {isHost && (
                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item)}
                        className="w-9 h-9 rounded-xl bg-[#3F1420] border border-[#FF8FA3]/30 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="trash-2" size={14} color="#FF8FA3" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Blessings & Love Notes Wall ─────────────────────────────────── */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <AppIcon name="heart" size={16} color="#D6307F" />
              <Text className="text-white text-[16px] font-bold">
                Blessings & Love Notes ({data?.contributions.length || 0})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedItem(null);
                setShowContributeModal(true);
              }}
              className="py-1 px-2.5 rounded-lg bg-[#2A2460] border border-[#322C63]"
            >
              <Text className="text-[#FFC53D] text-[12px] font-semibold">+ Add Blessing</Text>
            </TouchableOpacity>
          </View>

          {data?.contributions && data.contributions.length > 0 ? (
            data.contributions.map((c) => (
              <View
                key={c.id}
                className="p-4 mb-2.5 rounded-2xl bg-[#1E1A3F] border border-[#322C63] shadow-xs"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center">
                      <Text className="text-[#FFC53D] text-[12px] font-bold">
                        {c.contributorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white text-[13px] font-bold">
                        {c.contributorName}
                      </Text>
                      {c.giftItem ? (
                        <Text className="text-[#B8B3E0] text-[11px]">
                          towards {c.giftItem.title}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-[#6EE7B7] text-[14px] font-extrabold">
                      +₹{c.amount.toLocaleString("en-IN")}
                    </Text>
                    {c.thanked ? (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <AppIcon name="check" size={10} color="#B8B3E0" />
                        <Text className="text-[#B8B3E0] text-[10px]">Thanked</Text>
                      </View>
                    ) : isHost ? (
                      <TouchableOpacity
                        onPress={() => handleThank(c)}
                        className="mt-1 px-2 py-0.5 rounded-full bg-[#2A2460] border border-[#322C63]"
                      >
                        <Text className="text-[#FFC53D] text-[10px] font-bold">Say Thanks ❤️</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {c.message ? (
                  <View className="mt-2.5 p-2.5 rounded-xl bg-[#2A2460] border border-[#322C63]">
                    <Text className="text-[#B8B3E0] text-[12px] italic leading-relaxed">
                      "{c.message}"
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View className="p-6 rounded-2xl bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
              <AppIcon name="smile" size={24} color="#7C77A6" />
              <Text className="text-white text-[13px] font-semibold mt-2">
                No blessings posted yet
              </Text>
              <Text className="text-[#B8B3E0] text-[11px] text-center mt-0.5">
                Be the first to chip in and send your heartwarming wishes!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL: Add Gift Item (Host Only) ────────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl max-h-[88%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#322C63]">
              <View>
                <Text className="text-white text-[17px] font-bold">Add Registry Item</Text>
                <Text className="text-[#B8B3E0] text-[12px]">Add a wishlist item or group cash fund</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#B8B3E0" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Item / Fund Title *
              </Text>
              <TextInput
                value={itemTitle}
                onChangeText={setItemTitle}
                placeholder="e.g. Honeymoon Dinner, Espresso Machine"
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-3"
              />

              {/* Category Selector */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1.5">
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  {GIFT_CATEGORIES.filter((c) => c.key !== "ALL").map((cat) => {
                    const selected = itemCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setItemCategory(cat.key)}
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                          selected
                            ? "bg-[#7C5CFF] border-[#7C5CFF]"
                            : "bg-[#2A2460] border-[#322C63]"
                        }`}
                      >
                        <AppIcon
                          name={cat.icon as any}
                          size={11}
                          color={selected ? "#FFFFFF" : cat.color}
                        />
                        <Text
                          className={`text-[12px] font-semibold ${
                            selected ? "text-white" : "text-[#B8B3E0]"
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Group Gift / Cash Fund Toggle */}
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-[#2A2460] border border-[#322C63] mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[13px] font-bold">Group Fund (Chip-In)</Text>
                  <Text className="text-[#B8B3E0] text-[11px]">
                    Allows multiple guests to contribute any amount
                  </Text>
                </View>
                <Switch
                  value={itemIsGroup || itemCategory === "CASH_FUND"}
                  onValueChange={setItemIsGroup}
                  trackColor={{ false: "#322C63", true: "#7C5CFF" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Target Price */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Target Amount (₹ optional)
              </Text>
              <TextInput
                value={itemTargetAmount}
                onChangeText={setItemTargetAmount}
                placeholder="e.g. 5000"
                keyboardType="numeric"
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-3"
              />

              {/* Priority */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1.5">
                Priority
              </Text>
              <View className="flex-row gap-2 mb-3">
                {(["HIGH", "MEDIUM", "LOW"] as GiftPriority[]).map((p) => {
                  const selected = itemPriority === p;
                  const meta = PRIORITY_META[p];
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setItemPriority(p)}
                      className={`flex-1 py-2 rounded-xl items-center border ${
                        selected
                          ? "bg-[#7C5CFF] border-[#7C5CFF]"
                          : "bg-[#2A2460] border-[#322C63]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          selected ? "text-white" : "text-[#B8B3E0]"
                        }`}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Store URL */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Online Store Link (Optional)
              </Text>
              <TextInput
                value={itemExternalUrl}
                onChangeText={setItemExternalUrl}
                placeholder="https://amazon.in/..."
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-3"
              />

              {/* Description */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Notes for Guests
              </Text>
              <TextInput
                value={itemDesc}
                onChangeText={setItemDesc}
                placeholder="Any preferences, color, or delivery notes..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-4"
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleAddItem}
                disabled={savingItem}
                className="py-3.5 bg-[#7C5CFF] rounded-xl items-center active:opacity-90 shadow-sm"
              >
                {savingItem ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">Add to Registry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Chip In / Cash Blessing ─────────────────────────────── */}
      <Modal visible={showContributeModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl max-h-[85%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#322C63]">
              <View>
                <Text className="text-white text-[17px] font-bold">
                  {selectedItem ? `Chip in: ${selectedItem.title}` : "Send Celebration Blessing"}
                </Text>
                <Text className="text-[#B8B3E0] text-[12px]">
                  Pledge your gift and share warm wishes with the host
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowContributeModal(false)}
                className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#B8B3E0" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Quick Amount Pills */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-2">
                Select Amount (₹)
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {["500", "1000", "2500", "5000", "10000"].map((amt) => {
                  const isSel = contribAmount === amt;
                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setContribAmount(amt)}
                      className={`px-4 py-2 rounded-xl border ${
                        isSel
                          ? "bg-[#7C5CFF] border-[#7C5CFF]"
                          : "bg-[#2A2460] border-[#322C63]"
                      }`}
                    >
                      <Text
                        className={`text-[13px] font-extrabold ${
                          isSel ? "text-white" : "text-[#B8B3E0]"
                        }`}
                      >
                        ₹{parseInt(amt, 10).toLocaleString("en-IN")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom amount */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Or Custom Amount (₹)
              </Text>
              <TextInput
                value={contribAmount}
                onChangeText={setContribAmount}
                placeholder="Amount in INR"
                placeholderTextColor="#7C77A6"
                keyboardType="numeric"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[16px] font-bold mb-3"
              />

              {/* Contributor Name */}
              {!contribAnonymous && (
                <>
                  <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                    Your Full Name *
                  </Text>
                  <TextInput
                    value={contribName}
                    onChangeText={setContribName}
                    placeholder="e.g. Priya & Rahul"
                    placeholderTextColor="#7C77A6"
                    className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-3"
                  />
                </>
              )}

              {/* Anonymous Toggle */}
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-[#2A2460] border border-[#322C63] mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-[13px] font-bold">
                    Secret Well-Wisher (Anonymous)
                  </Text>
                  <Text className="text-[#B8B3E0] text-[11px]">
                    Hide your name on the public blessings wall
                  </Text>
                </View>
                <Switch
                  value={contribAnonymous}
                  onValueChange={setContribAnonymous}
                  trackColor={{ false: "#322C63", true: "#7C5CFF" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Message */}
              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Warm Blessing / Congratulatory Note
              </Text>
              <TextInput
                value={contribMessage}
                onChangeText={setContribMessage}
                placeholder="Wishing you a lifetime of joy and happiness! ❤️"
                multiline
                numberOfLines={3}
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-4"
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleContribute}
                disabled={submittingContrib}
                className="py-3.5 bg-[#7C5CFF] rounded-xl items-center active:opacity-90 shadow-sm"
              >
                {submittingContrib ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">
                    Send Blessing (₹{parseInt(contribAmount || "0", 10).toLocaleString("en-IN")})
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Claim Gift Item ─────────────────────────────────────── */}
      <Modal visible={showClaimModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#322C63]">
              <View>
                <Text className="text-white text-[17px] font-bold">Claim This Gift</Text>
                <Text className="text-[#B8B3E0] text-[12px]">
                  Promise to gift "{selectedItem?.title}"
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowClaimModal(false)}
                className="w-8 h-8 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#B8B3E0" />
              </TouchableOpacity>
            </View>

            <View className="mt-4">
              <Text className="text-[#B8B3E0] text-[13px] leading-relaxed mb-3">
                By claiming this item, other guests will see it as reserved so the host doesn't
                receive duplicates! You can buy it online or bring it in person.
              </Text>

              <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-1">
                Your Full Name *
              </Text>
              <TextInput
                value={claimantName}
                onChangeText={setClaimantName}
                placeholder="e.g. Vikram Sharma"
                placeholderTextColor="#7C77A6"
                className="py-3 px-3.5 rounded-xl border border-[#322C63] bg-[#2A2460] text-white text-[14px] mb-4"
              />

              <TouchableOpacity
                onPress={handleClaim}
                disabled={submittingClaim}
                className="py-3.5 bg-[#7C5CFF] rounded-xl items-center active:opacity-90 shadow-sm"
              >
                {submittingClaim ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">Confirm & Reserve Gift</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Celebration Popup ───────────────────────────────────── */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full bg-[#1E1A3F] border border-[#322C63] rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-[#2A2460] border-2 border-[#7C5CFF] items-center justify-center mb-3">
              <AppIcon name="gift" size={30} color="#FFC53D" />
            </View>

            <Text className="text-white text-[20px] font-extrabold text-center">
              Wonderful Gesture! 🎉
            </Text>

            <Text className="text-[#B8B3E0] text-[14px] text-center mt-2 leading-relaxed">
              {celebrationMsg}
            </Text>

            <TouchableOpacity
              onPress={() => setShowCelebration(false)}
              className="mt-6 w-full py-3 bg-[#7C5CFF] rounded-xl items-center shadow-sm"
            >
              <Text className="text-white text-[14px] font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
