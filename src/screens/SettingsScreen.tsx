import React, { useState } from 'react';
import { Linking, Switch, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SITE_URL } from '../config/env';
import Constants from 'expo-constants';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { COUNTRIES, countryLabel } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { UI_LANGUAGES, type UiLanguage } from '../i18n/languages';
import { useUiLanguage } from '../i18n/useUiLanguage';
import { confirmAction, notify } from '../lib/notify';
import type { RootScreenProps } from '../navigation/types';
import { authErrorMessage } from '../services/accounts';
import { deleteAllRemote } from '../services/cloud';
import { useAppState, type SyncState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const SYNC_KEYS: Record<SyncState, 'sync.syncing' | 'sync.done' | 'sync.error' | null> = {
  off: null,
  syncing: 'sync.syncing',
  done: 'sync.done',
  error: 'sync.error',
};

export const PRIVACY_POINTS = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4'] as const;

export const SettingsScreen: React.FC<RootScreenProps<'Settings'>> = ({ navigation }) => {
  const { t } = useTranslation(['settings', 'common']);
  const { uiLanguage, setUiLanguage, checkLanguageFor } = useUiLanguage();
  const { status, signOut, deleteAccount } = useAuth();
  const { profile, language, setLanguage, updateProfile, syncState, clearSyncedCopies, deleteLocalData } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseAppLanguage = (code: UiLanguage) => {
    setUiLanguage(code).catch(() => undefined);
    setLanguage(checkLanguageFor(code));
  };

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
      if (!(await confirmAction(t('confirm.signOut.title'), t('confirm.signOut.message'), t('confirm.signOut.action')))) return;
      await signOut();
      await clearSyncedCopies();
    });

  const onDeleteLocal = () =>
    guarded(async () => {
      const synced = status.kind === 'account';
      const message = synced ? t('confirm.deleteLocal.messageSynced') : t('confirm.deleteLocal.messageLocal');
      if (!(await confirmAction(t('confirm.deleteLocal.title'), message, t('confirm.deleteLocal.action')))) return;
      if (synced) await signOut();
      await deleteLocalData();
    });

  const onDeleteAccount = () =>
    guarded(async () => {
      if (!(await confirmAction(t('confirm.deleteAccount.title'), t('confirm.deleteAccount.message'), t('confirm.deleteAccount.action')))) return;
      if (status.kind === 'account') await deleteAllRemote(status.uid);
      await deleteAccount();
      await deleteLocalData();
      notify(t('deleted.title'), t('deleted.message'));
    });

  return (
    <Screen>
      <ScreenHeader title={t('title')} onBack={() => navigation.goBack()} />

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('account.title')}</SectionTitle>
        <Card style={{ gap: 10 }}>
          {status.kind === 'account' ? (
            <>
              <Text style={styles.strong}>{status.email}</Text>
              {SYNC_KEYS[syncState] ? <Text testID="sync-status" style={styles.body}>{t(SYNC_KEYS[syncState] as NonNullable<(typeof SYNC_KEYS)[SyncState]>)}</Text> : null}
              <Button testID="settings-signout" label={t('account.signOut')} variant="secondary" onPress={onSignOut} disabled={busy} />
              <LinkButton testID="settings-delete-account" label={t('account.deleteAccount')} color={colors.danger} onPress={onDeleteAccount} />
            </>
          ) : status.kind === 'unavailable' ? (
            <Text style={styles.body}>{t('account.unavailable')}</Text>
          ) : (
            <>
              <Text style={styles.strong}>{t('account.none')}</Text>
              <Text style={styles.body}>{t('account.noneBody')}</Text>
              <Button testID="settings-signup" label={t('account.create')} onPress={() => navigation.navigate('Account', { mode: 'signUp' })} />
              <LinkButton label={t('account.signIn')} onPress={() => navigation.navigate('Account', { mode: 'signIn' })} />
            </>
          )}
          {error ? <Notice message={error} /> : null}
        </Card>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('appLanguage.title')}</SectionTitle>
        <Text style={styles.body}>{t('appLanguage.body')}</Text>
        <View style={styles.wrap} testID="settings-app-language">
          {UI_LANGUAGES.map(l => (
            <Chip key={l.code} testID={`app-language-${l.code}`} label={l.label} nativeLabel={l.nativeLabel} selected={uiLanguage === l.code} onPress={() => chooseAppLanguage(l.code)} />
          ))}
        </View>
        {uiLanguage === 'th' ? <Text style={styles.body}>{t('common:languageNote.reportsInEnglish')}</Text> : null}
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('reportLanguage')}</SectionTitle>
        <View style={styles.wrap}>
          {LANGUAGES.map(l => (
            <Chip key={l.code} label={l.label} nativeLabel={l.nativeLabel} selected={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('myCountry')}</SectionTitle>
        <View style={styles.wrap}>
          {COUNTRIES.map(c => (
            <Chip
              key={c.code}
              label={countryLabel(c.code)}
              selected={profile.homeCountry === c.code}
              onPress={() => updateProfile({ homeCountry: profile.homeCountry === c.code ? undefined : c.code })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('destination')}</SectionTitle>
        <View style={styles.wrap}>
          {COUNTRIES.map(c => (
            <Chip
              key={c.code}
              label={countryLabel(c.code)}
              selected={profile.destinationCountry === c.code}
              onPress={() => updateProfile({ destinationCountry: profile.destinationCountry === c.code ? undefined : c.code })}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('privacy.title')}</SectionTitle>
        <Card style={{ gap: 8 }}>
          <View style={styles.switchRow}>
            <Text style={[styles.strong, { flex: 1 }]}>{t('privacy.share')}</Text>
            <Switch
              testID="settings-share-signals"
              accessibilityLabel={t('privacy.share')}
              value={profile.shareSignals}
              onValueChange={v => updateProfile({ shareSignals: v })}
              trackColor={{ false: colors.borderLight, true: colors.accent }}
              thumbColor={colors.white}
              {...({ activeThumbColor: colors.white } as object)}
            />
          </View>
          <Text style={styles.body}>{t('privacy.shareBody')}</Text>
          {PRIVACY_POINTS.map(p => (
            <Text key={p} style={styles.body}>{t(p)}</Text>
          ))}
        </Card>
        <LinkButton testID="settings-privacy-policy" label={t('privacy.policy')} onPress={() => Linking.openURL(`${SITE_URL}/privacy`).catch(() => undefined)} />
        <LinkButton testID="settings-delete-info" label={t('privacy.deleteInfo')} onPress={() => Linking.openURL(`${SITE_URL}/delete-account`).catch(() => undefined)} />
        <Button testID="settings-delete-local" label={t('privacy.deleteLocal')} variant="secondary" onPress={onDeleteLocal} disabled={busy} />
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
