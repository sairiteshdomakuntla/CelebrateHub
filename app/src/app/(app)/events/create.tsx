import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import {
  eventsApi,
  type EventType,
  type ServiceCategory,
  EVENT_TYPE_META,
} from "@/lib/events.api";

// ─── Step definitions ─────────────────────────────────────────────────────────

type Step = "type" | "details" | "services" | "review";
const STEPS: Step[] = ["type", "details", "services", "review"];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const labels = ["Type", "Details", "Services", "Review"];
  const idx = STEPS.indexOf(current);
  return (
    <View className="flex-row items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View
            className={`h-1.5 rounded-full flex-1 ${i <= idx ? "bg-[#1C1C1E]" : "bg-[#E8E6E1]"}`}
          />
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Step 1 — Event type picker ───────────────────────────────────────────────

function TypeStep({
  selected,
  onSelect,
}: {
  selected: EventType | null;
  onSelect: (t: EventType) => void;
}) {
  const types = Object.entries(EVENT_TYPE_META) as [EventType, { label: string; emoji: string }][];
  return (
    <View>
      <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight mb-1">
        What are you celebrating?
      </Text>
      <Text className="text-[#6E6E73] text-[14px] mb-5">Choose the type of your event.</Text>
      <View className="flex-row flex-wrap gap-2.5">
        {types.map(([type, meta]) => {
          const active = selected === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => onSelect(type)}
              activeOpacity={0.78}
              className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border ${
                active
                  ? "bg-[#1C1C1E] border-[#1C1C1E]"
                  : "bg-white border-[#E3E1DC]"
              }`}
            >
              <Text className="text-[18px]">{meta.emoji}</Text>
              <Text
                className={`text-[13px] font-semibold ${
                  active ? "text-white" : "text-[#3A3A3C]"
                }`}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Date / Time picker field ─────────────────────────────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
  error,
  mode = "date",
  minimumDate,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  mode?: "date" | "time";
  minimumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  function formatDisplay(d: Date | null): string {
    if (!d) return mode === "date" ? "Select date" : "Select time";
    if (mode === "time") {
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(selected);
  }

  const displayDate = formatDisplay(value);
  const hasValue = value !== null;

  return (
    <View className="mb-4">
      <Text className="text-[#3A3A3C] text-[13px] font-semibold mb-1.5">{label}</Text>

      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.75}
        className={`flex-row items-center bg-white border rounded-xl px-4 py-3.5 ${
          error ? "border-red-400" : "border-[#E3E1DC]"
        }`}
      >
        <AppIcon
          name={mode === "date" ? "calendar" : "clock"}
          size={16}
          color={hasValue ? "#1C1C1E" : "#C7C7CC"}
        />
        <Text
          className={`flex-1 ml-2.5 text-[14px] ${
            hasValue ? "text-[#1C1C1E]" : "text-[#C7C7CC]"
          }`}
        >
          {displayDate}
        </Text>
        {hasValue && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => { /* clear not allowed for date — must select */ }}
          >
            <AppIcon name="chevron-down" size={15} color="#A7A7AB" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {error && (
        <Text className="text-red-500 text-[12px] mt-1">{error}</Text>
      )}

      {/* Android: native modal dialog */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          mode={mode}
          value={value ?? new Date()}
          minimumDate={minimumDate}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* iOS: show inline inside a modal bottom sheet */}
      {Platform.OS === "ios" && (
        <Modal
          visible={show}
          transparent
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
            <View className="bg-white rounded-t-3xl pb-8">
              <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                <Text className="text-[#1C1C1E] text-[16px] font-semibold">{label}</Text>
                <TouchableOpacity
                  onPress={() => setShow(false)}
                  className="bg-[#1C1C1E] px-4 py-1.5 rounded-full"
                >
                  <Text className="text-white text-[13px] font-semibold">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                mode={mode}
                value={value ?? new Date()}
                minimumDate={minimumDate}
                display="spinner"
                onChange={handleChange}
                style={{ height: 180 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Step 2 — Details ─────────────────────────────────────────────────────────

interface Details {
  title: string;
  eventDate: Date | null;
  startTime: Date | null;
  location: string;
  guestCount: string;
  budgetMin: string;
  budgetMax: string;
  requirements: string;
}

function DetailsStep({
  details,
  onDateChange,
  onTimeChange,
  onChange,
  errors,
}: {
  details: Details;
  onDateChange: (d: Date) => void;
  onTimeChange: (d: Date) => void;
  onChange: (k: keyof Details, v: string) => void;
  errors: Partial<Record<keyof Details, string>>;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <KeyboardAvoidingView enabled={Platform.OS === "ios"} behavior="padding">
      <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight mb-1">
        Event details
      </Text>
      <Text className="text-[#6E6E73] text-[14px] mb-5">Fill in the key information.</Text>

      <FormInput
        label="Event title (optional)"
        placeholder='e.g. "Priya & Arjun Wedding"'
        value={details.title}
        onChangeText={(v) => onChange("title", v)}
      />

      <DatePickerField
        label="Event date *"
        value={details.eventDate}
        onChange={onDateChange}
        error={errors.eventDate}
        minimumDate={tomorrow}
      />

      <DatePickerField
        label="Start time (optional)"
        value={details.startTime}
        onChange={onTimeChange}
        mode="time"
      />

      <FormInput
        label="Location / Venue *"
        placeholder="e.g. Taj Krishna, Hyderabad"
        value={details.location}
        onChangeText={(v) => onChange("location", v)}
        error={errors.location}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormInput
            label="Guest count"
            placeholder="100"
            value={details.guestCount}
            onChangeText={(v) => onChange("guestCount", v)}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <FormInput
            label="Budget min (₹)"
            placeholder="50000"
            value={details.budgetMin}
            onChangeText={(v) => onChange("budgetMin", v)}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <FormInput
        label="Budget max (₹)"
        placeholder="200000"
        value={details.budgetMax}
        onChangeText={(v) => onChange("budgetMax", v)}
        keyboardType="number-pad"
      />

      {/* Requirements — plain TextInput (multi-line) */}
      <View className="mb-4">
        <Text className="text-[#3A3A3C] text-[13px] font-semibold mb-1.5">Special requirements</Text>
        <View className="bg-white border border-[#E3E1DC] rounded-xl px-4 py-3 min-h-[88px]">
          <TextInput
            value={details.requirements}
            onChangeText={(v) => onChange("requirements", v)}
            placeholder="Any specific requests or notes..."
            placeholderTextColor="#C7C7CC"
            multiline
            textAlignVertical="top"
            className="text-[#1C1C1E] text-[14px] leading-[20px]"
            style={{ minHeight: 64 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 3 — Services picker ─────────────────────────────────────────────────

function ServicesStep({
  categories,
  selected,
  onToggle,
  loadingCategories,
}: {
  categories: ServiceCategory[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  loadingCategories: boolean;
}) {
  if (loadingCategories) {
    return (
      <View className="items-center py-12">
        <ActivityIndicator color="#1C1C1E" />
      </View>
    );
  }

  return (
    <View>
      <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight mb-1">
        Services needed
      </Text>
      <Text className="text-[#6E6E73] text-[14px] mb-5">
        Select all that apply. You can add more later.
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {categories.map((cat) => {
          const active = selected.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onToggle(cat.id)}
              activeOpacity={0.78}
              className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border ${
                active ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E3E1DC]"
              }`}
            >
              <AppIcon
                name={(cat.icon as any) || "briefcase"}
                size={14}
                color={active ? "#FFFFFF" : "#6E6E73"}
              />
              <Text
                className={`text-[13px] font-semibold ${
                  active ? "text-white" : "text-[#3A3A3C]"
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected.size > 0 && (
        <Text className="text-[#1C1C1E] text-[13px] font-semibold mt-4">
          {selected.size} selected
        </Text>
      )}
    </View>
  );
}

// ─── Step 4 — Review ──────────────────────────────────────────────────────────

function ReviewStep({
  eventType,
  details,
  selectedCategories,
  categories,
}: {
  eventType: EventType;
  details: Details;
  selectedCategories: Set<string>;
  categories: ServiceCategory[];
}) {
  const meta = EVENT_TYPE_META[eventType];
  const selectedNames = categories
    .filter((c) => selectedCategories.has(c.id))
    .map((c) => c.name);

  function Row({ label, value }: { label: string; value: string }) {
    return (
      <View className="flex-row justify-between py-2.5 border-b border-[#F0EEEA]">
        <Text className="text-[#6E6E73] text-[13px]">{label}</Text>
        <Text className="text-[#1C1C1E] text-[13px] font-medium flex-1 text-right ml-4" numberOfLines={2}>
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight mb-1">Review & confirm</Text>
      <Text className="text-[#6E6E73] text-[14px] mb-5">Double-check your event details.</Text>

      <View className="bg-white border border-[#E8E6E1] rounded-2xl px-4 py-2 mb-4">
        <Row label="Type" value={`${meta.emoji}  ${meta.label}`} />
        {details.title ? <Row label="Title" value={details.title} /> : null}
        <Row label="Date" value={details.eventDate ? details.eventDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "—"} />
        {details.startTime ? <Row label="Start time" value={details.startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} /> : null}
        <Row label="Location" value={details.location} />
        {details.guestCount ? <Row label="Guest count" value={details.guestCount} /> : null}
        {details.budgetMin || details.budgetMax ? (
          <Row
            label="Budget"
            value={`₹${details.budgetMin || "—"} – ₹${details.budgetMax || "—"}`}
          />
        ) : null}
        {selectedNames.length > 0 ? (
          <Row label="Services" value={selectedNames.join(", ")} />
        ) : null}
        {details.requirements ? (
          <View className="py-2.5">
            <Text className="text-[#6E6E73] text-[13px] mb-1">Requirements</Text>
            <Text className="text-[#1C1C1E] text-[13px]">{details.requirements}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("type");
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [details, setDetails] = useState<Details>({
    title: "",
    eventDate: null,
    startTime: null,
    location: "",
    guestCount: "",
    budgetMin: "",
    budgetMax: "",
    requirements: "",
  });
  const [detailErrors, setDetailErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    eventsApi.listCategories()
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, []);

  function setDetail(k: keyof Details, v: string) {
    setDetails((p) => ({ ...p, [k]: v }));
    if (detailErrors[k]) setDetailErrors((p) => ({ ...p, [k]: undefined }));
  }

  function toggleService(id: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function validateDetails(): boolean {
    const errs: Partial<Record<keyof Details, string>> = {};
    if (!details.eventDate) {
      errs.eventDate = "Date is required";
    }
    if (!details.location.trim()) errs.location = "Location is required";
    setDetailErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (step === "type") {
      if (!eventType) {
        Alert.alert("Choose a type", "Please select an event type to continue.");
        return;
      }
      setStep("details");
    } else if (step === "details") {
      if (!validateDetails()) return;
      setStep("services");
    } else if (step === "services") {
      setStep("review");
    }
  }

  function goBack() {
    const prev: Record<Step, Step | null> = {
      type: null,
      details: "type",
      services: "details",
      review: "services",
    };
    const p = prev[step];
    if (p) setStep(p);
    else router.back();
  }

  async function handleSubmit() {
    if (!eventType || !details.eventDate) return;
    setSubmitting(true);
    try {
      const payload = {
        type: eventType,
        title: details.title.trim() || undefined,
        eventDate: details.eventDate.toISOString(),
        startTime: details.startTime
          ? details.startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : undefined,
        location: details.location.trim(),
        guestCount: details.guestCount ? parseInt(details.guestCount) : undefined,
        budgetMin: details.budgetMin ? parseInt(details.budgetMin) : undefined,
        budgetMax: details.budgetMax ? parseInt(details.budgetMax) : undefined,
        requirements: details.requirements.trim() || undefined,
        serviceCategories: selectedServices.size > 0 ? Array.from(selectedServices) : undefined,
      };

      const event = await eventsApi.create(payload);
      Alert.alert("Event created! 🎉", "Your event has been saved.", [
        { text: "View event", onPress: () => router.replace(`/events/${event.id}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Could not create event.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step === "review";

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        {/* Nav bar */}
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={goBack}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] items-center justify-center mr-3"
          >
            <AppIcon name="arrow-left" size={16} color="#3A3A3C" />
          </TouchableOpacity>
          <Text className="text-[#1C1C1E] text-[16px] font-bold flex-1">Create Event</Text>
          <Text className="text-[#A7A7AB] text-[12px]">
            Step {STEPS.indexOf(step) + 1} / {STEPS.length}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepBar current={step} />

          {step === "type" && (
            <TypeStep selected={eventType} onSelect={setEventType} />
          )}
          {step === "details" && (
            <DetailsStep
              details={details}
              onDateChange={(d) => setDetails((p) => ({ ...p, eventDate: d }))}
              onTimeChange={(d) => setDetails((p) => ({ ...p, startTime: d }))}
              onChange={setDetail}
              errors={detailErrors}
            />
          )}
          {step === "services" && (
            <ServicesStep
              categories={categories}
              selected={selectedServices}
              onToggle={toggleService}
              loadingCategories={loadingCategories}
            />
          )}
          {step === "review" && eventType && (
            <ReviewStep
              eventType={eventType}
              details={details}
              selectedCategories={selectedServices}
              categories={categories}
            />
          )}

          <View className="mt-6">
            <Button
              label={isLast ? "Create Event" : "Continue"}
              onPress={isLast ? handleSubmit : goNext}
              fullWidth
              size="lg"
              loading={submitting}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
