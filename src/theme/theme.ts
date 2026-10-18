import { Platform, TextStyle } from 'react-native';

export const colors = {
  // Brand: the pyit taing htaung doll. Red and gold mark the brand only, never a verdict, button or band.
  brandRed: '#B8321C',
  brandRedDeep: '#8E2614',
  brandGold: '#F2B01E',
  brandGoldSoft: '#FCEFD2',
  brandGoldDeep: '#8A5A00',
  brandCream: '#FFF6EA',
  brandInk: '#1F1A17',

  // Interactive: lacquer black for buttons, links, switches and selection
  accent: '#1F1A17',
  accentHover: '#3D3631',
  accentSoft: '#F3ECE2',

  // Neutrals / Page Backgrounds (warm, from the doll's cream and lacquer black)
  background: '#F7F3EE',
  cardBackground: '#FFFFFF',
  darkBackground: '#1F1A17',
  deepDarkBackground: '#15110F',
  charcoalBackground: '#3D3631',
  slateDark: '#2E2723',

  // Typography Neutrals
  textPrimary: '#1F1A17',
  textSecondary: '#57504A',
  textMuted: '#6B635C',
  textLight: '#DDD3C7',
  textLighter: '#EFE8DF',
  textWhite: '#FFFFFF',

  // Borders & Dividers
  border: '#E6DED3',
  borderLight: '#D7CDC0',
  borderDark: '#4A403A',
  borderSubtle: '#EFE8DF',
  borderMuted: '#E8E1D7',

  // Status & Verdicts: Safe / Low Risk (blue, used for nothing else)
  safe: '#1D4ED8',
  safeBg: '#DBE5FF',
  safeText: '#1E3A8A',
  safeTrack: '#93B4FF',

  // Status & Verdicts: Danger / High Risk (deep crimson, kept apart from the brand red; always with the octagon)
  danger: '#9F1239',
  dangerDark: '#881337',
  dangerSoftBg: '#FFF0F2',
  dangerSoftText: '#6F0F2C',
  dangerBarTrack: '#F9B5C4',
  dangerPillBg: '#9F1239',

  // Warning & Accents
  warningText: '#B45309',
  warningBadge: '#FDBA74',
  avatarPink: '#FDE4D3',
  avatarPinkText: '#9A3412',

  // Utility badge / code pill
  codeBg: '#F1EBE3',
  codeText: '#3D3631',

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
  purpleDark: '#7E22CE',
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

/** One step up for reading text on tablets. Returns null on phones so styles stay as they are. */
export const readable = (tablet: boolean, fontSize: number, lineHeight: number): TextStyle | null =>
  tablet ? { fontSize: fontSize + 2, lineHeight: lineHeight + 4 } : null;

// Verdict roles, matching the overlay in ShieldPalette.kt (ring, chip background, chip text).
export const verdictRoles = {
  safe: { ring: colors.safe, chipBg: colors.safeBg, chipText: colors.safeText },
  careful: { ring: colors.warningText, chipBg: colors.amberLight, chipText: colors.amberDark },
  danger: { ring: colors.danger, chipBg: colors.danger, chipText: colors.white },
} as const;

export const theme = {
  space,
  radius,
  type,
  readable,
  verdictRoles,
  colors,
  fonts,
  fontWeights,
  baseTextStyle,
};

export default theme;
