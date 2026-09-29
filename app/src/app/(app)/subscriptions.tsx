import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { AppIcon } from "@/components/ui/pro-icon";
import { useAuthStore } from "@/store/auth.store";
import { BASE_URL } from "@/lib/api";
import {
  subscriptionsApi,
  type SubscriptionPlan,
  type Subscription,
  type RazorpayOrderResponse,
} from "@/lib/subscriptions.api";

type IntervalFilter = "MONTHLY" | "YEARLY";

function formatDate(iso?: string | null) {
  if (!iso) return "Always Active";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(amount: number) {
  if (amount === 0) return "Free";
  return "₹" + amount.toLocaleString("en-IN");
}

function findMonthlyCounterpart(plan: SubscriptionPlan, all: SubscriptionPlan[]) {
  if (plan.interval !== "YEARLY" || plan.price <= 0) return null;
  const monthlySlug = plan.slug.replace(/-yearly$/, "-monthly");
  if (monthlySlug === plan.slug) return null;
  return (
    all.find((p) => p.slug === monthlySlug && p.interval === "MONTHLY" && p.price > 0) ?? null
  );
}

function bestYearlySavingsPct(all: SubscriptionPlan[]): number | null {
  let best: number | null = null;
  for (const plan of all) {
    const monthly = findMonthlyCounterpart(plan, all);
    if (!monthly) continue;
    const fullYearMonthly = monthly.price * 12;
    if (fullYearMonthly <= plan.price) continue;
    const pct = Math.round(((fullYearMonthly - plan.price) / fullYearMonthly) * 100);
    if (best === null || pct > best) best = pct;
  }
  return best;
}

function planFacts(plan: SubscriptionPlan, all: SubscriptionPlan[]): string[] {
  const facts: string[] = [];

  // Real copy straight from the admin-managed plan description
  if (plan.description) {
    for (const part of plan.description.split(/,\s+/)) {
      const text = part.trim();
      if (!text) continue;
      facts.push(text.charAt(0).toUpperCase() + text.slice(1));
    }
  }

  if (plan.price === 0) {
    facts.push("Free forever — no card required");
  } else if (plan.interval === "YEARLY") {
    const monthly = findMonthlyCounterpart(plan, all);
    if (monthly) {
      const perMonth = Math.round(plan.price / 12);
      const pct = Math.round(((monthly.price * 12 - plan.price) / (monthly.price * 12)) * 100);
      facts.push(
        `Billed yearly — about ${formatPrice(perMonth)}/month instead of ${formatPrice(
          monthly.price
        )}/month (save ${pct}%)`
      );
    } else {
      facts.push(`Billed ${formatPrice(plan.price)} per year`);
    }
  } else {
    facts.push(`Billed ${formatPrice(plan.price)} per month`);
  }

  return facts;
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "CUSTOMER";

  const [interval, setInterval] = useState<IntervalFilter>("MONTHLY");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlan | null>(null);
  const [initiatingOrder, setInitiatingOrder] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allPlans, mySub] = await Promise.all([
        subscriptionsApi.listPlans(role),
        subscriptionsApi.getMySubscription(),
      ]);
      setPlans(allPlans);
      setActiveSub(mySub);
    } catch (err: any) {
      console.error("Failed to load subscription data", err);
    }
  }, [role]);

  // Block admin users — admins don't take memberships
  useEffect(() => {
    if (role === "ADMIN") {
      Alert.alert(
        "Not Available",
        "Membership & Plans are not applicable for admin accounts.",
        [{ text: "Go Back", onPress: () => router.back() }]
      );
      return;
    }
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData, role]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Real Razorpay Subscription Checkout
  async function handleSelectPlan(plan: SubscriptionPlan) {
    if (activeSub?.planId === plan.id && activeSub.status === "ACTIVE") {
      Alert.alert("Already Active", "You are already subscribed to this plan.");
      return;
    }

    setInitiatingOrder(true);
    setSelectedPlanForCheckout(plan);

    try {
      const order = await subscriptionsApi.createOrder(plan.id);

      if (order.free) {
        Alert.alert("🎉 Success", "Free plan activated successfully!");
        await loadData();
        return;
      }

      // Open official Razorpay Checkout via authenticated in-app browser session
      const checkoutUrl = `${BASE_URL}/api/subscriptions/checkout?orderId=${encodeURIComponent(
        order.orderId!
      )}&planId=${encodeURIComponent(plan.id)}&userId=${encodeURIComponent(user?.id || "")}`;

      const result = await WebBrowser.openAuthSessionAsync(
        checkoutUrl,
        "celebratehub://payment-success"
      );

      if (result.type === "success" && result.url) {
        const queryString = result.url.split("?")[1] || "";
        const params = new URLSearchParams(queryString);
        const paymentId = params.get("razorpay_payment_id");
        const orderId = params.get("razorpay_order_id") || order.orderId!;
        const signature = params.get("razorpay_signature");

        if (paymentId && signature) {
          setProcessingPayment(true);
          await subscriptionsApi.verifyPayment({
            planId: plan.id,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
          });

          Alert.alert(
            "🎉 Payment Verified!",
            `Your payment was processed and verified by Razorpay! ${plan.name} is now active.`,
            [{ text: "Awesome!", onPress: () => loadData() }]
          );
        } else {
          Alert.alert("Payment Cancelled", "Payment was not completed.");
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || "Could not complete Razorpay checkout.";
      Alert.alert("Razorpay Error", msg);
    } finally {
      setInitiatingOrder(false);
      setProcessingPayment(false);
      setSelectedPlanForCheckout(null);
    }
  }

  function handleCancelAutoRenew() {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel auto-renewal? You will keep your benefits until the end of your current billing period.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel Auto-renew",
          style: "destructive",
          onPress: async () => {
            try {
              await subscriptionsApi.cancelSubscription();
              Alert.alert("Cancelled", "Your subscription will not renew automatically.");
              await loadData();
            } catch (err: any) {
              Alert.alert("Error", "Could not cancel subscription.");
            }
          },
        },
      ]
    );
  }

  const filteredPlans = plans.filter((p) => p.price === 0 || p.interval === interval);
  const annualSavingsPct = bestYearlySavingsPct(plans);
  const recommendedPlanId = filteredPlans.find((p) => p.price > 0)?.id;

  if (role === "ADMIN") {
    return (
      <View className="flex-1 bg-[#F7F7F5] items-center justify-center p-6">
        <StatusBar style="dark" />
        <View className="w-16 h-16 rounded-3xl bg-[#1C1C1E] items-center justify-center mb-4 shadow-sm">
          <AppIcon name="shield" size={28} color="#FFFFFF" />
        </View>
        <Text className="text-[20px] font-bold text-[#1C1C1E] text-center mb-2">
          Administrator Account
        </Text>
        <Text className="text-[14px] text-[#6E6E73] text-center mb-6 leading-relaxed max-w-xs">
          As the platform owner, you have full unrestricted access to all features. Personal subscriptions and memberships are not applicable.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#1C1C1E] px-6 py-3.5 rounded-2xl shadow-sm active:bg-black"
        >
          <Text className="text-white font-bold text-[14px]">Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F5]">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-5 pt-3 pb-4 bg-[#F7F7F5] border-b border-[#EBEAE5] flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-[#E5E4E0] items-center justify-center shadow-xs"
            >
              <AppIcon name="arrow-left" size={18} color="#1C1C1E" />
            </TouchableOpacity>
            <View>
              <Text className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">
                Plans & Billing
              </Text>
              <Text className="text-[12px] text-[#6E6E73] mt-0.5">
                {role === "PROVIDER" ? "Boost leads & bookings" : "VIP celebration planning"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            className="w-10 h-10 rounded-full bg-white border border-[#E5E4E0] items-center justify-center shadow-xs"
          >
            <AppIcon name="refresh-cw" size={16} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1C1C1E" />
            <Text className="text-[#6E6E73] text-[13px] mt-3">Loading membership plans...</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1C1C1E" />
            }
          >
            {/* Active Subscription Banner */}
            {activeSub ? (
              <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-6 shadow-md">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-[#10B981]/20 items-center justify-center">
                      <AppIcon name="check" size={16} color="#10B981" />
                    </View>
                    <View>
                      <Text className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
                        Current Plan
                      </Text>
                      <Text className="text-white text-[17px] font-bold">
                        {activeSub.plan.name}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-[#10B981] px-2.5 py-1 rounded-full">
                    <Text className="text-white text-[11px] font-bold uppercase tracking-wider">
                      {activeSub.status}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 pt-3.5 border-t border-white/10 flex-row items-center justify-between">
                  <View>
                    <Text className="text-white/50 text-[11px]">Valid Until</Text>
                    <Text className="text-white text-[13px] font-semibold mt-0.5">
                      {formatDate(activeSub.endDate || "")}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-white/50 text-[11px]">Billing</Text>
                    <Text className="text-white text-[13px] font-semibold mt-0.5">
                      {formatPrice(activeSub.plan.price)} / {activeSub.plan.interval.toLowerCase()}
                    </Text>
                  </View>
                  {activeSub.plan.price > 0 && activeSub.autoRenew && (
                    <TouchableOpacity
                      onPress={handleCancelAutoRenew}
                      className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15"
                    >
                      <Text className="text-white/80 text-[11px] font-semibold">
                        Cancel Renew
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : null}

            {/* Monthly / Annual Toggle */}
            <View className="flex-row items-center justify-center mb-6">
              <View className="flex-row bg-[#ECEAE6] p-1 rounded-2xl w-full max-w-xs">
                <TouchableOpacity
                  onPress={() => setInterval("MONTHLY")}
                  className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                    interval === "MONTHLY" ? "bg-white shadow-xs" : ""
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      interval === "MONTHLY" ? "text-[#1C1C1E]" : "text-[#7C7C80]"
                    }`}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInterval("YEARLY")}
                  className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row gap-1.5 ${
                    interval === "YEARLY" ? "bg-white shadow-xs" : ""
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      interval === "MONTHLY" ? "text-[#1C1C1E]" : "text-[#7C7C80]"
                    }`}
                  >
                    Annual
                  </Text>
                  {annualSavingsPct !== null && annualSavingsPct > 0 && (
                    <View className="bg-[#10B981] px-1.5 py-0.5 rounded-md">
                      <Text className="text-white text-[9px] font-bold">
                        SAVE {annualSavingsPct}%
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Plans List */}
            <View className="gap-4">
              {filteredPlans.map((plan) => {
                const isCurrent = activeSub
                  ? activeSub.planId === plan.id && activeSub.status === "ACTIVE"
                  : plan.price === 0;
                const isPaid = plan.price > 0;

                // Facts derived from the real plan record (description + pricing)
                const features = planFacts(plan, plans);
                const isRecommended = plan.id === recommendedPlanId;

                return (
                  <View
                    key={plan.id}
                    className={`bg-white rounded-3xl p-5 border ${
                      isCurrent
                        ? "border-[#10B981] shadow-sm"
                        : isPaid
                        ? "border-[#1C1C1E] shadow-sm"
                        : "border-[#E5E4E0]"
                    }`}
                  >
                    {isCurrent ? (
                      <View className="self-start bg-[#10B981] px-3 py-1 rounded-full mb-3 flex-row items-center gap-1.5">
                        <AppIcon name="check" size={11} color="#FFFFFF" />
                        <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                          Your Current Plan
                        </Text>
                      </View>
                    ) : isRecommended ? (
                      <View className="self-start bg-[#1C1C1E] px-3 py-1 rounded-full mb-3">
                        <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                          Recommended
                        </Text>
                      </View>
                    ) : null}

                    <View className="flex-row items-baseline justify-between">
                      <View>
                        <Text className="text-[18px] font-bold text-[#1C1C1E]">
                          {plan.name}
                        </Text>
                        <Text className="text-[12px] text-[#6E6E73] mt-0.5 leading-relaxed max-w-[240px]">
                          {plan.description}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[24px] font-extrabold text-[#1C1C1E]">
                          {formatPrice(plan.price)}
                        </Text>
                        {isPaid && (
                          <Text className="text-[11px] text-[#8E8E93]">
                            /{plan.interval === "YEARLY" ? "year" : "month"}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Features List */}
                    <View className="mt-4 pt-4 border-t border-[#F0EEEA] gap-2.5">
                      {features.map((f, i) => (
                        <View key={i} className="flex-row items-center gap-2.5">
                          <View
                            className={`w-5 h-5 rounded-full items-center justify-center ${
                              isCurrent || isPaid ? "bg-[#10B981]/15" : "bg-[#ECEAE6]"
                            }`}
                          >
                            <AppIcon
                              name="check"
                              size={12}
                              color={isCurrent || isPaid ? "#10B981" : "#7C7C80"}
                            />
                          </View>
                          <Text className="text-[13px] text-[#3A3A3C] font-medium flex-1">
                            {f}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      disabled={isCurrent || initiatingOrder}
                      onPress={() => handleSelectPlan(plan)}
                      className={`mt-5 py-3.5 rounded-2xl items-center justify-center flex-row gap-2 ${
                        isCurrent
                          ? "bg-[#ECEAE6]"
                          : isPaid
                          ? "bg-[#1C1C1E] shadow-sm active:bg-black"
                          : "bg-white border border-[#D5D3CE] active:bg-[#F7F7F5]"
                      }`}
                    >
                      {initiatingOrder && selectedPlanForCheckout?.id === plan.id ? (
                        <ActivityIndicator
                          size="small"
                          color={isPaid ? "#FFFFFF" : "#1C1C1E"}
                        />
                      ) : (
                        <>
                          {isPaid && !isCurrent && (
                            <AppIcon name="credit-card" size={15} color="#FFFFFF" />
                          )}
                          <Text
                            className={`text-[14px] font-bold ${
                              isCurrent
                                ? "text-[#8E8E93]"
                                : isPaid
                                ? "text-white"
                                : "text-[#1C1C1E]"
                            }`}
                          >
                            {isCurrent
                              ? "Current Plan"
                              : isPaid
                              ? "Upgrade with Razorpay"
                              : "Downgrade to Free Plan"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Razorpay Trust Badge */}
            <View className="mt-8 items-center justify-center flex-row gap-2">
              <AppIcon name="shield" size={16} color="#6E6E73" />
              <Text className="text-[12px] text-[#6E6E73] font-medium">
                Encrypted 256-bit payments powered by Razorpay
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
