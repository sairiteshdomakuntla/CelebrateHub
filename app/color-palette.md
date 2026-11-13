# CelebrateHub – Dark Birthday Theme

Design tokens and usage guide for the CelebrateHub mobile app (React Native, Expo, TypeScript).

Look: deep indigo background, violet-to-pink gradient for the main action on each screen, yellow for small highlights.

---

## 1. Base palette

| Token | Hex | Use |
|---|---|---|
| `bg` | `#120F2B` | App background |
| `surface` | `#1E1A3F` | Cards, inputs, sheets |
| `surfaceRaised` | `#2A2460` | Selected tiles, pressed state, modals |
| `border` | `#322C63` | Card and input borders, dividers |
| `primary` | `#7C5CFF` | Selected chips, links, focus ring, active tab |
| `secondary` | `#D6307F` | Gradient end (pink) |
| `accent` | `#FFC53D` | Ratings, progress bars, small highlights, step labels |
| `text` | `#FFFFFF` | Headings and body text |
| `textMuted` | `#B8B3E0` | Secondary text, hints, labels |
| `onAccent` | `#1D1745` | Text placed on the yellow accent |
| `disabledBg` | `#2A2650` | Disabled buttons |
| `disabledText` | `#7C77A6` | Disabled text |
| `overlay` | `rgba(18,15,43,0.72)` | Modal backdrop |

### Main gradient

```
start: #7C5CFF   end: #D6307F   direction: left to right (0deg → 90deg)
```

Use for the one main button per screen, hero cards and the logo mark. Do not use it for secondary buttons, cards or large backgrounds.

### Status colors (lead and subscription states)

Do not reuse brand colors for status. Each status has a background and a text color.

| Status | Background | Text | Example use |
|---|---|---|---|
| Success | `#123B34` | `#6EE7B7` | Lead accepted, verified provider, payment done |
| Warning | `#3D2F0F` | `#FFC53D` | Pending, waiting for providers, expiring subscription |
| Error | `#3F1420` | `#FF8FA3` | Rejected, expired, payment failed |
| Info | `#1B2A55` | `#8FB4FF` | New lead, tips, announcements |

---

## 2. Event themes (dark)

Keep the base palette for navigation, buttons on provider and admin screens, and payments. Swap only the gradient pair and the accent on event pages, invitation templates and Gift Circle. The default theme for Birthday events is the base palette above.

| Event type | `bg` | `surface` | Gradient start | Gradient end | Accent |
|---|---|---|---|---|---|
| Birthday | `#120F2B` | `#1E1A3F` | `#7C5CFF` | `#D6307F` | `#FFC53D` |
| Wedding | `#1F0D14` | `#2E1520` | `#B3364A` | `#E0A93B` | `#E8B96A` |
| Engagement | `#1E0F1A` | `#2D1927` | `#D4577F` | `#E8B08A` | `#F0C9A0` |
| Baby shower | `#0E1F22` | `#172E32` | `#3FB6B2` | `#F4A6A0` | `#F9D3C2` |
| Anniversary | `#1B0C14` | `#2A1520` | `#8E2F4F` | `#D08C7B` | `#E3B3A5` |
| Housewarming | `#1D140E` | `#2B2018` | `#C4633F` | `#8DA58A` | `#E3C28A` |
| Festival | `#1A0E08` | `#2A1810` | `#E8590C` | `#F5B301` | `#FFD36B` |
| Corporate | `#0B1626` | `#14243A` | `#2E6FD8` | `#2BB3A3` | `#6EE0D2` |

Check contrast before shipping any non-Birthday theme: white text on some gradient ends (Wedding gold, Engagement champagne, Baby shower peach, Festival yellow) is too light. Use `onAccent`-style dark text on those buttons, or darken the gradient end.

---

## 3. Typography

Font: **Plus Jakarta Sans** (weights 400, 500, 700).

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 700 | Screen titles |
| `title` | 22 / 28 | 700 | Section titles, event name |
| `heading` | 18 / 24 | 700 | Card titles |
| `body` | 15 / 22 | 400 | Main text |
| `bodyStrong` | 15 / 22 | 700 | Names, prices |
| `small` | 13 / 18 | 400 | Secondary text, meta |
| `caption` | 12 / 16 | 500 | Labels, chips, status tags |
| `button` | 16 / 20 | 700 | Buttons |

