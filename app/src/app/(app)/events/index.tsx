import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import { AppIcon } from "@/components/ui/pro-icon";
import {
  eventsApi,
  type Event,
  EVENT_TYPE_META,
  EVENT_STATUS_META,
} from "@/lib/events.api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EventCard({ event, index, onPress, onDelete }: {
  event: Event;
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  useEffect(() => {
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 320 }));
    translateY.value = withDelay(index * 60, withTiming(0, { duration: 320 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const meta = EVENT_TYPE_META[event.type];
  const statusMeta = EVENT_STATUS_META[event.status];

  return (
    <Animated.View style={style} className="mb-3">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.78}
        className="bg-white border border-[#E8E6E1] rounded-2xl p-4"
      >
        {/* Header row */}
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-3">
            <View className="w-11 h-11 rounded-xl bg-[#F7F7F5] border border-[#EFEEEA] items-center justify-center">
              <Text className="text-[22px]">{meta.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#1C1C1E] text-[15px] font-semibold" numberOfLines={1}>
                {event.title || meta.label}
              </Text>
              <Text className="text-[#6E6E73] text-[12px] mt-0.5">
                {meta.label}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onDelete}
            className="w-8 h-8 rounded-full bg-[#F7F7F5] items-center justify-center"
          >
            <AppIcon name="trash-2" size={14} color="#B3261E" />
          </TouchableOpacity>
        </View>

        {/* Date & location */}
        <View className="mt-3 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="calendar" size={13} color="#6E6E73" />
            <Text className="text-[#3A3A3C] text-[13px]">{formatDate(event.eventDate)}</Text>
            {event.startTime && (
              <Text className="text-[#A7A7AB] text-[12px]">· {event.startTime}</Text>
            )}
          </View>
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="map-pin" size={13} color="#6E6E73" />
            <Text className="text-[#3A3A3C] text-[13px]" numberOfLines={1}>{event.location}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row items-center gap-3 mt-3 pt-3 border-t border-[#F0EEEA]">
          {event.guestCount && (
            <View className="flex-row items-center gap-1">
              <AppIcon name="users" size={12} color="#A7A7AB" />
              <Text className="text-[#6E6E73] text-[12px]">{event.guestCount} guests</Text>
            </View>
          )}
          {event.services.length > 0 && (
            <View className="flex-row items-center gap-1">
              <AppIcon name="briefcase" size={12} color="#A7A7AB" />
              <Text className="text-[#6E6E73] text-[12px]">{event.services.length} service{event.services.length !== 1 ? "s" : ""}</Text>
            </View>
          )}
          <View className="flex-1 items-end">
            <View style={{ backgroundColor: statusMeta.bg }} className="px-2.5 py-1 rounded-full">
              <Text style={{ color: statusMeta.text }} className="text-[11px] font-semibold">
                {statusMeta.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const headerOpacity = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  const load = useCallback(async () => {
    try {
      const data = await eventsApi.list();
      setEvents(data);
    } catch {
      // silent – show empty state
    }
  }, []);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 350 });
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function confirmDelete(event: Event) {
    Alert.alert(
      "Delete event",
      `Permanently delete "${event.title || EVENT_TYPE_META[event.type].label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await eventsApi.delete(event.id);
              setEvents((prev) => prev.filter((e) => e.id !== event.id));
            } catch {
              Alert.alert("Error", "Could not delete event. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <Animated.View style={headerStyle} className="px-5 pt-4 pb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[#1C1C1E] text-[26px] font-bold tracking-tight">My Events</Text>
            <Text className="text-[#6E6E73] text-[13px] mt-0.5">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/events/create" as any)}
            className="bg-[#1C1C1E] flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
            activeOpacity={0.85}
          >
            <AppIcon name="plus" size={14} color="#FFFFFF" />
            <Text className="text-white text-[13px] font-semibold">New</Text>
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1C1C1E" />
          </View>
        ) : events.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />}
          >
            <View className="w-16 h-16 rounded-2xl bg-white border border-[#E8E6E1] items-center justify-center mb-4">
              <Text className="text-[28px]">🎉</Text>
            </View>
            <Text className="text-[#1C1C1E] text-[18px] font-bold text-center">No events yet</Text>
            <Text className="text-[#6E6E73] text-[14px] text-center mt-2 mb-6">
              Create your first event and we'll help you find the right vendors.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/events/create" as any)}
              className="bg-[#1C1C1E] px-6 py-3.5 rounded-xl"
              activeOpacity={0.85}
            >
              <Text className="text-white text-[14px] font-semibold">Plan an event</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />}
          >
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                onPress={() => router.push(`/events/${event.id}` as any)}
                onDelete={() => confirmDelete(event)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
