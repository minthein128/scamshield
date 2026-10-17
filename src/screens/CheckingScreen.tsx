import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import DollLoader from '../components/DollLoader';
import { CrossfadeText } from '../components/CrossfadeText';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { CheckResponse, CheckUpdate, Verdict } from '../api/types';
import { advance, FINISHED, stageKey, START, UNSTAGED, type CheckProgress } from '../lib/checkProgress';
import { forHistory, resultWord } from '../lib/attention';
import { diag, errorCode } from '../lib/diagLog';
import { Button, LinkButton } from '../components/ui';
import { useAuth } from '../state/AuthState';
import { errorCopy, getApiClient } from '../api';
import type { ErrorCopy } from '../api/errors';
import { ApiError } from '../api/errors';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const HOLD_SAFE_MS = 1500;
const HOLD_RISK_MS = 3600;

export const CheckingScreen: React.FC<RootScreenProps<'Checking'>> = ({ navigation, route }) => {
  const { t } = useTranslation(['checking', 'common', 'errors']);
  const { request, job, source, reported } = route.params;
  const language = job ? job.request.language : (request?.language ?? 'en');
  const { saveCheck } = useAppState();
  const [progress, setProgress] = useState<CheckProgress>(UNSTAGED);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const reduceMotion = useReduceMotion();
  const { status } = useAuth();
  const [error, setError] = useState<(ErrorCopy & { code?: string }) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedRef = useRef(false);
  const [result, setResult] = useState<CheckResponse | null>(null);

  const openReport = useCallback(
    (checked: CheckResponse) => {
      if (openedRef.current) return;
      openedRef.current = true;
      if (holdRef.current) clearTimeout(holdRef.current);
      navigation.replace('Report', { result: checked, language, fresh: true, ...(reported ? { reported } : {}) });
    },
    [navigation, language, reported],
  );

  const run = useCallback(async () => {
    setError(null);
    setProgress(UNSTAGED);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const client = getApiClient();
      if (job?.phase === 'extract') {
        const extraction = await client.extractJob(job.request, { signal: controller.signal });
        if (controller.signal.aborted || openedRef.current) return;
        openedRef.current = true;
        navigation.replace('JobFacts', { extraction, extractRequest: job.request, source });
        return;
      }
      let checked: CheckResponse;
      if (job) {
        checked = await client.assessJob(job.request, { signal: controller.signal });
      } else {
        let resolveFinal: (r: CheckResponse) => void = () => undefined;
        const final = new Promise<CheckResponse>(resolve => (resolveFinal = resolve));
        const onUpdate = (u: CheckUpdate) => {
          if (controller.signal.aborted) return;
          if (u.type === 'final') return resolveFinal(u.response);
          setProgress(p => advance(u.type === 'stage' && p === UNSTAGED ? START : p, u));
        };
        checked = await Promise.race([client.check(request as NonNullable<typeof request>, { signal: controller.signal, onUpdate }), final]);
      }
      await saveCheck(forHistory(checked), language, source);
      setProgress(FINISHED);
      setResult(checked);
      setVerdict(checked.verdict);
      if (!reduceMotion) await new Promise(resolve => (holdRef.current = setTimeout(resolve, checked.verdict === 'safe' ? HOLD_SAFE_MS : HOLD_RISK_MS)));
      if (controller.signal.aborted) return;
      openReport(checked);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'cancelled') return;
      const code = e instanceof ApiError ? e.code : undefined;
      const unreadable = job?.phase === 'extract' && (code === 'upstream' || code === 'invalid_response');
      if (job) diag.error('jobShield', job.phase === 'extract' ? 'extract_failed' : 'assess_failed', { code: code ?? errorCode(e), unreadable });
      setError({ ...(unreadable ? { title: t('errors:job.unreadable.title'), message: t('errors:job.unreadable.message') } : errorCopy(e)), code });
    }
  }, [openReport, request, job, language, navigation, saveCheck, source, reduceMotion, t]);

  useEffect(() => {
    run();
    return () => {
      abortRef.current?.abort();
      if (holdRef.current) clearTimeout(holdRef.current);
    };
  }, [run]);

  const word = result ? resultWord(result) : t('title');
  const reassure = verdict === 'careful' || verdict === 'danger' ? t(`reassure.${verdict}`) : null;
  const stage = job ? (job.phase === 'extract' ? 'read' : 'links') : stageKey(progress);

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
            <DollLoader floor={progress.floor} ceiling={progress.ceiling} verdict={verdict} label={word} markIcon={result?.attention === 'lower' ? 'info' : undefined} />
            <View style={styles.head}>
              <CrossfadeText testID="checking-verdict" accessibilityRole="header" accessibilityLiveRegion="polite" style={verdict ? styles.verdict : styles.title} text={word} rise={10} />
            </View>
            <View style={styles.under}>
              <CrossfadeText
                testID={verdict ? 'checking-reassure' : 'checking-stage'}
                accessibilityLiveRegion="polite"
                style={verdict ? styles.reassure : styles.stage}
                text={verdict ? (reassure ?? '') : t(`steps.${stage}`)}
              />
            </View>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {error ? <Button testID="checking-retry" label={t('retry')} onPress={run} /> : null}
        {result ? (
          <Button testID="checking-see-why" label={t('seeWhy')} variant="secondary" onPress={() => openReport(result)} />
        ) : (
          <Button label={error ? t('goBack') : t('cancel')} variant="secondary" onPress={() => navigation.goBack()} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepDarkBackground },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loader: { alignItems: 'center', gap: 10 },
  title: { color: colors.white, fontSize: 22, lineHeight: 30, fontFamily: fonts.bold },
  verdict: { color: colors.white, fontSize: 36, lineHeight: 46, fontFamily: fonts.extraBold, letterSpacing: -0.3, textAlign: 'center' },
  reassure: { color: colors.textLighter, fontSize: 17, lineHeight: 26, fontFamily: fonts.medium, textAlign: 'center', maxWidth: 320, marginTop: 4 },
  head: { minHeight: 46, justifyContent: 'center' },
  under: { minHeight: 80, alignItems: 'center' },
  stage: { color: colors.textLight, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, textAlign: 'center', minHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  errorBox: { gap: 8, alignItems: 'center' },
  errorTitle: { color: colors.white, fontSize: 22, lineHeight: 30, fontFamily: fonts.extraBold, textAlign: 'center' },
  errorText: { color: colors.textLighter, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, textAlign: 'center' },
});

export default CheckingScreen;
