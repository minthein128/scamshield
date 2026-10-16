import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from '../api/types';
import { UI_LANGUAGE_CODES } from '../i18n/languages';
import { isCountryCode, type CountryCode } from './countries';

export const PROFILE_KEY = 'saferoute.profile.v1';
export const LEGACY_LANGUAGE_KEY = 'saferoute.language.v1';

export interface Profile {
  onboarded: boolean;
  /** Opt-in. Report a scam shares on its own because the tap is explicit. */
  shareSignals: boolean;
  /** The sharing question was answered or skipped once. */
  sharingAsked: boolean;
  keepHistory: boolean;
  homeCountry?: CountryCode;
  destinationCountry?: CountryCode;
}

export const DEFAULT_PROFILE: Profile = { onboarded: false, shareSignals: false, sharingAsked: false, keepHistory: true };

export const LANGUAGE_CODES: LanguageCode[] = UI_LANGUAGE_CODES;

export function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as string[]).includes(value);
}

export function parseProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROFILE;
  const r = raw as Record<string, unknown>;
  return {
    onboarded: r.onboarded === true,
    shareSignals: r.sharingAsked === true && r.shareSignals === true,
    sharingAsked: r.sharingAsked === true,
    keepHistory: r.keepHistory !== false,
    ...(isCountryCode(r.homeCountry) ? { homeCountry: r.homeCountry } : {}),
    ...(isCountryCode(r.destinationCountry) ? { destinationCountry: r.destinationCountry } : {}),
  };
}

export type ProfileChoices = Partial<Pick<Profile, 'homeCountry' | 'destinationCountry' | 'shareSignals' | 'sharingAsked' | 'keepHistory'>>;

export function finishOnboarding(profile: Profile, choices: ProfileChoices = {}): Profile {
  return applyChoices({ ...profile, onboarded: true }, choices);
}

export function applyChoices(profile: Profile, choices: ProfileChoices): Profile {
  const next: Profile = { ...profile };
  if (typeof choices.shareSignals === 'boolean') next.shareSignals = choices.shareSignals;
  if (typeof choices.sharingAsked === 'boolean') next.sharingAsked = choices.sharingAsked;
  if (typeof choices.keepHistory === 'boolean') next.keepHistory = choices.keepHistory;
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

/** Reads the saved profile. A profile saved with the old separate report language is rewritten without it. */
export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const stored: unknown = JSON.parse(raw);
      if (stored && typeof stored === 'object' && 'language' in stored) await saveProfile(parseProfile(stored));
      return parseProfile(stored);
    }
    await AsyncStorage.removeItem(LEGACY_LANGUAGE_KEY);
    return DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
