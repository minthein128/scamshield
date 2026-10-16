import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useApiUrl } from '../config/runtime';
import { BrandMark, Wordmark } from '../components/BrandMark';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { FacebookMark, GoogleMark } from '../components/SocialMarks';
import { Text } from '../components/Text';
import { Button, Chip, Notice } from '../components/ui';
import { shieldSupport } from '../hooks/useShieldControl';
import { COUNTRIES, countryLabel, type CountryCode } from '../lib/countries';
import { UI_LANGUAGES, type UiLanguage } from '../i18n/languages';
import { useUiLanguage } from '../i18n/useUiLanguage';
import { CHECKS_PER_HOUR, SHARING_POINTS, helpPoints, localNumber, onboardingSteps, type HowId, type StepId } from '../lib/onboarding';
import type { RootStackParamList } from '../navigation/types';
import { authErrorMessage } from '../services/accounts';
import { facebookAvailable, googleAvailable } from '../services/social';
import { useAppState } from '../state/AppState';
import { useAuth } from '../state/AuthState';
import { useLayout } from '../hooks/useLayout';
import theme, { readable } from '../theme/theme';

const { colors, fonts } = theme;

const HOW_ICONS: Record<Exclude<HowId, 'doll'>, IconName> = { check: 'search', call: 'phone', warn: 'people' };

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation(['onboarding', 'common', 'account']);
  const tablet = useLayout().isTablet;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const focused = useIsFocused();
  const { uiLanguage, setUiLanguage } = useUiLanguage();
  const { profile, finishOnboarding } = useAppState();
  const { status, google, facebook } = useAuth();
  const shieldReady = shieldSupport(Platform.OS, useApiUrl()) === 'ready';
  const [steps] = useState<StepId[]>(() => (profile.onboarded ? ['sharing'] : onboardingSteps()));
  const [index, setIndex] = useState(0);
  const [home, setHome] = useState<CountryCode | undefined>(profile.homeCountry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const awaitingAuth = useRef(false);
  const step = steps[index];
  const accountsOff = status.kind === 'unavailable';
  const last = steps.length - 1;

  const chooseLanguage = (code: UiLanguage) => {
    setUiLanguage(code).catch(() => undefined);
  };

  useEffect(() => {
    if (!awaitingAuth.current || !focused || status.kind !== 'account' || step !== 'account') return;
    awaitingAuth.current = false;
    setError(null);
    setIndex(i => Math.min(i + 1, last));
  }, [status.kind, focused, step, last]);

  const finish = (shareSignals: boolean) => {
    finishOnboarding({ ...(home ? { homeCountry: home } : {}), shareSignals, sharingAsked: true });
  };

  const signInWith = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    awaitingAuth.current = true;
    try {
      await action();
    } catch (e) {
      awaitingAuth.current = false;
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openAccount = (mode: 'signUp' | 'signIn') => {
    setError(null);
    awaitingAuth.current = true;
    navigation.navigate('Account', { mode });
  };

  const skip = () => setIndex(last);

  const limit = (n: number) => t('account.without.limit', { n: localNumber(n, uiLanguage) });
  const accountFooter = accountsOff ? (
    <Button testID="onboarding-next" label={t('common:actions.next')} onPress={() => setIndex(index + 1)} />
  ) : (
    <>
      {googleAvailable ? (
        <Button testID="onboarding-google" label={t('account:google')} variant="secondary" disabled={busy} leading={<GoogleMark />} style={styles.social} onPress={() => signInWith(google)} />
      ) : null}
      {facebookAvailable ? (
        <Button testID="onboarding-facebook" label={t('account:facebook')} variant="secondary" disabled={busy} leading={<FacebookMark />} style={styles.social} onPress={() => signInWith(facebook)} />
      ) : null}
      <View style={styles.choiceRow}>
        <Button testID="onboarding-signup" label={t('account.signUp')} variant="secondary" disabled={busy} style={styles.choice} onPress={() => openAccount('signUp')} />
        <Button testID="onboarding-signin" label={t('account.signIn')} variant="secondary" disabled={busy} style={styles.choice} onPress={() => openAccount('signIn')} />
      </View>
      <TouchableOpacity testID="onboarding-anonymous" accessibilityRole="button" accessibilityLabel={t('account.anonymous')} activeOpacity={0.7} disabled={busy} onPress={() => setIndex(index + 1)} style={styles.anon}>
        <Text style={styles.anonText}>{t('account.anonymous')}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Screen
      footer={
        step === 'account' ? accountFooter : step === 'sharing' ? (
          <View style={styles.choiceRow}>
            <Button testID="onboarding-share-yes" label={t('sharing.yes')} variant="secondary" style={styles.choice} onPress={() => finish(true)} />
            <Button testID="onboarding-share-no" label={t('sharing.no')} variant="secondary" style={styles.choice} onPress={() => finish(false)} />
          </View>
        ) : (
          <Button testID="onboarding-next" label={t('common:actions.next')} onPress={() => setIndex(index + 1)} />
        )
      }
    >
      <View style={styles.top}>
        {steps.length > 1 ? <View style={styles.dots} accessibilityLabel={t('step', { current: index + 1, total: steps.length })}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View> : <View />}
        {step === 'countries' || step === 'how' ? (
          <TouchableOpacity testID="onboarding-skip" accessibilityRole="button" accessibilityLabel={t('skipA11y')} onPress={skip} style={styles.skip}>
            <Text style={styles.skipText}>{t('common:actions.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {step === 'language' ? (
        <>
          <View testID="onboarding-hero" style={styles.hero} accessible accessibilityLabel={`${t('language.heroA11y')}. ${t('language.tagline')}`}>
            <View style={styles.heroDisc}>
              <BrandMark size={tablet ? 88 : 64} />
            </View>
            <Wordmark size={tablet ? 48 : 40} />
            <Text style={[styles.tagline, readable(tablet, 15, 22)]}>{t('language.tagline')}</Text>
          </View>
          <Heading title={t('language.title')} body={t('language.body')} />
          <View style={styles.tiles}>
            {UI_LANGUAGES.map(l => {
              const on = uiLanguage === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  testID={`onboarding-language-${l.code}`}
                  accessibilityRole="button"
                  accessibilityLabel={l.label}
                  accessibilityState={{ selected: on }}
                  activeOpacity={0.7}
                  onPress={() => chooseLanguage(l.code)}
                  style={[styles.tile, on && styles.tileOn]}
                >
                  <Text style={[styles.tileText, on && { color: colors.white }]}>{l.label}</Text>
                  {on ? <Icon name="check" size={22} color={colors.white} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text testID="onboarding-age" style={styles.body}>{t('language.age')}</Text>
        </>
      ) : null}

      {step === 'account' ? (
        <>
          <Text accessibilityRole="header" style={[styles.h1, readable(tablet, 24, 32)]}>{t('account.title')}</Text>
          <View testID="onboarding-card-without" style={[styles.group, styles.groupPlain]}>
            <Text accessibilityRole="header" style={styles.groupTitle}>{t('account.without.heading')}</Text>
            <View style={styles.list}>
              <Perk icon="check" text={t('account.without.check')} />
              <Perk icon="check" text={t('account.without.voice')} />
              <Perk icon="check" text={t('account.without.doll')} />
              <Perk icon="check" text={t('account.without.call')} />
              <Perk icon="check" text={limit(CHECKS_PER_HOUR.anonymous)} />
            </View>
          </View>
          {accountsOff ? null : (
            <View testID="onboarding-card-with" style={[styles.group, styles.groupGold]}>
              <View style={styles.groupHead}>
                <Text accessibilityRole="header" style={[styles.groupTitle, styles.groupHeadText]}>{t('account.with.heading')}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('account.free')}</Text>
                </View>
              </View>
              <View style={styles.list}>
                <Perk icon="plus" text={t('account.with.contacts')} onWhite />
                <Perk icon="plus" text={t('account.with.warn')} onWhite />
                <Perk icon="plus" text={t('account.with.restore')} onWhite />
                <Perk icon="plus" text={t('account.with.limit', { n: localNumber(CHECKS_PER_HOUR.account, uiLanguage) })} onWhite />
              </View>
            </View>
          )}
          {error ? <Notice testID="onboarding-error" message={error} /> : null}
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
        </>
      ) : null}

      {step === 'how' ? (
        <>
          <Text accessibilityRole="header" style={[styles.h1, readable(tablet, 24, 32)]}>{t('how.title')}</Text>
          <View style={styles.rows}>
            {helpPoints(shieldReady).map(p => (
              <View key={p} testID={`onboarding-how-${p}`} style={styles.fn}>
                <View style={styles.fnIcon}>
                  {p === 'doll' ? <BrandMark size={44} /> : <Icon name={HOW_ICONS[p]} size={28} />}
                </View>
                <View style={styles.fnText}>
                  <Text style={[styles.fnTitle, readable(tablet, 18, 25)]}>{t(`how.${p}.title`)}</Text>
                  <Text style={[styles.fnBody, readable(tablet, 15, 21)]}>{t(`how.${p}.body`)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {step === 'sharing' ? (
        <>
          <Heading title={t('sharing.title')} body={t('sharing.body')} />
          <View style={[styles.note, { gap: 8 }]}>
            {SHARING_POINTS.map(p => (
              <Text key={p} style={styles.pointBody}>{`\u2022 ${t(`sharing.${p}`)}`}</Text>
            ))}
          </View>
          <Text style={styles.body}>{t('sharing.note')}</Text>
        </>
      ) : null}
    </Screen>
  );
};

const Perk: React.FC<{ icon: IconName; text: string; onWhite?: boolean }> = ({ icon, text, onWhite }) => {
  const tablet = useLayout().isTablet;
  return (
    <View style={styles.perk}>
      <View style={[styles.perkIcon, onWhite && styles.perkIconWhite]}>
        <Icon name={icon} size={16} color={colors.brandInk} />
      </View>
      <Text style={[styles.perkText, readable(tablet, 15, 21)]}>{text}</Text>
    </View>
  );
};

const Heading: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const tablet = useLayout().isTablet;
  return (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={[styles.h1, readable(tablet, 24, 32)]}>{title}</Text>
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
  hero: { alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  heroDisc: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tagline: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.medium, textAlign: 'center', maxWidth: 320 },
  h1: { color: colors.textPrimary, fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.4 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  tiles: { gap: 8 },
  tile: { minHeight: 56, borderRadius: 16, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tileText: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { borderRadius: 20, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16, gap: 8 },
  groupPlain: { backgroundColor: '#FBF9F6', borderWidth: 1, borderColor: colors.border },
  groupGold: { backgroundColor: '#FFF6E6', borderWidth: 1.5, borderColor: colors.brandGold },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupHeadText: { flex: 1 },
  groupTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.extraBold },
  badge: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 13, backgroundColor: colors.brandGoldSoft },
  badgeText: { color: '#7A4B00', fontSize: 12, lineHeight: 18, fontFamily: fonts.bold },
  list: { gap: 6 },
  perk: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  perkIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center' },
  perkIconWhite: { backgroundColor: colors.white },
  perkText: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  rows: { gap: 12, marginTop: 4 },
  fn: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  fnIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fnText: { flex: 1, minWidth: 0, gap: 2 },
  fnTitle: { color: colors.textPrimary, fontSize: 18, lineHeight: 25, fontFamily: fonts.bold },
  fnBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  pointBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, flexBasis: 0, minWidth: 0 },
  social: { borderColor: colors.borderLight },
  anon: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  anonText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, textDecorationLine: 'underline', textAlign: 'center' },
  note: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
});

export default OnboardingScreen;
