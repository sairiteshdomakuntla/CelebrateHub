import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Share,
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
} from "react-native-reanimated";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  eventsApi,
  type Event,
  type ServiceCategory,
  EVENT_TYPE_META,
  EVENT_STATUS_META,
} from "@/lib/events.api";
import {
  guestsApi,
  type Guest,
  generateInvitationMessage,
} from "@/lib/guests.api";
import { reviewsApi } from "@/lib/reviews.api";
import { giftsApi } from "@/lib/gifts.api";
import { VenueMapCard } from "@/components/map/venue-map-card";
import { LocationPickerModal } from "@/components/map/location-picker-modal";
import { BASE_URL } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-3 py-3 border-b border-[#322C63]">
      <View className="w-8 h-8 rounded-lg bg-[#2A2460] items-center justify-center mt-0.5">
        <AppIcon name={icon as any} size={14} color="#B8B3E0" />
      </View>
      <View className="flex-1">
        <Text className="text-[#B8B3E0] text-[11px] font-semibold uppercase tracking-wide">{label}</Text>
        <Text className="text-white text-[14px] mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

function ServiceChip({ service }: { service: Event["services"][number] }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-[#2A2460] border border-[#322C63] rounded-full px-3 py-1.5">
      <AppIcon
        name={(service.category.icon as any) || "briefcase"}
        size={12}
        color="#B8B3E0"
      />
      <Text className="text-white text-[12px] font-medium">{service.category.name}</Text>
    </View>
  );
}

// ─── Status picker ────────────────────────────────────────────────────────────

const STATUSES = ["DRAFT", "PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showVenuePicker, setShowVenuePicker] = useState(false);

  // Guests & Invitations state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestStats, setGuestStats] = useState({ total: 0, sent: 0, delivered: 0, pending: 0 });
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showInviteCardModal, setShowInviteCardModal] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [savingGuest, setSavingGuest] = useState(false);

  // Gift Circle state
  const [giftStats, setGiftStats] = useState<{ totalItems: number; claimedItems: number; totalCollectedAmount: number } | null>(null);

  // Reviews state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewProviderName, setReviewProviderName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const opacity = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const load = useCallback(async () => {
    try {
      const [ev, cats, guestRes] = await Promise.all([
        eventsApi.get(id),
        eventsApi.listCategories(),
        guestsApi.list(id).catch(() => ({
          guests: [],
          stats: { total: 0, sent: 0, delivered: 0, pending: 0 },
          eventTitle: null,
          eventType: "",
        })),
      ]);
      setEvent(ev);
      setCategories(cats);
      setGuests(guestRes.guests);
      setGuestStats(guestRes.stats);
      giftsApi.getCircle(id).then((g) => setGiftStats(g.stats)).catch(() => null);
      opacity.value = withTiming(1, { duration: 300 });
    } catch {
      Alert.alert("Error", "Could not load event.");
      router.back();
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleAddGuest() {
    if (!newGuestName.trim() || !event) return;
    setSavingGuest(true);
    try {
      const added = await guestsApi.add(event.id, {
        name: newGuestName.trim(),
        phone: newGuestPhone.trim() || undefined,
        email: newGuestEmail.trim() || undefined,
      });
      setGuests((prev) => [added, ...prev]);
      setGuestStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
      }));
      setNewGuestName("");
      setNewGuestPhone("");
      setNewGuestEmail("");
      setShowAddGuestModal(false);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not add guest.");
    } finally {
      setSavingGuest(false);
    }
  }

  async function handleDeleteGuest(guestId: string, guestName: string) {
    Alert.alert("Remove Guest", `Remove "${guestName}" from guest list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await guestsApi.delete(guestId);
            setGuests((prev) => prev.filter((g) => g.id !== guestId));
            setGuestStats((prev) => ({
              ...prev,
              total: Math.max(0, prev.total - 1),
            }));
          } catch {
            Alert.alert("Error", "Could not remove guest.");
          }
        },
      },
    ]);
  }

  async function handleSendWhatsApp(guest: Guest) {
    if (!event) return;
    if (!guest.phone) {
      Alert.alert("Missing Phone", "Please provide a phone number for this guest to send WhatsApp invitations.");
      return;
    }

    let cleanPhone = guest.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const registryUrl = `${BASE_URL}/registry/${event.id}`;
    const message = generateInvitationMessage(event, undefined, guest.name, registryUrl);

    try {
      await guestsApi.recordInvite(guest.id, "WHATSAPP");
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id
            ? { ...g, invitationStatus: "SENT", invitationChannel: "WHATSAPP", invitedAt: new Date().toISOString() }
            : g
        )
      );
      setGuestStats((prev) => ({
        ...prev,
        sent: prev.sent + (guest.invitationStatus === "PENDING" ? 1 : 0),
        pending: Math.max(0, prev.pending - (guest.invitationStatus === "PENDING" ? 1 : 0)),
      }));
    } catch (err) {
      console.warn("Failed recording invite status", err);
    }

    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(appUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(appUrl);
        } else {
          Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
      });
  }

  async function handleSendSms(guest: Guest) {
    if (!event) return;
    if (!guest.phone) {
      Alert.alert("Missing Phone", "Please provide a phone number for this guest.");
      return;
    }
    const registryUrl = `${BASE_URL}/registry/${event.id}`;
    const message = generateInvitationMessage(event, undefined, guest.name, registryUrl);
    try {
      await guestsApi.recordInvite(guest.id, "SMS");
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id
            ? { ...g, invitationStatus: "SENT", invitationChannel: "SMS", invitedAt: new Date().toISOString() }
            : g
        )
      );
    } catch {}
    Linking.openURL(`sms:${guest.phone}?body=${encodeURIComponent(message)}`);
  }

  async function handleShareCard() {
    if (!event) return;
    const registryUrl = `${BASE_URL}/registry/${event.id}`;
    const msg = generateInvitationMessage(event, undefined, undefined, registryUrl);
    try {
      await Share.share({
        title: event.title || `${event.type} Invitation`,
        message: msg,
      });
    } catch {}
  }

  function openReviewModal(
    bookingId: string,
    providerName: string,
    existingReview?: { id: string; rating: number; comment?: string | null } | null
  ) {
    setReviewBookingId(bookingId);
    setReviewProviderName(providerName);
    if (existingReview) {
      setEditingReviewId(existingReview.id);
      setReviewRating(existingReview.rating);
      setReviewComment(existingReview.comment || "");
    } else {
      setEditingReviewId(null);
      setReviewRating(5);
      setReviewComment("");
    }
    setShowReviewModal(true);
  }

  async function handleSubmitReview() {
    if (!reviewBookingId) return;
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await reviewsApi.updateReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      } else {
        await reviewsApi.createReview({
          bookingId: reviewBookingId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      }
      setShowReviewModal(false);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    Alert.alert("Delete Review", "Are you sure you want to delete your review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await reviewsApi.deleteReview(reviewId);
            await load();
          } catch {
            Alert.alert("Error", "Could not delete review.");
          }
        },
      },
    ]);
  }

  async function handleAddService(categoryId: string) {
    if (!event) return;
    setAddingService(true);
    try {
      await eventsApi.addService(event.id, categoryId);
      const updated = await eventsApi.get(event.id);
      setEvent(updated);
      setShowServicePicker(false);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not add service.");
    } finally {
      setAddingService(false);
    }
  }

  async function handleRemoveService(categoryId: string, categoryName: string) {
    if (!event) return;
    Alert.alert("Remove service", `Remove "${categoryName}" from this event?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await eventsApi.removeService(event.id, categoryId);
            const updated = await eventsApi.get(event.id);
            setEvent(updated);
          } catch {
            Alert.alert("Error", "Could not remove service.");
          }
        },
      },
    ]);
  }

  async function handleStatusChange(status: typeof STATUSES[number]) {
    if (!event) return;
    setUpdatingStatus(true);
    try {
      const updated = await eventsApi.update(event.id, { status });
      setEvent(updated);
    } catch {
      Alert.alert("Error", "Could not update status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDelete() {
    if (!event) return;
    Alert.alert(
      "Delete event",
      "This will permanently delete the event and all associated data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await eventsApi.delete(event.id);
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete event.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  if (!event) return null;

  const typeMeta = EVENT_TYPE_META[event.type];
  const statusMeta = EVENT_STATUS_META[event.status];

  // Categories not yet added to this event
  const addedCategoryIds = new Set(event.services.map((s) => s.categoryId));
  const availableCategories = categories.filter((c) => !addedCategoryIds.has(c.id));

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        {/* Top nav */}
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center mr-3"
          >
            <AppIcon name="arrow-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-[16px] font-bold flex-1" numberOfLines={1}>
            {event.title || typeMeta.label}
          </Text>
          <TouchableOpacity
            onPress={confirmDelete}
            className="w-9 h-9 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center"
          >
            <AppIcon name="trash-2" size={15} color="#FF8FA3" />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          style={animStyle}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />
          }
        >
          {/* Hero card */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-[36px] mb-2">{typeMeta.emoji}</Text>
            <Text className="text-white text-[22px] font-bold tracking-tight">
              {event.title || typeMeta.label}
            </Text>
            <Text className="text-[#B8B3E0] text-[13px] mt-0.5">{typeMeta.label}</Text>
            <View className="flex-row items-center gap-2 mt-3">
              <View
                style={{ backgroundColor: statusMeta.bg }}
                className="px-3 py-1.5 rounded-full"
              >
                <Text style={{ color: statusMeta.text }} className="text-[12px] font-semibold">
                  {statusMeta.label}
                </Text>
              </View>
              {updatingStatus && <ActivityIndicator size="small" color="#7C5CFF" />}
            </View>
          </View>

          {/* Status actions */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-4 mb-4">
            <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-widest mb-3">
              Update Status
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUSES.filter((s) => s !== event.status).map((s) => {
                const sm = EVENT_STATUS_META[s];
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    disabled={updatingStatus}
                    style={{ backgroundColor: sm.bg }}
                    className="px-3 py-1.5 rounded-full"
                  >
                    <Text style={{ color: sm.text }} className="text-[12px] font-semibold">
                      {sm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Info */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl px-4 py-1 mb-4">
            <InfoRow icon="calendar" label="Date" value={formatDate(event.eventDate)} />
            {event.startTime && (
              <InfoRow icon="clock" label="Start time" value={event.startTime} />
            )}
            <InfoRow icon="map-pin" label="Location" value={event.location} />
            {event.guestCount && (
              <InfoRow icon="users" label="Guest count" value={`${event.guestCount} guests`} />
            )}
            {(event.budgetMin || event.budgetMax) && (
              <InfoRow
                icon="indian-rupee"
                label="Budget"
                value={`₹${event.budgetMin?.toLocaleString("en-IN") ?? "—"} – ₹${
                  event.budgetMax?.toLocaleString("en-IN") ?? "—"
                }`}
              />
            )}
            {event.requirements && (
              <View className="py-3">
                <Text className="text-[#B8B3E0] text-[11px] font-semibold uppercase tracking-wide mb-1">
                  Requirements
                </Text>
                <Text className="text-white text-[14px] leading-[20px]">
                  {event.requirements}
                </Text>
              </View>
            )}
          </View>

          {/* Celebration Venue & Navigation Card */}
          <VenueMapCard
            location={event.location}
            latitude={event.latitude}
            longitude={event.longitude}
            eventTitle={event.title || event.type}
            canEdit={event.status !== "COMPLETED" && event.status !== "CANCELLED"}
            onEditPress={() => setShowVenuePicker(true)}
          />

          {/* Venue Pin / Location Picker Modal */}
          <LocationPickerModal
            visible={showVenuePicker}
            mode="VENUE_PIN"
            initialAddress={event.location}
            initialLatitude={event.latitude ? parseFloat(String(event.latitude)) : null}
            initialLongitude={event.longitude ? parseFloat(String(event.longitude)) : null}
            onClose={() => setShowVenuePicker(false)}
            onSelect={async (res) => {
              try {
                const updated = await eventsApi.update(event.id, {
                  location: res.address,
                  latitude: res.latitude,
                  longitude: res.longitude,
                });
                setEvent(updated);
                Alert.alert("Venue Updated", "Celebration venue and map pin have been updated.");
              } catch (err: any) {
                Alert.alert("Error", err?.response?.data?.message || "Could not update location");
              }
            }}
          />

          {/* Services */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-widest">
                Services ({event.services.length})
              </Text>
              {availableCategories.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowServicePicker((v) => !v)}
                  className="flex-row items-center gap-1"
                >
                  <AppIcon name="plus-circle" size={14} color="#7C5CFF" />
                  <Text className="text-[#7C5CFF] text-[12px] font-semibold">Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {event.services.length === 0 ? (
              <Text className="text-[#7C77A6] text-[13px]">No services added yet.</Text>
            ) : (
              <View className="gap-2.5">
                {event.services.map((svc) => {
                  const booking = svc.lead?.booking;
                  const isBooked = booking != null && booking.status === "CONFIRMED";
                  const provider = booking?.provider;

                  return (
                    <View
                      key={svc.id}
                      className="bg-[#2A2460] border border-[#322C63] rounded-xl p-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2 flex-1">
                          <View className="w-8 h-8 rounded-lg bg-[#1E1A3F] border border-[#322C63] items-center justify-center">
                            <AppIcon
                              name={(svc.category.icon as any) || "briefcase"}
                              size={14}
                              color="#7C5CFF"
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-white text-[14px] font-semibold">
                              {svc.category.name}
                            </Text>
                            {isBooked ? (
                              <View className="flex-row items-center gap-1.5 mt-0.5">
                                <View className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7]" />
                                <Text className="text-[#6EE7B7] text-[11px] font-bold">
                                  Provider Confirmed
                                </Text>
                              </View>
                            ) : (
                              <View className="flex-row items-center gap-1.5 mt-0.5">
                                <View className="w-1.5 h-1.5 rounded-full bg-[#FFC53D]" />
                                <Text className="text-[#FFC53D] text-[11px] font-medium">
                                  Searching providers...
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {!isBooked && (
                          <TouchableOpacity
                            onPress={() => handleRemoveService(svc.categoryId, svc.category.name)}
                            className="w-7 h-7 rounded-full bg-[#1E1A3F] items-center justify-center border border-[#322C63]"
                          >
                            <AppIcon name="x" size={13} color="#FF8FA3" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* If booked, display the assigned provider card */}
                      {isBooked && provider && (
                        <View className="mt-2.5 pt-2.5 border-t border-[#322C63] bg-[#1E1A3F] rounded-lg p-2.5">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-2">
                              <Text className="text-[13px] font-bold text-white">
                                {provider.businessName}
                              </Text>
                              {provider.user.phone && (
                                <Text className="text-[12px] text-[#B8B3E0] mt-0.5">
                                  {provider.user.phone}
                                </Text>
                              )}
                            </View>

                            <View className="flex-row items-center gap-2">
                              {provider.user.phone && (
                                <TouchableOpacity
                                  onPress={() => Linking.openURL(`tel:${provider.user.phone}`)}
                                  className="w-8 h-8 rounded-full bg-[#123B34] items-center justify-center border border-[#6EE7B7]/40"
                                >
                                  <AppIcon name="phone" size={13} color="#6EE7B7" />
                                </TouchableOpacity>
                              )}
                              {provider.user.email && (
                                <TouchableOpacity
                                  onPress={() => Linking.openURL(`mailto:${provider.user.email}`)}
                                  className="w-8 h-8 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
                                >
                                  <AppIcon name="mail" size={13} color="#FFFFFF" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {booking.agreedPrice && (
                            <View className="mt-1.5 pt-1.5 border-t border-[#322C63] flex-row items-center justify-between">
                              <Text className="text-[11px] text-[#B8B3E0]">Agreed Rate</Text>
                              <Text className="text-[12px] font-bold text-[#FFC53D]">
                                ₹{booking.agreedPrice.toLocaleString("en-IN")}
                              </Text>
                            </View>
                          )}

                          {/* Review Section */}
                          {booking.review ? (
                            <View className="mt-2.5 pt-2.5 border-t border-[#322C63] bg-[#2A2460] rounded-xl p-2.5">
                              <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <AppIcon
                                      key={star}
                                      name="star"
                                      size={12}
                                      color={star <= booking.review!.rating ? "#FFC53D" : "#7C77A6"}
                                    />
                                  ))}
                                  <Text className="text-[11px] font-bold text-[#FFC53D] ml-1">
                                    {booking.review.rating}/5
                                  </Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                  <TouchableOpacity
                                    onPress={() =>
                                      openReviewModal(booking.id, provider.businessName, booking.review)
                                    }
                                  >
                                    <Text className="text-[11px] font-semibold text-[#7C5CFF]">Edit</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteReview(booking.review!.id)}>
                                    <AppIcon name="trash-2" size={12} color="#FF8FA3" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              {booking.review.comment ? (
                                <Text className="text-[11px] text-[#B8B3E0] italic mt-1 leading-4">
                                  "{booking.review.comment}"
                                </Text>
                              ) : null}
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => openReviewModal(booking.id, provider.businessName)}
                              className="mt-2.5 pt-2.5 border-t border-[#322C63] flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2A2460]"
                            >
                              <AppIcon name="star" size={13} color="#FFC53D" />
                              <Text className="text-[12px] font-semibold text-white">
                                Rate & Review Provider
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Inline category picker */}
            {showServicePicker && (
              <View className="mt-4 pt-4 border-t border-[#322C63]">
                <Text className="text-[#B8B3E0] text-[12px] font-semibold mb-2.5">
                  Add service
                </Text>
                {addingService ? (
                  <ActivityIndicator color="#7C5CFF" />
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {availableCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleAddService(cat.id)}
                        className="flex-row items-center gap-1.5 bg-[#2A2460] border border-[#322C63] rounded-full px-3 py-1.5"
                      >
                        <AppIcon
                          name={(cat.icon as any) || "briefcase"}
                          size={12}
                          color="#7C5CFF"
                        />
                        <Text className="text-white text-[12px] font-medium">{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Guests & Digital Invitations Section */}
          {/* Guests & Digital Invitations Section */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-5 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-xl bg-[#2A2460] items-center justify-center">
                  <AppIcon name="users" size={17} color="#7C5CFF" />
                </View>
                <View>
                  <Text className="text-white text-[16px] font-bold">Guests & Invitations</Text>
                  <Text className="text-[#B8B3E0] text-[12px]">
                    {guests.length} {guests.length === 1 ? "guest" : "guests"} total • {guestStats.sent} invited
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowInviteCardModal(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#7C5CFF]"
              >
                <AppIcon name="mail" size={12} color="#FFFFFF" />
                <Text className="text-white text-[12px] font-semibold">Invite Card</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Status Chips */}
            <View className="flex-row items-center gap-2 mb-4">
              <View className="flex-1 bg-[#2A2460] border border-[#322C63] rounded-xl p-2.5 items-center">
                <Text className="text-[#B8B3E0] text-[11px] font-semibold uppercase">Total</Text>
                <Text className="text-white text-[16px] font-bold mt-0.5">{guests.length}</Text>
              </View>
              <View className="flex-1 bg-[#123B34] border border-[#123B34] rounded-xl p-2.5 items-center">
                <Text className="text-[#6EE7B7] text-[11px] font-semibold uppercase">Invited</Text>
                <Text className="text-[#6EE7B7] text-[16px] font-bold mt-0.5">{guestStats.sent}</Text>
              </View>
              <View className="flex-1 bg-[#3D2F0F] border border-[#3D2F0F] rounded-xl p-2.5 items-center">
                <Text className="text-[#FFC53D] text-[11px] font-semibold uppercase">Pending</Text>
                <Text className="text-[#FFC53D] text-[16px] font-bold mt-0.5">{guestStats.pending}</Text>
              </View>
            </View>

            {/* Guest list or empty */}
            {guests.length === 0 ? (
              <View className="py-6 items-center">
                <View className="w-12 h-12 rounded-full bg-[#2A2460] items-center justify-center mb-2">
                  <AppIcon name="user-plus" size={22} color="#7C5CFF" />
                </View>
                <Text className="text-white text-[14px] font-semibold">No guests added yet</Text>
                <Text className="text-[#B8B3E0] text-[12px] text-center mt-1 px-4 leading-4">
                  Add friends and family to send customized digital invitations via WhatsApp or SMS in one tap!
                </Text>
              </View>
            ) : (
              <View className="divide-y divide-[#322C63]">
                {guests.map((guest) => (
                  <View key={guest.id} className="py-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View className="w-9 h-9 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]">
                        <Text className="text-white text-[13px] font-bold">
                          {guest.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>
                          {guest.name}
                        </Text>
                        <Text className="text-[#B8B3E0] text-[12px]" numberOfLines={1}>
                          {guest.phone || guest.email || "No contact number"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      {/* Status tag */}
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          guest.invitationStatus === "SENT"
                            ? "bg-[#123B34]"
                            : "bg-[#3D2F0F]"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            guest.invitationStatus === "SENT"
                              ? "text-[#6EE7B7]"
                              : "text-[#FFC53D]"
                          }`}
                        >
                          {guest.invitationStatus}
                        </Text>
                      </View>

                      {/* WhatsApp invite trigger */}
                      <TouchableOpacity
                        onPress={() => handleSendWhatsApp(guest)}
                        className="w-8 h-8 rounded-full bg-[#25D366] items-center justify-center"
                        accessibilityLabel="Send WhatsApp"
                      >
                        <AppIcon name="message-circle" size={14} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* SMS invite trigger */}
                      <TouchableOpacity
                        onPress={() => handleSendSms(guest)}
                        className="w-8 h-8 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
                        accessibilityLabel="Send SMS"
                      >
                        <AppIcon name="send" size={13} color="#FFFFFF" />
                      </TouchableOpacity>

                      {/* Delete button */}
                      <TouchableOpacity
                        onPress={() => handleDeleteGuest(guest.id, guest.name)}
                        className="w-8 h-8 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
                        accessibilityLabel="Remove guest"
                      >
                        <AppIcon name="x" size={14} color="#FF8FA3" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add guest trigger button */}
            <TouchableOpacity
              onPress={() => setShowAddGuestModal(true)}
              className="mt-3 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[#7C5CFF]"
            >
              <AppIcon name="plus" size={15} color="#FFFFFF" />
              <Text className="text-white text-[13px] font-bold">Add Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Gift Circle & Registry Section */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-5 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-xl bg-[#2A2460] border border-[#322C63] items-center justify-center">
                  <AppIcon name="gift" size={18} color="#FFC53D" />
                </View>
                <View>
                  <Text className="text-white text-[16px] font-bold">Gift Circle & Registry</Text>
                  <Text className="text-[#B8B3E0] text-[12px]">
                    {giftStats ? `${giftStats.totalItems} items • ₹${giftStats.totalCollectedAmount.toLocaleString("en-IN")} raised` : "Wishlist, cash funds & guest blessings"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/events/gift-circle", params: { id: event.id } } as any)}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-[#7C5CFF]"
                activeOpacity={0.8}
              >
                <Text className="text-white text-[12px] font-bold">Open Registry</Text>
                <AppIcon name="chevron-right" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#B8B3E0] text-[13px] leading-[18px]">
              Curate your dream celebration wishlist, set up group cash funds, and invite guests to pledge gifts or share warm blessings!
            </Text>

            <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-[#322C63]">
              <View className="flex-1 bg-[#2A2460] border border-[#322C63] rounded-xl p-2.5 items-center">
                <Text className="text-[#B8B3E0] text-[10px] font-bold uppercase">Items</Text>
                <Text className="text-white text-[15px] font-extrabold mt-0.5">{giftStats?.totalItems ?? 0}</Text>
              </View>
              <View className="flex-1 bg-[#123B34] border border-[#123B34] rounded-xl p-2.5 items-center">
                <Text className="text-[#6EE7B7] text-[10px] font-bold uppercase">Claimed</Text>
                <Text className="text-[#6EE7B7] text-[15px] font-extrabold mt-0.5">{giftStats?.claimedItems ?? 0}</Text>
              </View>
              <View className="flex-1 bg-[#2A2460] border border-[#322C63] rounded-xl p-2.5 items-center">
                <Text className="text-[#FFC53D] text-[10px] font-bold uppercase">Raised</Text>
                <Text className="text-[#FFC53D] text-[15px] font-extrabold mt-0.5">₹{(giftStats?.totalCollectedAmount ?? 0).toLocaleString("en-IN")}</Text>
              </View>
            </View>
          </View>
        </Animated.ScrollView>

        {/* Modal 1: Add Guest Modal */}
        <Modal
          visible={showAddGuestModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddGuestModal(false)}
        >
          <View className="flex-1 bg-black/70 justify-end">
            <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-[18px] font-bold">Add New Guest</Text>
                <TouchableOpacity
                  onPress={() => setShowAddGuestModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
                >
                  <AppIcon name="x" size={16} color="#B8B3E0" />
                </TouchableOpacity>
              </View>

              <Text className="text-[#B8B3E0] text-[12px] font-medium mb-1 uppercase tracking-wider">
                Full Name *
              </Text>
              <TextInput
                value={newGuestName}
                onChangeText={setNewGuestName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#7C77A6"
                className="bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3 text-[14px] text-white mb-3"
              />

              <Text className="text-[#B8B3E0] text-[12px] font-medium mb-1 uppercase tracking-wider">
                Phone Number (for WhatsApp / SMS)
              </Text>
              <TextInput
                value={newGuestPhone}
                onChangeText={setNewGuestPhone}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                placeholderTextColor="#7C77A6"
                className="bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3 text-[14px] text-white mb-3"
              />

              <Text className="text-[#B8B3E0] text-[12px] font-medium mb-1 uppercase tracking-wider">
                Email Address (optional)
              </Text>
              <TextInput
                value={newGuestEmail}
                onChangeText={setNewGuestEmail}
                placeholder="e.g. ramesh@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#7C77A6"
                className="bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3 text-[14px] text-white mb-5"
              />

              <TouchableOpacity
                onPress={handleAddGuest}
                disabled={savingGuest || !newGuestName.trim()}
                className={`py-3.5 rounded-xl items-center justify-center ${
                  savingGuest || !newGuestName.trim() ? "bg-[#2A2650]" : "bg-[#7C5CFF]"
                }`}
              >
                {savingGuest ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-[14px]">Add to Guest List</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal 2: Digital Invitation Card Preview */}
        <Modal
          visible={showInviteCardModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInviteCardModal(false)}
        >
          <View className="flex-1 bg-black/75 justify-center items-center px-4">
            <View className="w-full max-w-sm bg-[#18181A] border-2 border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl relative">
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowInviteCardModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 items-center justify-center z-10"
              >
                <AppIcon name="x" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Card Header & Badge */}
              <View className="items-center mb-4">
                <View className="px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 mb-3">
                  <Text className="text-[#D4AF37] text-[10px] font-bold tracking-widest uppercase">
                    ✨ CELEBRATEHUB INVITATION ✨
                  </Text>
                </View>
                <Text className="text-[44px] mb-1">{typeMeta.emoji}</Text>
                <Text className="text-[#D4AF37] text-[11px] font-bold tracking-widest uppercase text-center">
                  You are cordially invited to
                </Text>
                <Text className="text-white text-[20px] font-bold text-center mt-1">
                  {event.title || `${typeMeta.label} Celebration`}
                </Text>
              </View>

              {/* Card Details */}
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 gap-3 mb-5">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 items-center justify-center">
                    <AppIcon name="calendar" size={14} color="#D4AF37" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#8E8E93] text-[10px] uppercase font-bold">Date & Time</Text>
                    <Text className="text-white text-[13px] font-medium">
                      {formatDate(event.eventDate)} {event.startTime ? `at ${event.startTime}` : ""}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 items-center justify-center">
                    <AppIcon name="map-pin" size={14} color="#D4AF37" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#8E8E93] text-[10px] uppercase font-bold">Venue</Text>
                    <Text className="text-white text-[13px] font-medium" numberOfLines={2}>
                      {event.location}
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="text-white/60 text-[11px] text-center italic mb-5">
                "We request the pleasure of your company on this joyful celebration!"
              </Text>

              {/* Action Buttons */}
              <View className="gap-2.5">
                <TouchableOpacity
                  onPress={handleShareCard}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[#D4AF37]"
                >
                  <AppIcon name="share-2" size={16} color="#000000" />
                  <Text className="text-black text-[13px] font-bold">Share Invitation Card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowInviteCardModal(false);
                    const registryUrl = `${BASE_URL}/registry/${event.id}`;
                    const msg = generateInvitationMessage(event, undefined, undefined, registryUrl);
                    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                  }}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]"
                >
                  <AppIcon name="message-circle" size={16} color="#FFFFFF" />
                  <Text className="text-white text-[13px] font-bold">Broadcast on WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal 3: Rate & Review Modal */}
        <Modal
          visible={showReviewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View className="flex-1 bg-black/70 justify-end">
            <View className="bg-[#1E1A3F] border-t border-[#322C63] rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-white text-[18px] font-bold">
                    {editingReviewId ? "Edit Your Review" : "Rate & Review"}
                  </Text>
                  <Text className="text-[#B8B3E0] text-[12px] mt-0.5">
                    {reviewProviderName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReviewModal(false)}
                  className="w-8 h-8 rounded-full bg-[#2A2460] items-center justify-center border border-[#322C63]"
                >
                  <AppIcon name="x" size={16} color="#B8B3E0" />
                </TouchableOpacity>
              </View>

              {/* Star selector */}
              <View className="items-center py-4 bg-[#2A2460] border border-[#322C63] rounded-2xl mb-4">
                <View className="flex-row items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <AppIcon
                        name="star"
                        size={32}
                        color={star <= reviewRating ? "#FFC53D" : "#7C77A6"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-[#B8B3E0] text-[13px] font-semibold mt-2">
                  {reviewRating === 5 && "⭐ Exceptional 5/5"}
                  {reviewRating === 4 && "⭐ Very Good 4/5"}
                  {reviewRating === 3 && "⭐ Good / Satisfactory 3/5"}
                  {reviewRating === 2 && "⭐ Could Be Better 2/5"}
                  {reviewRating === 1 && "⭐ Needs Improvement 1/5"}
                </Text>
              </View>

              {/* Review Comment */}
              <Text className="text-[#B8B3E0] text-[12px] font-medium mb-1.5 uppercase tracking-wider">
                Feedback & Experience (optional)
              </Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Share how the provider performed, their punctuality, quality of work, and customer service..."
                placeholderTextColor="#7C77A6"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3 text-[14px] text-white min-h-[90px] mb-5"
              />

              <TouchableOpacity
                onPress={handleSubmitReview}
                disabled={submittingReview}
                className="py-3.5 rounded-xl items-center justify-center bg-[#7C5CFF]"
              >
                {submittingReview ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-[14px]">
                    {editingReviewId ? "Update Review" : "Submit Review"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
