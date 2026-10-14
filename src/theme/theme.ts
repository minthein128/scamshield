import { Platform, TextStyle } from 'react-native';

export const colors = {
  // Brand & Accent
  accent: '#1D4ED8',
  accentHover: '#1E3A8A',
  brandBlue: '#1D4ED8',
  brandBlueDark: '#1E3A8A',
  brandBlueLight: '#DBE5FF',

  // Neutrals / Page Backgrounds
  background: '#F4F6F8',
  cardBackground: '#FFFFFF',
  darkBackground: '#0F1B2D',
  deepDarkBackground: '#0B1220',
  charcoalBackground: '#3A3F47',
  slateDark: '#1E293B',

  // Typography Neutrals
  textPrimary: '#0F1B2D',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#CBD5E1',
  textLighter: '#E2E8F0',
  textWhite: '#FFFFFF',

  // Borders & Dividers
  border: '#DCE3EC',
  borderLight: '#CBD5E1',
  borderDark: '#334155',
  borderSubtle: '#E2E8F0',
  borderMuted: '#E5E7EB',

  // Status & Verdicts: Safe / Low Risk (Brand Blue Chip)
  safeBg: '#DBE5FF',
  safeText: '#1E3A8A',

  // Status & Verdicts: Danger / High Risk (Orange-Red, NOT crimson)
  danger: '#C2410C',
  dangerDark: '#9A3412',
  dangerSoftBg: '#FFF1E8',
  dangerSoftText: '#7C2D12',
  dangerBarTrack: '#FDBA8C',
  dangerPillBg: '#C2410C',

  // Warning & Accents
  warningText: '#B45309',
  warningBadge: '#FDBA74',
  avatarPink: '#FDE4D3',
  avatarPinkText: '#9A3412',

  // Utility badge / code pill
  codeBg: '#EEF2F6',
  codeText: '#334155',

  // Other Design Palette Colors
  white: '#FFFFFF',
  black: '#000000',
  indigoDark: '#312E81',
  indigoMedium: '#4338CA',
  cyanDark: '#0E7490',
  tealDark: '#0F766E',
  amberLight: '#FEF3C7',
  amberBadge: '#FDE68A',
  amberDark: '#854D0E',
  roseLight: '#FBCFE8',
  roseDark: '#831843',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
  mono: 'IBMPlexMono-Medium',
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

// Text style helper guaranteeing includeFontPadding: false on Android
export const baseTextStyle: TextStyle = {
  color: colors.textPrimary,
  fontFamily: fonts.regular,
  ...Platform.select({
    android: {
      includeFontPadding: false,
    },
  }),
};

export const theme = {
  colors,
  fonts,
  fontWeights,
  baseTextStyle,
};

export default theme;
