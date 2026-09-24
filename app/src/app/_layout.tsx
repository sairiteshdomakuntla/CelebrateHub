import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth.store";
import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

/**
 * Isolated component that reads useSegments() so its re-renders
 * never propagate to <Slot /> and the screens rendered inside it.
 * This prevents keyboard dismissal caused by parent re-renders.
 */
function AuthGuard() {
  const { isInitialized, accessToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAppGroup = segments[0] === "(app)";

    SplashScreen.hideAsync();

    if (accessToken && inAuthGroup) {
      router.replace("/(app)" as any);
    } else if (!accessToken && inAppGroup) {
      router.replace("/(auth)/welcome" as any);
    } else if (!accessToken && !inAuthGroup) {
      router.replace("/(auth)/welcome" as any);
    }
  }, [isInitialized, accessToken, segments]);

  return null;
}

export default function RootLayout() {
  const { isInitialized, initialize } = useAuthStore();

  // Restore tokens from SecureStore on first mount
  useEffect(() => {
    initialize();
  }, []);

  if (!isInitialized) return null;

  return (
    <>
      <AuthGuard />
      <AnimatedSplashOverlay />
      <Slot />
    </>
  );
}
