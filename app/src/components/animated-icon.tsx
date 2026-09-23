import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 500;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const fadeOut = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 0.98 }], easing: Easing.out(Easing.quad) },
  });

  const brand = (
    <View style={styles.brandWrap}>
      <View style={styles.mark}>
        <Text style={styles.markText}>CH</Text>
      </View>
      <Text style={styles.wordmark}>CelebrateHub</Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={fadeOut.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {brand}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {brand}
    </View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.brandWrap}>
      <View style={styles.mark}>
        <Text style={styles.markText}>CH</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  wordmark: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
