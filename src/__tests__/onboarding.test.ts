import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, LEGACY_LANGUAGE_KEY, PROFILE_KEY, applyChoices, finishOnboarding, loadProfile, parseProfile, saveProfile } from '../lib/profile';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CHECKS_PER_HOUR, HELP_POINTS, helpPoints, localNumber, onboardingSteps } from '../lib/onboarding';

describe('onboarding state', () => {
  beforeEach(() => AsyncStorage.clear());

  it('starts not onboarded with no countries and no language of its own', async () => {
    expect(await loadProfile()).toEqual({ onboarded: false, shareSignals: false, sharingAsked: false, keepHistory: true });
  });

  it('finishing with choices stores the countries', async () => {
    const done = finishOnboarding(DEFAULT_PROFILE, { homeCountry: 'MM', destinationCountry: 'TH' });
    expect(done).toEqual({ onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true, homeCountry: 'MM', destinationCountry: 'TH' });
    await saveProfile(done);
    expect(await loadProfile()).toEqual(done);
  });

  it('skipping keeps the defaults and marks onboarding done', () => {
    expect(finishOnboarding(DEFAULT_PROFILE)).toEqual({ onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true });
  });

  it('the destination is optional and can be cleared later in settings', () => {
    const profile = finishOnboarding(DEFAULT_PROFILE, { homeCountry: 'PH', destinationCountry: 'MY' });
    expect(applyChoices(profile, { destinationCountry: undefined })).toEqual({ onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true, homeCountry: 'PH' });
    expect(applyChoices(profile, { homeCountry: 'MM' }).destinationCountry).toBe('MY');
  });

  it('shares scam patterns only after the user says yes', () => {
    expect(DEFAULT_PROFILE.shareSignals).toBe(false);
    const on = applyChoices(finishOnboarding(DEFAULT_PROFILE), { shareSignals: true, sharingAsked: true });
    expect(parseProfile(on)).toMatchObject({ shareSignals: true, sharingAsked: true });
    expect(parseProfile(applyChoices(on, { shareSignals: false })).shareSignals).toBe(false);
  });

  it('turns sharing off for existing users and asks them once', () => {
    expect(parseProfile({ onboarded: true, shareSignals: true })).toMatchObject({ onboarded: true, shareSignals: false, sharingAsked: false });
    expect(parseProfile({ onboarded: true })).toMatchObject({ shareSignals: false, sharingAsked: false });
  });

  it('keeps check history by default and remembers turning it off', () => {
    expect(parseProfile({ onboarded: true }).keepHistory).toBe(true);
    expect(parseProfile(applyChoices(DEFAULT_PROFILE, { keepHistory: false })).keepHistory).toBe(false);
  });

  it('drops the old separate report language and keeps the rest', async () => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ onboarded: true, language: 'tl', shareSignals: false, homeCountry: 'PH' }));
    expect(await loadProfile()).toEqual({ onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true, homeCountry: 'PH' });
    expect(JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) ?? '{}')).toEqual({ onboarded: true, shareSignals: false, sharingAsked: false, keepHistory: true, homeCountry: 'PH' });
  });

  it('forgets the legacy report language key', async () => {
    await AsyncStorage.setItem(LEGACY_LANGUAGE_KEY, 'my');
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
    expect(await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY)).toBeNull();
  });

  it('ignores corrupt or unknown stored values', async () => {
    expect(parseProfile({ onboarded: 'yes', language: 'xx', homeCountry: 'ZZ' })).toEqual({ onboarded: false, shareSignals: false, sharingAsked: false, keepHistory: true });
    await AsyncStorage.setItem(PROFILE_KEY, '{oops');
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('runs the same five steps in order on every platform', () => {
    expect(onboardingSteps()).toEqual(['language', 'account', 'countries', 'how', 'sharing']);
  });

  it('explains the product in four points and hides the doll where the shield cannot run', () => {
    expect(HELP_POINTS).toHaveLength(4);
    expect(helpPoints(true)).toEqual(['check', 'doll', 'call', 'warn']);
    expect(helpPoints(false)).toEqual(['check', 'call', 'warn']);
  });

  it('keeps the hourly limits in step with the server', () => {
    const server = readFileSync(join(__dirname, '../../server/src/config.ts'), 'utf8');
    expect(server).toContain(`ANON_LIMIT_PER_HOUR ?? ${CHECKS_PER_HOUR.anonymous}`);
    expect(server).toContain(`USER_LIMIT_PER_HOUR ?? ${CHECKS_PER_HOUR.account}`);
  });

  it('writes the limits in Burmese digits for Burmese', () => {
    expect(localNumber(20, 'my')).toBe('၂၀');
    expect(localNumber(60, 'my')).toBe('၆၀');
    expect(localNumber(60, 'en')).toBe('60');
  });
});
