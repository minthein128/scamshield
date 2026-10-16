import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApiUrl } from '../config/runtime';
import { BrandLockup } from '../components/BrandMark';
import { Screen } from '../components/Screen';
import { MessageGuardCard } from '../components/MessageGuardCard';
import { Text } from '../components/Text';
import { ShieldCard } from '../components/ShieldCard';
import { Button, Chip, LinkButton } from '../components/ui';
import { shieldSupport } from '../hooks/useShieldControl';
import { COUNTRIES, countryLabel, type CountryCode } from '../lib/countries';
import { UI_LANGUAGES, type UiLanguage } from '../i18n/languages';
import { useUiLanguage } from '../i18n/useUiLanguage';
import { HELP_POINTS, SHARING_POINTS, onboardingSteps, type AfterOnboarding, type StepId } from '../lib/onboarding';
import { useAppState } from '../state/AppState';
import { useLayout } from '../hooks/useLayout';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

export const OnboardingScreen: React.FC<{ onDone: (next?: AfterOnboarding) => void }> = ({ onDone }) => {
  const { t } = useTranslation(['onboarding', 'common']);
  const tablet = useLayout().isTablet;
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const { profile, finishOnboarding } = useAppState();
  const shieldReady = shieldSupport(Platform.OS, useApiUrl()) === 'ready';
  const steps: StepId[] = profile.onboarded ? ['sharing'] : onboardingSteps(shieldReady);
  const [index, setIndex] = useState(0);
  const [share, setShare] = useState(false);
  const [home, setHome] = useState<CountryCode | undefined>(profile.homeCountry);
  const [destination, setDestination] = useState<CountryCode | undefined>(profile.destinationCountry);
  const step = steps[index];

  const chooseLanguage = (code: UiLanguage) => {
    setUiLanguage(code).catch(() => undefined);
  };

  const finish = (next?: AfterOnboarding, shareSignals = share) => {
    finishOnboarding({ homeCountry: home, destinationCountry: destination, shareSignals, sharingAsked: true });
    onDone(next);
  };

  const answerSharing = (yes: boolean) => {
    setShare(yes);
    if (index + 1 < steps.length) setIndex(index + 1);
    else finish(undefined, yes);
  };

  return (
    <Screen
      footer={
        step === 'account' ? (
          <>
            <Button testID="onboarding-anonymous" label={t('account.anonymous')} onPress={() => finish()} />
            <Button testID="onboarding-signup" label={t('account.signUp')} variant="secondary" onPress={() => finish('signUp')} />
            <LinkButton testID="onboarding-signin" label={t('account.signIn')} onPress={() => finish('signIn')} />
          </>
) : step === 'sharing' ? (
          <View style={styles.choiceRow}>
            <Button testID="onboarding-share-yes" label={t('sharing.yes')} variant="secondary" style={styles.choice} onPress={() => answerSharing(true)} />
            <Button testID="onboarding-share-no" label={t('sharing.no')} variant="secondary" style={styles.choice} onPress={() => answerSharing(false)} />
          </View>
        ) : (
          <Button testID="onboarding-next" label={step === 'shield' ? t('common:actions.continue') : t('common:actions.next')} onPress={() => setIndex(index + 1)} />
        )
      }
    >
      <View style={styles.top}>
        <View style={styles.dots} accessibilityLabel={t('step', { current: index + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        {step !== 'account' && step !== 'sharing' ? (
          <TouchableOpacity testID="onboarding-skip" accessibilityRole="button" accessibilityLabel={t('skipA11y')} onPress={() => finish()} style={styles.skip}>
            <Text style={styles.skipText}>{t('common:actions.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {step === 'language' ? (
        <>
          <BrandLockup size={40} />
          <Heading title={t('language.title')} body={t('language.body')} />
          <Text testID="onboarding-age" style={styles.body}>{t('language.age')}</Text>
          <View style={styles.wrap}>
            {UI_LANGUAGES.map(l => (
              <Chip key={l.code} testID={`onboarding-language-${l.code}`} label={l.label} selected={uiLanguage === l.code} onPress={() => chooseLanguage(l.code)} />
            ))}
          </View>
        </>
      ) : null}

      {step === 'countries' ? (
        <>
          <Heading title={t('countries.fromTitle')} body={t('countries.fromBody')} />
          <View style={styles.wrap}>
            {COUNTRIES.map(c => (
              <Chip key={c.code} label={countryLabel(c.code)} selected={home === c.code} onPress={() => setHome(home === c.code ? undefined : c.code)} />
            ))}
          </View>
          <Heading title={t('countries.toTitle')} body={t('countries.toBody')} small />
          <View style={styles.wrap}>
            {COUNTRIES.map(c => (
              <Chip key={c.code} label={countryLabel(c.code)} selected={destination === c.code} onPress={() => setDestination(destination === c.code ? undefined : c.code)} />
            ))}
          </View>
        </>
      ) : null}

      {step === 'how' ? (
        <>
          <Heading title={t('how.title')} body={t('how.body')} />
          {HELP_POINTS.map((p, i) => (
            <View key={p} style={styles.point}>
              <View style={styles.pointNumber}>
                <Text style={styles.pointNumberText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pointTitle, readable(tablet, 15, 21)]}>{t(`how.${p}.title`)}</Text>
                <Text style={[styles.pointBody, readable(tablet, 14, 20)]}>{t(`how.${p}.body`)}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {step === 'shield' ? (
        <>
          <Heading title={t('shield.title')} body={t('shield.body')} />
          <ShieldCard />
          <MessageGuardCard />
        </>
      ) : null}

      {step === 'sharing' ? (
        <>
          <Heading title={t('sharing.title')} body={t('sharing.body')} />
          <View style={[styles.accountNote, { gap: 8 }]}>
            {SHARING_POINTS.map(p => (
              <Text key={p} style={styles.pointBody}>{`\u2022 ${t(`sharing.${p}`)}`}</Text>
            ))}
          </View>
          <Text style={styles.body}>{t('sharing.note')}</Text>
        </>
      ) : null}

      {step === 'account' ? (
        <>
          <Heading title={t('account.title')} body={t('account.body')} />
          <View style={styles.accountNote}>
            <Text style={styles.pointBody}>{t('account.note')}</Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
};

const Heading: React.FC<{ title: string; body: string; small?: boolean }> = ({ title, body, small }) => {
  const tablet = useLayout().isTablet;
  return (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={[small ? styles.h2 : styles.h1, small ? null : readable(tablet, 24, 32)]}>{title}</Text>
      <Text style={[styles.body, readable(tablet, 14, 20)]}>{body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 6, borderRadius: 3, backgroundColor: colors.borderLight },
  dotOn: { backgroundColor: colors.accent },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.bold },
  h1: { color: colors.textPrimary, fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.4 },
  h2: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold, marginTop: 8 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  pointNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandBlueLight, alignItems: 'center', justifyContent: 'center' },
  pointNumberText: { color: colors.safeText, fontSize: 15, fontFamily: fonts.bold },
  pointTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  pointBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, flexBasis: 0, minWidth: 0 },
  accountNote: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
});

export default OnboardingScreen;
