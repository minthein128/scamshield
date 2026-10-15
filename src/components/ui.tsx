import React from 'react';
import { View, TextInputProps, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, PixelRatio } from 'react-native';
import { useTranslation } from 'react-i18next';
import theme from '../theme/theme';
import { Text, TextInput } from './Text';
import { Icon, type IconName } from './Icon';
import { scriptStyle } from '../theme/script';

const { colors, fonts } = theme;

export const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('actions.back')} activeOpacity={0.7} onPress={onPress} style={styles.back}>
      <View style={{ transform: [{ scaleX: -1 }] }}>
        <Icon name="chevron" size={22} />
      </View>
    </TouchableOpacity>
  );
};

export const ScreenHeader: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
  <View style={styles.header}>
    {onBack ? <BackButton onPress={onBack} /> : null}
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

interface ButtonProps {
  label: string;
  /** Smaller second line under the label. */
  subLabel?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'dark';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  icon?: IconName;
  /** Drawn before the label in place of an icon, such as the voice avatar. */
  leading?: React.ReactNode;
  /** Screen reader label when the visible label is too short to explain the action. */
  accessibilityLabel?: string;
  /** Label lines before it is ellipsized. */
  maxLines?: number;
}

const LABEL_LINE = 20;

export const Button: React.FC<ButtonProps> = ({ label, subLabel, onPress, variant = 'primary', disabled, style, testID, icon, leading, accessibilityLabel, maxLines = 2 }) => {
  const v = BUTTON_VARIANTS[variant];
  const firstLine = Math.round((scriptStyle(label, 'bold', LABEL_LINE).lineHeight ?? LABEL_LINE) * PixelRatio.getFontScale());
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subLabel ? `${label}. ${subLabel}` : label)}
      accessibilityState={{ disabled: Boolean(disabled) }}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, v.container, disabled && { opacity: 0.45 }, style]}
    >
      <View style={[styles.buttonRow, leading ? styles.buttonRowCentered : null]}>
        {leading ? (
          <View style={styles.buttonIcon}>{leading}</View>
        ) : icon ? (
          <View style={[styles.buttonIcon, { height: firstLine }]}>
            <Icon name={icon} size={22} color={v.color} />
          </View>
        ) : null}
        <View style={styles.buttonBody}>
          <Text numberOfLines={maxLines} ellipsizeMode="tail" style={[styles.buttonText, { color: v.color }]}>{label}</Text>
          {subLabel ? <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.buttonSub, { color: v.color }]}>{subLabel}</Text> : null}
        </View>
      </View>
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
  nativeLabel?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, nativeLabel, selected, onPress, testID }) => (
  <TouchableOpacity
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
  >
    <Text style={[styles.chipText, { color: selected ? colors.white : colors.textPrimary }]}>{label}</Text>
    {nativeLabel ? <Text style={[styles.chipText, { color: selected ? colors.white : colors.textSecondary }]}>{nativeLabel}</Text> : null}
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
    <Text numberOfLines={2} style={[styles.linkText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

export const Field: React.FC<TextInputProps & { label: string; hint?: string }> = ({ label, hint, style, ...rest }) => (
  <View style={{ gap: 8 }}>
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

export const EmptyState: React.FC<{ title: string; body: string; actionLabel?: string; onAction?: () => void; testID?: string; icon?: IconName }> = ({ title, body, actionLabel, onAction, testID, icon = 'shield' }) => (
  <View testID={testID} style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Icon name={icon} size={24} color={colors.accent} />
    </View>
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

export const Divider: React.FC = () => <View accessibilityRole="none" style={styles.divider} />;

export const SectionTitle: React.FC<{ children: string }> = ({ children }) => <Text accessibilityRole="header" style={styles.sectionTitle}>{children}</Text>;

const styles = StyleSheet.create({
  linkButton: { minHeight: 48, paddingHorizontal: 4, justifyContent: 'center' },
  linkText: { fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, includeFontPadding: false },
  fieldLabel: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.regular },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandBlueLight, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.white },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, textAlign: 'center' },
  emptyBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, textAlign: 'center' },
  notice: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  noticeError: { backgroundColor: colors.dangerSoftBg, borderColor: colors.danger },
  noticeInfo: { backgroundColor: colors.brandBlueLight, borderColor: colors.brandBlueLight },
  noticeTitle: { fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  noticeText: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  back: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  headerTitle: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
  button: { minHeight: 48, maxWidth: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  buttonRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', maxWidth: '100%' },
  buttonRowCentered: { alignItems: 'center', gap: 10 },
  buttonIcon: { justifyContent: 'center', flexShrink: 0 },
  buttonBody: { flexShrink: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  buttonText: { fontSize: 16, lineHeight: 20, textAlign: 'center', fontFamily: fonts.bold, flexShrink: 1, includeFontPadding: false },
  buttonSub: { fontSize: 13, lineHeight: 18, textAlign: 'center', fontFamily: fonts.medium, opacity: 0.8, flexShrink: 1, includeFontPadding: false },
  chip: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', gap: 6, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipOff: { backgroundColor: colors.white, borderColor: colors.borderLight },
  chipText: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold, includeFontPadding: false },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  pill: { alignSelf: 'flex-start', maxWidth: '100%', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, fontSize: 13, lineHeight: 18, fontFamily: fonts.bold, overflow: 'hidden', includeFontPadding: false },
  divider: { height: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, color: colors.textPrimary, includeFontPadding: false },
});
