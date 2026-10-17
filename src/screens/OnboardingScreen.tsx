import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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
  const [footerHeight, setFooterHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const stacked = footerHeight > windowHeight * FOOTER_SHARE_MAX;
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

  const accountButtons = accountsOff ? (
    <Button testID="onboarding-next" label={t('common:actions.next')} onPress={() => setIndex(index + 1)} />
  ) : (
    <>
      {error ? <Notice testID="onboarding-error" message={error} /> : null}
      {googleAvailable ? (
        <Button testID="onboarding-google" label={t('account:google')} variant="secondary" disabled={busy} leading={<GoogleMark />} style={styles.social} onPress={() => signInWith(google)} />
      ) : null}
      {facebookAvailable ? (
        <Button testID="onboarding-facebook" label={t('account:facebook')} variant="secondary" disabled={busy} leading={<FacebookMark />} style={styles.social} onPress={() => signInWith(facebook)} />
      ) : null}
      <View style={[styles.choiceRow, stacked && styles.choiceStack]}>
        <Button testID="onboarding-signup" label={t('account.signUp')} variant="secondary" disabled={busy} maxLines={3} style={stacked ? undefined : styles.choice} onPress={() => openAccount('signUp')} />
        <Button testID="onboarding-signin" label={t('account.signIn')} variant="secondary" disabled={busy} maxLines={3} style={stacked ? undefined : styles.choice} onPress={() => openAccount('signIn')} />
      </View>
      <TouchableOpacity testID="onboarding-anonymous" accessibilityRole="button" accessibilityLabel={t('account.anonymous')} activeOpacity={0.7} disabled={busy} onPress={() => setIndex(index + 1)} hitSlop={ANON_SLOP} style={styles.anon}>
        <Text style={styles.anonText}>{t('account.anonymous')}</Text>
      </TouchableOpacity>
    </>
  );

  const accountFooter = (
    <View style={styles.footerStack} onLayout={e => setFooterHeight(Math.round(e.nativeEvent.layout.height))}>{accountButtons}</View>
  );

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.content}
      footerStyle={styles.footer}
      footer={
        step === 'account' ? (stacked ? null : accountFooter) : step === 'sharing' ? (
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
        </View> : null}
        {step === 'countries' || step === 'how' ? (
          <TouchableOpacity testID="onboarding-skip" accessibilityRole="button" accessibilityLabel={t('skipA11y')} onPress={skip} style={styles.skip}>
            <Text style={styles.skipText}>{t('common:actions.skip')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {step === 'language' ? (
        <>
          <View testID="onboarding-hero" style={styles.hero} accessible accessibilityLabel={t('language.heroA11y')}>
            <BrandMark size={tablet ? 64 : 48} />
            <Wordmark size={tablet ? 56 : 48} />
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
                <Perk icon="plus" text={t('account.with.limit', { n: localNumber(CHECKS_PER_HOUR.account, uiLanguage) })} onWhite />
              </View>
            </View>
          )}
          {stacked ? accountFooter : null}
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
          <View style={styles.note}>
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
    <View style={{ gap: 2 }}>
      <Text accessibilityRole="header" style={[styles.h1, readable(tablet, 24, 32)]}>{title}</Text>
      <Text style={[styles.body, readable(tablet, 14, 20)]}>{body}</Text>
    </View>
  );
};

/** When the account buttons would take more than this share of the window, they scroll with the cards. */
const FOOTER_SHARE_MAX = 0.45;
const ANON_SLOP = { top: 6, bottom: 6, left: 8, right: 8 };
const BAR_EMPTY = '#E3DBD0';

const styles = StyleSheet.create({
  content: { gap: 6, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 8 },
  footer: { gap: 6, paddingTop: 6, paddingHorizontal: 16, paddingBottom: 8 },
  top: { height: 24, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 40, height: 5, borderRadius: 3, backgroundColor: BAR_EMPTY },
  dotOn: { backgroundColor: colors.accent },
  skip: { position: 'absolute', right: 0, top: -12, height: 48, minWidth: 48, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontFamily: fonts.bold },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  h1: { color: colors.textPrimary, fontSize: 24, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.4 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  tiles: { gap: 4 },
  tile: { minHeight: 48, borderRadius: 16, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.white, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tileText: { color: colors.textPrimary, fontSize: 18, lineHeight: 24, fontFamily: fonts.bold },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 2 },
  groupPlain: { backgroundColor: '#FBF9F6', borderWidth: 1, borderColor: colors.border },
  groupGold: { backgroundColor: '#FFF6E6', borderWidth: 1.5, borderColor: colors.brandGold },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupHeadText: { flex: 1 },
  groupTitle: { color: colors.textPrimary, fontSize: 16, lineHeight: 22, fontFamily: fonts.extraBold },
  badge: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 13, backgroundColor: colors.brandGoldSoft },
  badgeText: { color: '#7A4B00', fontSize: 12, lineHeight: 18, fontFamily: fonts.bold },
  list: { gap: 1 },
  perk: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  perkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center' },
  perkIconWhite: { backgroundColor: colors.white },
  perkText: { flex: 1, color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  rows: { gap: 6 },
  fn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  fnIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.brandGoldSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fnText: { flex: 1, minWidth: 0, gap: 2 },
  fnTitle: { color: colors.textPrimary, fontSize: 18, lineHeight: 25, fontFamily: fonts.bold },
  fnBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
  pointBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choiceStack: { flexDirection: 'column' },
  footerStack: { gap: 6 },
  choice: { flex: 1, flexBasis: 0, minWidth: 0 },
  social: { borderColor: colors.borderLight },
  anon: { minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  anonText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: fonts.bold, textDecorationLine: 'underline', textAlign: 'center' },
  note: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
});

export default OnboardingScreen;
