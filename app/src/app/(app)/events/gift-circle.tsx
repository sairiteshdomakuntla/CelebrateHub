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
  HIGH:   { label: "Most Wanted",   bg: "#FEF3C7", text: "#92400E", icon: "star" },
  MEDIUM: { label: "Recommended",   bg: "#E0E7FF", text: "#3730A3", icon: "bookmark" },
  LOW:    { label: "Nice to Have",  bg: "#F3F4F6", text: "#4B5563", icon: "heart" },
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
    const message =
      `🎁 *Gift Circle & Registry for ${eventName}* 🎉\n\n` +
      `We invite you to view our gift wishlist and celebration funds organized by ${hostName}!\n` +
      `You can pledge a gift, chip into group funds, or leave sweet blessings.\n\n` +
      `👉 View Gift Registry: CelebrateHub App → Event ID: ${eventId}\n` +
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
      <SafeAreaView className="flex-1 bg-[#FAF9F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-[#6E6E73] text-[14px] font-medium mt-3">Loading Gift Circle...</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const isHost = data?.isHost ?? false;

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F5]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ─── Top Navigation Header ────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-[#F0EEEA]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F5F4F0] items-center justify-center"
          activeOpacity={0.7}
        >
          <AppIcon name="arrow-left" size={18} color="#1C1C1E" />
        </TouchableOpacity>

        <View className="items-center flex-1 px-2">
          <Text className="text-[#1C1C1E] text-[16px] font-bold" numberOfLines={1}>
            {data?.event.title || `${data?.event.type || "Event"} Registry`}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <AppIcon name="gift" size={11} color="#4F46E5" />
            <Text className="text-[#4F46E5] text-[11px] font-semibold tracking-wide uppercase">
              Gift Circle & Registry
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          className="w-10 h-10 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] items-center justify-center"
          activeOpacity={0.7}
        >
          <AppIcon name="share-2" size={17} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Festive Banner Card ────────────────────────────────────── */}
        <View className="m-4 p-5 rounded-3xl bg-[#1C1C1E] shadow-sm relative overflow-hidden">
          {/* Subtle glow decorative background */}
          <View className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#4F46E5]/30 blur-2xl" />
          <View className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#EC4899]/20 blur-xl" />

          {/* Header Tag */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <AppIcon name="star" size={12} color="#FBBF24" />
              <Text className="text-white text-[12px] font-medium tracking-wide">
                CELEBRATION REGISTRY
              </Text>
            </View>
            {isHost && (
              <View className="bg-[#4F46E5] px-2.5 py-0.5 rounded-full">
                <Text className="text-white text-[11px] font-semibold">Host View</Text>
              </View>
            )}
          </View>

          {/* Title & Host info */}
          <Text className="text-white text-[22px] font-extrabold mt-3.5 leading-tight">
            {data?.event.title || "Celebration Registry"}
          </Text>
          <Text className="text-[#A1A1AA] text-[13px] mt-1">
            Organized by <Text className="text-white font-medium">{data?.event.customer.name}</Text>
          </Text>

          {/* Raised progress / target counter */}
          <View className="mt-4 pt-4 border-t border-white/10">
            <View className="flex-row items-baseline justify-between mb-1.5">
              <View>
                <Text className="text-[#A1A1AA] text-[11px] font-semibold uppercase tracking-wider">
                  Total Blessings & Funds
                </Text>
                <Text className="text-white text-[24px] font-black mt-0.5">
                  ₹{(stats?.totalCollectedAmount || 0).toLocaleString("en-IN")}
                </Text>
              </View>
              {stats?.totalTargetAmount ? (
                <View className="items-end">
                  <Text className="text-[#A1A1AA] text-[11px]">Goal</Text>
                  <Text className="text-[#E4E4E7] text-[15px] font-semibold">
                    ₹{stats.totalTargetAmount.toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Progress bar */}
            {stats && stats.totalTargetAmount > 0 && (
              <View className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden mt-1.5 mb-2">
                <View
                  className="h-full bg-gradient-to-r bg-[#4F46E5] rounded-full"
                  style={{ width: `${Math.min(100, stats.percentageFunded)}%` }}
                />
              </View>
            )}
          </View>

          {/* Quick Metrics Bar */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-white/10">
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Gifts</Text>
              <Text className="text-white text-[16px] font-bold mt-0.5">
                {stats?.totalItems || 0}
              </Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Claimed</Text>
              <Text className="text-[#34D399] text-[16px] font-bold mt-0.5">
                {stats?.claimedItems || 0}
              </Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Blessings</Text>
              <Text className="text-[#FBBF24] text-[16px] font-bold mt-0.5">
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
              className="flex-1 flex-row items-center justify-center gap-2 py-3 bg-[#4F46E5] rounded-xl active:opacity-90"
            >
              <AppIcon name="dollar-sign" size={16} color="#FFFFFF" />
              <Text className="text-white text-[14px] font-bold">Chip In / Bless</Text>
            </TouchableOpacity>

            {isHost && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="flex-row items-center justify-center gap-1.5 px-4 py-3 bg-white/15 border border-white/20 rounded-xl active:opacity-90"
              >
                <AppIcon name="plus" size={16} color="#FFFFFF" />
                <Text className="text-white text-[14px] font-semibold">Add Gift</Text>
              </TouchableOpacity>
            )}
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
                    ? "bg-[#1C1C1E] border-[#1C1C1E]"
                    : "bg-white border-[#E5E3DD]"
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
                    isSelected ? "text-white" : "text-[#3A3A3C]"
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
            <Text className="text-[#1C1C1E] text-[16px] font-bold">
              Registry Items ({filteredItems.length})
            </Text>
            {isHost && (
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                className="flex-row items-center gap-1 py-1 px-2.5 rounded-lg bg-[#EEF2FF]"
              >
                <AppIcon name="plus" size={12} color="#4F46E5" />
                <Text className="text-[#4F46E5] text-[12px] font-semibold">Add New</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View className="p-8 rounded-2xl bg-white border border-[#EBE8E3] items-center justify-center my-2">
              <View className="w-14 h-14 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
                <AppIcon name="gift" size={26} color="#4F46E5" />
              </View>
              <Text className="text-[#1C1C1E] text-[16px] font-bold text-center">
                No items in this category yet
              </Text>
              <Text className="text-[#8E8E93] text-[13px] text-center mt-1 px-6">
                {isHost
                  ? "Tap 'Add Gift' above to add wishlist items or group cash funds for your guests!"
                  : "Check other categories or send a cash blessing directly!"}
              </Text>
              {isHost && (
                <TouchableOpacity
                  onPress={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 bg-[#4F46E5] rounded-xl flex-row items-center gap-2"
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
                  className={`p-4 mb-3 rounded-2xl bg-white border ${
                    isClaimed
                      ? "border-[#E5E5EA] opacity-90"
                      : "border-[#E8E6E1] shadow-xs"
                  }`}
                >
                  {/* Top category chip + priority badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View
                      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md"
                      style={{ backgroundColor: catMeta.bg }}
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
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF6EE]">
                          <AppIcon name="check" size={10} color="#1E7A3C" />
                          <Text className="text-[#1E7A3C] text-[10px] font-bold">
                            {item.status === "COMPLETED" ? "Funded" : "Claimed"}
                          </Text>
                        </View>
                      ) : (
                        <View className="px-2 py-0.5 rounded-full bg-[#EEF2FF]">
                          <Text className="text-[#4F46E5] text-[10px] font-bold">Available</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Title & description */}
                  <Text className="text-[#1C1C1E] text-[16px] font-bold leading-snug">
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text className="text-[#6E6E73] text-[13px] mt-1 line-clamp-2">
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Cash fund progress or target price */}
                  {isFund ? (
                    <View className="mt-3 p-3 rounded-xl bg-[#F7F7F5] border border-[#F0EEEA]">
                      <View className="flex-row items-baseline justify-between mb-1">
                        <Text className="text-[#8E8E93] text-[11px] font-semibold uppercase">
                          Group Fund Progress
                        </Text>
                        <Text className="text-[#1C1C1E] text-[13px] font-bold">
                          ₹{item.collectedAmount.toLocaleString("en-IN")}
                          {item.targetAmount ? ` / ₹${item.targetAmount.toLocaleString("en-IN")}` : ""}
                        </Text>
                      </View>

                      {item.targetAmount ? (
                        <View className="w-full h-2 bg-[#E5E3DD] rounded-full overflow-hidden mt-1">
                          <View
                            className="h-full bg-[#1E7A3C] rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((item.collectedAmount / item.targetAmount) * 100)
                              )}%`,
                            }}
                          />
                        </View>
                      ) : null}

                      <Text className="text-[#6E6E73] text-[11px] mt-1.5">
                        Multiple guests can chip in any amount!
                      </Text>
                    </View>
                  ) : item.targetAmount ? (
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <Text className="text-[#8E8E93] text-[12px]">Target Price:</Text>
                      <Text className="text-[#1C1C1E] text-[14px] font-bold">
                        ₹{item.targetAmount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  ) : null}

                  {/* Claimed by banner */}
                  {item.claimedBy ? (
                    <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#F0EEEA]">
                      <View className="flex-row items-center gap-1.5">
                        <AppIcon name="heart" size={12} color="#EC4899" />
                        <Text className="text-[#3A3A3C] text-[12px] font-medium">
                          Promised by <Text className="font-bold text-[#1C1C1E]">{item.claimedBy}</Text>
                        </Text>
                      </View>
                      {isHost && (
                        <TouchableOpacity
                          onPress={() => handleUnclaim(item)}
                          className="px-2 py-1 rounded bg-[#F1EFEC]"
                        >
                          <Text className="text-[#6E6E73] text-[11px] font-semibold">Reset</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-[#F0EEEA]">
                    {item.externalUrl && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(item.externalUrl!)}
                        className="flex-row items-center gap-1 py-2 px-3 rounded-xl bg-[#F5F4F0] border border-[#E5E3DD]"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="external-link" size={12} color="#3A3A3C" />
                        <Text className="text-[#3A3A3C] text-[12px] font-semibold">Store Link</Text>
                      </TouchableOpacity>
                    )}

                    {isFund ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedItem(item);
                          setContribAmount("1000");
                          setShowContributeModal(true);
                        }}
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#4F46E5] active:opacity-90"
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
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#1C1C1E] active:opacity-90"
                      >
                        <AppIcon name="gift" size={14} color="#FFFFFF" />
                        <Text className="text-white text-[13px] font-bold">I Will Gift This</Text>
                      </TouchableOpacity>
                    ) : null}

                    {isHost && (
                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item)}
                        className="w-9 h-9 rounded-xl bg-[#FEE2E2] items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="trash-2" size={14} color="#B3261E" />
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
              <AppIcon name="heart" size={16} color="#EC4899" />
              <Text className="text-[#1C1C1E] text-[16px] font-bold">
                Blessings & Love Notes ({data?.contributions.length || 0})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedItem(null);
                setShowContributeModal(true);
              }}
              className="py-1 px-2.5 rounded-lg bg-[#FDF2F8]"
            >
              <Text className="text-[#DB2777] text-[12px] font-semibold">+ Add Blessing</Text>
            </TouchableOpacity>
          </View>

          {data?.contributions && data.contributions.length > 0 ? (
            data.contributions.map((c) => (
              <View
                key={c.id}
                className="p-4 mb-2.5 rounded-2xl bg-white border border-[#EBE8E3] shadow-xs"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-8 h-8 rounded-full bg-[#F3E8FF] items-center justify-center">
                      <Text className="text-[#7E22CE] text-[12px] font-bold">
                        {c.contributorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[#1C1C1E] text-[13px] font-bold">
                        {c.contributorName}
                      </Text>
                      {c.giftItem ? (
                        <Text className="text-[#8E8E93] text-[11px]">
                          towards {c.giftItem.title}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-[#1E7A3C] text-[14px] font-extrabold">
                      +₹{c.amount.toLocaleString("en-IN")}
                    </Text>
                    {c.thanked ? (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <AppIcon name="check" size={10} color="#6E6E73" />
                        <Text className="text-[#6E6E73] text-[10px]">Thanked</Text>
                      </View>
                    ) : isHost ? (
                      <TouchableOpacity
                        onPress={() => handleThank(c)}
                        className="mt-1 px-2 py-0.5 rounded-full bg-[#EEF2FF]"
                      >
                        <Text className="text-[#4F46E5] text-[10px] font-bold">Say Thanks ❤️</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {c.message ? (
                  <View className="mt-2.5 p-2.5 rounded-xl bg-[#FAF9F5] border border-[#F2EFE9]">
                    <Text className="text-[#3A3A3C] text-[12px] italic leading-relaxed">
                      "{c.message}"
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View className="p-6 rounded-2xl bg-white border border-[#EBE8E3] items-center justify-center">
              <AppIcon name="smile" size={24} color="#A1A1AA" />
              <Text className="text-[#3A3A3C] text-[13px] font-semibold mt-2">
                No blessings posted yet
              </Text>
              <Text className="text-[#8E8E93] text-[11px] text-center mt-0.5">
                Be the first to chip in and send your heartwarming wishes!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL: Add Gift Item (Host Only) ────────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[88%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">Add Registry Item</Text>
                <Text className="text-[#8E8E93] text-[12px]">Add a wishlist item or group cash fund</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Item / Fund Title *
              </Text>
              <TextInput
                value={itemTitle}
                onChangeText={setItemTitle}
                placeholder="e.g. Honeymoon Dinner, Espresso Machine"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Category Selector */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">
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
                            ? "bg-[#1C1C1E] border-[#1C1C1E]"
                            : "bg-[#F7F7F5] border-[#E5E3DD]"
                        }`}
                      >
                        <AppIcon
                          name={cat.icon as any}
                          size={11}
                          color={selected ? "#FFFFFF" : cat.color}
                        />
                        <Text
                          className={`text-[12px] font-semibold ${
                            selected ? "text-white" : "text-[#3A3A3C]"
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
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#EBE8E3] mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[#1C1C1E] text-[13px] font-bold">Group Fund (Chip-In)</Text>
                  <Text className="text-[#8E8E93] text-[11px]">
                    Allows multiple guests to contribute any amount
                  </Text>
                </View>
                <Switch
                  value={itemIsGroup || itemCategory === "CASH_FUND"}
                  onValueChange={setItemIsGroup}
                  trackColor={{ false: "#E5E3DD", true: "#4F46E5" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Target Price */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Target Amount (₹ optional)
              </Text>
              <TextInput
                value={itemTargetAmount}
                onChangeText={setItemTargetAmount}
                placeholder="e.g. 5000"
                keyboardType="numeric"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Priority */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">
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
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          selected ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Store URL */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Online Store Link (Optional)
              </Text>
              <TextInput
                value={itemExternalUrl}
                onChangeText={setItemExternalUrl}
                placeholder="https://amazon.in/..."
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Description */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Notes for Guests
              </Text>
              <TextInput
                value={itemDesc}
                onChangeText={setItemDesc}
                placeholder="Any preferences, color, or delivery notes..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleAddItem}
                disabled={savingItem}
                className="py-3.5 bg-[#4F46E5] rounded-xl items-center active:opacity-90"
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">
                  {selectedItem ? `Chip in: ${selectedItem.title}` : "Send Celebration Blessing"}
                </Text>
                <Text className="text-[#8E8E93] text-[12px]">
                  Pledge your gift and share warm wishes with the host
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowContributeModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Quick Amount Pills */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-2">
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
                          ? "bg-[#4F46E5] border-[#4F46E5]"
                          : "bg-[#F7F7F5] border-[#E5E3DD]"
                      }`}
                    >
                      <Text
                        className={`text-[13px] font-extrabold ${
                          isSel ? "text-white" : "text-[#1C1C1E]"
                        }`}
                      >
                        ₹{parseInt(amt, 10).toLocaleString("en-IN")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom amount */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Or Custom Amount (₹)
              </Text>
              <TextInput
                value={contribAmount}
                onChangeText={setContribAmount}
                placeholder="Amount in INR"
                keyboardType="numeric"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[16px] font-bold mb-3"
              />

              {/* Contributor Name */}
              {!contribAnonymous && (
                <>
                  <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                    Your Full Name *
                  </Text>
                  <TextInput
                    value={contribName}
                    onChangeText={setContribName}
                    placeholder="e.g. Priya & Rahul"
                    placeholderTextColor="#A1A1AA"
                    className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
                  />
                </>
              )}

              {/* Anonymous Toggle */}
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#EBE8E3] mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-[#1C1C1E] text-[13px] font-bold">
                    Secret Well-Wisher (Anonymous)
                  </Text>
                  <Text className="text-[#8E8E93] text-[11px]">
                    Hide your name on the public blessings wall
                  </Text>
                </View>
                <Switch
                  value={contribAnonymous}
                  onValueChange={setContribAnonymous}
                  trackColor={{ false: "#E5E3DD", true: "#4F46E5" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Message */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Warm Blessing / Congratulatory Note
              </Text>
              <TextInput
                value={contribMessage}
                onChangeText={setContribMessage}
                placeholder="Wishing you a lifetime of joy and happiness! ❤️"
                multiline
                numberOfLines={3}
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={handleContribute}
                disabled={submittingContrib}
                className="py-3.5 bg-[#4F46E5] rounded-xl items-center active:opacity-90"
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">Claim This Gift</Text>
                <Text className="text-[#8E8E93] text-[12px]">
                  Promise to gift "{selectedItem?.title}"
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowClaimModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <View className="mt-4">
              <Text className="text-[#3A3A3C] text-[13px] leading-relaxed mb-3">
                By claiming this item, other guests will see it as reserved so the host doesn't
                receive duplicates! You can buy it online or bring it in person.
              </Text>

              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Your Full Name *
              </Text>
              <TextInput
                value={claimantName}
                onChangeText={setClaimantName}
                placeholder="e.g. Vikram Sharma"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              <TouchableOpacity
                onPress={handleClaim}
                disabled={submittingClaim}
                className="py-3.5 bg-[#1C1C1E] rounded-xl items-center active:opacity-90"
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
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-6 items-center shadow-xl">
            <View className="w-16 h-16 rounded-full bg-[#EEF2FF] border-2 border-[#C7D2FE] items-center justify-center mb-3">
              <AppIcon name="gift" size={30} color="#4F46E5" />
            </View>

            <Text className="text-[#1C1C1E] text-[20px] font-extrabold text-center">
              Wonderful Gesture! 🎉
            </Text>

            <Text className="text-[#4B5563] text-[14px] text-center mt-2 leading-relaxed">
              {celebrationMsg}
            </Text>

            <TouchableOpacity
              onPress={() => setShowCelebration(false)}
              className="mt-6 w-full py-3 bg-[#4F46E5] rounded-xl items-center"
            >
              <Text className="text-white text-[14px] font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
