import React from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" activeOpacity={0.7} onPress={onPress} style={styles.back}>
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
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
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
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
  >
    <Text style={[styles.chipText, { color: selected ? colors.white : colors.textPrimary }]}>{label}</Text>
  </TouchableOpacity>
);

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }> = ({ children, style, testID }) => (
  <View testID={testID} style={[styles.card, style]}>{children}</View>
);

export const Pill: React.FC<{ label: string; background: string; color: string }> = ({ label, background, color }) => (
  <Text style={[styles.pill, { backgroundColor: background, color }]}>{label}</Text>
);

export const LinkButton: React.FC<{ label: string; onPress: () => void; testID?: string; color?: string }> = ({ label, onPress, testID, color = colors.accent }) => (
  <TouchableOpacity testID={testID} accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={styles.linkButton}>
    <Text style={[styles.linkText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

export const Field: React.FC<TextInputProps & { label: string; hint?: string }> = ({ label, hint, style, ...rest }) => (
  <View style={{ gap: 6 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.textMuted}
      {...rest}
      style={[styles.input, style]}
    />
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

export const EmptyState: React.FC<{ title: string; body: string; actionLabel?: string; onAction?: () => void; testID?: string }> = ({ title, body, actionLabel, onAction, testID }) => (
  <View testID={testID} style={styles.empty}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
    {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" style={{ alignSelf: 'stretch' }} /> : null}
  </View>
);

export const Notice: React.FC<{ title?: string; message: string; tone?: 'error' | 'info'; actionLabel?: string; onAction?: () => void; testID?: string }> = ({
  title,
  message,
  tone = 'error',
  actionLabel,
  onAction,
  testID,
}) => (
  <View testID={testID} accessibilityRole="alert" style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]}>
    {title ? <Text style={[styles.noticeTitle, { color: tone === 'error' ? colors.dangerSoftText : colors.safeText }]}>{title}</Text> : null}
    <Text style={[styles.noticeText, { color: tone === 'error' ? colors.dangerDark : colors.safeText }]}>{message}</Text>
    {actionLabel && onAction ? <LinkButton label={actionLabel} onPress={onAction} color={tone === 'error' ? colors.dangerDark : colors.accent} /> : null}
  </View>
);

export const SectionTitle: React.FC<{ children: string }> = ({ children }) => <Text style={styles.sectionTitle}>{children}</Text>;

const styles = StyleSheet.create({
  linkButton: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  linkText: { fontSize: 14, lineHeight: 19, fontFamily: fonts.bold, includeFontPadding: false },
  fieldLabel: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, includeFontPadding: false },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 15, lineHeight: 20, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.regular },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.white },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold, textAlign: 'center' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, textAlign: 'center' },
  notice: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  noticeError: { backgroundColor: colors.dangerSoftBg, borderColor: colors.danger },
  noticeInfo: { backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlueLight },
  noticeTitle: { fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  noticeText: { fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  headerTitle: { fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipOff: { backgroundColor: colors.white, borderColor: colors.borderLight },
  chipText: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold, includeFontPadding: false },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, overflow: 'hidden', includeFontPadding: false },
  sectionTitle: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
});
