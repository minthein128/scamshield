import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '../api/types';
import { isCountryCode, type CountryCode } from './countries';

export const PROFILE_KEY = 'saferoute.profile.v1';
const LEGACY_LANGUAGE_KEY = 'saferoute.language.v1';

export interface Profile {
  onboarded: boolean;
  language: LanguageCode;
  shareSignals: boolean;
  homeCountry?: CountryCode;
  destinationCountry?: CountryCode;
}

export const DEFAULT_PROFILE: Profile = { onboarded: false, language: 'en', shareSignals: true };

export const LANGUAGE_CODES: LanguageCode[] = ['en', 'id', 'tl', 'my'];

export function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as string[]).includes(value);
}

export function parseProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROFILE;
  const r = raw as Record<string, unknown>;
  return {
    onboarded: r.onboarded === true,
    language: isLanguage(r.language) ? r.language : 'en',
    shareSignals: r.shareSignals !== false,
    ...(isCountryCode(r.homeCountry) ? { homeCountry: r.homeCountry } : {}),
    ...(isCountryCode(r.destinationCountry) ? { destinationCountry: r.destinationCountry } : {}),
  };
}

export type ProfileChoices = Partial<Pick<Profile, 'language' | 'homeCountry' | 'destinationCountry' | 'shareSignals'>>;

export function finishOnboarding(profile: Profile, choices: ProfileChoices = {}): Profile {
  return applyChoices({ ...profile, onboarded: true }, choices);
}

export function applyChoices(profile: Profile, choices: ProfileChoices): Profile {
  const next: Profile = { ...profile };
  if (choices.language) next.language = choices.language;
  if (typeof choices.shareSignals === 'boolean') next.shareSignals = choices.shareSignals;
  if ('homeCountry' in choices) {
    if (choices.homeCountry) next.homeCountry = choices.homeCountry;
    else delete next.homeCountry;
  }
  if ('destinationCountry' in choices) {
    if (choices.destinationCountry) next.destinationCountry = choices.destinationCountry;
    else delete next.destinationCountry;
  }
  return next;
}

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return parseProfile(JSON.parse(raw));
    const legacy = await AsyncStorage.getItem(LEGACY_LANGUAGE_KEY);
    return isLanguage(legacy) ? { ...DEFAULT_PROFILE, language: legacy } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
