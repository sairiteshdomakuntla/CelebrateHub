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

type LoginMethod = "email" | "phone";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

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
      Alert.alert("Login Failed", message);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      {/* Background blobs */}
      <View
        className="absolute rounded-full bg-rose-brand opacity-10"
        style={{ width: 260, height: 260, top: -50, right: -60 }}
      />
      <View
        className="absolute rounded-full bg-purple-brand opacity-10"
        style={{ width: 200, height: 200, bottom: 80, left: -50 }}
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
          <View className="items-center mb-8">
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
              Welcome back
            </Text>
            <Text className="text-text-muted text-[14px] text-center">
              Sign in to your CelebrateHub account
            </Text>
          </View>

          {/* Email / Phone toggle */}
          <View className="mb-7">
            <View className="flex-row bg-bg-input rounded-xl border border-border-faint p-1">
              <TouchableOpacity
                className={`flex-1 py-2.5 items-center rounded-[9px] ${
                  method === "email" ? "bg-bg-card border border-border-rose" : ""
                }`}
                onPress={() => { setMethod("email"); setErrors({}); }}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    method === "email" ? "text-rose-brand" : "text-text-muted"
                  }`}
                >
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-2.5 items-center rounded-[9px] ${
                  method === "phone" ? "bg-bg-card border border-border-rose" : ""
                }`}
                onPress={() => { setMethod("phone"); setErrors({}); }}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-[14px] font-semibold ${
                    method === "phone" ? "text-rose-brand" : "text-text-muted"
                  }`}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View className="mb-2">
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

            <TouchableOpacity className="self-end -mt-1 mb-1">
              <Text className="text-rose-brand text-[13px] font-medium">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <Button
            label="Sign In"
            onPress={handleLogin}
            fullWidth
            size="lg"
            loading={isLoading}
            style={{
              marginTop: 16,
              shadowColor: "#E8956D",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 14,
              elevation: 8,
            }}
          />

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-text-muted text-[14px]">New here? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)}>
              <Text className="text-rose-brand text-[14px] font-semibold">
                Create an account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
