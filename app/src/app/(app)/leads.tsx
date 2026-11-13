import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  leadsApi,
  type LeadItem,
  type LeadStats,
} from "@/lib/leads.api";
import { EVENT_TYPE_META } from "@/lib/events.api";

type TabType = "available" | "accepted" | "history";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount?: number | null) {
  if (amount == null) return null;
  return "₹" + amount.toLocaleString("en-IN");
}

export default function ProviderLeadsScreen() {
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: TabType =
    tabParam === "accepted" || tabParam === "history" ? tabParam : "available";
  const [tab, setTab] = useState<TabType>(initialTab);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState<LeadStats>({ availableCount: 0, acceptedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingLeadId, setActingLeadId] = useState<string | null>(null);

  // Accept modal state
  const [selectedLeadForAccept, setSelectedLeadForAccept] = useState<LeadItem | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");

  const loadData = useCallback(async (currentTab: TabType) => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        leadsApi.getLeads(currentTab),
        leadsApi.getStats(),
      ]);
      setLeads(leadsRes);
      setStats(statsRes);
    } catch (err: any) {
      console.error("Failed to load leads", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(tab).finally(() => setLoading(false));
  }, [tab, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(tab);
    setRefreshing(false);
  }, [tab, loadData]);

  async function handleConfirmAccept() {
    if (!selectedLeadForAccept) return;
    const leadId = selectedLeadForAccept.leadId;
    setActingLeadId(leadId);
    try {
      const priceNum = quotePrice.trim() ? parseInt(quotePrice.replace(/[^0-9]/g, ""), 10) : undefined;
      const res = await leadsApi.acceptLead(leadId, {
        agreedPrice: priceNum,
        notes: quoteNotes.trim() || undefined,
      });

      setSelectedLeadForAccept(null);
      setQuotePrice("");
      setQuoteNotes("");

      Alert.alert(
        "🎉 Lead Accepted!",
        "Congratulations! This event service is now confirmed with you. The client's direct contact details are now unlocked.",
        [
          {
            text: "View in Bookings",
            onPress: () => setTab("accepted"),
          },
        ]
      );
      await loadData(tab);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not accept lead. It may have already been claimed.";
      Alert.alert("Unable to Accept", msg);
      await loadData(tab);
    } finally {
      setActingLeadId(null);
    }
  }

  function handleDecline(lead: LeadItem) {
    Alert.alert(
      "Decline Lead",
      `Are you sure you want to pass on this request for ${lead.service.category.name}? It will remain open for other providers.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setActingLeadId(lead.leadId);
            try {
              await leadsApi.declineLead(lead.leadId);
              await loadData(tab);
            } catch (err: any) {
              Alert.alert("Error", "Could not decline lead.");
            } finally {
              setActingLeadId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-5 pt-3 pb-4 bg-[#120F2B] border-b border-[#322C63] flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center shadow-sm"
            >
              <AppIcon name="arrow-left" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-[20px] font-bold text-white tracking-tight">
                Qualified Leads
              </Text>
              <Text className="text-[12px] text-[#B8B3E0] mt-0.5">
                First-come, first-served celebration requests
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-10 h-10 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center shadow-sm active:bg-[#2A2460]"
          >
            <AppIcon name="refresh-cw" size={16} color="#B8B3E0" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View className="px-5 py-3 bg-[#120F2B]">
          <View className="flex-row bg-[#1E1A3F] p-1 rounded-xl border border-[#322C63]">
            {/* Available */}
            <TouchableOpacity
              onPress={() => setTab("available")}
              className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
                tab === "available" ? "bg-[#7C5CFF] shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "available" ? "text-white" : "text-[#B8B3E0]"
                }`}
              >
                Available
              </Text>
              {stats.availableCount > 0 && (
                <View className="bg-[#FFC53D] rounded-full px-1.5 py-0.2 min-w-[18px] items-center justify-center">
                  <Text className="text-[11px] font-bold text-[#120F2B]">
                    {stats.availableCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Accepted / Bookings */}
            <TouchableOpacity
              onPress={() => setTab("accepted")}
              className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
                tab === "accepted" ? "bg-[#7C5CFF] shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "accepted" ? "text-white" : "text-[#B8B3E0]"
                }`}
              >
                Bookings
              </Text>
              {stats.acceptedCount > 0 && (
                <View className="bg-[#123B34] border border-[#6EE7B7]/40 rounded-full px-1.5 py-0.2 min-w-[18px] items-center justify-center">
                  <Text className="text-[11px] font-bold text-[#6EE7B7]">
                    {stats.acceptedCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* History */}
            <TouchableOpacity
              onPress={() => setTab("history")}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                tab === "history" ? "bg-[#7C5CFF] shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "history" ? "text-white" : "text-[#B8B3E0]"
                }`}
              >
                History
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C5CFF" />
            <Text className="text-[#B8B3E0] text-[13px] mt-3">Fetching qualified leads...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />
            }
          >
            {leads.length === 0 ? (
              <View className="items-center justify-center py-16 px-6">
                <View className="w-16 h-16 rounded-2xl bg-[#1E1A3F] border border-[#322C63] items-center justify-center mb-4">
                  <AppIcon
                    name={tab === "available" ? "inbox" : tab === "accepted" ? "check-circle" : "clock"}
                    size={28}
                    color="#7C5CFF"
                  />
                </View>
                <Text className="text-white text-[17px] font-semibold text-center">
                  {tab === "available"
                    ? "No Pending Leads"
                    : tab === "accepted"
                    ? "No Confirmed Bookings Yet"
                    : "No Past Leads"}
                </Text>
                <Text className="text-[#B8B3E0] text-[13px] text-center mt-1.5 leading-relaxed">
                  {tab === "available"
                    ? "When clients create celebrations matching your registered service categories, they'll appear here immediately."
                    : tab === "accepted"
                    ? "When you accept qualified leads, confirmed client bookings and direct contact info will appear here."
                    : "Declined and past leads are archived here."}
                </Text>

                {tab === "available" && (
                  <TouchableOpacity
                    onPress={() => router.push("/provider-profile" as any)}
                    className="mt-6 bg-[#1E1A3F] border border-[#322C63] px-4 py-2.5 rounded-xl flex-row items-center gap-2 shadow-sm active:bg-[#2A2460]"
                  >
                    <AppIcon name="briefcase" size={14} color="#7C5CFF" />
                    <Text className="text-white text-[13px] font-semibold">
                      Manage Service Categories
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              leads.map((item, idx) => {
                const typeMeta = EVENT_TYPE_META[item.event.type] || {
                  label: item.event.type,
                  emoji: "🎉",
                };
                const isAvailableTab = tab === "available";
                const isAcceptedTab = tab === "accepted";
                const isActing = actingLeadId === item.leadId;

                return (
                  <View
                    key={item.leadProviderId}
                    className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-4 mb-3.5 shadow-sm"
                  >
                    {/* Top Row: Service Category & Event Type Badge */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-[#322C63]">
                      <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-lg bg-[#2A2460] border border-[#322C63] items-center justify-center">
                          <AppIcon
                            name={(item.service.category.icon as any) || "briefcase"}
                            size={14}
                            color="#7C5CFF"
                          />
                        </View>
                        <View>
                          <Text className="text-[14px] font-bold text-white">
                            {item.service.category.name}
                          </Text>
                          <Text className="text-[11px] text-[#B8B3E0]">
                            Requested Service
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-1.5 bg-[#2A2460] border border-[#322C63] px-2.5 py-1 rounded-full">
                        <Text className="text-[12px]">{typeMeta.emoji}</Text>
                        <Text className="text-[12px] font-medium text-white">
                          {typeMeta.label}
                        </Text>
                      </View>
                    </View>

                    {/* Event Title & Date/Location */}
                    <View className="mt-3">
                      <Text className="text-[16px] font-semibold text-white" numberOfLines={1}>
                        {item.event.title || `${typeMeta.label} Celebration`}
                      </Text>

                      <View className="mt-2.5 gap-2">
                        {/* Date & Time */}
                        <View className="flex-row items-center gap-2">
                          <AppIcon name="calendar" size={13} color="#7C5CFF" />
                          <Text className="text-[13px] text-[#B8B3E0] font-medium">
                            {formatDate(item.event.eventDate)}
                            {item.event.startTime && ` · ${item.event.startTime}`}
                          </Text>
                        </View>

                        {/* Location */}
                        <View className="flex-row items-center gap-2">
                          <AppIcon name="map-pin" size={13} color="#7C5CFF" />
                          <Text className="text-[13px] text-[#B8B3E0]" numberOfLines={1}>
                            {item.event.location}
                          </Text>
                        </View>

                        {/* Guest Count & Budget */}
                        <View className="flex-row items-center gap-4 mt-0.5">
                          {item.event.guestCount ? (
                            <View className="flex-row items-center gap-1.5">
                              <AppIcon name="users" size={13} color="#7C5CFF" />
                              <Text className="text-[13px] text-[#B8B3E0]">
                                {item.event.guestCount} guests
                              </Text>
                            </View>
                          ) : null}

                          {(item.event.budgetMin || item.event.budgetMax) && (
                            <View className="flex-row items-center gap-1.5">
                              <AppIcon name="credit-card" size={13} color="#FFC53D" />
                              <Text className="text-[13px] text-[#FFC53D] font-medium">
                                {formatCurrency(item.event.budgetMin)} - {formatCurrency(item.event.budgetMax)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Requirements box if present */}
                    {(item.service.requirements || item.event.requirements) && (
                      <View className="mt-3 p-2.5 rounded-xl bg-[#2A2460] border border-[#322C63]">
                        <Text className="text-[11px] font-semibold text-[#FFC53D] uppercase tracking-wide">
                          Client Notes
                        </Text>
                        <Text className="text-[12px] text-white mt-1 leading-relaxed">
                          {item.service.requirements || item.event.requirements}
                        </Text>
                      </View>
                    )}

                    {/* Accepted Booking Client Details Card */}
                    {isAcceptedTab && (
                      <View className="mt-3.5 pt-3 border-t border-[#322C63] bg-[#123B34]/40 border border-[#6EE7B7]/20 rounded-xl p-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <View className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
                            <Text className="text-[12px] font-bold text-[#6EE7B7] uppercase tracking-wide">
                              Booking Confirmed
                            </Text>
                          </View>
                          {item.booking?.agreedPrice ? (
                            <Text className="text-[13px] font-bold text-[#FFC53D]">
                              {formatCurrency(item.booking.agreedPrice)}
                            </Text>
                          ) : null}
                        </View>

                        <View className="mt-2.5 flex-row items-center justify-between">
                          <View>
                            <Text className="text-[14px] font-bold text-white">
                              {item.event.customer.name}
                            </Text>
                            {item.booking?.customer?.phone || item.event.customer.phone ? (
                              <Text className="text-[12px] text-[#B8B3E0] mt-0.5">
                                {item.booking?.customer?.phone || item.event.customer.phone}
                              </Text>
                            ) : null}
                          </View>

                          <View className="flex-row items-center gap-2">
                            {(item.booking?.customer?.phone || item.event.customer.phone) && (
                              <TouchableOpacity
                                onPress={() => {
                                  const phone = item.booking?.customer?.phone || item.event.customer.phone;
                                  if (phone) Linking.openURL(`tel:${phone}`);
                                }}
                                className="w-9 h-9 rounded-full bg-[#10B981] items-center justify-center shadow-sm active:opacity-80"
                              >
                                <AppIcon name="phone" size={15} color="#FFFFFF" />
                              </TouchableOpacity>
                            )}

                            {(item.booking?.customer?.email || item.event.customer.email) && (
                              <TouchableOpacity
                                onPress={() => {
                                  const email = item.booking?.customer?.email || item.event.customer.email;
                                  if (email) Linking.openURL(`mailto:${email}`);
                                }}
                                className="w-9 h-9 rounded-full bg-[#7C5CFF] items-center justify-center shadow-sm active:opacity-80"
                              >
                                <AppIcon name="mail" size={15} color="#FFFFFF" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Available Tab Action Buttons */}
                    {isAvailableTab && (
                      <View className="mt-3.5 pt-3 border-t border-[#322C63] flex-row items-center gap-2.5">
                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => handleDecline(item)}
                          className="flex-1 py-2.5 rounded-xl border border-[#322C63] bg-[#2A2460] items-center justify-center active:bg-[#322C63]"
                        >
                          <Text className="text-[13px] font-semibold text-[#FF8FA3]">
                            Decline
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => setSelectedLeadForAccept(item)}
                          className="flex-2 py-2.5 px-4 rounded-xl bg-[#7C5CFF] items-center justify-center flex-row gap-1.5 shadow-md active:bg-[#6848e0]"
                        >
                          {isActing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <AppIcon name="zap" size={14} color="#FFC53D" />
                              <Text className="text-[13px] font-bold text-white">
                                Accept Request
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* History Tab Status Tag */}
                    {tab === "history" && (
                      <View className="mt-3 pt-2.5 border-t border-[#322C63] flex-row items-center justify-between">
                        <Text className="text-[12px] text-[#B8B3E0]">
                          Status: {item.myStatus === "DECLINED" ? "Declined by you" : item.leadStatus}
                        </Text>
                        <Text className="text-[11px] text-[#6C6694]">
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Accept Lead Modal */}
        <Modal
          visible={selectedLeadForAccept != null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedLeadForAccept(null)}
        >
          <View className="flex-1 bg-black/75 justify-center items-center px-5">
            <View className="bg-[#1E1A3F] border border-[#322C63] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <View className="w-12 h-12 rounded-2xl bg-[#123B34] border border-[#6EE7B7]/30 items-center justify-center mb-3">
                <AppIcon name="zap" size={24} color="#FFC53D" />
              </View>

              <Text className="text-[18px] font-bold text-white">
                Accept Service Lead
              </Text>
              <Text className="text-[13px] text-[#B8B3E0] mt-1 leading-relaxed">
                Confirm your availability for{" "}
                <Text className="font-semibold text-white">
                  {selectedLeadForAccept?.service.category.name}
                </Text>{" "}
                at {selectedLeadForAccept?.event.location}.
              </Text>

              {/* Price Quote Field (Optional) */}
              <View className="mt-4">
                <Text className="text-[12px] font-semibold text-[#B8B3E0] mb-1.5">
                  Proposed Quote / Rate (₹ Optional)
                </Text>
                <TextInput
                  value={quotePrice}
                  onChangeText={setQuotePrice}
                  placeholder="e.g. 15000"
                  keyboardType="numeric"
                  placeholderTextColor="#6C6694"
                  className="bg-[#2A2460] border border-[#322C63] rounded-xl px-3.5 py-2.5 text-[14px] text-white"
                />
              </View>

              {/* Notes Field (Optional) */}
              <View className="mt-3">
                <Text className="text-[12px] font-semibold text-[#B8B3E0] mb-1.5">
                  Message for Client (Optional)
                </Text>
                <TextInput
                  value={quoteNotes}
                  onChangeText={setQuoteNotes}
                  placeholder="e.g. Looking forward to making your day special!"
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#6C6694"
                  className="bg-[#2A2460] border border-[#322C63] rounded-xl px-3.5 py-2.5 text-[14px] text-white"
                />
              </View>

              <View className="mt-6 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => setSelectedLeadForAccept(null)}
                  className="flex-1 py-3 rounded-xl border border-[#322C63] bg-[#2A2460] items-center justify-center active:bg-[#322C63]"
                >
                  <Text className="text-[14px] font-semibold text-[#B8B3E0]">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={actingLeadId != null}
                  onPress={handleConfirmAccept}
                  className="flex-1 py-3 rounded-xl bg-[#7C5CFF] items-center justify-center flex-row gap-1.5 shadow-md active:bg-[#6848e0]"
                >
                  {actingLeadId != null ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[14px] font-bold text-white">
                      Confirm & Claim
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
