import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/ui/pro-icon";
import { adminApi, authApi, type AdminUserListItem, type CreateUserPayload } from "@/lib/auth.api";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";

const ROLE_FILTERS = ["ALL", "CUSTOMER", "PROVIDER", "ADMIN"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: "#EAF0FB", text: "#2F54B8" },
  PROVIDER: { bg: "#FDF3E3", text: "#8A5E10" },
  CUSTOMER: { bg: "#EAF6EE", text: "#1E7A3C" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "#EAF6EE", text: "#1E7A3C" },
  INACTIVE: { bg: "#F1EFEC", text: "#6E6E73" },
  SUSPENDED: { bg: "#FBECEB", text: "#B3261E" },
};

function CreateUserSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER" | "ADMIN">("CUSTOMER");
  const [businessName, setBusinessName] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setRole("CUSTOMER"); setBusinessName(""); setServiceArea(""); setErrors({});
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() && !phone.trim()) e.email = "Email or phone required";
    if (!password || password.length < 8) e.password = "Minimum 8 characters";
    if (!/[A-Z]/.test(password)) e.password = "Include one uppercase letter";
    if (!/[0-9]/.test(password)) e.password = "Include one number";
    if (role === "PROVIDER" && !businessName.trim()) e.businessName = "Business name required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateUserPayload = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        role,
        businessName: role === "PROVIDER" ? businessName.trim() : undefined,
        serviceArea: role === "PROVIDER" && serviceArea.trim() ? serviceArea.trim() : undefined,
      };
      await authApi.createUser(payload);
      reset();
      onCreated();
      onClose();
      Alert.alert("Account created", "The new account is ready to use.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message ?? "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop. Plain View on purpose: a pressable backdrop swallows and
          re-fires taps around the focused inputs, which fights the keyboard
          for focus. Dismiss via X or the Android back button. */}
      <View
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <View style={{ maxHeight: "92%" }}>
          {/* KeyboardAvoidingView is iOS-only here ON PURPOSE. On Android the
              window soft-resize already lifts this flex-end sheet above the
              keyboard in a single layout pass. Adding KAV height-adjustment on
              top makes the layout bounce while the keyboard animates, and
              Android chases the moving fields — the focus loop. */}
          <KeyboardAvoidingView
            enabled={Platform.OS === "ios"}
            behavior="padding"
          >
            <View className="bg-white rounded-t-3xl border-t border-[#E8E6E1]">
              <View className="items-center pt-3 pb-2">
                <View className="w-10 h-1 rounded-full bg-[#E0DED8]" />
              </View>

              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
          <View className="flex-row justify-between items-start mb-5">
            <View className="flex-1 mr-3">
              <Text className="text-[#1C1C1E] text-[20px] font-bold tracking-tight">
                {role === "ADMIN" ? "New administrator" : role === "PROVIDER" ? "New provider" : "New customer"}
              </Text>
              <Text className="text-[#6E6E73] text-[13px] mt-1">
                {role === "ADMIN"
                  ? "Full platform access"
                  : role === "PROVIDER"
                  ? "Receives leads and bookings"
                  : "Plans events and hires providers"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-9 h-9 rounded-full bg-[#F4F2EE] items-center justify-center"
            >
              <AppIcon name="x" size={15} color="#3A3A3C" />
            </TouchableOpacity>
          </View>

          <Text className="text-[#3A3A3C] text-[13px] font-semibold mb-2">
            Account role
          </Text>
          <View className="flex-row gap-2 mb-5">
            {[
              { r: "CUSTOMER", label: "Customer", icon: "user" as const },
              { r: "PROVIDER", label: "Provider", icon: "briefcase" as const },
              { r: "ADMIN", label: "Admin", icon: "shield" as const },
            ].map(({ r, label, icon }) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r as any)}
                className={`flex-1 py-3 rounded-xl items-center border flex-row justify-center gap-1.5 ${
                  role === r ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E3E1DC]"
                }`}
              >
                <AppIcon name={icon} size={14} color={role === r ? "#FFFFFF" : "#6E6E73"} />
                <Text className={`text-[13px] font-semibold ${role === r ? "text-white" : "text-[#6E6E73]"}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormInput label="Full name" placeholder="Priya Sharma" value={name}
            onChangeText={(t) => { setName(t); setErrors(e => ({...e, name:""})); }} error={errors.name} />
          <FormInput label="Email" placeholder="user@example.com" keyboardType="email-address"
            value={email} onChangeText={(t) => { setEmail(t); setErrors(e => ({...e, email:""})); }}
            error={errors.email} />
          <FormInput label="Phone (optional)" placeholder="+91 98765 43210"
            keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <FormInput label="Password" placeholder="Minimum 8 characters"
            isPassword value={password}
            onChangeText={(t) => { setPassword(t); setErrors(e => ({...e, password:""})); }}
            error={errors.password} />

          {role === "PROVIDER" && (
            <>
              <FormInput label="Business name" placeholder="Meera Wedding Photography"
                value={businessName}
                onChangeText={(t) => { setBusinessName(t); setErrors(e => ({...e, businessName:""})); }}
                error={errors.businessName} />
              <FormInput label="Service area (optional)" placeholder="e.g. Hyderabad, Telangana"
                value={serviceArea}
                onChangeText={setServiceArea} />
            </>
          )}

          <Button
            label={role === "ADMIN" ? "Create admin" : role === "PROVIDER" ? "Create provider" : "Create customer"}
            onPress={handleCreate}
            fullWidth
            size="lg"
            loading={loading}
          />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

function UserCard({
  user,
  onStatusChange,
  onDelete,
}: {
  user: AdminUserListItem;
  onStatusChange: (id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const roleStyle = ROLE_STYLE[user.role] ?? ROLE_STYLE.CUSTOMER;
  const statusStyle = STATUS_STYLE[user.status] ?? STATUS_STYLE.ACTIVE;

  const statusActions = (["ACTIVE", "INACTIVE", "SUSPENDED"] as const).filter(
    (s) => s !== user.status
  );

  return (
    <View className="bg-white border border-[#E8E6E1] rounded-2xl p-4 mb-2.5">
      <View className="flex-row items-start gap-3">
        <View className="w-11 h-11 rounded-full bg-[#F1EFEC] border border-[#E8E6E1] items-center justify-center">
          <Text className="text-[#1C1C1E] text-[16px] font-bold">
            {user.name?.[0]?.toUpperCase()}
          </Text>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-[#1C1C1E] text-[15px] font-semibold" numberOfLines={1}>
              {user.name}
            </Text>
            <View style={{ backgroundColor: roleStyle.bg }} className="px-2 py-0.5 rounded-full">
              <Text style={{ color: roleStyle.text }} className="text-[10px] font-semibold uppercase tracking-wide">
                {user.role}
              </Text>
            </View>
          </View>
          <Text className="text-[#6E6E73] text-[13px] mt-0.5" numberOfLines={1}>
            {user.email ?? user.phone ?? "—"}
          </Text>
          {user.provider?.businessName && (
            <Text className="text-[#6E6E73] text-[12px] mt-0.5" numberOfLines={1}>
              {user.provider.businessName}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-2">
            <View style={{ backgroundColor: statusStyle.bg }} className="px-2 py-0.5 rounded-full">
              <Text style={{ color: statusStyle.text }} className="text-[10px] font-semibold uppercase tracking-wide">
                {user.status}
              </Text>
            </View>
            <Text className="text-[#A7A7AB] text-[11px]">
              {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setMenuOpen(v => !v)}
          className="w-9 h-9 rounded-full bg-[#F4F2EE] items-center justify-center"
        >
          <AppIcon name="more-horizontal" size={15} color="#3A3A3C" />
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View className="mt-3 pt-3 border-t border-[#EFEEEA] gap-2">
          {statusActions.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => { setMenuOpen(false); onStatusChange(user.id, s); }}
              className="py-2.5 px-3 rounded-xl items-center bg-[#F7F7F5] border border-[#E8E6E1]"
            >
              <Text className="text-[13px] font-semibold text-[#1C1C1E]">
                Mark as {s.toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => { setMenuOpen(false); onDelete(user.id, user.name); }}
            className="py-2.5 px-3 rounded-xl items-center bg-[#FBECEB] border border-[#F2C7C3]"
          >
            <Text className="text-[13px] font-semibold text-[#B3261E]">Delete user</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  // Debounced query: typing only updates local state, so the keyboard never
  // fights a network round-trip (or an error popup) on any keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(
    async (p = 1, append = false) => {
      try {
        const resp = await adminApi.listUsers({
          page: p,
          search: debouncedSearch || undefined,
          role: roleFilter === "ALL" ? undefined : roleFilter,
        });
        setUsers(prev => append ? [...prev, ...resp.users] : resp.users);
        setTotalPages(resp.pagination.totalPages);
        setTotal(resp.pagination.total);
        setPage(p);
        setLoadError(null);
      } catch (err: any) {
        // Never Alert here: a popup steals TextInput focus and dismisses the
        // keyboard. Surface failures inline with a retry action instead.
        if (!append) {
          setLoadError(
            err?.response?.data?.message ??
            "Could not load users. Check your connection and try again."
          );
        }
      }
    },
    [debouncedSearch, roleFilter]
  );

  useEffect(() => {
    // Full-screen spinner only on first mount. Filter/search changes refresh
    // in the background so the list (and keyboard) never flash away.
    if (!mountedRef.current) {
      mountedRef.current = true;
      setLoading(true);
      fetchUsers(1).finally(() => setLoading(false));
    } else {
      void fetchUsers(1);
    }
  }, [fetchUsers]);

  function reload() {
    setLoadError(null);
    setLoading(users.length === 0);
    fetchUsers(1).finally(() => setLoading(false));
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchUsers(1);
    setRefreshing(false);
  }

  async function handleStatusChange(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    try {
      const updated = await adminApi.updateStatus(id, status);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: updated.status } : u));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to update status");
    }
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(
      "Delete user",
      `Permanently delete "${name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminApi.deleteUser(id);
              setUsers(prev => prev.filter(u => u.id !== id));
              setTotal(t => t - 1);
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message ?? "Failed to delete");
            }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[#1C1C1E] text-[24px] font-bold tracking-tight">
              Users
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              className="bg-[#1C1C1E] px-4 py-2.5 rounded-xl flex-row items-center gap-1.5"
              activeOpacity={0.85}
            >
              <AppIcon name="plus" size={14} color="#FFFFFF" />
              <Text className="text-white text-[13px] font-semibold">New user</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-[#6E6E73] text-[13px]">
            {total} registered account{total !== 1 ? "s" : ""}
          </Text>
        </View>

        <View className="px-5 mb-3">
          <View className="flex-row items-center bg-white border border-[#E3E1DC] rounded-xl px-3.5 gap-2">
            <AppIcon name="search" size={16} color="#A7A7AB" />
            <TextInput
              className="flex-1 text-[#1C1C1E] text-[14px] py-3"
              placeholder="Search name, email, phone"
              placeholderTextColor="#A7A7AB"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <AppIcon name="x-circle" size={17} color="#A7A7AB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role filter — fixed segmented row (4 equal pills, fixed height).
            A horizontal ScrollView stretches its children vertically here,
            which rendered the pills as giant clipped capsules. */}
        <View className="px-5 mb-4 flex-row gap-2">
          {ROLE_FILTERS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRoleFilter(r)}
              activeOpacity={0.8}
              className={`flex-1 h-10 rounded-full border items-center justify-center ${
                roleFilter === r ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E3E1DC]"
              }`}
            >
              <Text
                className={`text-[12px] font-semibold capitalize ${
                  roleFilter === r ? "text-white" : "text-[#6E6E73]"
                }`}
                numberOfLines={1}
              >
                {r.toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && users.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1C1C1E" size="large" />
          </View>
        ) : loadError && users.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <View className="w-14 h-14 rounded-2xl bg-[#FBECEB] border border-[#F2C7C3] items-center justify-center mb-1">
              <AppIcon name="info" size={22} color="#B3261E" />
            </View>
            <Text className="text-[#1C1C1E] text-[16px] font-semibold text-center">Could not load users</Text>
            <Text className="text-[#6E6E73] text-[13px] text-center mb-2">{loadError}</Text>
            <TouchableOpacity
              onPress={reload}
              activeOpacity={0.8}
              className="bg-[#1C1C1E] px-5 py-3 rounded-xl"
            >
              <Text className="text-white text-[14px] font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <View className="w-14 h-14 rounded-2xl bg-white border border-[#E8E6E1] items-center justify-center mb-1">
              <AppIcon name="user" size={22} color="#A7A7AB" />
            </View>
            <Text className="text-[#1C1C1E] text-[16px] font-semibold">No users found</Text>
            <Text className="text-[#6E6E73] text-[13px] text-center">Try a different search or filter.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1C1E" />
            }
          >
            {loadError && (
              <TouchableOpacity
                onPress={reload}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FBECEB] border border-[#F2C7C3] mb-2.5"
              >
                <AppIcon name="info" size={14} color="#B3261E" />
                <Text className="text-[#B3261E] text-[12px] font-semibold">
                  Refresh failed — tap to retry
                </Text>
              </TouchableOpacity>
            )}
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}

            {page < totalPages && (
              <TouchableOpacity
                onPress={() => fetchUsers(page + 1, true)}
                className="mt-2 py-3.5 items-center bg-white border border-[#E8E6E1] rounded-2xl"
              >
                <Text className="text-[#1C1C1E] text-[14px] font-semibold">Load more</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <CreateUserSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchUsers(1)}
      />
    </View>
  );
}
