import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

export type StatusType = keyof typeof colors.status;

interface StatusTagProps {
  label: string;
  status: StatusType;
  style?: ViewStyle;
}

export function StatusTag({ label, status, style }: StatusTagProps) {
  const c = colors.status[status] ?? colors.status.info;
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: c.bg },
        style,
      ]}
    >
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
