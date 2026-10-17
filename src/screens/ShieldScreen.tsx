import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ShieldModule from 'shield-module';
import { Screen } from '../components/Screen';
import { QuickSettingsTileCard } from '../components/QuickSettingsTileCard';
import { VoiceCompanionCard } from '../components/VoiceCompanionCard';
import { ShieldCardView } from '../components/ShieldCard';
import { Text } from '../components/Text';
import { Button, Card, ScreenHeader } from '../components/ui';
import { useShieldControl } from '../hooks/useShieldControl';
import { toCheckResponse } from '../lib/shield';
import { useAppState } from '../state/AppState';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';

const { colors, fonts } = theme;

const STEPS = ['overlay', 'notifications', 'capture'] as const;

export const ShieldScreen: React.FC<RootScreenProps<'Shield'>> = ({ navigation }) => {
  const { t } = useTranslation('shield');
  const control = useShieldControl();
  const [checking, setChecking] = useState(false);
  const { language } = useAppState();

  useEffect(() => {
    if (control.support !== 'ready') return;
    const sub = ShieldModule.addShieldResultListener(r => {
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
    <Screen header={<ScreenHeader title={t('title')} onBack={() => navigation.goBack()} />}>
      <ShieldCardView control={control} />
      <VoiceCompanionCard />
      {control.support === 'ready' ? <QuickSettingsTileCard /> : null}
      <Card style={{ gap: 8 }}>
        <Text style={styles.title}>{t('needs.title')}</Text>
        {STEPS.map((step, i) => (
          <Text key={step} style={styles.body}>{`${i + 1}. ${t(`needs.${step}`)}`}</Text>
        ))}
        <Text style={styles.body}>{t('needs.privacy')}</Text>
      </Card>
      {control.running ? (
        <Button testID="shield-check-now" label={checking ? t('checkingNow') : t('checkNow')} onPress={checkNow} disabled={checking} />
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.regular },
});

export default ShieldScreen;
