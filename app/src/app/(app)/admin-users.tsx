import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { adminApi, authApi, type AdminUserListItem, type CreateUserPayload } from "@/lib/auth.api";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_FILTERS = ["ALL", "CUSTOMER", "PROVIDER", "ADMIN"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    "bg-purple-500/20 text-purple-400",
  PROVIDER: "bg-amber-500/20 text-amber-400",
  CUSTOMER: "bg-sky-500/20 text-sky-400",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/20 text-emerald-400",
  INACTIVE:  "bg-slate-500/20 text-slate-400",
  SUSPENDED: "bg-red-500/20 text-red-400",
};

// ─── Create User Modal ────────────────────────────────────────────────────────

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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setName(""); setEmail(""); setPhone(""); setPassword("");
    setRole("CUSTOMER"); setBusinessName(""); setErrors({});
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim() && !phone.trim()) e.email = "Email or phone required";
    if (!password || password.length < 8) e.password = "Min 8 characters";
    if (!/[A-Z]/.test(password)) e.password = "Need 1 uppercase";
    if (!/[0-9]/.test(password)) e.password = "Need 1 number";
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
      };
      await authApi.createUser(payload);
      reset();
      onCreated();
      onClose();
      Alert.alert("Success", `${role} account created successfully.`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message ?? "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 bg-black/70 justify-end">
      <View
        className="bg-bg-muted rounded-t-3xl border-t border-border-subtle"
        style={{ maxHeight: "90%" }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-2">
          <View className="w-10 h-1 rounded-full bg-white/20" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-text-primary text-xl font-bold">Create User</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text className="text-text-muted text-2xl leading-none">×</Text>
            </TouchableOpacity>
          </View>

          {/* Role selector */}
          <Text className="text-text-secondary text-[13px] font-semibold uppercase tracking-wider mb-2">
            Role
          </Text>
          <View className="flex-row gap-2 mb-5">
            {(["CUSTOMER", "PROVIDER", "ADMIN"] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl items-center border ${
                  role === r
                    ? "bg-rose-brand border-rose-brand"
                    : "bg-bg-input border-border-subtle"
                }`}
              >
                <Text className={`text-xs font-bold ${role === r ? "text-bg" : "text-text-muted"}`}>
                  {r}
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
          <FormInput label="Password" placeholder="Min 8 chars, 1 uppercase, 1 number"
            isPassword value={password}
            onChangeText={(t) => { setPassword(t); setErrors(e => ({...e, password:""})); }}
            error={errors.password} />

          {role === "PROVIDER" && (
            <FormInput label="Business name" placeholder="Meera Wedding Photography"
              value={businessName}
              onChangeText={(t) => { setBusinessName(t); setErrors(e => ({...e, businessName:""})); }}
              error={errors.businessName} />
          )}

          <Button label="Create User" onPress={handleCreate} fullWidth size="lg" loading={loading}
            style={{ marginTop: 8, shadowColor: "#E8956D", shadowOffset: {width:0,height:6}, shadowOpacity:0.35, shadowRadius:12, elevation:7 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

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

  const statusActions = (["ACTIVE", "INACTIVE", "SUSPENDED"] as const).filter(
    (s) => s !== user.status
  );

  return (
    <View className="bg-bg-card border border-border-subtle rounded-2xl p-4 mb-3">
      <View className="flex-row items-start gap-3">
        {/* Avatar */}
        <View className="w-11 h-11 rounded-full bg-rose-dim items-center justify-center flex-shrink-0">
          <Text className="text-rose-brand text-base font-black">
            {user.name?.[0]?.toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-text-primary text-[14px] font-semibold" numberOfLines={1}>
              {user.name}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
              <Text className={`text-[10px] font-bold ${ROLE_BADGE[user.role].split(" ")[1]}`}>
                {user.role}
              </Text>
            </View>
          </View>
          <Text className="text-text-muted text-xs mt-0.5" numberOfLines={1}>
            {user.email ?? user.phone ?? "—"}
          </Text>
          {user.provider?.businessName && (
            <Text className="text-amber-400/80 text-xs mt-0.5" numberOfLines={1}>
              🏢 {user.provider.businessName}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-2">
            <View className={`px-2 py-0.5 rounded-full ${STATUS_BADGE[user.status]}`}>
              <Text className={`text-[10px] font-semibold ${STATUS_BADGE[user.status].split(" ")[1]}`}>
                {user.status}
              </Text>
            </View>
            <Text className="text-text-dim text-[10px]">
              {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Action menu toggle */}
        <TouchableOpacity onPress={() => setMenuOpen(v => !v)} className="p-1">
          <Text className="text-text-muted text-xl leading-none">⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Action menu */}
      {menuOpen && (
        <View className="mt-3 pt-3 border-t border-border-subtle gap-2">
          {statusActions.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => { setMenuOpen(false); onStatusChange(user.id, s); }}
              className={`py-2 px-3 rounded-xl items-center ${
                s === "ACTIVE" ? "bg-emerald-500/10 border border-emerald-500/25"
                : s === "SUSPENDED" ? "bg-red-500/10 border border-red-500/25"
                : "bg-slate-500/10 border border-slate-500/25"
              }`}
            >
              <Text className={`text-xs font-bold ${
                s === "ACTIVE" ? "text-emerald-400"
                : s === "SUSPENDED" ? "text-red-400"
                : "text-slate-400"
              }`}>
                Set {s}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => { setMenuOpen(false); onDelete(user.id, user.name); }}
            className="py-2 px-3 rounded-xl items-center bg-red-500/10 border border-red-500/25"
          >
            <Text className="text-xs font-bold text-red-400">Delete User</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(
    async (p = 1, append = false) => {
      try {
        const resp = await adminApi.listUsers({
          page: p,
          search: search || undefined,
          role: roleFilter === "ALL" ? undefined : roleFilter,
        });
        setUsers(prev => append ? [...prev, ...resp.users] : resp.users);
        setTotalPages(resp.pagination.totalPages);
        setTotal(resp.pagination.total);
        setPage(p);
      } catch {
        Alert.alert("Error", "Failed to load users");
      }
    },
    [search, roleFilter]
  );

  useEffect(() => {
    setLoading(true);
    fetchUsers(1).finally(() => setLoading(false));
  }, [fetchUsers]);

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
      "Delete User",
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
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-text-primary text-2xl font-extrabold tracking-tight">
              User Management
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              className="bg-rose-brand px-4 py-2 rounded-xl"
              activeOpacity={0.85}
            >
              <Text className="text-bg text-sm font-bold">+ New</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-text-muted text-sm">
            {total} user{total !== 1 ? "s" : ""} registered
          </Text>
        </View>

        {/* Search */}
        <View className="px-6 mb-3">
          <View className="flex-row items-center bg-bg-input border border-border-subtle rounded-xl px-4 gap-2">
            <Text className="text-text-dim text-base">🔍</Text>
            <TextInput
              className="flex-1 text-text-primary text-[14px] py-3"
              placeholder="Search name, email, phone…"
              placeholderTextColor="#4B5563"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Text className="text-text-dim text-lg">×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 12 }}
        >
          {ROLE_FILTERS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-full border ${
                roleFilter === r
                  ? "bg-rose-brand border-rose-brand"
                  : "bg-transparent border-border-subtle"
              }`}
              activeOpacity={0.8}
            >
              <Text className={`text-xs font-bold ${roleFilter === r ? "text-bg" : "text-text-muted"}`}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#E8956D" size="large" />
          </View>
        ) : users.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-4xl">👤</Text>
            <Text className="text-text-muted text-base">No users found</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8956D" />
            }
          >
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}

            {/* Load more */}
            {page < totalPages && (
              <TouchableOpacity
                onPress={() => fetchUsers(page + 1, true)}
                className="mt-2 py-3 items-center border border-border-subtle rounded-2xl"
              >
                <Text className="text-rose-brand text-sm font-semibold">Load more</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Create user sheet */}
      <CreateUserSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchUsers(1)}
      />
    </View>
  );
}
