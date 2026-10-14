import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import { Screen } from '../components/Screen';
import { AndroidNote } from '../components/AndroidNote';
import { Button, Card, ScreenHeader } from '../components/ui';
import { notify } from '../lib/notify';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const ShieldScreen: React.FC<RootScreenProps<'Shield'>> = ({ navigation }) => {
  const isAndroid = Platform.OS === 'android';
  const [permission, setPermission] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setPermission(await ShieldModule.hasOverlayPermission());
    setRunning(await ShieldModule.isShieldRunning());
  }, []);

  useEffect(() => {
    if (isAndroid) refresh().catch(() => undefined);
  }, [isAndroid, refresh]);

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
        const ok = await ShieldModule.startShield();
        if (!ok) notify('The shield did not start', 'Allow "Display over other apps" for SafeRoute and try again.');
      }
      await refresh();
    } finally {
      setBusy(false);
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
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.semiBold },
  statusValue: { fontSize: 14, fontFamily: fonts.bold },
});

export default ShieldScreen;
