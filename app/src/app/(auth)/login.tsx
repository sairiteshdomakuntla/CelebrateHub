import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useAuthStore } from "@/store/auth.store";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/pro-icon";
import axios from "axios";

type LoginMethod = "email" | "phone";

const PORTAL_META: Record<string, { pill: string; title: string; subtitle: string; icon: "person.fill" | "briefcase.fill" | "lock.shield.fill" }> = {
  provider: {
    pill: "Service provider",
    title: "Provider sign in",
    subtitle: "Access your leads, bookings and business profile.",
    icon: "briefcase.fill",
  },
  admin: {
    pill: "Administration",
    title: "Admin sign in",
    subtitle: "Restricted to authorised system administrators.",
    icon: "lock.shield.fill",
  },
  customer: {
    pill: "Customer",
    title: "Welcome back",
    subtitle: "Sign in to manage your events and bookings.",
    icon: "person.fill",
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { login, isLoading } = useAuthStore();

  const meta = PORTAL_META[role ?? "customer"] ?? PORTAL_META.customer;

  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (method === "email") {
      if (!email.trim()) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Enter a valid email";
    } else {
      if (!phone.trim()) newErrors.phone = "Phone number is required";
    }
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    try {
      await login({
        email: method === "email" ? email.trim().toLowerCase() : undefined,
        phone: method === "phone" ? phone.trim() : undefined,
        password,
      });
      router.replace("/(app)" as any);
    } catch (err) {
      let message = "Login failed. Please check your credentials.";
      if (axios.isAxiosError(err)) message = err.response?.data?.message ?? message;
      else if (err instanceof Error) message = err.message;
      Alert.alert("Login failed", message);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-6 self-start flex-row items-center gap-1 py-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <SymbolView name="chevron.left" size={17} tintColor="#1C1C1E" />
              <Text className="text-[#1C1C1E] text-[15px] font-medium">Back</Text>
            </TouchableOpacity>

            <View className="mb-7">
              <BrandMark size={48} />
              <View className="bg-white self-start px-3 py-1.5 rounded-full mt-5 border border-[#E8E6E1]">
                <Text className="text-[#6E6E73] text-[12px] font-semibold">
                  {meta.pill}
                </Text>
              </View>
              <Text className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mt-3">
                {meta.title}
              </Text>
              <Text className="text-[#6E6E73] text-[15px] mt-1.5 leading-[22px]">
                {meta.subtitle}
              </Text>
            </View>

            <View className="mb-6">
              <View className="flex-row bg-[#ECEAE6] rounded-xl p-1">
                {(["email", "phone"] as LoginMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    className={`flex-1 py-2.5 items-center rounded-lg ${
                      method === m ? "bg-white border border-[#E0DED8]" : ""
                    }`}
                    onPress={() => { setMethod(m); setErrors({}); }}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-[14px] font-semibold capitalize ${
                        method === m ? "text-[#1C1C1E]" : "text-[#6E6E73]"
                      }`}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-[#E8E6E1] p-5 mb-4">
              {method === "email" ? (
                <FormInput
                  label="Email address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                  error={errors.email}
                  autoComplete="email"
                />
              ) : (
                <FormInput
                  label="Phone number"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
                  error={errors.phone}
                />
              )}

              <FormInput
                label="Password"
                placeholder="Enter your password"
                isPassword
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                error={errors.password}
              />

              <TouchableOpacity className="self-end mt-1">
                <Text className="text-[#1C1C1E] text-[13px] font-semibold">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              label="Sign in"
              onPress={handleLogin}
              fullWidth
              size="lg"
              loading={isLoading}
            />

            {role === "provider" || role === "admin" ? (
              <View className="mt-5 p-4 bg-white border border-[#E8E6E1] rounded-2xl">
                <View className="flex-row items-center gap-2 mb-1">
                  <SymbolView name="info.circle.fill" size={15} tintColor="#6E6E73" />
                  <Text className="text-[#1C1C1E] font-semibold text-[13px]">
                    {role === "provider" ? "New service provider?" : "Need admin access?"}
                  </Text>
                </View>
                <Text className="text-[#6E6E73] text-[13px] leading-[19px]">
                  {role === "provider"
                    ? "Provider accounts are created and verified by CelebrateHub administration. Contact support to get onboarded."
                    : "Admin accounts are provisioned by platform owners. Self-registration is disabled."}
                </Text>
              </View>
            ) : (
              <View className="items-center mt-6">
                <View className="flex-row items-center justify-center">
                  <Text className="text-[#6E6E73] text-[14px]">New to CelebrateHub? </Text>
                  <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)}>
                    <Text className="text-[#1C1C1E] text-[14px] font-semibold underline">
                      Create account
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-[#A7A7AB] text-[12px] text-center mt-2 leading-[17px]">
                  Registration is for customers only. Providers and admins are onboarded by our team.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
