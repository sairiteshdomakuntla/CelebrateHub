import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import { adminApi, type AdminPlanItem, type AdminPlansResponse } from "@/lib/auth.api";

export default function AdminPlansScreen() {
  const router = useRouter();

  const [data, setData] = useState<AdminPlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState<"ALL" | "PROVIDER" | "CUSTOMER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [targetRole, setTargetRole] = useState<"PROVIDER" | "CUSTOMER">("PROVIDER");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("999");
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Fetch Plans ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const res = await adminApi.listPlans();
      setData(res);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to load plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─── Filtered Plans ─────────────────────────────────────────────────────────

  const filteredPlans = useMemo(() => {
    if (!data) return [];
    return data.plans.filter((p) => {
      if (roleFilter !== "ALL" && p.targetRole !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && !p.isActive) return false;
      if (statusFilter === "INACTIVE" && p.isActive) return false;
      return true;
    });
  }, [data, roleFilter, statusFilter]);

  // ─── Open Create / Edit Modal ──────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingPlan(null);
    setTargetRole("PROVIDER");
    setName("");
    setSlug("");
    setPrice("999");
    setInterval("MONTHLY");
    setDescription("");
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (p: AdminPlanItem) => {
    setEditingPlan(p);
    setTargetRole(p.targetRole);
    setName(p.name);
    setSlug(p.slug);
    setPrice(String(p.price));
    setInterval(p.interval);
    setDescription(p.description || "");
    setIsActive(p.isActive);
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingPlan) {
      const base = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const prefix = targetRole.toLowerCase();
      setSlug(base ? `${prefix}-${base}` : "");
    }
  };

  // ─── Save Plan Handler ─────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert("Validation", "Plan name must be at least 2 characters");
      return;
    }

    const priceNum = parseInt(price.replace(/[^0-9]/g, ""), 10);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Validation", "Price must be a positive number or 0");
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, {
          name: name.trim(),
          slug: slug.trim() || undefined,
          price: priceNum,
          interval,
          description: description.trim() || null,
          isActive,
        });
        Alert.alert("Success", "Subscription plan updated successfully");
      } else {
        await adminApi.createPlan({
          name: name.trim(),
          slug: slug.trim() || undefined,
          price: priceNum,
          interval,
          description: description.trim() || undefined,
          isActive,
          targetRole,
        });
        Alert.alert("Success", "New subscription plan created");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle Active Status ──────────────────────────────────────────────────

  const handleToggleActive = async (p: AdminPlanItem) => {
    try {
      await adminApi.updatePlan(p.id, { isActive: !p.isActive });
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not toggle status");
    }
  };

  // ─── Delete Plan Handler ───────────────────────────────────────────────────

  const handleDelete = (p: AdminPlanItem) => {
    Alert.alert(
      "Delete Plan",
      `Are you sure you want to remove "${p.name}"? If users have subscribed to this plan, it will be safely deactivated instead.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await adminApi.deletePlan(p.id);
              Alert.alert("Notice", res.message);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete plan");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF9F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1C1C1E" />
        <Text className="text-[#6E6E73] text-[14px] mt-3">Loading subscription plans...</Text>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F5]" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ─── Top Header ────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-[#F0EEEA]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F5F4F0] items-center justify-center"
          activeOpacity={0.7}
        >
          <AppIcon name="arrow-left" size={18} color="#1C1C1E" />
        </TouchableOpacity>

        <View className="items-center flex-1 px-2">
          <Text className="text-[#1C1C1E] text-[16px] font-bold">Subscription Plans</Text>
          <Text className="text-[#6E6E73] text-[11px] font-semibold tracking-wide uppercase">
            Pricing & Lead Tiers
          </Text>
        </View>

        <TouchableOpacity
          onPress={openCreateModal}
          className="flex-row items-center gap-1 py-1.5 px-3 rounded-full bg-[#1C1C1E]"
          activeOpacity={0.8}
        >
          <AppIcon name="plus" size={13} color="#FFFFFF" />
          <Text className="text-white text-[12px] font-bold">New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Revenue & Metrics Card ──────────────────────────────────────── */}
        <View className="m-4 p-5 rounded-3xl bg-[#1C1C1E] shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <AppIcon name="credit-card" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-white text-[16px] font-extrabold">Subscription Revenue</Text>
            </View>

            <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <Text className="text-emerald-400 text-[11px] font-bold">
                {stats?.activePlans || 0} of {stats?.totalPlans || 0} Active
              </Text>
            </View>
          </View>

          <View className="mt-1 mb-3">
            <Text className="text-[#A1A1AA] text-[11px] font-semibold uppercase tracking-wider">
              Est. Monthly Recurring Revenue
            </Text>
            <Text className="text-white text-[28px] font-black mt-0.5">
              ₹{(stats?.estimatedMRR || 0).toLocaleString("en-IN")}/mo
            </Text>
          </View>

          <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Total Plans</Text>
              <Text className="text-white text-[17px] font-bold mt-0.5">{stats?.totalPlans || 0}</Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Active Subscribers</Text>
              <Text className="text-[#34D399] text-[17px] font-bold mt-0.5">{stats?.totalSubscribers || 0}</Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Billing Engine</Text>
              <Text className="text-[#818CF8] text-[15px] font-bold mt-0.5">Razorpay</Text>
            </View>
          </View>
        </View>

        {/* ─── Role Filters (All vs Vendor vs Customer) ───────────────────── */}
        <View className="flex-row mx-4 mb-3 p-1 bg-[#EBE8E3] rounded-2xl">
          {[
            { key: "ALL", label: "All Tiers", icon: "grid" },
            { key: "PROVIDER", label: "Vendor Plans", icon: "briefcase" },
            { key: "CUSTOMER", label: "Host Plans", icon: "user" },
          ].map((tab) => {
            const isSel = roleFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setRoleFilter(tab.key as any)}
                className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                  isSel ? "bg-white shadow-xs" : "bg-transparent"
                }`}
              >
                <AppIcon
                  name={tab.icon as any}
                  size={12}
                  color={isSel ? "#1C1C1E" : "#6E6E73"}
                />
                <Text
                  className={`text-[12px] font-bold ${
                    isSel ? "text-[#1C1C1E]" : "text-[#6E6E73]"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Status Filter Pills ─────────────────────────────────────────── */}
        <View className="flex-row px-4 mb-3 gap-2">
          {[
            { key: "ALL", label: "All Statuses" },
            { key: "ACTIVE", label: "Active Only" },
            { key: "INACTIVE", label: "Inactive Only" },
          ].map((f) => {
            const sel = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatusFilter(f.key as any)}
                className={`px-3 py-1.5 rounded-lg border ${
                  sel ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E5E3DD]"
                }`}
              >
                <Text className={`text-[11px] font-bold ${sel ? "text-white" : "text-[#6E6E73]"}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Plans List ──────────────────────────────────────────────────── */}
        <View className="px-4">
          {filteredPlans.length === 0 ? (
            <View className="p-8 bg-white border border-[#E8E6E1] rounded-2xl items-center justify-center mt-2">
              <AppIcon name="credit-card" size={28} color="#8E8E93" />
              <Text className="text-[#1C1C1E] text-[15px] font-bold mt-2">No plans found</Text>
              <Text className="text-[#8E8E93] text-[12px] mt-0.5 text-center">
                Tap "+ New Plan" above to create pricing tiers for vendors or customers.
              </Text>
            </View>
          ) : (
            filteredPlans.map((p) => {
              const isVendor = p.targetRole === "PROVIDER";
              return (
                <View
                  key={p.id}
                  className={`p-4 mb-3 bg-white border rounded-2xl shadow-xs ${
                    p.isActive ? "border-[#E8E6E1]" : "border-[#E5E5EA] opacity-80"
                  }`}
                >
                  {/* Top Bar: Role & Status */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View
                      className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-md ${
                        isVendor ? "bg-[#FDF3E3]" : "bg-[#EEF2FF]"
                      }`}
                    >
                      <AppIcon
                        name={isVendor ? "briefcase" : "user"}
                        size={11}
                        color={isVendor ? "#8A5E10" : "#4F46E5"}
                      />
                      <Text
                        className={`text-[10px] font-extrabold uppercase tracking-wide ${
                          isVendor ? "text-[#8A5E10]" : "text-[#4F46E5]"
                        }`}
                      >
                        {isVendor ? "Vendor Tier" : "Host Club"}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          p.isActive ? "bg-emerald-50" : "bg-amber-50"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            p.isActive ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {p.isActive ? "ACTIVE" : "INACTIVE"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Price */}
                  <View className="flex-row items-baseline justify-between mt-1">
                    <Text className="text-[#1C1C1E] text-[17px] font-extrabold flex-1 pr-2">
                      {p.name}
                    </Text>
                    <View className="items-end">
                      <Text className="text-[#1C1C1E] text-[18px] font-black">
                        {p.price === 0 ? "Free" : `₹${p.price.toLocaleString("en-IN")}`}
                      </Text>
                      {p.price > 0 && (
                        <Text className="text-[#8E8E93] text-[10px] font-semibold uppercase">
                          / {p.interval.toLowerCase()}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Slug */}
                  <Text className="text-[#8E8E93] text-[11px] font-mono mt-0.5">
                    slug: {p.slug}
                  </Text>

                  {/* Description */}
                  {p.description ? (
                    <Text className="text-[#52525B] text-[13px] mt-2 leading-[18px]">
                      {p.description}
                    </Text>
                  ) : null}

                  {/* Subscribers & Actions */}
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#F0EEEA]">
                    <View className="flex-row items-center gap-2">
                      <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF9F5]">
                        <AppIcon name="users" size={11} color="#059669" />
                        <Text className="text-[#059669] text-[11px] font-bold">
                          {p.activeSubscribers} Active
                        </Text>
                      </View>

                      <Text className="text-[#8E8E93] text-[11px]">
                        ({p._count.subscriptions} total ever)
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        onPress={() => openEditModal(p)}
                        className="w-8 h-8 rounded-xl bg-[#F5F4F0] items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="edit-2" size={13} color="#3A3A3C" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleActive(p)}
                        className="w-8 h-8 rounded-xl bg-[#F5F4F0] items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <AppIcon
                          name={p.isActive ? "eye-off" : "eye"}
                          size={13}
                          color={p.isActive ? "#D97706" : "#059669"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(p)}
                        className="w-8 h-8 rounded-xl bg-[#FEE2E2] items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <AppIcon name="trash-2" size={13} color="#B3261E" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL: Add / Edit Subscription Plan ──────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[88%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">
                  {editingPlan ? "Edit Subscription Tier" : "Create Subscription Plan"}
                </Text>
                <Text className="text-[#8E8E93] text-[12px]">
                  Configure price, billing frequency, and features
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center"
              >
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Target Role Selector */}
              {!editingPlan && (
                <View className="mb-3">
                  <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">
                    Target Audience *
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        setTargetRole("PROVIDER");
                        if (name) setSlug(`provider-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
                      }}
                      className={`flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                        targetRole === "PROVIDER"
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <AppIcon
                        name="briefcase"
                        size={13}
                        color={targetRole === "PROVIDER" ? "#FFFFFF" : "#6E6E73"}
                      />
                      <Text
                        className={`text-[12px] font-bold ${
                          targetRole === "PROVIDER" ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        Service Vendor
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setTargetRole("CUSTOMER");
                        if (name) setSlug(`customer-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
                      }}
                      className={`flex-1 py-2.5 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                        targetRole === "CUSTOMER"
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <AppIcon
                        name="user"
                        size={13}
                        color={targetRole === "CUSTOMER" ? "#FFFFFF" : "#6E6E73"}
                      />
                      <Text
                        className={`text-[12px] font-bold ${
                          targetRole === "CUSTOMER" ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        Event Host
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Plan Name */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Plan Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder="e.g. Growth Pro, Unlimited Leads, VIP Club"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Plan Slug */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                System Identifier / Slug *
              </Text>
              <TextInput
                value={slug}
                onChangeText={setSlug}
                placeholder="e.g. provider-growth-monthly"
                autoCapitalize="none"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3 font-mono"
              />

              {/* Price & Billing Interval Row */}
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                    Price (₹ INR) *
                  </Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="999 (0 for free tier)"
                    keyboardType="numeric"
                    placeholderTextColor="#A1A1AA"
                    className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[15px] font-bold"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                    Billing Interval *
                  </Text>
                  <View className="flex-row gap-1">
                    <TouchableOpacity
                      onPress={() => setInterval("MONTHLY")}
                      className={`flex-1 py-3 rounded-xl items-center border ${
                        interval === "MONTHLY"
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-[#FAF9F5] border-[#E5E3DD]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          interval === "MONTHLY" ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        Monthly
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setInterval("YEARLY")}
                      className={`flex-1 py-3 rounded-xl items-center border ${
                        interval === "YEARLY"
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-[#FAF9F5] border-[#E5E3DD]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          interval === "YEARLY" ? "text-white" : "text-[#3A3A3C]"
                        }`}
                      >
                        Yearly
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Description / Features */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Plan Description & Feature Highlights
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Unlimited qualified leads, instant push alerts, verified badge..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Active Toggle */}
              <View className="flex-row items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#EBE8E3] mb-4">
                <View className="flex-1 pr-3">
                  <Text className="text-[#1C1C1E] text-[13px] font-bold">
                    Available on Razorpay Storefront
                  </Text>
                  <Text className="text-[#8E8E93] text-[11px]">
                    When active, users can purchase this plan during checkout.
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#E5E3DD", true: "#059669" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="py-3.5 bg-[#1C1C1E] rounded-xl items-center active:opacity-90"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">
                    {editingPlan ? "Update Subscription Plan" : "Create Plan"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
