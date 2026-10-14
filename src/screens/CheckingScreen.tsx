import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScanProgress from '../components/ScanProgress';
import { Button } from '../components/ui';
import { getApiClient, userMessage } from '../api';
import { ApiError } from '../api/errors';
import type { RootScreenProps } from '../navigation/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const STEPS = [
  'Reading what you sent',
  'Picking out names, numbers and links',
  'Spotting red flags',
  'Checking the links and the company',
  'Scoring the risk',
  'Writing your warning',
];
const STEP_MS = 900;

export const CheckingScreen: React.FC<RootScreenProps<'Checking'>> = ({ navigation, route }) => {
  const { request, source } = route.params;
  const { saveCheck } = useAppState();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setStep(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await getApiClient().check(request, { signal: controller.signal });
      await saveCheck(result, request.language, source);
      navigation.replace('Report', { result, language: request.language, fresh: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'cancelled') return;
      setError(userMessage(e));
    }
  }, [navigation, request, saveCheck, source]);

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
            <Text style={styles.errorTitle}>The check did not finish</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScanProgress steps={STEPS} step={step} title="Checking..." />
        )}
      </View>
      <View style={styles.footer}>
        {error ? <Button testID="checking-retry" label="Try again" onPress={run} /> : null}
        <Button label={error ? 'Go back' : 'Cancel'} variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.deepDarkBackground },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  errorBox: { gap: 8, alignItems: 'center' },
  errorTitle: { color: colors.white, fontSize: 22, lineHeight: 30, fontFamily: fonts.extraBold, textAlign: 'center' },
  errorText: { color: colors.textLighter, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, textAlign: 'center' },
});

export default CheckingScreen;
