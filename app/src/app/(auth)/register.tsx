import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
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
      Alert.alert("Registration Failed", message);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      {/* Background blobs */}
      <View
        className="absolute rounded-full bg-purple-brand opacity-[0.09]"
        style={{ width: 280, height: 280, top: -60, left: -80 }}
      />
      <View
        className="absolute rounded-full bg-rose-brand opacity-[0.09]"
        style={{ width: 220, height: 220, bottom: 60, right: -50 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} className="mb-6 self-start">
            <Text className="text-text-muted text-[14px] font-medium">← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="items-center mb-6">
            <View
              className="w-[60px] h-[60px] rounded-[18px] bg-rose-brand items-center justify-center mb-4"
              style={{
                shadowColor: "#E8956D",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.45,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <Text className="text-bg text-[22px] font-black tracking-tight">CH</Text>
            </View>
            <Text className="text-text-primary text-[26px] font-extrabold tracking-tight mb-1.5">
              Create account
            </Text>
            <Text className="text-text-muted text-[14px]">
              Start planning your perfect celebration
            </Text>
          </View>

          {/* Progress indicator */}
          <View className="flex-row items-center justify-center mb-1.5 gap-1.5">
            <View className="w-6 h-2 rounded bg-rose-brand" />
            <View className="flex-1 max-w-[40px] h-0.5 bg-bg-muted rounded" />
            <View className="w-2 h-2 rounded-full bg-bg-muted" />
            <View className="flex-1 max-w-[40px] h-0.5 bg-bg-muted rounded" />
            <View className="w-2 h-2 rounded-full bg-bg-muted" />
          </View>
          <Text className="text-text-dim text-[11px] text-center mb-6 tracking-[0.3px]">
            Step 1 of 3 — Your Details
          </Text>

          {/* Form */}
          <View className="mb-2">
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
              hint="We'll use this to send event updates"
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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              isPassword
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
              error={errors.password}
            />

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

          {/* Terms */}
          <Text className="text-text-dim text-[12px] text-center leading-[18px] mb-5">
            By creating an account you agree to our{" "}
            <Text className="text-rose-brand font-semibold">Terms of Service</Text> and{" "}
            <Text className="text-rose-brand font-semibold">Privacy Policy</Text>.
          </Text>

          {/* CTA */}
          <Button
            label="Create Account"
            onPress={handleRegister}
            fullWidth
            size="lg"
            loading={isLoading}
            style={{
              shadowColor: "#E8956D",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 14,
              elevation: 8,
            }}
          />

          {/* Login link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-text-muted text-[14px]">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
              <Text className="text-rose-brand text-[14px] font-semibold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
