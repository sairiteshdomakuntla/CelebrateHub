import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";

/**
 * Root entry — auth guard in _layout handles the real redirect,
 * this keeps direct "/" visits deterministic.
 */
export default function RootIndex() {
  const { accessToken, isInitialized } = useAuthStore();
  if (!isInitialized) return null;
  return <Redirect href={accessToken ? "/(app)" : "/(auth)/welcome"} />;
}
