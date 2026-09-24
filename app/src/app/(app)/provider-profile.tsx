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
    <View className="bg-white border border-[#E8E6E1] rounded-2xl p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-4">
        <AppIcon name={icon as any} size={14} color="#6E6E73" />
        <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-widest">
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
        pricingMin: pricingMin ? parseInt(pricingMin) : null,
        pricingMax: pricingMax ? parseInt(pricingMax) : null,
        isAvailable,
      };
      const updated = await providersApi.update(payload);
      onSaved(updated);
      Alert.alert("Saved", "Business profile updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Business Profile" icon="briefcase">
      {/* Availability toggle */}
      <View className="flex-row items-center justify-between bg-[#F7F7F5] rounded-xl px-4 py-3.5 mb-4">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-2 h-2 rounded-full ${isAvailable ? "bg-[#4ADE80]" : "bg-[#6E6E73]"}`}
          />
          <Text className="text-[#1C1C1E] text-[14px] font-medium">
            {isAvailable ? "Open for new leads" : "Unavailable"}
          </Text>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={setIsAvailable}
          trackColor={{ false: "#E3E1DC", true: "#1C1C1E" }}
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
      <FormInput
        label="Service area"
        placeholder="e.g. Hyderabad, Telangana"
        value={serviceArea}
        onChangeText={setServiceArea}
      />
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
      <Text className="text-[#6E6E73] text-[13px] mb-3">
        Select all service types you offer.
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {allCategories.map((cat) => {
          const active = selected.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => toggle(cat.id)}
              activeOpacity={0.75}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                active ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-[#F7F7F5] border-[#E3E1DC]"
              }`}
            >
              <AppIcon
                name={(cat.icon as any) || "briefcase"}
                size={13}
                color={active ? "#FFFFFF" : "#6E6E73"}
              />
              <Text
                className={`text-[12px] font-medium ${
                  active ? "text-white" : "text-[#3A3A3C]"
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
      <Text className="text-[#6E6E73] text-[13px] mb-4">
        Set the days and hours you're available for bookings.
      </Text>
      {DAYS_OF_WEEK.map((day) => {
        const slot = slots[day.key];
        return (
          <View key={day.key} className="mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#1C1C1E] text-[14px] font-medium w-24">{day.label}</Text>
              <Switch
                value={slot.enabled}
                onValueChange={() => toggle(day.key)}
                trackColor={{ false: "#E3E1DC", true: "#1C1C1E" }}
                thumbColor="#FFFFFF"
              />
            </View>
            {slot.enabled && (
              <View className="flex-row gap-3 mt-2">
                <View className="flex-1">
                  <FormInput
                    label="Start"
                    placeholder="09:00"
                    value={slot.startTime}
                    onChangeText={(v) => setTime(day.key, "startTime", v)}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View className="flex-1">
                  <FormInput
                    label="End"
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
        <ActivityIndicator color="#1C1C1E" className="py-4" />
      </Section>
    );
  }

  const stats = data?.stats;
  const reviews = data?.reviews || [];

  return (
    <Section title="Client Reviews & Ratings" icon="star">
      {/* Metric summary */}
      <View className="flex-row items-center bg-[#F7F7F5] rounded-xl p-3.5 mb-3 gap-4">
        <View className="items-center justify-center pr-3 border-r border-[#E3E1DC]">
          <Text className="text-[26px] font-bold text-[#1C1C1E]">
            {stats?.averageRating ? stats.averageRating.toFixed(1) : "0.0"}
          </Text>
          <View className="flex-row items-center gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <AppIcon
                key={s}
                name="star"
                size={11}
                color={s <= Math.round(stats?.averageRating || 0) ? "#F59E0B" : "#D1D5DB"}
              />
            ))}
          </View>
          <Text className="text-[11px] text-[#8E8E93] mt-1 font-medium">
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
                <Text className="text-[10px] font-bold text-[#8E8E93] w-3">{star}★</Text>
                <View className="flex-1 h-1.5 bg-[#E5E4E0] rounded-full overflow-hidden">
                  <View
                    style={{ width: `${pct}%` }}
                    className="h-full bg-[#F59E0B] rounded-full"
                  />
                </View>
                <Text className="text-[10px] text-[#8E8E93] w-4 text-right">{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Review list */}
      {reviews.length === 0 ? (
        <View className="py-4 items-center">
          <Text className="text-[#8E8E93] text-[13px] text-center">
            No customer reviews yet. As you fulfill event bookings, client ratings will appear here.
          </Text>
        </View>
      ) : (
        <View className="divide-y divide-[#F0EEEA]">
          {reviews.map((r) => (
            <View key={r.id} className="py-3">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-full bg-[#EAE8E3] items-center justify-center">
                    <Text className="text-[#1C1C1E] text-[11px] font-bold">
                      {r.author?.name ? r.author.name[0].toUpperCase() : "C"}
                    </Text>
                  </View>
                  <Text className="text-[#1C1C1E] text-[13px] font-semibold">
                    {r.author?.name || "Customer"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <AppIcon
                      key={s}
                      name="star"
                      size={10}
                      color={s <= r.rating ? "#F59E0B" : "#D1D5DB"}
                    />
                  ))}
                </View>
              </View>

              {r.booking?.lead?.eventService?.category?.name && (
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Service: {r.booking.lead.eventService.category.name}
                </Text>
              )}

              {r.comment && (
                <Text className="text-[#3A3A3C] text-[12px] leading-4">
                  "{r.comment}"
                </Text>
              )}

              <Text className="text-[#A7A7AB] text-[10px] mt-1">
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
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  if (!profile) return null;

  const verMeta = VERIFICATION_META[profile.verificationStatus];

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        {/* Nav */}
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] items-center justify-center mr-3"
          >
            <AppIcon name="arrow-left" size={16} color="#3A3A3C" />
          </TouchableOpacity>
          <Text className="text-[#1C1C1E] text-[18px] font-bold flex-1">Business Profile</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />
          }
        >
          {/* Summary card */}
          <View className="bg-[#1C1C1E] rounded-2xl p-5 mb-4">
            <View className="w-14 h-14 rounded-2xl bg-white/10 items-center justify-center mb-3">
              <Text className="text-white text-[20px] font-bold">
                {profile.businessName[0].toUpperCase()}
              </Text>
            </View>
            <Text className="text-white text-[20px] font-bold tracking-tight">
              {profile.businessName}
            </Text>
            {profile.serviceArea && (
              <View className="flex-row items-center gap-1.5 mt-1">
                <AppIcon name="map-pin" size={12} color="#FFFFFF80" />
                <Text className="text-white/60 text-[13px]">{profile.serviceArea}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-2 mt-3">
              <View style={{ backgroundColor: verMeta.bg }} className="px-3 py-1.5 rounded-full">
                <Text style={{ color: verMeta.text }} className="text-[12px] font-semibold">
                  {verMeta.label}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <AppIcon name="star" size={12} color="#F59E0B" />
                <Text className="text-white/80 text-[12px]">
                  {Number(profile.ratingAvg).toFixed(1)} ({profile.ratingCount})
                </Text>
              </View>
            </View>
          </View>

          {/* Verification notice if pending */}
          {profile.verificationStatus === "PENDING" && (
            <View className="flex-row items-start gap-3 bg-[#FDF3E3] border border-[#F0DFB8] rounded-2xl p-4 mb-4">
              <AppIcon name="info" size={16} color="#8A5E10" />
              <Text className="text-[#8A5E10] text-[13px] flex-1 leading-[19px]">
                Your profile is under review. You'll receive leads once verification is complete.
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
