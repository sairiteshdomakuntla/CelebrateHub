import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import { useAuthStore } from "@/store/auth.store";
import { FormInput } from "@/components/ui/FormInput";
import { BrandMark } from "@/components/ui/pro-icon";
import { eventsApi, type ServiceCategory } from "@/lib/events.api";
import axios from "axios";

const DEFAULT_CATEGORIES = [
  { id: "photography", name: "Photography & Video", icon: "camera" },
  { id: "catering", name: "Catering & Food", icon: "coffee" },
  { id: "decor", name: "Decor & Flowers", icon: "sparkles" },
  { id: "dj-music", name: "DJ & Sound", icon: "music" },
  { id: "venue", name: "Venues & Banquets", icon: "home" },
  { id: "makeup", name: "Makeup & Styling", icon: "heart" },
  { id: "cake-desserts", name: "Cake & Desserts", icon: "gift" },
  { id: "planner", name: "Event Planner", icon: "briefcase" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { register, registerProvider, isLoading } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<"CUSTOMER" | "PROVIDER">(
    params.role === "provider" ? "PROVIDER" : "CUSTOMER"
  );

  // Common user fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Provider-specific onboarding fields
  const [businessName, setBusinessName] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [pricingMin, setPricingMin] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>(
    DEFAULT_CATEGORIES
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load live service categories from API
  useEffect(() => {
    eventsApi
      .listCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(() => {
        // Fall back to default categories
      });
  }, []);

  function toggleCategory(catId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
    setErrors((e) => ({ ...e, categories: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Full name must be at least 2 characters";
    }

    if (!email.trim() && !phone.trim()) {
      newErrors.email = "Provide an email or phone number";
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Include at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Include at least one number";
    }

    if (password && confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (selectedRole === "PROVIDER") {
      if (!phone.trim()) {
        newErrors.phone = "Phone number is required for vendor communication";
      }
      if (!businessName.trim() || businessName.trim().length < 2) {
        newErrors.businessName = "Business name must be at least 2 characters";
      }
      if (!serviceArea.trim() || serviceArea.trim().length < 2) {
        newErrors.serviceArea = "Specify your service coverage city or area";
      }
      if (selectedCategoryIds.length === 0) {
        newErrors.categories = "Select at least one primary service category";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;

    try {
      if (selectedRole === "PROVIDER") {
        const parsedPrice = pricingMin ? parseInt(pricingMin.replace(/[^0-9]/g, ""), 10) : undefined;
        await registerProvider({
          name: name.trim(),
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          password,
          businessName: businessName.trim(),
          serviceArea: serviceArea.trim(),
          pricingMin: parsedPrice,
          description: description.trim() || undefined,
          categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        });
      } else {
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase() || undefined,
          phone: phone.trim() || undefined,
          password,
        });
      }

      router.replace("/(app)" as any);
    } catch (err) {
      let message = "Registration failed. Please try again.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message ?? message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      Alert.alert("Registration Failed", message);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 48, paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-4 self-start flex-row items-center gap-1 py-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppIcon name="chevron-left" size={17} color="#1C1C1E" />
              <Text className="text-[#1C1C1E] text-[15px] font-medium">Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View className="mb-5">
              <BrandMark size={44} />
              <Text className="text-[#1C1C1E] text-[26px] font-extrabold tracking-tight mt-3">
                {selectedRole === "PROVIDER" ? "Partner with CelebrateHub" : "Create your account"}
              </Text>
              <Text className="text-[#6E6E73] text-[14px] mt-1 leading-[20px]">
                {selectedRole === "PROVIDER"
                  ? "Grow your celebration business, receive real-time leads, and connect with event hosts."
                  : "Join CelebrateHub to discover vendors, plan events, and manage gift circles."}
              </Text>
            </View>

            {/* Role Switcher Pill Bar */}
            <View className="flex-row p-1 bg-[#EBE8E3] rounded-2xl mb-5">
              <TouchableOpacity
                onPress={() => {
                  setSelectedRole("CUSTOMER");
                  setErrors({});
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
                  selectedRole === "CUSTOMER"
                    ? "bg-white shadow-xs"
                    : "bg-transparent"
                }`}
                activeOpacity={0.8}
              >
                <AppIcon
                  name="user"
                  size={15}
                  color={selectedRole === "CUSTOMER" ? "#1C1C1E" : "#6E6E73"}
                />
                <Text
                  className={`text-[13px] font-bold ${
                    selectedRole === "CUSTOMER" ? "text-[#1C1C1E]" : "text-[#6E6E73]"
                  }`}
                >
                  Event Host
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedRole("PROVIDER");
                  setErrors({});
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
                  selectedRole === "PROVIDER"
                    ? "bg-[#1C1C1E] shadow-xs"
                    : "bg-transparent"
                }`}
                activeOpacity={0.8}
              >
                <AppIcon
                  name="briefcase"
                  size={15}
                  color={selectedRole === "PROVIDER" ? "#FFFFFF" : "#6E6E73"}
                />
                <Text
                  className={`text-[13px] font-bold ${
                    selectedRole === "PROVIDER" ? "text-white" : "text-[#6E6E73]"
                  }`}
                >
                  Service Vendor
                </Text>
              </TouchableOpacity>
            </View>

            {/* Provider Welcome Pill */}
            {selectedRole === "PROVIDER" && (
              <View className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-4 flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-full bg-[#FEF3C7] items-center justify-center mt-0.5">
                  <AppIcon name="zap" size={16} color="#B45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#92400E] text-[13px] font-bold">
                    Vendor Onboarding Flow
                  </Text>
                  <Text className="text-[#B45309] text-[12px] leading-[17px] mt-0.5">
                    Your profile will be created with instant lead matching. You can update pricing, portfolio images, and subscriptions anytime.
                  </Text>
                </View>
              </View>
            )}

            {/* Form Section 1: Contact & Login Credentials */}
            <View className="bg-white rounded-2xl border border-[#E8E6E1] p-5 mb-4 shadow-xs">
              <Text className="text-[#1C1C1E] text-[15px] font-bold mb-3">
                {selectedRole === "PROVIDER" ? "1. Contact & Account Info" : "Account Details"}
              </Text>

              <FormInput
                label="Full name *"
                placeholder={selectedRole === "PROVIDER" ? "e.g. Rahul Kapoor (Owner)" : "e.g. Priya Sharma"}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
                error={errors.name}
                autoComplete="name"
              />

              <FormInput
                label="Email address"
                placeholder="name@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                error={errors.email}
                hint={selectedRole === "PROVIDER" ? "Leads & inquiries will be delivered here" : "Event updates & booking notices"}
                autoComplete="email"
              />

              <FormInput
                label={`Phone number ${selectedRole === "PROVIDER" ? "*" : "(optional)"}`}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
                error={errors.phone}
                hint={selectedRole === "PROVIDER" ? "Required for instant customer calls & WhatsApp leads" : undefined}
              />

              <FormInput
                label="Password *"
                placeholder="Min. 8 characters"
                isPassword
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                error={errors.password}
              />

              <View className="flex-row gap-2 mb-3 -mt-1">
                {[
                  { ok: password.length >= 8, label: "8+ chars" },
                  { ok: /[A-Z]/.test(password), label: "Uppercase" },
                  { ok: /[0-9]/.test(password), label: "Number" },
                ].map((r) => (
                  <View
                    key={r.label}
                    className={`px-2.5 py-1 rounded-full border ${
                      r.ok ? "bg-[#EAF6EE] border-[#CDE8D5]" : "bg-[#F4F2EE] border-[#E8E6E1]"
                    }`}
                  >
                    <Text className={`text-[11px] font-medium ${r.ok ? "text-[#1E7A3C]" : "text-[#A7A7AB]"}`}>
                      {r.ok ? "✓ " : ""}{r.label}
                    </Text>
                  </View>
                ))}
              </View>

              <FormInput
                label="Confirm password *"
                placeholder="Re-enter password"
                isPassword
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
                error={errors.confirmPassword}
              />
            </View>

            {/* Form Section 2: Provider Business & Services Details */}
            {selectedRole === "PROVIDER" && (
              <View className="bg-white rounded-2xl border border-[#E8E6E1] p-5 mb-4 shadow-xs">
                <Text className="text-[#1C1C1E] text-[15px] font-bold mb-3">
                  2. Business & Service Setup
                </Text>

                <FormInput
                  label="Business / Brand Name *"
                  placeholder="e.g. Royal Moments Candid Studios"
                  value={businessName}
                  onChangeText={(t) => { setBusinessName(t); setErrors((e) => ({ ...e, businessName: "" })); }}
                  error={errors.businessName}
                  hint="How customers and clients will find you on CelebrateHub"
                />

                {/* Primary Category Selector */}
                <View className="mb-4">
                  <Text className="text-[#1C1C1E] text-[13px] font-semibold mb-1">
                    Select Your Service Categories *
                  </Text>
                  <Text className="text-[#6E6E73] text-[12px] mb-2.5">
                    Choose what services you provide to match relevant client leads.
                  </Text>

                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => toggleCategory(cat.id)}
                          className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                            isSelected
                              ? "bg-[#1C1C1E] border-[#1C1C1E]"
                              : "bg-[#F7F7F5] border-[#E3E1DC]"
                          }`}
                          activeOpacity={0.7}
                        >
                          <AppIcon
                            name={(cat.icon as any) || "briefcase"}
                            size={12}
                            color={isSelected ? "#FFFFFF" : "#6E6E73"}
                          />
                          <Text
                            className={`text-[12px] font-semibold ${
                              isSelected ? "text-white" : "text-[#3A3A3C]"
                            }`}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.categories ? (
                    <Text className="text-[#B3261E] text-[12px] mt-1.5 font-medium">
                      {errors.categories}
                    </Text>
                  ) : null}
                </View>

                <FormInput
                  label="City / Coverage Area *"
                  placeholder="e.g. Mumbai, Navi Mumbai & Pune"
                  value={serviceArea}
                  onChangeText={(t) => { setServiceArea(t); setErrors((e) => ({ ...e, serviceArea: "" })); }}
                  error={errors.serviceArea}
                  hint="Locations where you are willing to travel and deliver services"
                />

                <FormInput
                  label="Starting Package / Base Price (₹ optional)"
                  placeholder="e.g. 15000"
                  keyboardType="numeric"
                  value={pricingMin}
                  onChangeText={setPricingMin}
                  hint="Starting rate shown to customers browsing services"
                />

                <FormInput
                  label="Business Bio / About"
                  placeholder="Tell clients about your experience, style, and equipment..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              className={`py-4 rounded-xl items-center justify-center mb-4 ${
                selectedRole === "PROVIDER" ? "bg-[#1C1C1E]" : "bg-[#4F46E5]"
              }`}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white text-[15px] font-bold">
                  {selectedRole === "PROVIDER"
                    ? "Complete Onboarding & Join →"
                    : "Create Host Account"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign in alternative link */}
            <View className="flex-row justify-center items-center py-2">
              <Text className="text-[#6E6E73] text-[14px]">Already have an account? </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    (selectedRole === "PROVIDER"
                      ? "/(auth)/login?role=provider"
                      : "/(auth)/login") as any
                  )
                }
              >
                <Text className="text-[#1C1C1E] text-[14px] font-bold underline">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
