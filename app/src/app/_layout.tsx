import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth.store";
import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isInitialized, accessToken, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Restore tokens from SecureStore on first mount
  useEffect(() => {
    initialize();
  }, []);

  // Auth guard: once initialized, redirect to the right group
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

  if (!isInitialized) return null;

  return (
    <>
      <AnimatedSplashOverlay />
      <Slot />
    </>
  );
}
