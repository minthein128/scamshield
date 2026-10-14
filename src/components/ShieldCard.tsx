import React from 'react';
import { Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from './Icon';
import { STEP_TEXT, useShieldControl, type ShieldControl } from '../hooks/useShieldControl';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ShieldCard: React.FC<{ onDetails?: () => void }> = ({ onDetails }) => <ShieldCardView control={useShieldControl()} onDetails={onDetails} />;

export const ShieldCardView: React.FC<{ control: ShieldControl; onDetails?: () => void }> = ({ control, onDetails }) => {
  const { support, running, step, error, setEnabled } = control;
  const apkUrl = process.env.EXPO_PUBLIC_APK_URL?.trim();

  if (support === 'unsupported') return null;

  const unavailable = support !== 'ready';
  const working = step !== 'idle';
  const status = unavailable
    ? support === 'web'
      ? 'Works in the SafeRoute Android app.'
      : support === 'insecure-service'
        ? 'This build uses an insecure service address, so the shield is off.'
        : 'Not available in this build.'
    : working
      ? STEP_TEXT[step]
      : running
        ? 'On. Tap the bubble on anything suspicious.'
        : 'Off. Turn it on to check what is on your screen.';

  return (
    <View testID="shield-card" style={[styles.card, unavailable && styles.cardOff]}>
      <View style={styles.row}>
        <View style={[styles.icon, running && styles.iconOn]}>
          <Icon name="shieldCheck" size={28} color={colors.white} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Screen shield</Text>
          <Text testID="shield-status" style={styles.status}>{status}</Text>
        </View>
        {unavailable ? null : <Switch
          testID="shield-switch"
          accessibilityLabel="Screen shield"
          value={running || working}
          disabled={unavailable || working}
          onValueChange={setEnabled}
          trackColor={{ false: colors.borderDark, true: colors.accent }}
          thumbColor={colors.white}
        />}
      </View>
      <Text style={styles.body}>A small button floats over other apps. Tap it on a job post, chat or listing and SafeRoute checks what is on your screen.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {support === 'web' && apkUrl ? (
        <TouchableOpacity testID="shield-apk" accessibilityRole="link" accessibilityLabel="Download the Android app" onPress={() => Linking.openURL(apkUrl)} style={styles.link}>
          <Text style={styles.linkText}>Download the Android app</Text>
        </TouchableOpacity>
      ) : null}
      {onDetails && !unavailable ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Shield details" onPress={onDetails} style={styles.link}>
          <Text style={styles.linkText}>Details and permissions</Text>
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
