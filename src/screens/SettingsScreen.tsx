import React, { useState } from 'react';
import { Linking, Switch, Text, StyleSheet, View } from 'react-native';
import { SITE_URL } from '../config/env';
import Constants from 'expo-constants';
import { Screen } from '../components/Screen';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { confirmAction, notify } from '../lib/notify';
import type { RootScreenProps } from '../navigation/types';
import { authErrorMessage } from '../services/accounts';
import { deleteAllRemote } from '../services/cloud';
import { useAppState, type SyncState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const SYNC_TEXT: Record<SyncState, string> = {
  off: '',
  syncing: 'Syncing your checks and contacts...',
  done: 'Your checks and contacts are synced.',
  error: 'Sync is paused. We will try again next time you open the app.',
};

export const PRIVACY_POINTS = [
  'Your checks are saved on this device. Signed-in accounts also sync the report text, trusted contacts and settings. Screenshots are never saved or synced.',
  'To check something, SafeRoute sends the text, link or screenshot to our check service, which uses Google AI models and Google Safe Browsing to assess it. We do not log the content.',
  'Each install gets an anonymous ID. We use it only to limit how many checks one person can run per hour.',
  'You can delete the data on this device at any time. Account holders can also delete their account and everything synced.',
];

export const SettingsScreen: React.FC<RootScreenProps<'Settings'>> = ({ navigation }) => {
  const { status, signOut, deleteAccount } = useAuth();
  const { profile, language, setLanguage, updateProfile, syncState, clearSyncedCopies, deleteLocalData } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guarded = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = () =>
    guarded(async () => {
      if (!(await confirmAction('Sign out?', 'Your checks and contacts stay in your account. This device will be cleared.', 'Sign out'))) return;
      await signOut();
      await clearSyncedCopies();
    });

  const onDeleteLocal = () =>
    guarded(async () => {
      const synced = status.kind === 'account';
      const message = synced
        ? 'This clears checks, contacts and settings on this device and signs you out. Your account and its synced copies stay until you delete the account.'
        : 'This clears your checks, trusted contacts and settings on this device.';
      if (!(await confirmAction('Delete data on this device?', message, 'Delete'))) return;
      if (synced) await signOut();
      await deleteLocalData();
    });

  const onDeleteAccount = () =>
    guarded(async () => {
      if (!(await confirmAction('Delete your account?', 'This permanently deletes your account and everything synced to it. Data on this device is cleared too.', 'Delete account'))) return;
      if (status.kind === 'account') await deleteAllRemote(status.uid);
      await deleteAccount();
      await deleteLocalData();
      notify('Account deleted', 'Your account and synced data are gone.');
    });

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <View style={{ gap: 8 }}>
        <SectionTitle>Account</SectionTitle>
        <Card style={{ gap: 10 }}>
          {status.kind === 'account' ? (
            <>
              <Text style={styles.strong}>{status.email}</Text>
              {SYNC_TEXT[syncState] ? <Text testID="sync-status" style={styles.body}>{SYNC_TEXT[syncState]}</Text> : null}
              <Button testID="settings-signout" label="Sign out" variant="secondary" onPress={onSignOut} disabled={busy} />
              <LinkButton testID="settings-delete-account" label="Delete account" color={colors.danger} onPress={onDeleteAccount} />
            </>
          ) : status.kind === 'unavailable' ? (
            <Text style={styles.body}>You are using SafeRoute without an account. Accounts are not available in this build.</Text>
          ) : (
            <>
              <Text style={styles.strong}>No account</Text>
              <Text style={styles.body}>Everything works without one. Create an account to keep your checks and contacts if you change phone, and to get a higher hourly check limit.</Text>
              <Button testID="settings-signup" label="Create account" onPress={() => navigation.navigate('Account', { mode: 'signUp' })} />
              <LinkButton label="Sign in" onPress={() => navigation.navigate('Account', { mode: 'signIn' })} />
            </>
          )}
          {error ? <Notice message={error} /> : null}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Language</SectionTitle>
        <View style={styles.wrap}>
          {LANGUAGES.map(l => (
            <Chip key={l.code} label={l.label} nativeLabel={l.nativeLabel} selected={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>My country</SectionTitle>
        <View style={styles.wrap}>
          {COUNTRIES.map(c => (
            <Chip
              key={c.code}
              label={c.name}
              selected={profile.homeCountry === c.code}
              onPress={() => updateProfile({ homeCountry: profile.homeCountry === c.code ? undefined : c.code })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Where I will work or travel</SectionTitle>
        <View style={styles.wrap}>
          {COUNTRIES.map(c => (
            <Chip
              key={c.code}
              label={c.name}
              selected={profile.destinationCountry === c.code}
              onPress={() => updateProfile({ destinationCountry: profile.destinationCountry === c.code ? undefined : c.code })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>Privacy</SectionTitle>
        <Card style={{ gap: 8 }}>
          <View style={styles.switchRow}>
            <Text style={[styles.strong, { flex: 1 }]}>Help others: share anonymous scam patterns</Text>
            <Switch
              testID="settings-share-signals"
              accessibilityLabel="Help others: share anonymous scam patterns"
              value={profile.shareSignals}
              onValueChange={v => updateProfile({ shareSignals: v })}
              trackColor={{ false: colors.borderLight, true: colors.accent }}
              thumbColor={colors.white}
              {...({ activeThumbColor: colors.white } as object)}
            />
          </View>
          <Text style={styles.body}>No screenshots and no raw text are shared. Personal details are removed first, and phone numbers, accounts and links are stored only as one-way hashes. Patterns appear on the Scam radar once several people report them.</Text>
          {PRIVACY_POINTS.map(p => (
            <Text key={p} style={styles.body}>{p}</Text>
          ))}
        </Card>
        <LinkButton testID="settings-privacy-policy" label="Privacy policy" onPress={() => Linking.openURL(`${SITE_URL}/privacy`).catch(() => undefined)} />
        <LinkButton testID="settings-delete-info" label="How to delete your data" onPress={() => Linking.openURL(`${SITE_URL}/delete-account`).catch(() => undefined)} />
        <Button testID="settings-delete-local" label="Delete data on this device" variant="secondary" onPress={onDeleteLocal} disabled={busy} />
      </View>

      <Text style={styles.version}>{`SafeRoute ${Constants.expoConfig?.version ?? ''}`.trim()}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  strong: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', fontFamily: fonts.regular },
});

export default SettingsScreen;
