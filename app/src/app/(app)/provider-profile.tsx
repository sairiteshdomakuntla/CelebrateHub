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
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import {
  providersApi,
  type ProviderProfile,
  type UpdateProviderPayload,
  type AvailabilitySlotPayload,
  type DayOfWeek,
  DAYS_OF_WEEK,
  VERIFICATION_META,
} from "@/lib/providers.api";
import { eventsApi, type ServiceCategory } from "@/lib/events.api";
import { reviewsApi, type ProviderReviewsResponse } from "@/lib/reviews.api";
import { LocationPickerModal } from "@/components/map/location-picker-modal";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-4">
        <AppIcon name={icon as any} size={14} color="#7C5CFF" />
        <Text className="text-[#B8B3E0] text-[12px] font-semibold uppercase tracking-widest">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ─── Business info section ────────────────────────────────────────────────────

function BusinessSection({
  profile,
  onSaved,
}: {
  profile: ProviderProfile;
  onSaved: (p: ProviderProfile) => void;
}) {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [description, setDescription] = useState(profile.description ?? "");
  const [serviceArea, setServiceArea] = useState(profile.serviceArea ?? "");
  const [serviceRadiusKm, setServiceRadiusKm] = useState(profile.serviceRadiusKm ?? 25);
  const [latitude, setLatitude] = useState<number | null>(
    profile.latitude ? parseFloat(profile.latitude) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    profile.longitude ? parseFloat(profile.longitude) : null
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pricingMin, setPricingMin] = useState(profile.pricingMin?.toString() ?? "");
  const [pricingMax, setPricingMax] = useState(profile.pricingMax?.toString() ?? "");
  const [isAvailable, setIsAvailable] = useState(profile.isAvailable);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!businessName.trim()) {
      Alert.alert("Required", "Business name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateProviderPayload = {
        businessName: businessName.trim(),
        description: description.trim() || null,
        serviceArea: serviceArea.trim() || null,
        serviceRadiusKm,
        latitude,
        longitude,
        pricingMin: pricingMin ? parseInt(pricingMin) : null,
        pricingMax: pricingMax ? parseInt(pricingMax) : null,
        isAvailable,
      };
      const updated = await providersApi.update(payload);
      onSaved(updated);
      Alert.alert("Saved", "Business profile and service radius updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Business Profile" icon="briefcase">
      {/* Availability toggle */}
      <View className="flex-row items-center justify-between bg-[#2A2460] border border-[#322C63] rounded-xl px-4 py-3.5 mb-4">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2 h-2 rounded-full ${isAvailable ? "bg-[#6EE7B7]" : "bg-[#B8B3E0]"}`}
          />
          <Text className="text-white text-[14px] font-medium">
            {isAvailable ? "Open for new celebration leads" : "Currently Unavailable"}
          </Text>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ false: "#322C63", true: "#7C5CFF" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <FormInput
        label="Business name *"
        placeholder="e.g. Meera Wedding Photography"
        value={businessName}
        onChangeText={setBusinessName}
      />
      <FormInput
        label="Description"
        placeholder="Tell customers about your services, experience, specialties..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {/* Interactive Service Area & Radius Selector Card */}
      <View className="mb-4 bg-[#2A2460] rounded-xl p-3.5 border border-[#322C63]">
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="map-pin" size={14} color="#7C5CFF" />
            <Text className="text-white text-[13px] font-semibold">Service Area & Radius</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowLocationPicker(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#7C5CFF] flex-row items-center gap-1 active:bg-[#6848e0]"
          >
            <AppIcon name="crosshair" size={11} color="#FFFFFF" />
            <Text className="text-white text-[11px] font-bold">Pick on Map</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-[#B8B3E0] text-[12px] leading-4">
          {serviceArea
            ? `${serviceArea} • ${serviceRadiusKm} km coverage perimeter`
            : "Set your central hub and coverage perimeter to match with nearby event leads."}
        </Text>
        {latitude && longitude && (
          <View className="mt-2 flex-row items-center gap-2">
            <View className="bg-[#7C5CFF]/20 px-2 py-0.5 rounded-md border border-[#7C5CFF]/30">
              <Text className="text-[#7C5CFF] text-[10px] font-mono font-bold">
                GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </Text>
            </View>
            <View className="bg-[#123B34] px-2 py-0.5 rounded-md border border-[#6EE7B7]/30">
              <Text className="text-[#6EE7B7] text-[10px] font-bold">{serviceRadiusKm} km radius</Text>
            </View>
          </View>
        )}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormInput
            label="Min price (₹)"
            placeholder="10000"
            value={pricingMin}
            onChangeText={setPricingMin}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <FormInput
            label="Max price (₹)"
            placeholder="100000"
            value={pricingMax}
            onChangeText={setPricingMax}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <Button label="Save changes" onPress={handleSave} fullWidth loading={saving} />

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        mode="SERVICE_RADIUS"
        initialAddress={serviceArea}
        initialLatitude={latitude}
        initialLongitude={longitude}
        initialRadiusKm={serviceRadiusKm}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(res) => {
          setServiceArea(res.address);
          setLatitude(res.latitude);
          setLongitude(res.longitude);
          if (res.radiusKm) setServiceRadiusKm(res.radiusKm);
        }}
      />
    </Section>
  );
}

// ─── Categories section ───────────────────────────────────────────────────────

function CategoriesSection({
  profile,
  allCategories,
  onSaved,
}: {
  profile: ProviderProfile;
  allCategories: ServiceCategory[];
  onSaved: (p: ProviderProfile) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(profile.categories.map((c) => c.categoryId))
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) {
      Alert.alert("Required", "Select at least one category.");
      return;
    }
    setSaving(true);
    try {
      const updated = await providersApi.setCategories(Array.from(selected));
      onSaved(updated!);
      Alert.alert("Saved", "Service categories updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not save categories.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Service Categories" icon="tag">
      <Text className="text-[#B8B3E0] text-[13px] mb-3">
        Select all service types you offer to be matched with customer requests.
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {allCategories.map((cat) => {
          const active = selected.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => toggle(cat.id)}
              activeOpacity={0.75}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                active ? "bg-[#7C5CFF] border-[#7C5CFF]" : "bg-[#2A2460] border-[#322C63]"
              }`}
            >
              <AppIcon
                name={(cat.icon as any) || "briefcase"}
                size={13}
                color={active ? "#FFFFFF" : "#B8B3E0"}
              />
              <Text
                className={`text-[12px] font-medium ${
                  active ? "text-white font-bold" : "text-[#B8B3E0]"
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Button label="Save categories" onPress={handleSave} fullWidth loading={saving} />
    </Section>
  );
}

// ─── Availability section ─────────────────────────────────────────────────────

const DEFAULT_START = "09:00";
const DEFAULT_END   = "18:00";

interface SlotState {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function buildInitialSlots(profile: ProviderProfile): Record<DayOfWeek, SlotState> {
  const result = {} as Record<DayOfWeek, SlotState>;
  for (const day of DAYS_OF_WEEK) {
    const existing = profile.availability.find((a) => a.dayOfWeek === day.key);
    result[day.key] = {
      enabled:   existing ? existing.isAvailable : false,
      startTime: existing ? existing.startTime   : DEFAULT_START,
      endTime:   existing ? existing.endTime     : DEFAULT_END,
    };
  }
  return result;
}

function AvailabilitySection({
  profile,
  onSaved,
}: {
  profile: ProviderProfile;
  onSaved: (p: ProviderProfile) => void;
}) {
  const [slots, setSlots] = useState<Record<DayOfWeek, SlotState>>(
    buildInitialSlots(profile)
  );
  const [saving, setSaving] = useState(false);

  function toggle(day: DayOfWeek) {
    setSlots((p) => ({ ...p, [day]: { ...p[day], enabled: !p[day].enabled } }));
  }

  function setTime(day: DayOfWeek, field: "startTime" | "endTime", val: string) {
    setSlots((p) => ({ ...p, [day]: { ...p[day], [field]: val } }));
  }

  async function handleSave() {
    const payload: AvailabilitySlotPayload[] = DAYS_OF_WEEK
      .filter((d) => slots[d.key].enabled)
      .map((d) => ({
        dayOfWeek:   d.key,
        startTime:   slots[d.key].startTime,
        endTime:     slots[d.key].endTime,
        isAvailable: true,
      }));

    setSaving(true);
    try {
      const updated = await providersApi.setAvailability(payload);
      onSaved(updated!);
      Alert.alert("Saved", "Availability updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Weekly Availability" icon="clock">
      <Text className="text-[#B8B3E0] text-[13px] mb-4">
        Set the days and hours you're available for celebration bookings.
      </Text>
      {DAYS_OF_WEEK.map((day) => {
        const slot = slots[day.key];
        return (
          <View key={day.key} className="mb-3 bg-[#2A2460] p-3 rounded-xl border border-[#322C63]">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-[14px] font-semibold w-24">{day.label}</Text>
              <Switch
                value={slot.enabled}
                onValueChange={() => toggle(day.key)}
                trackColor={{ false: "#322C63", true: "#7C5CFF" }}
                thumbColor="#FFFFFF"
              />
            </View>
            {slot.enabled && (
              <View className="flex-row gap-3 mt-3 pt-2 border-t border-[#322C63]">
                <View className="flex-1">
                  <FormInput
                    label="Start Time"
                    placeholder="09:00"
                    value={slot.startTime}
                    onChangeText={(v) => setTime(day.key, "startTime", v)}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    label="End Time"
                    placeholder="18:00"
                    value={slot.endTime}
                    onChangeText={(v) => setTime(day.key, "endTime", v)}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
      <Button label="Save availability" onPress={handleSave} fullWidth loading={saving} />
    </Section>
  );
}

// ─── Reviews section ──────────────────────────────────────────────────────────

function ReviewsSection({ providerId }: { providerId: string }) {
  const [data, setData] = useState<ProviderReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsApi
      .getProviderReviews(providerId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return (
      <Section title="Client Reviews & Ratings" icon="star">
        <ActivityIndicator color="#7C5CFF" className="py-4" />
      </Section>
    );
  }

  const stats = data?.stats;
  const reviews = data?.reviews || [];

  return (
    <Section title="Client Reviews & Ratings" icon="star">
      {/* Metric summary */}
      <View className="flex-row items-center bg-[#2A2460] border border-[#322C63] rounded-xl p-3.5 mb-3 gap-4">
        <View className="items-center justify-center pr-3 border-r border-[#322C63]">
          <Text className="text-[26px] font-bold text-white">
            {stats?.total ? (stats.averageRating || 0).toFixed(1) : "—"}
          </Text>
          <View className="flex-row items-center gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <AppIcon
                key={s}
                name="star"
                size={11}
                color={s <= Math.round(stats?.averageRating || 0) ? "#FFC53D" : "#322C63"}
              />
            ))}
          </View>
          <Text className="text-[11px] text-[#B8B3E0] mt-1 font-medium">
            {stats?.total || 0} {stats?.total === 1 ? "review" : "reviews"}
          </Text>
        </View>

        {/* Breakdown bars */}
        <View className="flex-1 gap-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats?.breakdown[star as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = stats?.total ? (count / stats.total) * 100 : 0;
            return (
              <View key={star} className="flex-row items-center gap-2">
                <Text className="text-[10px] font-bold text-[#B8B3E0] w-3">{star}★</Text>
                <View className="flex-1 h-1.5 bg-[#1E1A3F] rounded-full overflow-hidden">
                  <View
                    style={{ width: `${pct}%` }}
                    className="h-full bg-[#FFC53D] rounded-full"
                  />
                </View>
                <Text className="text-[10px] text-[#B8B3E0] w-4 text-right">{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Review list */}
      {reviews.length === 0 ? (
        <View className="py-4 items-center">
          <Text className="text-[#B8B3E0] text-[13px] text-center">
            No customer reviews yet. As you fulfill event bookings, client ratings will appear here.
          </Text>
        </View>
      ) : (
        <View className="divide-y divide-[#322C63]">
          {reviews.map((r) => (
            <View key={r.id} className="py-3">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-full bg-[#2A2460] border border-[#322C63] items-center justify-center">
                    <Text className="text-white text-[11px] font-bold">
                      {r.author?.name ? r.author.name[0].toUpperCase() : "C"}
                    </Text>
                  </View>
                  <Text className="text-white text-[13px] font-semibold">
                    {r.author?.name || "Customer"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <AppIcon
                      key={s}
                      name="star"
                      size={10}
                      color={s <= r.rating ? "#FFC53D" : "#322C63"}
                    />
                  ))}
                </View>
              </View>

              {r.booking?.lead?.eventService?.category?.name && (
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-[#FFC53D] mb-1">
                  Service: {r.booking.lead.eventService.category.name}
                </Text>
              )}

              {r.comment && (
                <Text className="text-[#B8B3E0] text-[12px] leading-4">
                  "{r.comment}"
                </Text>
              )}

              <Text className="text-[#6C6694] text-[10px] mt-1">
                {new Date(r.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProviderProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, cats] = await Promise.all([
        providersApi.getMe(),
        eventsApi.listCategories(),
      ]);
      setProfile(p);
      setCategories(cats);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ?? "Could not load provider profile."
      );
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#120F2B] items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C5CFF" />
      </View>
    );
  }

  if (!profile) return null;

  const verMeta = VERIFICATION_META[profile.verificationStatus];

  return (
    <View className="flex-1 bg-[#120F2B]">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1">
        {/* Nav */}
        <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-[#322C63]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#1E1A3F] border border-[#322C63] items-center justify-center mr-3 active:bg-[#2A2460]"
          >
            <AppIcon name="arrow-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-[18px] font-bold flex-1">Business Profile</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />
          }
        >
          {/* Summary card */}
          <View className="bg-[#1E1A3F] border border-[#322C63] rounded-2xl p-5 mb-4 shadow-sm">
            <View className="w-14 h-14 rounded-2xl bg-[#7C5CFF]/20 border border-[#7C5CFF]/30 items-center justify-center mb-3">
              <Text className="text-[#FFC53D] text-[20px] font-bold">
                {profile.businessName[0].toUpperCase()}
              </Text>
            </View>
            <Text className="text-white text-[20px] font-bold tracking-tight">
              {profile.businessName}
            </Text>
            {profile.serviceArea && (
              <View className="flex-row items-center gap-1.5 mt-1">
                <AppIcon name="map-pin" size={12} color="#7C5CFF" />
                <Text className="text-[#B8B3E0] text-[13px]">{profile.serviceArea}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-2 mt-3">
              <View style={{ backgroundColor: verMeta.bg }} className="px-3 py-1.5 rounded-full border border-white/10">
                <Text style={{ color: verMeta.text }} className="text-[12px] font-semibold">
                  {verMeta.label}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 bg-[#2A2460] px-2.5 py-1 rounded-full border border-[#322C63]">
                <AppIcon name="star" size={12} color="#FFC53D" />
                <Text className="text-[#FFC53D] text-[12px] font-bold">
                  {Number(profile.ratingAvg).toFixed(1)} ({profile.ratingCount})
                </Text>
              </View>
            </View>
          </View>

          {/* Verification notice if pending */}
          {profile.verificationStatus === "PENDING" && (
            <View className="flex-row items-start gap-3 bg-[#3D2F0F] border border-[#FFC53D]/30 rounded-2xl p-4 mb-4">
              <AppIcon name="info" size={16} color="#FFC53D" />
              <Text className="text-[#FFC53D] text-[13px] flex-1 leading-[19px]">
                Your profile is under review by CelebrateHub moderation. You'll receive live leads once verification is complete.
              </Text>
            </View>
          )}

          {/* Sections */}
          <BusinessSection profile={profile} onSaved={setProfile} />
          <CategoriesSection
            profile={profile}
            allCategories={categories}
            onSaved={setProfile}
          />
          <AvailabilitySection profile={profile} onSaved={setProfile} />
          <ReviewsSection providerId={profile.id} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
