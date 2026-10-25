import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuthStore } from '@/store/auth.store';
import { colors } from '@/theme';

export default function AppTabs() {
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.surfaceRaised}
      tintColor={colors.primary}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      labelStyle={{ default: { color: colors.textMuted }, selected: { color: colors.primary } }}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
          src={require('@/assets/images/tabIcons/home.png')}
        />
      </NativeTabs.Trigger>

      {isAdmin && (
        <NativeTabs.Trigger name="admin-users">
          <NativeTabs.Trigger.Label>Users</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'person.2', selected: 'person.2.fill' }}
            md="group"
            src={require('@/assets/images/tabIcons/users.png')}
          />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person', selected: 'person.fill' }}
          md="person"
          src={require('@/assets/images/tabIcons/profile.png')}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
