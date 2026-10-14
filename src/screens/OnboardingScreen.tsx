import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';
import { ShieldCard } from '../components/ShieldCard';
import { Button, Chip, LinkButton } from '../components/ui';
import { shieldSupport } from '../hooks/useShieldControl';
import { COUNTRIES, type CountryCode } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { HELP_POINTS, onboardingSteps, type AfterOnboarding } from '../lib/onboarding';
import type { LanguageCode } from '../api/types';
import { useAppState } from '../state/AppState';
import theme from '../theme/theme';

const { colors, fonts } = theme;

export const OnboardingScreen: React.FC<{ onDone: (next?: AfterOnboarding) => void }> = ({ onDone }) => {
  const { profile, finishOnboarding } = useAppState();
  const steps = onboardingSteps(shieldSupport() === 'ready');
  const [index, setIndex] = useState(0);
  const [language, setLanguage] = useState<LanguageCode>(profile.language);
  const [home, setHome] = useState<CountryCode | undefined>(profile.homeCountry);
  const [destination, setDestination] = useState<CountryCode | undefined>(profile.destinationCountry);
  const step = steps[index];

  const finish = (next?: AfterOnboarding) => {
    finishOnboarding({ language, homeCountry: home, destinationCountry: destination });
    onDone(next);
  };

  return (
    <Screen
      footer={
        step === 'account' ? (
          <>
            <Button testID="onboarding-anonymous" label="Continue without an account" onPress={() => finish()} />
            <Button testID="onboarding-signup" label="Create account" variant="secondary" onPress={() => finish('signUp')} />
            <LinkButton testID="onboarding-signin" label="I already have an account" onPress={() => finish('signIn')} />
          </>
        ) : (
          <Button testID="onboarding-next" label={step === 'shield' ? 'Continue' : 'Next'} onPress={() => setIndex(index + 1)} />
        )
      }
    >
      <View style={styles.top}>
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        {step !== 'account' ? (
          <TouchableOpacity testID="onboarding-skip" accessibilityRole="button" accessibilityLabel="Skip setup" onPress={() => finish()} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {step === 'language' ? (
        <>
          <Heading title="Choose your language" body="SafeRoute writes its reports and spoken warnings in this language. You can change it later." />
          <View style={styles.wrap}>
            {LANGUAGES.map(l => (
              <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
            ))}
          </View>
        </>
      ) : null}

      {step === 'countries' ? (
        <>
          <Heading title="Where are you from?" body="This shows the right hotlines first." />
          <View style={styles.wrap}>
            {COUNTRIES.map(c => (
              <Chip key={c.code} label={c.name} selected={home === c.code} onPress={() => setHome(home === c.code ? undefined : c.code)} />
            ))}
          </View>
          <Heading title="Where will you work or travel?" body="Optional. Skip it if you do not know yet." small />
          <View style={styles.wrap}>
            {COUNTRIES.map(c => (
              <Chip key={c.code} label={c.name} selected={destination === c.code} onPress={() => setDestination(destination === c.code ? undefined : c.code)} />
            ))}
          </View>
        </>
      ) : null}

      {step === 'how' ? (
        <>
          <Heading title="How SafeRoute helps" body="Three things, nothing to set up." />
          {HELP_POINTS.map((p, i) => (
            <View key={p.title} style={styles.point}>
              <View style={styles.pointNumber}>
                <Text style={styles.pointNumberText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {step === 'shield' ? (
        <>
          <Heading title="Turn on the screen shield" body="Optional. You can also do this later from the home screen." />
          <ShieldCard />
        </>
      ) : null}

      {step === 'account' ? (
        <>
          <Heading title="Use SafeRoute your way" body="Everything works without an account. Your checks stay on this device." />
          <View style={styles.accountNote}>
            <Text style={styles.pointBody}>
              An account is optional. It saves your history and trusted contacts so you can get them back on a new phone, and it raises your hourly check limit.
            </Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
};

const Heading: React.FC<{ title: string; body: string; small?: boolean }> = ({ title, body, small }) => (
  <View style={{ gap: 4 }}>
    <Text accessibilityRole="header" style={small ? styles.h2 : styles.h1}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>
);

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
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  pointNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandBlueLight, alignItems: 'center', justifyContent: 'center' },
  pointNumberText: { color: colors.safeText, fontSize: 15, fontFamily: fonts.bold },
  pointTitle: { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.bold },
  pointBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
  accountNote: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
});

export default OnboardingScreen;
