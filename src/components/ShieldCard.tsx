import React from 'react';
import { Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { STEP_TEXT, useShieldControl, type ShieldControl } from '../hooks/useShieldControl';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const ShieldIcon: React.FC = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <Path d="M9 12l2 2 4-4" />
  </Svg>
);

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
          <ShieldIcon />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Screen shield</Text>
          <Text testID="shield-status" style={styles.status}>{status}</Text>
        </View>
        <Switch
          testID="shield-switch"
          accessibilityLabel="Screen shield"
          value={running || working}
          disabled={unavailable || working}
          onValueChange={setEnabled}
          trackColor={{ false: colors.borderDark, true: colors.accent }}
          thumbColor={colors.white}
        />
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
  card: { backgroundColor: colors.darkBackground, borderRadius: 20, padding: 18, gap: 10 },
  cardOff: { opacity: 0.92 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.slateDark, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.accent },
  text: { flex: 1, gap: 2 },
  title: { color: colors.white, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, includeFontPadding: false },
  status: { color: colors.textLighter, fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, includeFontPadding: false },
  body: { color: colors.textLight, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
  error: { color: colors.warningBadge, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.brandBlueLight, fontSize: 14, lineHeight: 19, fontFamily: fonts.bold, textDecorationLine: 'underline' },
});

export default ShieldCard;
