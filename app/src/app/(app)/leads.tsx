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
import { useRouter } from "expo-router";
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
  const [tab, setTab] = useState<TabType>("available");
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
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-5 pt-3 pb-4 bg-[#F7F7F5] border-b border-[#EBEAE5] flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-[#E5E4E0] items-center justify-center shadow-xs"
            >
              <AppIcon name="arrow-left" size={18} color="#1C1C1E" />
            </TouchableOpacity>
            <View>
              <Text className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">
                Qualified Leads
              </Text>
              <Text className="text-[12px] text-[#6E6E73] mt-0.5">
                First-come, first-served requests
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-10 h-10 rounded-full bg-white border border-[#E5E4E0] items-center justify-center shadow-xs"
          >
            <AppIcon name="refresh-cw" size={16} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View className="px-5 py-3 bg-[#F7F7F5]">
          <View className="flex-row bg-[#ECEAE6] p-1 rounded-xl">
            {/* Available */}
            <TouchableOpacity
              onPress={() => setTab("available")}
              className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
                tab === "available" ? "bg-white shadow-xs" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "available" ? "text-[#1C1C1E]" : "text-[#7C7C80]"
                }`}
              >
                Available
              </Text>
              {stats.availableCount > 0 && (
                <View className="bg-[#1C1C1E] rounded-full px-1.5 py-0.2 min-w-[18px] items-center justify-center">
                  <Text className="text-[11px] font-bold text-white">
                    {stats.availableCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Accepted / Bookings */}
            <TouchableOpacity
              onPress={() => setTab("accepted")}
              className={`flex-1 py-2 rounded-lg items-center flex-row justify-center gap-1.5 ${
                tab === "accepted" ? "bg-white shadow-xs" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "accepted" ? "text-[#1C1C1E]" : "text-[#7C7C80]"
                }`}
              >
                Bookings
              </Text>
              {stats.acceptedCount > 0 && (
                <View className="bg-[#10B981] rounded-full px-1.5 py-0.2 min-w-[18px] items-center justify-center">
                  <Text className="text-[11px] font-bold text-white">
                    {stats.acceptedCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* History */}
            <TouchableOpacity
              onPress={() => setTab("history")}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                tab === "history" ? "bg-white shadow-xs" : ""
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  tab === "history" ? "text-[#1C1C1E]" : "text-[#7C7C80]"
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
            <ActivityIndicator size="large" color="#1C1C1E" />
            <Text className="text-[#6E6E73] text-[13px] mt-3">Fetching qualified leads...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />
            }
          >
            {leads.length === 0 ? (
              <View className="items-center justify-center py-16 px-6">
                <View className="w-16 h-16 rounded-2xl bg-[#ECEAE5] items-center justify-center mb-4">
                  <AppIcon
                    name={tab === "available" ? "inbox" : tab === "accepted" ? "check-circle" : "clock"}
                    size={28}
                    color="#8E8E93"
                  />
                </View>
                <Text className="text-[#1C1C1E] text-[17px] font-semibold text-center">
                  {tab === "available"
                    ? "No Pending Leads"
                    : tab === "accepted"
                    ? "No Confirmed Bookings Yet"
                    : "No Past Leads"}
                </Text>
                <Text className="text-[#6E6E73] text-[13px] text-center mt-1.5 leading-relaxed">
                  {tab === "available"
                    ? "When clients create celebrations matching your registered service categories, they'll appear here immediately."
                    : tab === "accepted"
                    ? "When you accept qualified leads, confirmed client bookings and direct contact info will appear here."
                    : "Declined and past leads are archived here."}
                </Text>

                {tab === "available" && (
                  <TouchableOpacity
                    onPress={() => router.push("/provider-profile" as any)}
                    className="mt-6 bg-white border border-[#E5E4E0] px-4 py-2.5 rounded-xl flex-row items-center gap-2 shadow-xs"
                  >
                    <AppIcon name="briefcase" size={14} color="#1C1C1E" />
                    <Text className="text-[#1C1C1E] text-[13px] font-semibold">
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
                    className="bg-white border border-[#E8E6E2] rounded-2xl p-4 mb-3.5 shadow-xs"
                  >
                    {/* Top Row: Service Category & Event Type Badge */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
                      <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-lg bg-[#F3F1EC] items-center justify-center">
                          <AppIcon
                            name={(item.service.category.icon as any) || "briefcase"}
                            size={14}
                            color="#1C1C1E"
                          />
                        </View>
                        <View>
                          <Text className="text-[14px] font-bold text-[#1C1C1E]">
                            {item.service.category.name}
                          </Text>
                          <Text className="text-[11px] text-[#8E8E93]">
                            Requested Service
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-1.5 bg-[#F7F7F5] border border-[#E8E6E1] px-2.5 py-1 rounded-full">
                        <Text className="text-[12px]">{typeMeta.emoji}</Text>
                        <Text className="text-[12px] font-medium text-[#3A3A3C]">
                          {typeMeta.label}
                        </Text>
                      </View>
                    </View>

                    {/* Event Title & Date/Location */}
                    <View className="mt-3">
                      <Text className="text-[16px] font-semibold text-[#1C1C1E]" numberOfLines={1}>
                        {item.event.title || `${typeMeta.label} Celebration`}
                      </Text>

                      <View className="mt-2.5 gap-2">
                        {/* Date & Time */}
                        <View className="flex-row items-center gap-2">
                          <AppIcon name="calendar" size={13} color="#6E6E73" />
                          <Text className="text-[13px] text-[#3A3A3C] font-medium">
                            {formatDate(item.event.eventDate)}
                            {item.event.startTime && ` · ${item.event.startTime}`}
                          </Text>
                        </View>

                        {/* Location */}
                        <View className="flex-row items-center gap-2">
                          <AppIcon name="map-pin" size={13} color="#6E6E73" />
                          <Text className="text-[13px] text-[#3A3A3C]" numberOfLines={1}>
                            {item.event.location}
                          </Text>
                        </View>

                        {/* Guest Count & Budget */}
                        <View className="flex-row items-center gap-4 mt-0.5">
                          {item.event.guestCount ? (
                            <View className="flex-row items-center gap-1.5">
                              <AppIcon name="users" size={13} color="#6E6E73" />
                              <Text className="text-[13px] text-[#3A3A3C]">
                                {item.event.guestCount} guests
                              </Text>
                            </View>
                          ) : null}

                          {(item.event.budgetMin || item.event.budgetMax) && (
                            <View className="flex-row items-center gap-1.5">
                              <AppIcon name="credit-card" size={13} color="#6E6E73" />
                              <Text className="text-[13px] text-[#3A3A3C] font-medium">
                                {formatCurrency(item.event.budgetMin)} - {formatCurrency(item.event.budgetMax)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Requirements box if present */}
                    {(item.service.requirements || item.event.requirements) && (
                      <View className="mt-3 p-2.5 rounded-xl bg-[#F7F7F5] border border-[#EBEAE6]">
                        <Text className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                          Client Notes
                        </Text>
                        <Text className="text-[12px] text-[#3A3A3C] mt-1 leading-relaxed">
                          {item.service.requirements || item.event.requirements}
                        </Text>
                      </View>
                    )}

                    {/* Accepted Booking Client Details Card */}
                    {isAcceptedTab && (
                      <View className="mt-3.5 pt-3 border-t border-[#F0EEEA] bg-[#F9F9F8] rounded-xl p-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1.5">
                            <View className="w-2 h-2 rounded-full bg-[#10B981]" />
                            <Text className="text-[12px] font-bold text-[#10B981] uppercase tracking-wide">
                              Booking Confirmed
                            </Text>
                          </View>
                          {item.booking?.agreedPrice ? (
                            <Text className="text-[13px] font-bold text-[#1C1C1E]">
                              {formatCurrency(item.booking.agreedPrice)}
                            </Text>
                          ) : null}
                        </View>

                        <View className="mt-2.5 flex-row items-center justify-between">
                          <View>
                            <Text className="text-[14px] font-bold text-[#1C1C1E]">
                              {item.event.customer.name}
                            </Text>
                            {item.booking?.customer?.phone || item.event.customer.phone ? (
                              <Text className="text-[12px] text-[#6E6E73] mt-0.5">
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
                                className="w-9 h-9 rounded-full bg-[#10B981] items-center justify-center shadow-xs"
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
                                className="w-9 h-9 rounded-full bg-[#1C1C1E] items-center justify-center shadow-xs"
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
                      <View className="mt-3.5 pt-3 border-t border-[#F0EEEA] flex-row items-center gap-2.5">
                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => handleDecline(item)}
                          className="flex-1 py-2.5 rounded-xl border border-[#DEDCD7] items-center justify-center active:bg-[#ECEAE6]"
                        >
                          <Text className="text-[13px] font-semibold text-[#6E6E73]">
                            Decline
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => setSelectedLeadForAccept(item)}
                          className="flex-2 py-2.5 px-4 rounded-xl bg-[#1C1C1E] items-center justify-center flex-row gap-1.5 shadow-sm active:bg-black"
                        >
                          {isActing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <AppIcon name="zap" size={14} color="#FBBF24" />
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
                      <View className="mt-3 pt-2.5 border-t border-[#F0EEEA] flex-row items-center justify-between">
                        <Text className="text-[12px] text-[#8E8E93]">
                          Status: {item.myStatus === "DECLINED" ? "Declined by you" : item.leadStatus}
                        </Text>
                        <Text className="text-[11px] text-[#A7A7AB]">
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
          <View className="flex-1 bg-black/50 justify-center items-center px-5">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
              <View className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] items-center justify-center mb-3">
                <AppIcon name="zap" size={24} color="#10B981" />
              </View>

              <Text className="text-[18px] font-bold text-[#1C1C1E]">
                Accept Service Lead
              </Text>
              <Text className="text-[13px] text-[#6E6E73] mt-1 leading-relaxed">
                Confirm your availability for{" "}
                <Text className="font-semibold text-[#1C1C1E]">
                  {selectedLeadForAccept?.service.category.name}
                </Text>{" "}
                at {selectedLeadForAccept?.event.location}.
              </Text>

              {/* Price Quote Field (Optional) */}
              <View className="mt-4">
                <Text className="text-[12px] font-semibold text-[#3A3A3C] mb-1.5">
                  Proposed Quote / Rate (₹ Optional)
                </Text>
                <TextInput
                  value={quotePrice}
                  onChangeText={setQuotePrice}
                  placeholder="e.g. 15000"
                  keyboardType="numeric"
                  placeholderTextColor="#A7A7AB"
                  className="bg-[#F7F7F5] border border-[#E5E4E0] rounded-xl px-3.5 py-2.5 text-[14px] text-[#1C1C1E]"
                />
              </View>

              {/* Notes Field (Optional) */}
              <View className="mt-3">
                <Text className="text-[12px] font-semibold text-[#3A3A3C] mb-1.5">
                  Message for Client (Optional)
                </Text>
                <TextInput
                  value={quoteNotes}
                  onChangeText={setQuoteNotes}
                  placeholder="e.g. Looking forward to making your day special!"
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#A7A7AB"
                  className="bg-[#F7F7F5] border border-[#E5E4E0] rounded-xl px-3.5 py-2.5 text-[14px] text-[#1C1C1E]"
                />
              </View>

              <View className="mt-6 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => setSelectedLeadForAccept(null)}
                  className="flex-1 py-3 rounded-xl border border-[#DEDCD7] items-center justify-center"
                >
                  <Text className="text-[14px] font-semibold text-[#6E6E73]">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={actingLeadId != null}
                  onPress={handleConfirmAccept}
                  className="flex-1 py-3 rounded-xl bg-[#1C1C1E] items-center justify-center flex-row gap-1.5 shadow-md"
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
