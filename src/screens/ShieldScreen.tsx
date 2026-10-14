import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import * as ShieldModule from 'shield-module';
import { Screen } from '../components/Screen';
import { AndroidNote } from '../components/AndroidNote';
import { Button, Card, ScreenHeader } from '../components/ui';
import { notify } from '../lib/notify';
import { apiUrlFromEnv, isCleartext, toCheckResponse } from '../lib/shield';
import { useAppState } from '../state/AppState';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ShieldScreen: React.FC<RootScreenProps<'Shield'>> = ({ navigation }) => {
  const isAndroid = Platform.OS === 'android';
  const [permission, setPermission] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const { language } = useAppState();
  const apiUrl = apiUrlFromEnv();

  const refresh = useCallback(async () => {
    setPermission(await ShieldModule.hasOverlayPermission());
    setRunning(await ShieldModule.isShieldRunning());
  }, []);

  useEffect(() => {
    if (isAndroid) refresh().catch(() => undefined);
  }, [isAndroid, refresh]);

  useEffect(() => {
    if (!isAndroid) return;
    const sub = ShieldModule.addShieldResultListener(r => {
      setChecking(false);
      navigation.navigate('Report', { result: toCheckResponse(r), language, fresh: true });
    });
    return () => sub.remove();
  }, [isAndroid, language, navigation]);

  const grant = async () => {
    setBusy(true);
    try {
      await ShieldModule.requestOverlayPermission();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      if (running) {
        await ShieldModule.stopShield();
      } else {
        if (!apiUrl) {
          notify('The shield needs the online check service', 'This build has no service address, so the shield cannot check your screen.');
          return;
        }
        if (Number(Platform.Version) >= 33) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        const allowed = await ShieldModule.requestScreenCapturePermission();
        if (!allowed) {
          notify('Screen capture was not allowed', 'The shield needs to see your screen to check it.');
          return;
        }
        const ok = await ShieldModule.startShield({ apiUrl, language });
        if (!ok) notify('The shield did not start', 'Allow "Display over other apps" for SafeRoute and try again.');
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      await ShieldModule.checkScreenNow();
    } catch {
      setChecking(false);
      notify('The check did not start', 'Turn the shield on and try again.');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Screen shield" onBack={() => navigation.goBack()} />
      <Card style={{ gap: 8 }}>
        <Text style={styles.title}>Your shield button</Text>
        <Text style={styles.body}>It sits on the side of your screen. Tap it on anything that looks strange and SafeRoute checks what is on screen.</Text>
      </Card>

      <AndroidNote text="The screen shield is in the SafeRoute Android app." />

      {isAndroid ? (
        <>
          <Card style={{ gap: 10 }}>
            <StatusRow label="Display over other apps" on={permission} onText="Allowed" offText="Not allowed" />
            <StatusRow label="Shield" on={running} onText="On" offText="Off" />
          </Card>
          {!permission ? <Button testID="shield-grant" label="Allow display over other apps" onPress={grant} disabled={busy} /> : null}
          {running ? <Button testID="shield-check-now" label={checking ? 'Checking your screen...' : 'Check this screen now'} onPress={checkNow} disabled={checking} /> : null}
          {isCleartext(apiUrl) ? <Text style={styles.warn}>The shield needs an https:// service address. This build uses http://, which Android blocks for the overlay.</Text> : null}
          <Button
            testID="shield-toggle"
            label={running ? 'Turn shield off' : 'Turn shield on'}
            variant={running ? 'secondary' : 'primary'}
            onPress={toggle}
            disabled={busy || (!permission && !running)}
          />
        </>
      ) : null}
    </Screen>
  );
};

const StatusRow: React.FC<{ label: string; on: boolean; onText: string; offText: string }> = ({ label, on, onText, offText }) => (
  <View style={styles.statusRow}>
    <Text style={styles.statusLabel}>{label}</Text>
    <Text style={[styles.statusValue, { color: on ? colors.safeText : colors.textMuted }]}>{on ? onText : offText}</Text>
  </View>
);

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
  warn: { color: colors.danger, fontSize: 13, lineHeight: 18, fontFamily: fonts.semiBold },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.semiBold },
  statusValue: { fontSize: 14, fontFamily: fonts.bold },
});

export default ShieldScreen;
