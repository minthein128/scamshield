import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button, Card, Field, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { facebookAvailable, googleAvailable } from '../services/social';
import type { RootScreenProps } from '../navigation/types';
import { authErrorMessage } from '../services/accounts';
import { useAuth } from '../state/AuthState';
import { useLayout } from '../hooks/useLayout';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

export const AccountScreen: React.FC<RootScreenProps<'Account'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['account', 'common']);
  const tablet = useLayout().isTablet;
  const { status, signUp, signIn, google, facebook, sendReset } = useAuth();
  const [mode, setMode] = useState<'signUp' | 'signIn'>(route.params?.mode ?? 'signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const leave = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'));
  const signUpMode = mode === 'signUp';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      leave();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!email.trim() || !password) {
      setError(t('errors.missing'));
      return;
    }
    run(() => (signUpMode ? signUp(email, password) : signIn(email, password))).catch(() => undefined);
  };

  const reset = async () => {
    if (!email.trim()) {
      setError(t('errors.resetNeedsEmail'));
      return;
    }
    setError(null);
    try {
      await sendReset(email);
      setInfo(t('resetSent'));
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  if (status.kind === 'unavailable') {
    return (
      <Screen>
        <ScreenHeader title={t('title')} onBack={leave} />
        <Notice tone="info" title={t('unavailable.title')} message={t('unavailable.body')} />
      </Screen>
    );
  }

  if (status.kind === 'account') {
    return (
      <Screen>
        <ScreenHeader title={t('title')} onBack={leave} />
        <Card style={{ gap: 4 }}>
          <Text style={styles.label}>{t('signedInAs')}</Text>
          <Text style={styles.value}>{status.email}</Text>
        </Card>
        <Button label={t('common:actions.done')} onPress={leave} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button testID="account-submit" label={signUpMode ? t('createTitle') : t('signInTitle')} onPress={submit} disabled={busy} />}>
      <ScreenHeader title={signUpMode ? t('createTitle') : t('signInTitle')} onBack={leave} />
      <Text style={[styles.body, readable(tablet, 14, 20)]}>
        {signUpMode ? t('introSignUp') : t('introSignIn')}
      </Text>

      <Field
        testID="account-email"
        label={t('email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Field
        testID="account-password"
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={signUpMode ? 'new-password' : 'current-password'}
        textContentType={signUpMode ? 'newPassword' : 'password'}
        hint={signUpMode ? t('passwordHint') : undefined}
        onSubmitEditing={submit}
      />

      {error ? <Notice testID="account-error" message={error} /> : null}
      {info ? <Notice tone="info" message={info} /> : null}

      <View style={styles.links}>
        <LinkButton
          testID="account-toggle"
          label={signUpMode ? t('haveAccount') : t('createNew')}
          onPress={() => {
            setMode(signUpMode ? 'signIn' : 'signUp');
            setError(null);
          }}
        />
        {!signUpMode ? <LinkButton testID="account-forgot" label={t('forgot')} onPress={reset} /> : null}
      </View>

      {googleAvailable ? (
        <Button testID="account-google" label={t('google')} variant="secondary" disabled={busy} onPress={() => run(google).catch(() => undefined)} />
      ) : null}
      {facebookAvailable ? (
        <Button testID="account-facebook" label={t('facebook')} variant="secondary" disabled={busy} onPress={() => run(facebook).catch(() => undefined)} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  label: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.regular },
  value: { color: colors.textPrimary, fontSize: 16, fontFamily: fonts.bold },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
});

export default AccountScreen;
