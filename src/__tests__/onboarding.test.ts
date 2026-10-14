import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PROFILE, PROFILE_KEY, applyChoices, finishOnboarding, loadProfile, parseProfile, saveProfile } from '../lib/profile';
import { HELP_POINTS, onboardingSteps } from '../lib/onboarding';

describe('onboarding state', () => {
  beforeEach(() => AsyncStorage.clear());

  it('starts not onboarded, in English, with no countries', async () => {
    expect(await loadProfile()).toEqual({ onboarded: false, language: 'en', shareSignals: true });
  });

  it('finishing with choices stores language and countries', async () => {
    const done = finishOnboarding(DEFAULT_PROFILE, { language: 'my', homeCountry: 'MM', destinationCountry: 'TH' });
    expect(done).toEqual({ onboarded: true, language: 'my', shareSignals: true, homeCountry: 'MM', destinationCountry: 'TH' });
    await saveProfile(done);
    expect(await loadProfile()).toEqual(done);
  });

  it('skipping keeps the defaults and marks onboarding done', () => {
    expect(finishOnboarding(DEFAULT_PROFILE)).toEqual({ onboarded: true, language: 'en', shareSignals: true });
  });

  it('the destination is optional and can be cleared later in settings', () => {
    const profile = finishOnboarding(DEFAULT_PROFILE, { homeCountry: 'PH', destinationCountry: 'MY' });
    expect(applyChoices(profile, { destinationCountry: undefined })).toEqual({ onboarded: true, language: 'en', shareSignals: true, homeCountry: 'PH' });
    expect(applyChoices(profile, { language: 'tl' }).destinationCountry).toBe('MY');
  });

  it('keeps the share-signals choice, on by default', () => {
    const off = applyChoices(finishOnboarding(DEFAULT_PROFILE), { shareSignals: false });
    expect(off.shareSignals).toBe(false);
    expect(parseProfile(off).shareSignals).toBe(false);
    expect(parseProfile({ onboarded: true }).shareSignals).toBe(true);
  });

  it('ignores corrupt or unknown stored values', async () => {
    expect(parseProfile({ onboarded: 'yes', language: 'xx', homeCountry: 'ZZ' })).toEqual({ onboarded: false, language: 'en', shareSignals: true });
    await AsyncStorage.setItem(PROFILE_KEY, '{oops');
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('reads a language saved by the previous version', async () => {
    await AsyncStorage.setItem('saferoute.language.v1', 'id');
    expect(await loadProfile()).toEqual({ onboarded: false, language: 'id', shareSignals: true });
  });

  it('explains the product in exactly three points', () => {
    expect(HELP_POINTS).toHaveLength(3);
  });

  it('offers the shield step only when the shield can run', () => {
    expect(onboardingSteps(false)).toEqual(['language', 'countries', 'how', 'account']);
    expect(onboardingSteps(true)).toContain('shield');
  });
});
