import React from 'react';
import { Linking, StyleProp, StyleSheet, Switch, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { BrandMark } from './BrandMark';
import { stepText, useShieldControl, type ShieldControl } from '../hooks/useShieldControl';
import theme from '../theme/theme';
import { APK_URL } from '../config/env';

const { colors, fonts } = theme;

export const ShieldCard: React.FC<{ onDetails?: () => void; style?: StyleProp<ViewStyle> }> = ({ onDetails, style }) => <ShieldCardView control={useShieldControl()} onDetails={onDetails} style={style} />;

export const ShieldCardView: React.FC<{ control: ShieldControl; onDetails?: () => void; style?: StyleProp<ViewStyle> }> = ({ control, onDetails, style }) => {
  const { t } = useTranslation('shield');
  const { support, on, step, error, setEnabled } = control;
  const apkUrl = APK_URL;

  if (support === 'unsupported') return null;

  const unavailable = support !== 'ready';
  const working = step !== 'idle';
  const status = unavailable
    ? support === 'web'
      ? t('status.web')
      : support === 'insecure-service'
        ? t('status.insecure')
        : t('status.unavailable')
    : working
      ? stepText(step)
      : on
        ? t('status.on')
        : t('status.off');

  return (
    <View testID="shield-card" style={[styles.card, unavailable && styles.cardOff, style]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <BrandMark size={56} medallion={on ? colors.brandGold : colors.textLight} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text testID="shield-status" style={styles.status}>{status}</Text>
        </View>
        {unavailable ? null : <Switch
          testID="shield-switch"
          accessibilityLabel={t('title')}
          value={on}
          disabled={unavailable || working}
          onValueChange={setEnabled}
          trackColor={{ false: colors.borderDark, true: colors.brandGold }}
          thumbColor={colors.white}
        />}
      </View>
      <Text style={styles.body}>{t('body')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {support === 'web' && apkUrl ? (
        <TouchableOpacity testID="shield-apk" accessibilityRole="link" accessibilityLabel={t('download')} onPress={() => Linking.openURL(apkUrl)} style={styles.link}>
          <Text style={styles.linkText}>{t('download')}</Text>
        </TouchableOpacity>
      ) : null}
      {onDetails && !unavailable ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('detailsA11y')} onPress={onDetails} style={styles.link}>
          <Text style={styles.linkText}>{t('details')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.darkBackground, borderRadius: 24, padding: 20, gap: 12 },
  cardOff: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { color: colors.white, fontSize: 20, lineHeight: 28, fontFamily: fonts.bold, includeFontPadding: false },
  status: { color: colors.textLighter, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, includeFontPadding: false },
  body: { color: colors.textLight, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  error: { color: colors.warningBadge, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { color: colors.brandGold, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});

export default ShieldCard;
