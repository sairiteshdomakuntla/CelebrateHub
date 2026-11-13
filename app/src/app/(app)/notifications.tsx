import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  notificationsApi,
  type AppNotification,
  type NotificationType,
  NOTIF_META,
} from "@/lib/notifications.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Notification card ────────────────────────────────────────────────────────

function NotifCard({
  item,
  onRead,
  onDelete,
}: {
  item: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = NOTIF_META[item.type as NotificationType] ?? NOTIF_META.SYSTEM;

  return (
    <TouchableOpacity
      onPress={() => !item.isRead && onRead(item.id)}
      activeOpacity={item.isRead ? 1 : 0.7}
      className={`flex-row gap-3 p-4 rounded-2xl mb-2.5 border ${
        item.isRead
          ? "bg-[#1E1A3F] border-[#322C63]"
          : "bg-[#2A2460] border-[#7C5CFF]/40 shadow-sm"
      }`}
    >
      {/* Type icon */}
      <View
        style={{ backgroundColor: meta.bg }}
        className="w-11 h-11 rounded-2xl items-center justify-center flex-shrink-0 mt-0.5 border border-white/5"
      >
        <AppIcon name={meta.icon as any} size={18} color={meta.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className={`text-[14px] leading-[19px] flex-1 ${
              item.isRead ? "text-[#B8B3E0] font-medium" : "text-white font-bold"
            }`}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-[#6C6694] text-[11px] mt-0.5 flex-shrink-0">
            {formatRelative(item.createdAt)}
          </Text>
        </View>

        <Text
          className="text-[#B8B3E0] text-[13px] leading-[18px] mt-1"
          numberOfLines={3}
        >
          {item.body}
        </Text>

        {/* Type chip */}
        <View className="flex-row items-center justify-between mt-2.5">
          <View
            style={{ backgroundColor: meta.bg }}
            className="self-start px-2 py-0.5 rounded-full border border-white/5"
          >
            <Text style={{ color: meta.color }} className="text-[10px] font-bold uppercase tracking-wider">
              {item.type}
            </Text>
          </View>

          {/* Delete action */}
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
            className="w-7 h-7 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center active:bg-[#322C63]"
          >
            <AppIcon name="x" size={12} color="#B8B3E0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread dot */}
      {!item.isRead && (
        <View className="absolute top-4 left-3 w-2 h-2 rounded-full bg-[#7C5CFF]" />
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: "ALL",    label: "All" },
  { key: "UNREAD", label: "Unread" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterKey>("ALL");

  const fetchNotifications = useCallback(
    async (filterKey: FilterKey, pageNum: number, append = false) => {
      try {
        const result = await notificationsApi.list({
          unreadOnly: filterKey === "UNREAD",
          page: pageNum,
          pageSize: 20,
        });

        setNotifications((prev) =>
          append ? [...prev, ...result.notifications] : result.notifications
        );
        setUnreadCount(result.unreadCount);
        setTotalPages(result.pagination.totalPages);
      } catch (err: any) {
        Alert.alert("Error", err?.response?.data?.message || "Could not load notifications.");
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchNotifications(filter, 1).finally(() => setLoading(false));
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchNotifications(filter, 1);
    setRefreshing(false);
  }, [filter]);

  async function loadMore() {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    await fetchNotifications(filter, next, true);
    setLoadingMore(false);
  }

  async function handleRead(id: string) {
    try {
      const updated = await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await notificationsApi.delete(id);
      const notif = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not delete notification.");
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearRead() {
    Alert.alert(
      "Clear Read",
      "Delete all read notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              const result = await notificationsApi.clearRead();
              setNotifications((prev) => prev.filter((n) => !n.isRead));
              Alert.alert("Done", `${result.deleted} notifications cleared.`);
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Could not clear notifications.");
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }

  const hasRead = notifications.some((n) => n.isRead);

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-[#322C63]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center mr-3 active:bg-[#2A2460]"
          >
            <AppIcon name="arrow-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-white text-[18px] font-bold">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-[#FFC53D] text-[12px] font-semibold mt-0.5">
                {unreadCount} unread
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View className="flex-row gap-2">
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                disabled={markingAll}
                className="flex-row items-center gap-1.5 bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 px-3 py-1.5 rounded-full active:bg-[#7C5CFF]/30"
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color="#7C5CFF" />
                ) : (
                  <>
                    <AppIcon name="check-circle" size={13} color="#7C5CFF" />
                    <Text className="text-[#7C5CFF] text-[12px] font-bold">All read</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {hasRead && (
              <TouchableOpacity
                onPress={handleClearRead}
                disabled={clearing}
                className="w-8 h-8 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center active:bg-[#2A2460]"
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#B8B3E0" />
                ) : (
                  <AppIcon name="trash-2" size={14} color="#B8B3E0" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter tabs */}
        <View className="flex-row mx-5 my-3 gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border transition-all ${
                  isActive
                    ? "bg-[#7C5CFF] border-[#7C5CFF] shadow-sm"
                    : "bg-[#1E1A3F] border-[#322C63]"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    isActive ? "text-white font-bold" : "text-[#B8B3E0]"
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.key === "UNREAD" && unreadCount > 0 && (
                  <View className="bg-[#FFC53D] min-w-[18px] h-[18px] rounded-full items-center justify-center px-1">
                    <Text className="text-[#120F2B] text-[10px] font-black">{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C5CFF" />
            <Text className="text-[#B8B3E0] text-[13px] mt-3">Loading notifications...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#7C5CFF"
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 60) {
                loadMore();
              }
            }}
            scrollEventThrottle={16}
          >
            {notifications.length === 0 ? (
              <View className="items-center py-20">
                {/* Illustrative icon */}
                <View className="w-20 h-20 rounded-3xl bg-[#1E1A3F] border border-[#322C63] items-center justify-center mb-4 shadow-sm">
                  <AppIcon name="bell-off" size={32} color="#7C5CFF" />
                </View>
                <Text className="text-white text-[16px] font-bold">
                  {filter === "UNREAD" ? "You're all caught up!" : "No notifications yet"}
                </Text>
                <Text className="text-[#B8B3E0] text-[13px] text-center mt-1.5 px-10 leading-5">
                  {filter === "UNREAD"
                    ? "No unread notifications at the moment."
                    : "Lead alerts, booking updates and review notifications will appear here."}
                </Text>
              </View>
            ) : (
              <>
                {/* Group label */}
                <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-wider mb-3">
                  {filter === "UNREAD" ? `${unreadCount} Unread` : `${notifications.length} notifications`}
                </Text>

                {notifications.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                ))}

                {loadingMore && (
                  <View className="items-center py-4">
                    <ActivityIndicator color="#7C5CFF" />
                  </View>
                )}

                {page >= totalPages && notifications.length > 0 && (
                  <Text className="text-center text-[#6C6694] text-[12px] mt-2">
                    You've reached the end
                  </Text>
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
