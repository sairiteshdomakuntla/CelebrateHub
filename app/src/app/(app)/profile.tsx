import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/pro-icon";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { authApi, type AuthUser } from "@/lib/auth.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:    { bg: "#EAF0FB", text: "#2F54B8", border: "#CCD9F2" },
  PROVIDER: { bg: "#FDF3E3", text: "#8A5E10", border: "#F0DFB8" },
  CUSTOMER: { bg: "#EAF6EE", text: "#1E7A3C", border: "#CDE8D5" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: "#EAF6EE", text: "#1E7A3C" },
  INACTIVE:  { bg: "#F1EFEC", text: "#6E6E73" },
  SUSPENDED: { bg: "#FBECEB", text: "#B3261E" },
};

// ─── Editable field row ───────────────────────────────────────────────────────

function EditableRow({
  label,
  value,
  editing,
  onEdit,
  onDone,
  onCancel,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "words",
  last = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onDone: (val: string) => void;
  onCancel: () => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  last?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  // Sync draft when value changes externally (e.g. after save)
  useEffect(() => { setDraft(value); }, [value]);

  return (
    <View className={`py-3 ${last ? "" : "border-b border-[#EFEEEA]"}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-wider mb-1">
          {label}
        </Text>
        {!editing && (
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F4F0]"
          >
            <AppIcon name="edit-2" size={11} color="#6E6E73" />
            <Text className="text-[#6E6E73] text-[11px] font-semibold">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder ?? label}
            placeholderTextColor="#A7A7AB"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoFocus
            className="bg-[#F7F7F5] border border-[#6366F1]/40 rounded-xl px-3.5 py-2.5 text-[14px] text-[#1C1C1E] mb-2"
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onDone(draft.trim())}
              className="flex-1 bg-[#1C1C1E] rounded-xl py-2.5 items-center"
            >
              <Text className="text-white text-[13px] font-bold">Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setDraft(value); onCancel(); }}
              className="flex-1 bg-[#F5F4F0] border border-[#E3E1DC] rounded-xl py-2.5 items-center"
            >
              <Text className="text-[#6E6E73] text-[13px] font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text className="text-[#1C1C1E] text-[15px] font-medium">
          {value || <Text className="text-[#A7A7AB]">Not set</Text>}
        </Text>
      )}
    </View>
  );
}

// ─── Change Password modal ────────────────────────────────────────────────────

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setShowCurrent(false); setShowNew(false);
  }

  async function handleSubmit() {
    if (!currentPw.trim()) {
      Alert.alert("Missing field", "Please enter your current password.");
      return;
    }
    if (newPw.length < 8) {
      Alert.alert("Weak password", "New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      Alert.alert("✓ Password changed", "Your password has been updated successfully.");
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white rounded-t-3xl px-6 pt-4 pb-10">
          {/* Handle */}
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-[#D1D1D6]" />
          </View>

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-[#1C1C1E] text-[18px] font-bold">Change Password</Text>
            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center"
            >
              <AppIcon name="x" size={15} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Current password */}
          <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-wider mb-1.5">
            Current Password
          </Text>
          <View className="flex-row items-center bg-[#F7F7F5] border border-[#E3E1DC] rounded-xl px-3.5 mb-4">
            <TextInput
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="••••••••"
              placeholderTextColor="#A7A7AB"
              secureTextEntry={!showCurrent}
              className="flex-1 py-3 text-[14px] text-[#1C1C1E]"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <AppIcon name={showCurrent ? "eye-off" : "eye"} size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* New password */}
          <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-wider mb-1.5">
            New Password
          </Text>
          <View className="flex-row items-center bg-[#F7F7F5] border border-[#E3E1DC] rounded-xl px-3.5 mb-4">
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              placeholder="Min. 8 characters"
              placeholderTextColor="#A7A7AB"
              secureTextEntry={!showNew}
              className="flex-1 py-3 text-[14px] text-[#1C1C1E]"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <AppIcon name={showNew ? "eye-off" : "eye"} size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-wider mb-1.5">
            Confirm New Password
          </Text>
          <View className={`flex-row items-center bg-[#F7F7F5] border rounded-xl px-3.5 mb-6 ${
            confirmPw && confirmPw !== newPw ? "border-[#B3261E]" : "border-[#E3E1DC]"
          }`}>
            <TextInput
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Re-enter new password"
              placeholderTextColor="#A7A7AB"
              secureTextEntry={!showNew}
              className="flex-1 py-3 text-[14px] text-[#1C1C1E]"
            />
            {confirmPw.length > 0 && (
              <AppIcon
                name={confirmPw === newPw ? "check" : "x"}
                size={16}
                color={confirmPw === newPw ? "#1E7A3C" : "#B3261E"}
              />
            )}
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-[#1C1C1E] rounded-2xl py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-[15px] font-bold">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Info row (read-only) ─────────────────────────────────────────────────────

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? "" : "border-b border-[#EFEEEA]"}`}>
      <Text className="text-[#6E6E73] text-[14px]">{label}</Text>
      <Text className="text-[#1C1C1E] text-[14px] font-medium">{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type EditingField = "name" | "email" | "phone" | null;

export default function ProfileScreen() {
  const router = useRouter();
  const { user: storeUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      setProfile(data);
      useAuthStore.getState().setUser(data);
    } catch {
      setProfile(storeUser as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSaveField(field: "name" | "email" | "phone", value: string) {
    if (!value && field !== "phone") {
      Alert.alert("Required", `${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty.`);
      return;
    }
    // Check no actual change
    const current = profile?.[field] ?? "";
    if (value === current) { setEditingField(null); return; }

    setSaving(true);
    try {
      const updated = await authApi.updateMe({ [field]: value || null });
      setProfile(updated);
      useAuthStore.getState().setUser(updated);
      setEditingField(null);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  }

  const user = profile ?? storeUser;
  const roleStyle   = ROLE_STYLE[user?.role ?? "CUSTOMER"]   ?? ROLE_STYLE.CUSTOMER;
  const statusStyle = STATUS_STYLE[user?.status ?? "ACTIVE"] ?? STATUS_STYLE.ACTIVE;
  const initial     = user?.name?.[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center">
        <ActivityIndicator color="#1C1C1E" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar & header ── */}
          <View className="items-center pt-8 pb-6">
            <View className="w-20 h-20 rounded-full bg-[#1C1C1E] items-center justify-center mb-4">
              <Text className="text-white text-[30px] font-bold">{initial}</Text>
            </View>

            <Text className="text-[#1C1C1E] text-[22px] font-bold tracking-tight">
              {user?.name}
            </Text>
            <Text className="text-[#6E6E73] text-[14px] mt-1">
              {user?.email ?? user?.phone ?? ""}
            </Text>

            <View className="flex-row gap-2 mt-3">
              <View
                style={{ backgroundColor: roleStyle.bg, borderColor: roleStyle.border }}
                className="px-3 py-1.5 rounded-full border"
              >
                <Text style={{ color: roleStyle.text }} className="text-[12px] font-semibold">
                  {user?.role}
                </Text>
              </View>
              <View style={{ backgroundColor: statusStyle.bg }} className="px-3 py-1.5 rounded-full">
                <Text style={{ color: statusStyle.text }} className="text-[12px] font-semibold">
                  {user?.status}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Provider business card ── */}
          {profile?.provider && (
            <View className="bg-white border border-[#E8E6E1] rounded-2xl p-5 mb-3">
              <View className="flex-row items-center gap-2 mb-3">
                <AppIcon name="briefcase" size={15} color="#6E6E73" />
                <Text className="text-[#6E6E73] text-[12px] font-semibold uppercase tracking-widest">
                  Business
                </Text>
              </View>
              <Text className="text-[#1C1C1E] text-[16px] font-bold">
                {profile.provider.businessName}
              </Text>
              {profile.provider.serviceArea && (
                <Text className="text-[#6E6E73] text-[14px] mt-0.5">{profile.provider.serviceArea}</Text>
              )}
              <View className="flex-row items-center gap-3 mt-3">
                <View className="flex-row items-center gap-1.5">
                  <AppIcon name="star" size={14} color="#9A6A14" />
                  <Text className="text-[#1C1C1E] text-[14px] font-semibold">
                    {Number(profile.provider.ratingAvg).toFixed(1)}
                  </Text>
                  <Text className="text-[#A7A7AB] text-[12px]">
                    ({profile.provider.ratingCount} reviews)
                  </Text>
                </View>
                <View
                  className={`px-2.5 py-1 rounded-full ${
                    profile.provider.isAvailable ? "bg-[#EAF6EE]" : "bg-[#F1EFEC]"
                  }`}
                >
                  <Text
                    className={`text-[12px] font-semibold ${
                      profile.provider.isAvailable ? "text-[#1E7A3C]" : "text-[#6E6E73]"
                    }`}
                  >
                    {profile.provider.isAvailable ? "Available" : "Unavailable"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Editable details ── */}
          <View className="bg-white border border-[#E8E6E1] rounded-2xl px-5 py-1 mb-3">
            <View className="flex-row items-center gap-2 pt-4 pb-2 border-b border-[#EFEEEA]">
              <AppIcon name="user" size={14} color="#6E6E73" />
              <Text className="text-[#6E6E73] text-[11px] font-bold uppercase tracking-wider">
                Personal details
              </Text>
              {saving && <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 6 }} />}
            </View>

            <EditableRow
              label="Name"
              value={user?.name ?? ""}
              editing={editingField === "name"}
              onEdit={() => setEditingField("name")}
              onDone={(v) => handleSaveField("name", v)}
              onCancel={() => setEditingField(null)}
              placeholder="Your full name"
            />

            <EditableRow
              label="Email"
              value={user?.email ?? ""}
              editing={editingField === "email"}
              onEdit={() => setEditingField("email")}
              onDone={(v) => handleSaveField("email", v)}
              onCancel={() => setEditingField(null)}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <EditableRow
              label="Phone"
              value={user?.phone ?? ""}
              editing={editingField === "phone"}
              onEdit={() => setEditingField("phone")}
              onDone={(v) => handleSaveField("phone", v || "")}
              onCancel={() => setEditingField(null)}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              last
            />
          </View>

          {/* ── Account info (read-only) ── */}
          <View className="bg-white border border-[#E8E6E1] rounded-2xl px-5 py-1 mb-3">
            <View className="flex-row items-center gap-2 pt-4 pb-2 border-b border-[#EFEEEA]">
              <AppIcon name="info" size={14} color="#6E6E73" />
              <Text className="text-[#6E6E73] text-[11px] font-bold uppercase tracking-wider">
                Account details
              </Text>
            </View>

            <InfoRow
              label="Email verified"
              value={user?.emailVerified ? "✓ Verified" : "Not verified"}
            />
            <InfoRow
              label="Member since"
              value={
                user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : "—"
              }
            />
            {user?.lastLoginAt ? (
              <InfoRow
                label="Last login"
                last
                value={new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              />
            ) : (
              <View className="py-1" />
            )}
          </View>

          {/* ── Security ── */}
          <View className="bg-white border border-[#E8E6E1] rounded-2xl mb-3 overflow-hidden">
            <TouchableOpacity
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-[#F1EFEC] items-center justify-center">
                <AppIcon name="lock" size={17} color="#3A3A3C" />
              </View>
              <View className="flex-1">
                <Text className="text-[#1C1C1E] text-[15px] font-semibold">Change Password</Text>
                <Text className="text-[#8E8E93] text-[12px] mt-0.5">
                  Update your account password
                </Text>
              </View>
              <AppIcon name="chevron-right" size={16} color="#C7C7CC" />
            </TouchableOpacity>

            <View className="h-px bg-[#F0EEEA] mx-5" />

            <TouchableOpacity
              onPress={() => router.push("/subscriptions" as any)}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 px-5 py-4"
            >
              <View className="w-10 h-10 rounded-xl bg-[#1C1C1E] items-center justify-center">
                <AppIcon name="shield" size={17} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[#1C1C1E] text-[15px] font-semibold">Membership & Plans</Text>
                <Text className="text-[#8E8E93] text-[12px] mt-0.5">
                  Manage subscription & Razorpay billing
                </Text>
              </View>
              <AppIcon name="chevron-right" size={16} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          {/* ── Sign out ── */}
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-2 bg-white border border-[#EAD9D2] rounded-2xl py-4 mt-1"
          >
            {loggingOut ? (
              <ActivityIndicator color="#B3261E" size="small" />
            ) : (
              <View className="flex-row items-center gap-2">
                <AppIcon name="log-out" size={16} color="#B3261E" />
                <Text className="text-[#B3261E] text-[15px] font-semibold">Sign out</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text className="text-[#A7A7AB] text-[12px] text-center mt-6">
            CelebrateHub · v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
}
