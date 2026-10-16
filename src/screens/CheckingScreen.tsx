import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import DollLoader from '../components/DollLoader';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { Verdict } from '../api/types';
import { Button, LinkButton } from '../components/ui';
import { useAuth } from '../state/AuthState';
import { errorCopy, getApiClient } from '../api';
import type { ErrorCopy } from '../api/errors';
import { ApiError } from '../api/errors';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const STEPS = ['read', 'pick', 'spot', 'links', 'score', 'write'] as const;
const STEP_MS = 900;

export const CheckingScreen: React.FC<RootScreenProps<'Checking'>> = ({ navigation, route }) => {
  const { t } = useTranslation('checking');
  const { request, source, reported } = route.params;
  const { saveCheck } = useAppState();
  const [step, setStep] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const reduceMotion = useReduceMotion();
  const { status } = useAuth();
  const [error, setError] = useState<(ErrorCopy & { code?: string }) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setStep(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await getApiClient().check(request, { signal: controller.signal });
      await saveCheck(result, request.language, source);
      setVerdict(result.verdict);
      if (!reduceMotion) await new Promise(resolve => setTimeout(resolve, 1100));
      if (controller.signal.aborted) return;
      navigation.replace('Report', { result, language: request.language, fresh: true, ...(reported ? { reported } : {}) });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'cancelled') return;
      setError({ ...errorCopy(e), code: e instanceof ApiError ? e.code : undefined });
    }
  }, [navigation, request, saveCheck, source, reported, reduceMotion]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  useEffect(() => {
    if (error) return;
    const timer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [error]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        {error ? (
          <View style={styles.errorBox}>
            <Text accessibilityRole="header" style={styles.errorTitle}>{error.title}</Text>
            <Text testID="checking-error" style={styles.errorText}>{error.message}</Text>
            {error.code === 'rate_limited' && status.kind === 'anonymous' ? (
              <LinkButton label={t('createAccount')} color={colors.brandGold} onPress={() => navigation.replace('Account', { mode: 'signUp' })} />
            ) : null}
          </View>
        ) : (
          <View style={styles.loader}>
            <DollLoader step={step} verdict={verdict} label={t('title')} />
            <Text accessibilityRole="header" style={styles.title}>{verdict ? t(`verdict.${verdict}`) : t('title')}</Text>
            <Text testID="checking-stage" accessibilityLiveRegion="polite" style={styles.stage}>{verdict ? ' ' : t(`steps.${STEPS[step]}`)}</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {error ? <Button testID="checking-retry" label={t('retry')} onPress={run} /> : null}
        <Button label={error ? t('goBack') : t('cancel')} variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepDarkBackground },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loader: { alignItems: 'center', gap: 8 },
  title: { color: colors.white, fontSize: 22, lineHeight: 30, fontFamily: fonts.bold },
  stage: { color: colors.textLight, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, textAlign: 'center', minHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  errorBox: { gap: 8, alignItems: 'center' },
  errorTitle: { color: colors.white, fontSize: 22, lineHeight: 30, fontFamily: fonts.extraBold, textAlign: 'center' },
  errorText: { color: colors.textLighter, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, textAlign: 'center' },
});

export default CheckingScreen;
