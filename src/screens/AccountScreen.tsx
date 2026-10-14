import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, Field, LinkButton, Notice, ScreenHeader } from '../components/ui';
import { facebookAvailable, googleAvailable } from '../services/social';
import type { RootScreenProps } from '../navigation/types';
import { authErrorMessage } from '../services/accounts';
import { useAuth } from '../state/AuthState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const AccountScreen: React.FC<RootScreenProps<'Account'>> = ({ navigation, route }) => {
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
      setError('Enter your email and password.');
      return;
    }
    run(() => (signUpMode ? signUp(email, password) : signIn(email, password))).catch(() => undefined);
  };

  const reset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    setError(null);
    try {
      await sendReset(email);
      setInfo('If that email has an account, a reset link is on its way.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  if (status.kind === 'unavailable') {
    return (
      <Screen>
        <ScreenHeader title="Account" onBack={leave} />
        <Notice tone="info" title="Accounts are not available" message="This build is not connected to the account service. SafeRoute still works fully without an account." />
      </Screen>
    );
  }

  if (status.kind === 'account') {
    return (
      <Screen>
        <ScreenHeader title="Account" onBack={leave} />
        <Card style={{ gap: 4 }}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{status.email}</Text>
        </Card>
        <Button label="Done" onPress={leave} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button testID="account-submit" label={signUpMode ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy} />}>
      <ScreenHeader title={signUpMode ? 'Create account' : 'Sign in'} onBack={leave} />
      <Text style={styles.body}>
        {signUpMode
          ? 'Your checks and trusted contacts so far stay with you and are saved to the new account.'
          : 'Sign in to get your saved checks and trusted contacts back.'}
      </Text>

      <Field
        testID="account-email"
        label="Email"
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
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={signUpMode ? 'new-password' : 'current-password'}
        textContentType={signUpMode ? 'newPassword' : 'password'}
        hint={signUpMode ? 'At least 6 characters.' : undefined}
        onSubmitEditing={submit}
      />

      {error ? <Notice testID="account-error" message={error} /> : null}
      {info ? <Notice tone="info" message={info} /> : null}

      <View style={styles.links}>
        <LinkButton
          testID="account-toggle"
          label={signUpMode ? 'I already have an account' : 'Create a new account'}
          onPress={() => {
            setMode(signUpMode ? 'signIn' : 'signUp');
            setError(null);
          }}
        />
        {!signUpMode ? <LinkButton testID="account-forgot" label="Forgot password?" onPress={reset} /> : null}
      </View>

      {googleAvailable ? (
        <Button testID="account-google" label="Continue with Google" variant="secondary" disabled={busy} onPress={() => run(google).catch(() => undefined)} />
      ) : null}
      {facebookAvailable ? (
        <Button testID="account-facebook" label="Continue with Facebook" variant="secondary" disabled={busy} onPress={() => run(facebook).catch(() => undefined)} />
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
