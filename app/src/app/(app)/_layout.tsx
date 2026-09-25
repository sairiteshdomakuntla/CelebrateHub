import { Stack } from "expo-router";

/**
 * (app)/_layout.tsx — Stack navigator
 *
 * Replaces the previous NativeTabs layout so that sub-directory routes
 * (events/create, events/:id, etc.) can be pushed as full-screen pages.
 * The tab-bar UI is handled by the AppTabs component rendered inside each
 * relevant screen, or can be re-added as a bottom tab if needed later.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="admin-users" />
      <Stack.Screen name="admin-providers" />
      <Stack.Screen name="admin-categories" />
      <Stack.Screen name="admin-plans" />
      <Stack.Screen name="admin-moderation" />
      <Stack.Screen name="admin-analytics" />
      <Stack.Screen name="provider-profile" />
      <Stack.Screen name="leads" />
      <Stack.Screen name="subscriptions" />
      <Stack.Screen name="events" />
    </Stack>
  );
}

