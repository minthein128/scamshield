import React from 'react';
import { Linking, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Icon } from './Icon';
import { stepText, useShieldControl, type ShieldControl } from '../hooks/useShieldControl';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ShieldCard: React.FC<{ onDetails?: () => void }> = ({ onDetails }) => <ShieldCardView control={useShieldControl()} onDetails={onDetails} />;

export const ShieldCardView: React.FC<{ control: ShieldControl; onDetails?: () => void }> = ({ control, onDetails }) => {
  const { t } = useTranslation('shield');
  const { support, running, step, error, setEnabled } = control;
  const apkUrl = process.env.EXPO_PUBLIC_APK_URL?.trim();

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
      : running
        ? t('status.on')
        : t('status.off');

  return (
    <View testID="shield-card" style={[styles.card, unavailable && styles.cardOff]}>
      <View style={styles.row}>
        <View style={[styles.icon, running && styles.iconOn]}>
          <Icon name="shieldCheck" size={28} color={colors.white} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text testID="shield-status" style={styles.status}>{status}</Text>
        </View>
        {unavailable ? null : <Switch
          testID="shield-switch"
          accessibilityLabel={t('title')}
          value={running || working}
          disabled={unavailable || working}
          onValueChange={setEnabled}
          trackColor={{ false: colors.borderDark, true: colors.accent }}
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
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.slateDark, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.accent },
  text: { flex: 1, gap: 2 },
  title: { color: colors.white, fontSize: 20, lineHeight: 28, fontFamily: fonts.bold, includeFontPadding: false },
  status: { color: colors.textLighter, fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, includeFontPadding: false },
  body: { color: colors.textLight, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  error: { color: colors.warningBadge, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  link: { minHeight: 48, justifyContent: 'center' },
  linkText: { color: colors.brandBlueLight, fontSize: 15, lineHeight: 20, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});

export default ShieldCard;
