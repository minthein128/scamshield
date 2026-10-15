import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as ShieldModule from 'shield-module';
import { Screen } from '../components/Screen';
import { MessageGuardCard } from '../components/MessageGuardCard';
import { VoiceCompanionCard } from '../components/VoiceCompanionCard';
import { ShieldCardView } from '../components/ShieldCard';
import { Button, Card, ScreenHeader } from '../components/ui';
import { useShieldControl } from '../hooks/useShieldControl';
import { toCheckResponse } from '../lib/shield';
import { useAppState } from '../state/AppState';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const STEPS = [
  'Allow "Display over other apps" so the button can float over other apps.',
  'Allow notifications so Android keeps the shield running.',
  'Allow screen capture. SafeRoute only looks at your screen when you tap the button.',
];

export const ShieldScreen: React.FC<RootScreenProps<'Shield'>> = ({ navigation }) => {
  const control = useShieldControl();
  const [checking, setChecking] = useState(false);
  const { language } = useAppState();

  useEffect(() => {
    if (control.support !== 'ready') return;
    const sub = ShieldModule.addShieldResultListener(r => {
      if (r.kind === 'message') return;
      setChecking(false);
      navigation.navigate('Report', { result: toCheckResponse(r), language, fresh: true });
    });
    return () => sub.remove();
  }, [control.support, language, navigation]);

  const checkNow = async () => {
    setChecking(true);
    if (!(await control.checkNow())) setChecking(false);
  };

  return (
    <Screen>
      <ScreenHeader title="Screen shield" onBack={() => navigation.goBack()} />
      <ShieldCardView control={control} />
      <VoiceCompanionCard />
      <MessageGuardCard />
      <Card style={{ gap: 8 }}>
        <Text style={styles.title}>What the shield needs</Text>
        {STEPS.map((s, i) => (
          <Text key={s} style={styles.body}>{`${i + 1}. ${s}`}</Text>
        ))}
        <Text style={styles.body}>The screenshot goes to the check service only to be checked. It is not saved.</Text>
      </Card>
      {control.running ? (
        <Button testID="shield-check-now" label={checking ? 'Checking your screen...' : 'Check this screen now'} onPress={checkNow} disabled={checking} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
});

export default ShieldScreen;
