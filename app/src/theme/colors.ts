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

export type ColorTokens = typeof colors;