Setup:

```bash
npx expo install expo-font @expo-google-fonts/plus-jakarta-sans expo-linear-gradient
```

```tsx
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';

const [loaded] = useFonts({
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
});
if (!loaded) return null; // or keep the splash screen visible
```

---

## 4. Spacing, radius, sizes

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 20, 24, 32 |
| Screen padding | 20 horizontal |
| Gap between cards | 12–16 |
| Radius small (chips inner, tags) | 12 |
| Radius medium (inputs, buttons) | 12–14 |
| Radius large (cards, tiles) | 14 |
| Radius hero (hero card) | 16 |
| Radius pill (chips) | 20 |
| Minimum touch target | 44 × 44 |
| Input height | 48 |
| Primary button height | 54 |
| Secondary / small button height | 44 |

---

## 5. Component specs

**Primary button:** gradient fill, white text (`button` style), height 54, radius 14. One per screen.

**Secondary button:** `surface` fill, 1px `border`, white text, height 54 (or 44 when small).

**Outline accent button (for example, Contribute):** transparent fill, 1px `accent` border, `accent` text, height 44.

**Input:** `surface` fill, 1px `border`, radius 12, height 48, white text, label above in `textMuted` 12px. Focus: border `primary`.

**Event type chip:** height 40, radius 20. Default: `surface` fill with `border`. Selected: `primary` fill and border, bold text.

**Service tile:** `surface` fill, 1px `border`, radius 14, min height 100. Selected: `surfaceRaised` fill, 2px `primary` border, "Selected" label in `accent`.

**Card:** `surface` fill, 1px `border`, radius 14, padding 14.

**Hero card:** main gradient, radius 16, padding 18, white text.

**Status tag:** radius 12, padding 4 × 10, caption bold, colors from the status table.

**Progress bar (Gift Circle):** track `border`, fill `accent`, height 10, radius 5.

---

## 6. Accessibility notes

- `text` and `textMuted` on `bg` and `surface` are well above 4.5:1.
- White on the `primary` violet is about 4.3:1, so use it only for large or bold text (16px bold buttons, selected chips). Do not use `primary` as a background for small regular text.
- Never rely on color alone for status. Always show a text label ("Accepted", "Expired") next to the color.
- Keep touch targets at 44px or more. Add `accessibilityLabel` to icon-only buttons.
- Support system font scaling: do not hard-code heights on text containers.

---

## 7. Drop-in code

### `src/theme/colors.ts`

```ts
export const colors = {
  bg: '#120F2B',
  surface: '#1E1A3F',
  surfaceRaised: '#2A2460',
  border: '#322C63',
  primary: '#7C5CFF',
  secondary: '#D6307F',
  accent: '#FFC53D',
  text: '#FFFFFF',
  textMuted: '#B8B3E0',
  onAccent: '#1D1745',
  disabledBg: '#2A2650',
  disabledText: '#7C77A6',
  overlay: 'rgba(18,15,43,0.72)',
  gradient: ['#7C5CFF', '#D6307F'] as const,
  status: {
    success: { bg: '#123B34', fg: '#6EE7B7' },
    warning: { bg: '#3D2F0F', fg: '#FFC53D' },
    error: { bg: '#3F1420', fg: '#FF8FA3' },
    info: { bg: '#1B2A55', fg: '#8FB4FF' },
  },
} as const;
```

### `src/theme/eventThemes.ts`

