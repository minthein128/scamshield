import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { BackButton } from '../components/ui';
import type { RootScreenProps } from '../navigation/types';
import theme from '../theme/theme';
import { DemoStepper } from './learn/DemoStepper';
import { SHIELD_STEPS } from './learn/content';

const { colors, fonts } = theme;

export const ShieldHowToScreen: React.FC<RootScreenProps<'ShieldHowTo'>> = ({ navigation }) => {
  const { t } = useTranslation('learn');
  return (
    <Screen
      header={
        <View style={styles.top}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.eyebrow}>{t('shieldHowTo.eyebrow')}</Text>
        </View>
      }
    >
      <Text accessibilityRole="header" style={styles.title}>{t('shieldRow.title')}</Text>
      <DemoStepper steps={SHIELD_STEPS} onDone={() => navigation.goBack()} testID="shield-stepper" />
    </Screen>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontFamily: fonts.semiBold },
  title: { color: colors.textPrimary, fontSize: 22, lineHeight: 28, fontFamily: fonts.bold },
});

export default ShieldHowToScreen;
