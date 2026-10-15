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
  textMuted: '#5B6B80',
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
  myanmar: 'A10YoeShin-Regular',
  myanmarBold: 'A10YoeShin-Bold',
  thai: 'NotoSansThai-Regular',
  thaiBold: 'NotoSansThai-Bold',
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

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const type = {
  display: { fontSize: 28, lineHeight: 36 },
  title: { fontSize: 22, lineHeight: 28 },
  heading: { fontSize: 18, lineHeight: 24 },
  lead: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
} as const;

// Verdict roles, matching the overlay in ShieldPalette.kt (ring, chip background, chip text).
export const verdictRoles = {
  safe: { ring: colors.accent, chipBg: colors.safeBg, chipText: colors.safeText },
  careful: { ring: colors.warningText, chipBg: colors.amberLight, chipText: colors.amberDark },
  danger: { ring: colors.danger, chipBg: colors.danger, chipText: colors.white },
} as const;

export const theme = {
  space,
  radius,
  type,
  verdictRoles,
  colors,
  fonts,
  fontWeights,
  baseTextStyle,
};

export default theme;
