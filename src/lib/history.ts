import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CheckResponse, LanguageCode } from '../api/types';

const HISTORY_KEY = 'saferoute.history.v1';
const LANGUAGE_KEY = 'saferoute.language.v1';
export const MAX_HISTORY = 30;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  language: LanguageCode;
  source?: string;
  result: CheckResponse;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const existing = await loadHistory();
  const next = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function loadLanguage(): Promise<LanguageCode> {
  const value = await AsyncStorage.getItem(LANGUAGE_KEY);
  return value === 'id' || value === 'tl' || value === 'my' ? value : 'en';
}

export async function saveLanguage(code: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
}
