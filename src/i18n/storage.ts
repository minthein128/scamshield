import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUiLanguage, type UiLanguage } from './languages';

export const UI_LANGUAGE_KEY = 'saferoute.uiLanguage.v1';

export async function loadUiLanguage(): Promise<UiLanguage | undefined> {
  try {
    const raw = await AsyncStorage.getItem(UI_LANGUAGE_KEY);
    return isUiLanguage(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export async function saveUiLanguage(code: UiLanguage): Promise<void> {
  await AsyncStorage.setItem(UI_LANGUAGE_KEY, code);
}

export async function clearUiLanguage(): Promise<void> {
  await AsyncStorage.removeItem(UI_LANGUAGE_KEY);
}
