import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuthStore } from '@/store/auth.store';

const INK = '#1C1C1E';
const MUTED = '#8E8E93';

export default function AppTabs() {
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';

  return (
    <NativeTabs
      backgroundColor="#FFFFFF"
      indicatorColor="#F1EFEC"
      tintColor={INK}
      iconColor={{ default: MUTED, selected: INK }}
      labelStyle={{ default: { color: MUTED }, selected: { color: INK } }}
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
