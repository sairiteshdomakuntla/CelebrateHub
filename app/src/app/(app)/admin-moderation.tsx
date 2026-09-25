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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppIcon } from "@/components/ui/pro-icon";
import {
  adminApi,
  type AdminReviewItem,
  type AdminIssueItem,
  type AdminReviewsResponse,
  type AdminIssuesResponse,
} from "@/lib/auth.api";

const ISSUE_CATEGORIES = [
  { key: "ALL", label: "All Categories" },
  { key: "BOOKING_DISPUTE", label: "Booking Dispute" },
  { key: "PAYMENT_ISSUE", label: "Payment / Refund" },
  { key: "VENDOR_CONDUCT", label: "Vendor Conduct" },
  { key: "APP_BUG", label: "Technical Issue" },
  { key: "OTHER", label: "Other" },
];

export default function AdminModerationScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"REVIEWS" | "ISSUES">("REVIEWS");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reviews State
  const [reviewsData, setReviewsData] = useState<AdminReviewsResponse | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "FLAGGED" | "LOW_RATING" | "HIDDEN">("ALL");
  const [reviewSearch, setReviewSearch] = useState("");

  // Flag Modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [targetReview, setTargetReview] = useState<AdminReviewItem | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [moderationNotes, setModerationNotes] = useState("");
  const [submittingReviewAction, setSubmittingReviewAction] = useState(false);

  // Issues State
  const [issuesData, setIssuesData] = useState<AdminIssuesResponse | null>(null);
  const [issueStatusFilter, setIssueStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [issueCategoryFilter, setIssueCategoryFilter] = useState<string>("ALL");

  // Issue Update Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [targetIssue, setTargetIssue] = useState<AdminIssueItem | null>(null);
  const [issueStatus, setIssueStatus] = useState<"OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED">("IN_PROGRESS");
  const [issuePriority, setIssuePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submittingIssueAction, setSubmittingIssueAction] = useState(false);

  // New Issue Modal
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssueCategory, setNewIssueCategory] = useState("BOOKING_DISPUTE");
  const [newIssuePriority, setNewIssuePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [creatingIssue, setCreatingIssue] = useState(false);

  // ─── Fetch Data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [revs, isss] = await Promise.all([
        adminApi.listReviews(),
        adminApi.listIssues(),
      ]);
      setReviewsData(revs);
      setIssuesData(isss);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to load moderation data");
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

  // ─── Filtered Reviews ──────────────────────────────────────────────────────

  const filteredReviews = useMemo(() => {
    if (!reviewsData) return [];
    return reviewsData.reviews.filter((r) => {
      const matchesSearch =
        (r.comment || "").toLowerCase().includes(reviewSearch.toLowerCase()) ||
        r.author.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        r.provider.businessName.toLowerCase().includes(reviewSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (reviewFilter === "FLAGGED") return r.isFlagged || r.status === "FLAGGED";
      if (reviewFilter === "LOW_RATING") return r.rating <= 2;
      if (reviewFilter === "HIDDEN") return r.status === "HIDDEN";
      return true;
    });
  }, [reviewsData, reviewSearch, reviewFilter]);

  // ─── Filtered Issues ───────────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    if (!issuesData) return [];
    return issuesData.issues.filter((iss) => {
      if (issueStatusFilter !== "ALL" && iss.status !== issueStatusFilter) return false;
      if (issueCategoryFilter !== "ALL" && iss.category !== issueCategoryFilter) return false;
      return true;
    });
  }, [issuesData, issueStatusFilter, issueCategoryFilter]);

  // ─── Review Actions ────────────────────────────────────────────────────────

  const handleApproveReview = async (review: AdminReviewItem) => {
    try {
      await adminApi.updateReviewStatus(review.id, {
        status: "APPROVED",
        flagReason: null,
      });
      loadData();
      Alert.alert("Approved ✓", "Review is now approved and visible on public profile.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not approve review");
    }
  };

  const handleHideReview = async (review: AdminReviewItem) => {
    try {
      await adminApi.updateReviewStatus(review.id, {
        status: "HIDDEN",
        moderationNotes: "Hidden by admin for violating community guidelines",
      });
      loadData();
      Alert.alert("Hidden", "Review has been hidden from public search.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not hide review");
    }
  };

  const openFlagModal = (review: AdminReviewItem) => {
    setTargetReview(review);
    setFlagReason(review.flagReason || "Offensive language / Fake review");
    setModerationNotes(review.moderationNotes || "");
    setShowFlagModal(true);
  };

  const submitFlagReview = async () => {
    if (!targetReview) return;
    setSubmittingReviewAction(true);
    try {
      await adminApi.updateReviewStatus(targetReview.id, {
        status: "FLAGGED",
        flagReason: flagReason.trim() || undefined,
        moderationNotes: moderationNotes.trim() || undefined,
      });
      setShowFlagModal(false);
      loadData();
      Alert.alert("Flagged", "Review has been marked for moderation investigation.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not flag review");
    } finally {
      setSubmittingReviewAction(false);
    }
  };

  const handleDeleteReview = (review: AdminReviewItem) => {
    Alert.alert(
      "Delete Review",
      `Permanently delete this review from ${review.author.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminApi.deleteReview(review.id);
              loadData();
              Alert.alert("Deleted", "Review was removed.");
            } catch (err: any) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  // ─── Issue Actions ─────────────────────────────────────────────────────────

  const openUpdateIssueModal = (issue: AdminIssueItem) => {
    setTargetIssue(issue);
    setIssueStatus(issue.status);
    setIssuePriority(issue.priority);
    setResolutionNotes(issue.resolutionNotes || "");
    setShowIssueModal(true);
  };

  const submitUpdateIssue = async () => {
    if (!targetIssue) return;
    setSubmittingIssueAction(true);
    try {
      await adminApi.updateIssue(targetIssue.id, {
        status: issueStatus,
        priority: issuePriority,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setShowIssueModal(false);
      loadData();
      Alert.alert("Updated ✓", `Issue ticket status is now ${issueStatus}.`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to update ticket");
    } finally {
      setSubmittingIssueAction(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) {
      Alert.alert("Validation", "Please provide a title for the dispute");
      return;
    }
    if (!newIssueDesc.trim()) {
      Alert.alert("Validation", "Please provide description details");
      return;
    }

    setCreatingIssue(true);
    try {
      await adminApi.createIssue({
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim(),
        category: newIssueCategory,
        priority: newIssuePriority,
      });
      setShowNewIssueModal(false);
      setNewIssueTitle("");
      setNewIssueDesc("");
      loadData();
      Alert.alert("Success", "Dispute ticket created successfully");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create issue");
    } finally {
      setCreatingIssue(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAF9F5] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1C1C1E" />
        <Text className="text-[#6E6E73] text-[14px] mt-3">Loading Trust & Safety center...</Text>
      </SafeAreaView>
    );
  }

  const reviewStats = reviewsData?.stats;
  const issueStats = issuesData?.stats;

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
          <Text className="text-[#1C1C1E] text-[16px] font-bold">Trust & Safety Center</Text>
          <Text className="text-[#6E6E73] text-[11px] font-semibold tracking-wide uppercase">
            Reviews & Dispute Moderation
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowNewIssueModal(true)}
          className="flex-row items-center gap-1 py-1.5 px-3 rounded-full bg-[#1C1C1E]"
          activeOpacity={0.8}
        >
          <AppIcon name="plus" size={13} color="#FFFFFF" />
          <Text className="text-white text-[12px] font-bold">New Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Mode Switcher (Reviews vs Issues) ───────────────────────────── */}
        <View className="flex-row mx-4 mt-4 mb-3 p-1 bg-[#EBE8E3] rounded-2xl">
          <TouchableOpacity
            onPress={() => setActiveTab("REVIEWS")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "REVIEWS" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <AppIcon
              name="star"
              size={13}
              color={activeTab === "REVIEWS" ? "#1C1C1E" : "#6E6E73"}
            />
            <Text
              className={`text-[13px] font-bold ${
                activeTab === "REVIEWS" ? "text-[#1C1C1E]" : "text-[#6E6E73]"
              }`}
            >
              Reviews ({reviewStats?.totalReviews || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("ISSUES")}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
              activeTab === "ISSUES" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <AppIcon
              name="shield"
              size={13}
              color={activeTab === "ISSUES" ? "#1C1C1E" : "#6E6E73"}
            />
            <Text
              className={`text-[13px] font-bold ${
                activeTab === "ISSUES" ? "text-[#1C1C1E]" : "text-[#6E6E73]"
              }`}
            >
              Disputes & Issues ({issueStats?.total || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "REVIEWS" ? (
          <>
            {/* ─── Reviews Metrics Card ────────────────────────────────────── */}
            <View className="mx-4 mb-4 p-5 rounded-3xl bg-[#1C1C1E] shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                    <AppIcon name="star" size={15} color="#FBBF24" />
                  </View>
                  <Text className="text-white text-[16px] font-extrabold">Review Moderation</Text>
                </View>

                <View className="bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <Text className="text-amber-400 text-[11px] font-bold">
                    {reviewStats?.flaggedCount || 0} Flagged
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">Total Reviews</Text>
                  <Text className="text-white text-[18px] font-bold mt-0.5">
                    {reviewStats?.totalReviews || 0}
                  </Text>
                </View>
                <View className="h-6 w-px bg-white/15" />
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">Platform Avg</Text>
                  <Text className="text-[#FBBF24] text-[18px] font-bold mt-0.5">
                    {reviewStats?.avgRating || "5.0"}★
                  </Text>
                </View>
                <View className="h-6 w-px bg-white/15" />
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">Hidden</Text>
                  <Text className="text-[#EF4444] text-[18px] font-bold mt-0.5">
                    {reviewStats?.hiddenCount || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Search & Filters ────────────────────────────────────────── */}
            <View className="px-4 mb-3">
              <View className="flex-row items-center bg-white border border-[#E5E3DD] rounded-xl px-3.5 py-2.5 mb-2.5 shadow-xs">
                <AppIcon name="search" size={16} color="#8E8E93" />
                <TextInput
                  value={reviewSearch}
                  onChangeText={setReviewSearch}
                  placeholder="Search by client, vendor, or review text..."
                  placeholderTextColor="#A1A1AA"
                  className="flex-1 ml-2.5 text-[#1C1C1E] text-[14px]"
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { key: "ALL", label: "All Reviews" },
                  { key: "FLAGGED", label: "Flagged Only" },
                  { key: "LOW_RATING", label: "Low Rating (1-2★)" },
                  { key: "HIDDEN", label: "Hidden Only" },
                ].map((f) => {
                  const sel = reviewFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setReviewFilter(f.key as any)}
                      className={`px-3.5 py-1.5 rounded-lg border ${
                        sel ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text className={`text-[11px] font-bold ${sel ? "text-white" : "text-[#6E6E73]"}`}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ─── Reviews Feed ────────────────────────────────────────────── */}
            <View className="px-4">
              {filteredReviews.length === 0 ? (
                <View className="p-8 bg-white border border-[#E8E6E1] rounded-2xl items-center justify-center mt-2">
                  <AppIcon name="check-circle" size={28} color="#059669" />
                  <Text className="text-[#1C1C1E] text-[15px] font-bold mt-2">All Reviews Clean</Text>
                  <Text className="text-[#8E8E93] text-[12px] mt-0.5 text-center">
                    No reviews matching the selected filter criteria.
                  </Text>
                </View>
              ) : (
                filteredReviews.map((rev) => {
                  const isHidden = rev.status === "HIDDEN";
                  const isFlagged = rev.isFlagged || rev.status === "FLAGGED";

                  return (
                    <View
                      key={rev.id}
                      className={`p-4 mb-3 bg-white border rounded-2xl shadow-xs ${
                        isFlagged
                          ? "border-amber-300 bg-amber-50/20"
                          : isHidden
                          ? "border-red-200 opacity-75"
                          : "border-[#E8E6E1]"
                      }`}
                    >
                      {/* Top Header: Author & Status */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2 flex-1 pr-2">
                          <View className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center">
                            <Text className="text-[#1C1C1E] text-[12px] font-bold">
                              {rev.author.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-[#1C1C1E] text-[14px] font-bold" numberOfLines={1}>
                              {rev.author.name}
                            </Text>
                            <Text className="text-[#8E8E93] text-[11px]" numberOfLines={1}>
                              for <Text className="font-semibold text-[#3A3A3C]">{rev.provider.businessName}</Text>
                            </Text>
                          </View>
                        </View>

                        {/* Stars */}
                        <View className="flex-row items-center gap-1 bg-[#FFFBEB] px-2 py-1 rounded-md border border-[#FDE68A]">
                          <AppIcon name="star" size={11} color="#D97706" />
                          <Text className="text-[#92400E] text-[12px] font-extrabold">{rev.rating}.0</Text>
                        </View>
                      </View>

                      {/* Comment text */}
                      <View className="p-3 rounded-xl bg-[#FAF9F5] border border-[#F0EEEA] my-1">
                        <Text className="text-[#1C1C1E] text-[13px] leading-[19px]">
                          "{rev.comment || "No written review comment."}"
                        </Text>
                      </View>

                      {/* Flag Reason Banner if flagged */}
                      {isFlagged && rev.flagReason && (
                        <View className="flex-row items-center gap-1.5 p-2 rounded-lg bg-amber-100/70 border border-amber-200 mt-2">
                          <AppIcon name="alert-triangle" size={12} color="#B45309" />
                          <Text className="text-[#92400E] text-[11px] font-semibold flex-1">
                            Flag: {rev.flagReason}
                          </Text>
                        </View>
                      )}

                      {/* Moderation Actions */}
                      <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#F0EEEA]">
                        <View className="flex-row items-center gap-1.5">
                          <View
                            className={`px-2 py-0.5 rounded-full ${
                              rev.status === "APPROVED"
                                ? "bg-emerald-50"
                                : rev.status === "FLAGGED"
                                ? "bg-amber-100"
                                : "bg-red-50"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${
                                rev.status === "APPROVED"
                                  ? "text-emerald-700"
                                  : rev.status === "FLAGGED"
                                  ? "text-amber-800"
                                  : "text-red-700"
                              }`}
                            >
                              {rev.status}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-1.5">
                          {rev.status !== "APPROVED" && (
                            <TouchableOpacity
                              onPress={() => handleApproveReview(rev)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200"
                            >
                              <Text className="text-emerald-700 text-[11px] font-bold">Approve</Text>
                            </TouchableOpacity>
                          )}

                          {!isFlagged && (
                            <TouchableOpacity
                              onPress={() => openFlagModal(rev)}
                              className="px-2.5 py-1 rounded-lg bg-[#F5F4F0] border border-[#E5E3DD]"
                            >
                              <Text className="text-[#3A3A3C] text-[11px] font-semibold">Flag</Text>
                            </TouchableOpacity>
                          )}

                          {!isHidden ? (
                            <TouchableOpacity
                              onPress={() => handleHideReview(rev)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200"
                            >
                              <Text className="text-amber-800 text-[11px] font-semibold">Hide</Text>
                            </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity
                            onPress={() => handleDeleteReview(rev)}
                            className="w-7 h-7 rounded-lg bg-red-50 items-center justify-center border border-red-200"
                          >
                            <AppIcon name="trash-2" size={12} color="#B3261E" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <>
            {/* ─── Issues Metrics Card ─────────────────────────────────────── */}
            <View className="mx-4 mb-4 p-5 rounded-3xl bg-[#1C1C1E] shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                    <AppIcon name="shield" size={15} color="#FFFFFF" />
                  </View>
                  <Text className="text-white text-[16px] font-extrabold">Disputes & Tickets</Text>
                </View>

                <View className="bg-red-500/20 px-2.5 py-1 rounded-full border border-red-500/30">
                  <Text className="text-red-400 text-[11px] font-bold">
                    {issueStats?.openCount || 0} Open
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">Total Disputes</Text>
                  <Text className="text-white text-[18px] font-bold mt-0.5">{issueStats?.total || 0}</Text>
                </View>
                <View className="h-6 w-px bg-white/15" />
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">In Progress</Text>
                  <Text className="text-[#FBBF24] text-[18px] font-bold mt-0.5">
                    {issueStats?.inProgressCount || 0}
                  </Text>
                </View>
                <View className="h-6 w-px bg-white/15" />
                <View className="items-center flex-1">
                  <Text className="text-[#A1A1AA] text-[11px]">Resolved</Text>
                  <Text className="text-[#34D399] text-[18px] font-bold mt-0.5">
                    {issueStats?.resolvedCount || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Issue Status Filters ────────────────────────────────────── */}
            <View className="px-4 mb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { key: "ALL", label: "All Tickets" },
                  { key: "OPEN", label: "Open Only" },
                  { key: "IN_PROGRESS", label: "In Progress" },
                  { key: "RESOLVED", label: "Resolved" },
                ].map((f) => {
                  const sel = issueStatusFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setIssueStatusFilter(f.key as any)}
                      className={`px-3.5 py-1.5 rounded-lg border ${
                        sel ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text className={`text-[11px] font-bold ${sel ? "text-white" : "text-[#6E6E73]"}`}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ─── Issues Feed ─────────────────────────────────────────────── */}
            <View className="px-4">
              {filteredIssues.length === 0 ? (
                <View className="p-8 bg-white border border-[#E8E6E1] rounded-2xl items-center justify-center mt-2">
                  <AppIcon name="check-circle" size={28} color="#059669" />
                  <Text className="text-[#1C1C1E] text-[15px] font-bold mt-2">No Active Disputes</Text>
                  <Text className="text-[#8E8E93] text-[12px] mt-0.5 text-center">
                    All support tickets and disputes are cleared.
                  </Text>
                </View>
              ) : (
                filteredIssues.map((iss) => {
                  const isOpen = iss.status === "OPEN";
                  const isResolved = iss.status === "RESOLVED";

                  return (
                    <View
                      key={iss.id}
                      className="p-4 mb-3 bg-white border border-[#E8E6E1] rounded-2xl shadow-xs"
                    >
                      {/* Top Bar: User & Priority */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`px-2 py-0.5 rounded-md ${
                              iss.priority === "URGENT"
                                ? "bg-red-100"
                                : iss.priority === "HIGH"
                                ? "bg-amber-100"
                                : "bg-slate-100"
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-extrabold uppercase ${
                                iss.priority === "URGENT"
                                  ? "text-red-800"
                                  : iss.priority === "HIGH"
                                  ? "text-amber-800"
                                  : "text-slate-700"
                              }`}
                            >
                              {iss.priority} PRIORITY
                            </Text>
                          </View>

                          <View className="px-2 py-0.5 rounded-md bg-[#FAF9F5]">
                            <Text className="text-[#6E6E73] text-[10px] font-semibold">
                              {iss.category.replace(/_/g, " ")}
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`px-2.5 py-0.5 rounded-full ${
                            isOpen ? "bg-red-50" : isResolved ? "bg-emerald-50" : "bg-amber-50"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isOpen ? "text-red-700" : isResolved ? "text-emerald-700" : "text-amber-800"
                            }`}
                          >
                            {iss.status}
                          </Text>
                        </View>
                      </View>

                      {/* Title & Desc */}
                      <Text className="text-[#1C1C1E] text-[16px] font-bold mt-1">
                        {iss.title}
                      </Text>
                      <Text className="text-[#52525B] text-[13px] leading-[19px] mt-1">
                        {iss.description}
                      </Text>

                      {/* Resolution Notes if present */}
                      {iss.resolutionNotes && (
                        <View className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 mt-2.5">
                          <Text className="text-emerald-900 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                            Resolution Notes
                          </Text>
                          <Text className="text-emerald-800 text-[12px] leading-[17px]">
                            {iss.resolutionNotes}
                          </Text>
                        </View>
                      )}

                      {/* User Info & Actions */}
                      <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#F0EEEA]">
                        <View>
                          <Text className="text-[#1C1C1E] text-[12px] font-semibold">
                            {iss.user.name} ({iss.user.role})
                          </Text>
                          <Text className="text-[#8E8E93] text-[11px]">
                            {iss.user.email || iss.user.phone || "No direct contact"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => openUpdateIssueModal(iss)}
                          className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#1C1C1E]"
                        >
                          <AppIcon name="edit-2" size={11} color="#FFFFFF" />
                          <Text className="text-white text-[11px] font-bold">
                            {isResolved ? "View Details" : "Resolve / Update"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── MODAL: Flag Review Reason ───────────────────────────────────── */}
      <Modal visible={showFlagModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">Flag Review for Investigation</Text>
                <Text className="text-[#8E8E93] text-[12px]">Mark this review for moderation review</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFlagModal(false)} className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center">
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <View className="mt-4">
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">Flagging Reason *</Text>
              <TextInput
                value={flagReason}
                onChangeText={setFlagReason}
                placeholder="e.g. Offensive language, suspected fake review, harassment"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">Internal Moderation Notes</Text>
              <TextInput
                value={moderationNotes}
                onChangeText={setModerationNotes}
                placeholder="Notes for fellow admins..."
                multiline
                numberOfLines={3}
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              <TouchableOpacity
                onPress={submitFlagReview}
                disabled={submittingReviewAction}
                className="py-3.5 bg-amber-600 rounded-xl items-center"
              >
                {submittingReviewAction ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">Flag Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Resolve / Update Issue Ticket ─────────────────────────── */}
      <Modal visible={showIssueModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">Update Support Ticket</Text>
                <Text className="text-[#8E8E93] text-[12px]">{targetIssue?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowIssueModal(false)} className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center">
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <View className="mt-4">
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">Ticket Status</Text>
              <View className="flex-row gap-2 mb-3">
                {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((st) => {
                  const sel = issueStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setIssueStatus(st)}
                      className={`flex-1 py-2 rounded-xl items-center border ${
                        sel ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text className={`text-[11px] font-bold ${sel ? "text-white" : "text-[#3A3A3C]"}`}>
                        {st.replace(/_/g, " ")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">Resolution & Action Notes</Text>
              <TextInput
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                placeholder="Explained policy to client, issued dispute refund, or contacted vendor..."
                multiline
                numberOfLines={3}
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              <TouchableOpacity
                onPress={submitUpdateIssue}
                disabled={submittingIssueAction}
                className="py-3.5 bg-[#1C1C1E] rounded-xl items-center"
              >
                {submittingIssueAction ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">Save Ticket Updates</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: File New Issue ────────────────────────────────────────── */}
      <Modal visible={showNewIssueModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%] p-5 pb-8">
            <View className="flex-row items-center justify-between pb-3 border-b border-[#F0EEEA]">
              <View>
                <Text className="text-[#1C1C1E] text-[17px] font-bold">Record Dispute / Issue</Text>
                <Text className="text-[#8E8E93] text-[12px]">File client complaint or technical dispute</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNewIssueModal(false)} className="w-8 h-8 rounded-full bg-[#F5F4F0] items-center justify-center">
                <AppIcon name="x" size={16} color="#6E6E73" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">Issue Title *</Text>
              <TextInput
                value={newIssueTitle}
                onChangeText={setNewIssueTitle}
                placeholder="e.g. Booking cancellation deposit dispute"
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-3"
              />

              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1.5">Category</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {ISSUE_CATEGORIES.filter((c) => c.key !== "ALL").map((cat) => {
                  const sel = newIssueCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setNewIssueCategory(cat.key)}
                      className={`px-3 py-1.5 rounded-lg border ${
                        sel ? "bg-[#1C1C1E] border-[#1C1C1E]" : "bg-white border-[#E5E3DD]"
                      }`}
                    >
                      <Text className={`text-[11px] font-bold ${sel ? "text-white" : "text-[#3A3A3C]"}`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-[#3A3A3C] text-[12px] font-semibold mb-1">Description *</Text>
              <TextInput
                value={newIssueDesc}
                onChangeText={setNewIssueDesc}
                placeholder="Full details of the complaint or issue..."
                multiline
                numberOfLines={3}
                className="py-3 px-3.5 rounded-xl border border-[#E5E3DD] bg-[#FAF9F5] text-[#1C1C1E] text-[14px] mb-4"
              />

              <TouchableOpacity
                onPress={handleCreateIssue}
                disabled={creatingIssue}
                className="py-3.5 bg-[#1C1C1E] rounded-xl items-center"
              >
                {creatingIssue ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">Create Dispute Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
