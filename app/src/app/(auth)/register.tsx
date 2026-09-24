import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import { useAuthStore } from "@/store/auth.store";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/pro-icon";
import axios from "axios";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2)
      newErrors.name = "Full name must be at least 2 characters";
    if (!email.trim() && !phone.trim())
      newErrors.email = "Provide an email or phone number";
    if (email && !/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Enter a valid email address";
    if (!password)
      newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password))
      newErrors.password = "Include at least one uppercase letter";
    else if (!/[0-9]/.test(password))
      newErrors.password = "Include at least one number";
    if (password && confirmPassword !== password)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      router.replace("/(app)" as any);
    } catch (err) {
      let message = "Registration failed. Please try again.";
      if (axios.isAxiosError(err)) message = err.response?.data?.message ?? message;
      else if (err instanceof Error) message = err.message;
      Alert.alert("Registration failed", message);
    }
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-6 self-start flex-row items-center gap-1 py-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppIcon name="chevron-left" size={17} color="#1C1C1E" />
              <Text className="text-[#1C1C1E] text-[15px] font-medium">Back</Text>
            </TouchableOpacity>

            <View className="mb-6">
              <BrandMark size={48} />
              <Text className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mt-4">
                Create your account
              </Text>
              <Text className="text-[#6E6E73] text-[15px] mt-1.5 leading-[22px]">
                Join CelebrateHub to discover vendors and plan your celebrations.
              </Text>
            </View>

            <View className="bg-white border border-[#E8E6E1] rounded-2xl p-4 mb-4 flex-row items-start gap-3">
              <AppIcon name="info" size={17} color="#6E6E73" />
              <Text className="text-[#3A3A3C] text-[13px] leading-[19px] flex-1">
                Public registration is for customers and event hosts. Providers and admins are onboarded directly by our team.
              </Text>
            </View>

            <View className="bg-white rounded-2xl border border-[#E8E6E1] p-5 mb-4">
              <FormInput
                label="Full name"
                placeholder="Priya Sharma"
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
                error={errors.name}
                autoComplete="name"
              />

              <FormInput
                label="Email address"
                placeholder="priya@example.com"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: "" })); }}
                error={errors.email}
                hint="Event updates and booking confirmations go here"
                autoComplete="email"
              />

              <FormInput
                label="Phone number (optional)"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <FormInput
                label="Password"
                placeholder="Min. 8 characters"
                isPassword
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                error={errors.password}
              />

              <View className="flex-row gap-2 mb-1 -mt-1">
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
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>

              <FormInput
                label="Confirm password"
                placeholder="Repeat your password"
                isPassword
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrors((e) => ({ ...e, confirmPassword: "" }));
                }}
                error={errors.confirmPassword}
              />
            </View>

            <Text className="text-[#6E6E73] text-[12px] text-center leading-[18px] mb-5 px-2">
              By creating an account you agree to our{" "}
              <Text className="text-[#1C1C1E] font-semibold">Terms of Service</Text> and{" "}
              <Text className="text-[#1C1C1E] font-semibold">Privacy Policy</Text>.
            </Text>

            <Button
              label="Create account"
              onPress={handleRegister}
              fullWidth
              size="lg"
              loading={isLoading}
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-[#6E6E73] text-[14px]">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login?role=customer" as any)}>
                <Text className="text-[#1C1C1E] text-[14px] font-semibold underline">Sign in</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
