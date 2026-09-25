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
import {
  adminApi,
  type AdminCategoryItem,
  type EventTypeCatalogItem,
} from "@/lib/auth.api";

const COMMON_ICONS = [
  "camera",
  "coffee",
  "sparkles",
  "music",
  "home",
  "heart",
  "gift",
  "briefcase",
  "smile",
  "film",
  "star",
  "sun",
  "truck",
  "map-pin",
  "award",
  "shopping-bag",
];

export default function AdminCategoriesScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"SERVICES" | "EVENTS">("SERVICES");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIcon, setFormIcon] = useState("sparkles");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // ─── Fetch Categories ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const data = await adminApi.listCategories();
      setCategories(data.categories);
      setEventTypes(data.eventTypes);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to load categories");
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

  // ─── Filtered Categories ───────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "ACTIVE") return c.isActive;
      if (statusFilter === "INACTIVE") return !c.isActive;
      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  // ─── Open Create / Edit Modal ──────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    setFormIcon("sparkles");
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (category: AdminCategoryItem) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormIcon(category.icon || "sparkles");
    setFormIsActive(category.isActive);
    setShowModal(true);
  };

  // ─── Auto-generate Slug on Name change ─────────────────────────────────────

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormSlug(autoSlug);
    }
  };

  // ─── Save Category Handler ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim() || formName.trim().length < 2) {
      Alert.alert("Validation", "Category name must be at least 2 characters");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          icon: formIcon,
          isActive: formIsActive,
        });
        Alert.alert("Success", "Category updated successfully");
      } else {
        await adminApi.createCategory({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          icon: formIcon,
          isActive: formIsActive,
        });
        Alert.alert("Success", "Category created successfully");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle Active Status ──────────────────────────────────────────────────

  const handleToggleActive = async (category: AdminCategoryItem) => {
    try {
      await adminApi.updateCategory(category.id, {
        isActive: !category.isActive,
      });
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not toggle status");
    }
  };

  // ─── Delete Category Handler ───────────────────────────────────────────────

  const handleDelete = (category: AdminCategoryItem) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to remove "${category.name}"? If providers or events are currently linked, it will be safely deactivated instead.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await adminApi.deleteCategory(category.id);
              Alert.alert("Notice", res.message);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  // ─── Metrics ───────────────────────────────────────────────────────────────

  const totalActive = categories.filter((c) => c.isActive).length;
  const totalProviders = categories.reduce((sum, c) => sum + (c._count?.providers || 0), 0);
  const totalEventServices = categories.reduce((sum, c) => sum + (c._count?.eventServices || 0), 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF9F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1C1C1E" />
        <Text className="text-[#6E6E73] text-[14px] mt-3">Loading categories...</Text>
      </SafeAreaView>
    );
  }

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
          <Text className="text-[#1C1C1E] text-[16px] font-bold">Categories & Catalog</Text>
          <Text className="text-[#6E6E73] text-[11px] font-semibold tracking-wide uppercase">
            Admin Management
          </Text>
        </View>

        <TouchableOpacity
          onPress={openCreateModal}
          className="flex-row items-center gap-1 py-1.5 px-3 rounded-full bg-[#1C1C1E]"
          activeOpacity={0.8}
        >
          <AppIcon name="plus" size={13} color="#FFFFFF" />
          <Text className="text-white text-[12px] font-bold">Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Metrics Banner Card ─────────────────────────────────────────── */}
        <View className="m-4 p-5 rounded-3xl bg-[#1C1C1E] shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <AppIcon name="grid" size={15} color="#FFFFFF" />
              </View>
              <Text className="text-white text-[16px] font-extrabold">Platform Catalog</Text>
            </View>
            <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <Text className="text-emerald-400 text-[11px] font-bold">
                {totalActive} of {categories.length} Active
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Service Types</Text>
              <Text className="text-white text-[18px] font-bold mt-0.5">{categories.length}</Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Vendors Linked</Text>
              <Text className="text-white text-[18px] font-bold mt-0.5">{totalProviders}</Text>
            </View>
            <View className="h-6 w-px bg-white/15" />
            <View className="items-center flex-1">
              <Text className="text-[#A1A1AA] text-[11px]">Event Services</Text>
              <Text className="text-white text-[18px] font-bold mt-0.5">{totalEventServices}</Text>
            </View>
          </View>
        </View>

        {/* ─── Mode Switcher (Services vs Event Types) ─────────────────────── */}
        <View className="flex-row mx-4 mb-3 p-1 bg-[#EBE8E3] rounded-2xl">
          <TouchableOpacity
            onPress={() => setActiveTab("SERVICES")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "SERVICES" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <AppIcon
              name="briefcase"
              size={13}
              color={activeTab === "SERVICES" ? "#1C1C1E" : "#6E6E73"}
            />
            <Text
              className={`text-[13px] font-bold ${
                activeTab === "SERVICES" ? "text-[#1C1C1E]" : "text-[#6E6E73]"
              }`}
            >
              Services ({categories.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("EVENTS")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "EVENTS" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <AppIcon
              name="calendar"
              size={13}
              color={activeTab === "EVENTS" ? "#1C1C1E" : "#6E6E73"}
            />
            <Text
              className={`text-[13px] font-bold ${
                activeTab === "EVENTS" ? "text-[#1C1C1E]" : "text-[#6E6E73]"
              }`}
            >
              Event Types ({eventTypes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "SERVICES" ? (
          <>
            {/* ─── Search & Status Filters ──────────────────────────────────── */}
            <View className="px-4 mb-3">
              <View className="flex-row items-center bg-white border border-[#E5E3DD] rounded-xl px-3.5 py-2.5 mb-2.5 shadow-xs">
                <AppIcon name="search" size={16} color="#8E8E93" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search service category or slug..."
                  placeholderTextColor="#A1A1AA"
                  className="flex-1 ml-2.5 text-[#1C1C1E] text-[14px]"
                  clearButtonMode="while-editing"
                />
              </View>

              <View className="flex-row gap-2">
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
                        sel
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          sel ? "text-white" : "text-[#6E6E73]"
                        }`}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ─── Categories List ─────────────────────────────────────────── */}
            <View className="px-4">
              {filteredCategories.length === 0 ? (
                <View className="p-8 bg-white border border-[#E8E6E1] rounded-2xl items-center justify-center mt-2">
                  <AppIcon name="inbox" size={28} color="#8E8E93" />
                  <Text className="text-[#1C1C1E] text-[15px] font-bold mt-2">
                    No categories found
                  </Text>
                  <Text className="text-[#8E8E93] text-[12px] mt-0.5 text-center">
                    Try adjusting your search query or add a new category.
                  </Text>
                </View>
              ) : (
                filteredCategories.map((cat) => (
                  <View
                    key={cat.id}
                    className="p-4 mb-2.5 bg-white border border-[#E8E6E1] rounded-2xl shadow-xs"
                  >
                    <View className="flex-row items-center justify-between">
                      {/* Left: Icon & Details */}
                      <View className="flex-row items-center gap-3 flex-1 pr-2">
                        <View
                          className={`w-11 h-11 rounded-2xl items-center justify-center border ${
                            cat.isActive
                              ? "bg-[#F3E8FF] border-[#E9D5FF]"
                              : "bg-[#F3F4F6] border-[#E5E7EB]"
                          }`}
                        >
                          <AppIcon
                            name={(cat.icon as any) || "briefcase"}
                            size={18}
                            color={cat.isActive ? "#7E22CE" : "#9CA3AF"}
                          />
                        </View>

                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-[#1C1C1E] text-[15px] font-bold">
                              {cat.name}
                            </Text>
                            <View
                              className={`px-2 py-0.5 rounded-full ${
                                cat.isActive ? "bg-emerald-50" : "bg-amber-50"
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-bold ${
                                  cat.isActive ? "text-emerald-700" : "text-amber-700"
                                }`}
                              >
                                {cat.isActive ? "ACTIVE" : "INACTIVE"}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[#8E8E93] text-[11px] font-mono mt-0.5">
                            slug: {cat.slug}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Actions */}
                      <View className="flex-row items-center gap-1.5">
                        <TouchableOpacity
                          onPress={() => openEditModal(cat)}
                          className="w-8 h-8 rounded-xl bg-[#F5F4F0] items-center justify-center"
                          activeOpacity={0.7}
                        >
                          <AppIcon name="edit-2" size={13} color="#3A3A3C" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleToggleActive(cat)}
                          className="w-8 h-8 rounded-xl bg-[#F5F4F0] items-center justify-center"
                          activeOpacity={0.7}
                        >
                          <AppIcon
                            name={cat.isActive ? "eye-off" : "eye"}
                            size={13}
                            color={cat.isActive ? "#D97706" : "#059669"}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDelete(cat)}
                          className="w-8 h-8 rounded-xl bg-[#FEE2E2] items-center justify-center"
                          activeOpacity={0.7}
                        >
                          <AppIcon name="trash-2" size={13} color="#B3261E" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Stats pills */}
                    <View className="flex-row items-center gap-2 mt-3 pt-2.5 border-t border-[#F0EEEA]">
                      <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF9F5]">
                        <AppIcon name="users" size={11} color="#6E6E73" />
                        <Text className="text-[#3A3A3C] text-[11px] font-semibold">
                          {cat._count.providers} Vendors
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF9F5]">
                        <AppIcon name="calendar" size={11} color="#6E6E73" />
                        <Text className="text-[#3A3A3C] text-[11px] font-semibold">
                          {cat._count.eventServices} Events Linked
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* ─── Event Types Catalog ─────────────────────────────────────────── */
          <View className="px-4">
            <Text className="text-[#6E6E73] text-[13px] mb-3 leading-relaxed">
              Standard event categories configured on CelebrateHub. Customer planning workflows and vendor matching dynamically support these celebration occasions.
            </Text>

            {eventTypes.map((et) => (
              <View
                key={et.type}
                className="p-4 mb-2.5 bg-white border border-[#E8E6E1] rounded-2xl flex-row items-center justify-between shadow-xs"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${et.color}15` }}
                  >
                    <AppIcon name={et.icon as any} size={17} color={et.color} />
                  </View>
                  <View>
                    <Text className="text-[#1C1C1E] text-[15px] font-bold">{et.label}</Text>
                    <Text className="text-[#8E8E93] text-[11px] font-mono mt-0.5">
                      enum: {et.type}
                    </Text>
                  </View>
                </View>

                <View className="px-2.5 py-1 rounded-full bg-emerald-50">
                  <Text className="text-emerald-700 text-[10px] font-bold">SYSTEM ACTIVE</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── MODAL: Add / Edit Category ────────────────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">
                  {editingCategory ? "Edit Category" : "Add Service Category"}
                </Text>
                <Text className="text-[#8E8E93] text-[12px]">
                  Configure service title, slug, and vector icon
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
              {/* Category Name */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                Category Name *
              </Text>
              <TextInput
                value={formName}
                onChangeText={handleNameChange}
                placeholder="e.g. Drone Cinematography, Bartending"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              {/* Slug */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">
                URL Identifier / Slug
              </Text>
              <TextInput
                value={formSlug}
                onChangeText={setFormSlug}
                placeholder="e.g. drone-cinematography"
                autoCapitalize="none"
                placeholderTextColor="#A1A1AA"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3 font-mono"
              />

              {/* Icon Selector */}
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">
                Display Icon ({formIcon})
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {COMMON_ICONS.map((ic) => {
                  const sel = formIcon === ic;
                  return (
                    <TouchableOpacity
                      key={ic}
                      onPress={() => setFormIcon(ic)}
                      className={`w-10 h-10 rounded-xl items-center justify-center border ${
                        sel
                          ? "bg-[#1C1C1E] border-[#1C1C1E]"
                          : "bg-[#F7F7F5] border-[#E5E3DD]"
                      }`}
                    >
                      <AppIcon
                        name={ic as any}
                        size={16}
                        color={sel ? "#FFFFFF" : "#6E6E73"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active Toggle */}
              <View className="flex-row items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#EBE8E3] mb-4">
                <View className="flex-1 pr-3">
                  <Text className="text-[#1C1C1E] text-[13px] font-bold">
                    Active for Vendor Matching
                  </Text>
                  <Text className="text-[#8E8E93] text-[11px]">
                    When active, customers can request this service and vendors can select it.
                  </Text>
                </View>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: "#E5E3DD", true: "#059669" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="py-3.5 bg-[#1C1C1E] rounded-xl items-center active:opacity-90"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">
                    {editingCategory ? "Update Category" : "Create Category"}
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
