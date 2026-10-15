import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, LEGACY_LANGUAGE_KEY, PROFILE_KEY, applyChoices, finishOnboarding, loadProfile, parseProfile, saveProfile } from '../lib/profile';
import { HELP_POINTS, onboardingSteps } from '../lib/onboarding';

describe('onboarding state', () => {
  beforeEach(() => AsyncStorage.clear());

  it('starts not onboarded with no countries and no language of its own', async () => {
    expect(await loadProfile()).toEqual({ onboarded: false, shareSignals: true });
  });

  it('finishing with choices stores the countries', async () => {
    const done = finishOnboarding(DEFAULT_PROFILE, { homeCountry: 'MM', destinationCountry: 'TH' });
    expect(done).toEqual({ onboarded: true, shareSignals: true, homeCountry: 'MM', destinationCountry: 'TH' });
    await saveProfile(done);
    expect(await loadProfile()).toEqual(done);
  });

  it('skipping keeps the defaults and marks onboarding done', () => {
    expect(finishOnboarding(DEFAULT_PROFILE)).toEqual({ onboarded: true, shareSignals: true });
  });

  it('the destination is optional and can be cleared later in settings', () => {
    const profile = finishOnboarding(DEFAULT_PROFILE, { homeCountry: 'PH', destinationCountry: 'MY' });
    expect(applyChoices(profile, { destinationCountry: undefined })).toEqual({ onboarded: true, shareSignals: true, homeCountry: 'PH' });
    expect(applyChoices(profile, { homeCountry: 'MM' }).destinationCountry).toBe('MY');
  });

  it('keeps the share-signals choice, on by default', () => {
    const off = applyChoices(finishOnboarding(DEFAULT_PROFILE), { shareSignals: false });
    expect(off.shareSignals).toBe(false);
    expect(parseProfile(off).shareSignals).toBe(false);
    expect(parseProfile({ onboarded: true }).shareSignals).toBe(true);
  });

  it('drops the old separate report language and keeps the rest', async () => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ onboarded: true, language: 'tl', shareSignals: false, homeCountry: 'PH' }));
    expect(await loadProfile()).toEqual({ onboarded: true, shareSignals: false, homeCountry: 'PH' });
    expect(JSON.parse((await AsyncStorage.getItem(PROFILE_KEY)) ?? '{}')).toEqual({ onboarded: true, shareSignals: false, homeCountry: 'PH' });
  });

  it('forgets the legacy report language key', async () => {
    await AsyncStorage.setItem(LEGACY_LANGUAGE_KEY, 'my');
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
    expect(await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY)).toBeNull();
  });

  it('ignores corrupt or unknown stored values', async () => {
    expect(parseProfile({ onboarded: 'yes', language: 'xx', homeCountry: 'ZZ' })).toEqual({ onboarded: false, shareSignals: true });
    await AsyncStorage.setItem(PROFILE_KEY, '{oops');
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('explains the product in exactly three points', () => {
    expect(HELP_POINTS).toHaveLength(3);
  });

  it('offers the shield step only when the shield can run', () => {
    expect(onboardingSteps(false)).toEqual(['language', 'countries', 'how', 'account']);
    expect(onboardingSteps(true)).toContain('shield');
  });
});