```ts
export type EventType =
  | 'BIRTHDAY' | 'WEDDING' | 'ENGAGEMENT' | 'BABY_SHOWER'
  | 'ANNIVERSARY' | 'HOUSEWARMING' | 'FESTIVAL' | 'CORPORATE' | 'OTHER';

export type EventTheme = {
  bg: string;
  surface: string;
  gradient: readonly [string, string];
  accent: string;
};

export const eventThemes: Record<EventType, EventTheme> = {
  BIRTHDAY:     { bg: '#120F2B', surface: '#1E1A3F', gradient: ['#7C5CFF', '#D6307F'], accent: '#FFC53D' },
  WEDDING:      { bg: '#1F0D14', surface: '#2E1520', gradient: ['#B3364A', '#E0A93B'], accent: '#E8B96A' },
  ENGAGEMENT:   { bg: '#1E0F1A', surface: '#2D1927', gradient: ['#D4577F', '#E8B08A'], accent: '#F0C9A0' },
  BABY_SHOWER:  { bg: '#0E1F22', surface: '#172E32', gradient: ['#3FB6B2', '#F4A6A0'], accent: '#F9D3C2' },
  ANNIVERSARY:  { bg: '#1B0C14', surface: '#2A1520', gradient: ['#8E2F4F', '#D08C7B'], accent: '#E3B3A5' },
  HOUSEWARMING: { bg: '#1D140E', surface: '#2B2018', gradient: ['#C4633F', '#8DA58A'], accent: '#E3C28A' },
  FESTIVAL:     { bg: '#1A0E08', surface: '#2A1810', gradient: ['#E8590C', '#F5B301'], accent: '#FFD36B' },
  CORPORATE:    { bg: '#0B1626', surface: '#14243A', gradient: ['#2E6FD8', '#2BB3A3'], accent: '#6EE0D2' },
  OTHER:        { bg: '#120F2B', surface: '#1E1A3F', gradient: ['#7C5CFF', '#D6307F'], accent: '#FFC53D' },
};
```

### `src/theme/typography.ts`

```ts
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const type = {
  display:    { fontFamily: fonts.bold,    fontSize: 28, lineHeight: 34 },
  title:      { fontFamily: fonts.bold,    fontSize: 22, lineHeight: 28 },
  heading:    { fontFamily: fonts.bold,    fontSize: 18, lineHeight: 24 },
  body:       { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bold,    fontSize: 15, lineHeight: 22 },
  small:      { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption:    { fontFamily: fonts.medium,  fontSize: 12, lineHeight: 16 },
  button:     { fontFamily: fonts.bold,    fontSize: 16, lineHeight: 20 },
} as const;
```

### `src/theme/layout.ts`

```ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 12, md: 14, lg: 14, hero: 16, pill: 20 } as const;
export const size = { touch: 44, input: 48, button: 54 } as const;
```

### `src/theme/index.ts`

```ts
export * from './colors';
export * from './eventThemes';
export * from './typography';
export * from './layout';
```

### Example: primary button

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, radius, size } from '../theme';

type Props = { label: string; onPress: () => void; disabled?: boolean };

export function PrimaryButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={disabled ? [colors.disabledBg, colors.disabledBg] : colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Text style={[type.button, { color: disabled ? colors.disabledText : colors.text }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: size.button, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
```

### Example: status tag

```tsx
import { View, Text } from 'react-native';
import { colors, type } from '../theme';

type Status = keyof typeof colors.status;

export function StatusTag({ label, status }: { label: string; status: Status }) {
  const c = colors.status[status];
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'flex-start' }}>
      <Text style={[type.caption, { color: c.fg, fontFamily: 'PlusJakartaSans_700Bold' }]}>{label}</Text>
    </View>
  );
}
```

### Example: applying an event theme

```tsx
import { eventThemes, EventType } from '../theme';

function EventScreen({ eventType }: { eventType: EventType }) {
  const theme = eventThemes[eventType] ?? eventThemes.OTHER;
  // use theme.bg for the screen background, theme.surface for cards,
  // theme.gradient for the hero and main button, theme.accent for highlights
}
```

Use `OTHER` (the Birthday palette) when the event type is not set.

---

## 8. Suggested mapping to your event and lead statuses

| App state | Tag label | Status |
|---|---|---|
| Lead accepted by a provider | Accepted | success |
| Waiting for providers to accept | Waiting | warning |
| Lead taken by another provider | Closed | info |
| Lead expired | Expired | error |
| New lead for a provider | New lead | info |
| Provider verified | Verified | success |
| Verification pending | In review | warning |
| Provider suspended or rejected | Suspended | error |
| Subscription active | Active | success |
| Subscription expiring soon | Expiring | warning |
| Subscription expired | Expired | error |