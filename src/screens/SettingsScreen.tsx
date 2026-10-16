import { appName } from '../config/brand';
import React, { useState } from 'react';
import { Linking, Switch, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SITE_URL } from '../config/env';
import Constants from 'expo-constants';
import { ConnectionCard } from '../components/ConnectionCard';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Button, Card, Chip, LinkButton, Notice, ScreenHeader, SectionTitle } from '../components/ui';
import { COUNTRIES, countryLabel, type CountryCode } from '../lib/countries';
import { Select } from '../components/Select';
import { UI_LANGUAGES } from '../i18n/languages';
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

const NONE = 'none';

export const PRIVACY_POINTS = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4', 'privacy.p5'] as const;

export const SettingsScreen: React.FC<RootScreenProps<'Settings'>> = ({ navigation }) => {
  const { t } = useTranslation(['settings', 'common', 'shield']);
  const { status, signOut, deleteAccount } = useAuth();
  const { profile, language, setLanguage, updateProfile, setKeepHistory, syncState, clearSyncedCopies, deleteLocalData } = useAppState();
  const countryOptions: { value: CountryCode | typeof NONE; label: string }[] = [{ value: NONE, label: t('notSet') }, ...COUNTRIES.map(c => ({ value: c.code, label: countryLabel(c.code) }))];
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

  const onKeepHistory = (keep: boolean) =>
    guarded(async () => {
      if (!keep) {
        const message = status.kind === 'account' ? t('confirm.historyOff.messageSynced') : t('confirm.historyOff.message');
        if (!(await confirmAction(t('confirm.historyOff.title'), message, t('confirm.historyOff.action')))) return;
      }
      await setKeepHistory(keep);
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
    <Screen header={<ScreenHeader title={t('title')} onBack={() => navigation.goBack()} />}>

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

      <TouchableOpacity testID="settings-shield" accessibilityRole="button" accessibilityLabel={`${t('shield:title')}. ${t('shield:details')}`} activeOpacity={0.7} onPress={() => navigation.navigate('Shield')} style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.strong}>{t('shield:title')}</Text>
          <Text style={styles.body}>{t('shield:details')}</Text>
        </View>
        <Icon name="chevron" size={22} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('language.title')}</SectionTitle>
        <Text style={styles.body}>{t('language.body')}</Text>
        <View style={styles.wrap} testID="settings-language">
          {UI_LANGUAGES.map(l => (
            <Chip key={l.code} testID={`language-${l.code}`} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <Select
          testID="settings-home-country"
          label={t('myCountry')}
          value={profile.homeCountry ?? NONE}
          options={countryOptions}
          onChange={v => updateProfile({ homeCountry: v === NONE ? undefined : v })}
        />
        <Select
          testID="settings-destination-country"
          label={t('destination')}
          value={profile.destinationCountry ?? NONE}
          options={countryOptions}
          onChange={v => updateProfile({ destinationCountry: v === NONE ? undefined : v })}
        />
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
              onValueChange={v => updateProfile({ shareSignals: v, sharingAsked: true })}
              trackColor={{ false: colors.borderLight, true: colors.accent }}
              thumbColor={colors.white}
              {...({ activeThumbColor: colors.white } as object)}
            />
          </View>
          <Text style={styles.body}>{t('privacy.shareBody')}</Text>
          <View style={styles.switchRow}>
            <Text style={[styles.strong, { flex: 1 }]}>{t('privacy.history')}</Text>
            <Switch
              testID="settings-keep-history"
              accessibilityLabel={t('privacy.history')}
              value={profile.keepHistory}
              onValueChange={onKeepHistory}
              disabled={busy}
              trackColor={{ false: colors.borderLight, true: colors.accent }}
              thumbColor={colors.white}
              {...({ activeThumbColor: colors.white } as object)}
            />
          </View>
          <Text style={styles.body}>{t('privacy.historyBody')}</Text>
          {PRIVACY_POINTS.map(p => (
            <Text key={p} style={styles.body}>{t(p)}</Text>
          ))}
        </Card>
        <LinkButton testID="settings-privacy-policy" label={t('privacy.policy')} onPress={() => Linking.openURL(`${SITE_URL}/privacy`).catch(() => undefined)} />
        <LinkButton testID="settings-delete-info" label={t('privacy.deleteInfo')} onPress={() => Linking.openURL(`${SITE_URL}/delete-account`).catch(() => undefined)} />
        <Button testID="settings-delete-local" label={t('privacy.deleteLocal')} variant="secondary" onPress={onDeleteLocal} disabled={busy} />
      </View>

      <View style={{ gap: 8 }}>
        <SectionTitle>{t('connection.title')}</SectionTitle>
        <ConnectionCard onOpenLog={() => navigation.navigate('Diagnostics')} />
      </View>

      <Text style={styles.version}>{`${appName()} ${Constants.expoConfig?.version ?? ''}`.trim()}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  strong: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', fontFamily: fonts.regular },
});

export default SettingsScreen;
