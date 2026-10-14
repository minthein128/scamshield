import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity accessibilityLabel="Go back" activeOpacity={0.7} onPress={onPress} style={styles.back}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  </TouchableOpacity>
);

export const ScreenHeader: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
  <View style={styles.header}>
    {onBack ? <BackButton onPress={onBack} /> : null}
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'dark';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({ label, onPress, variant = 'primary', disabled, style, testID }) => {
  const v = BUTTON_VARIANTS[variant];
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, v.container, disabled && { opacity: 0.45 }, style]}
    >
      <Text style={[styles.buttonText, { color: v.color }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const BUTTON_VARIANTS = {
  primary: { container: { backgroundColor: colors.accent }, color: colors.white },
  dark: { container: { backgroundColor: colors.darkBackground }, color: colors.white },
  danger: { container: { backgroundColor: colors.danger }, color: colors.white },
  secondary: { container: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight }, color: colors.textPrimary },
};

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{ selected }}
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
  >
    <Text style={[styles.chipText, { color: selected ? colors.white : colors.textPrimary }]}>{label}</Text>
  </TouchableOpacity>
);

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Pill: React.FC<{ label: string; background: string; color: string }> = ({ label, background, color }) => (
  <Text style={[styles.pill, { backgroundColor: background, color }]}>{label}</Text>
);

export const SectionTitle: React.FC<{ children: string }> = ({ children }) => <Text style={styles.sectionTitle}>{children}</Text>;

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  headerTitle: { fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipOff: { backgroundColor: colors.white, borderColor: colors.borderLight },
  chipText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, includeFontPadding: false },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, overflow: 'hidden', includeFontPadding: false },
  sectionTitle: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
});
