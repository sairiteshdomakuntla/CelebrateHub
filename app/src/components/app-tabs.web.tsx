import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

export default function AppTabs() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/(app)" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          {isAdmin && (
            <TabTrigger name="admin-users" href="/(app)/admin-users" asChild>
              <TabButton>Users</TabButton>
            </TabTrigger>
          )}
          <TabTrigger name="profile" href="/(app)/profile" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          { backgroundColor: isFocused ? '#1C1C1E' : 'transparent' },
        ]}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isFocused ? '#FFFFFF' : '#6E6E73',
          }}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brandText}>CelebrateHub</Text>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 8,
    maxWidth: 800,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E6E1',
  },
  brandText: {
    marginRight: 'auto',
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
});
