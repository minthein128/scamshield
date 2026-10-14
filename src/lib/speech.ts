import * as Speech from 'expo-speech';
import type { LanguageCode } from '../api/types';
import { languageOption } from './languages';

export function pickSpeechLocale(voiceLanguages: string[], code: LanguageCode): string {
  const wanted = languageOption(code).speechLocale;
  const base = wanted.split('-')[0].toLowerCase();
  const aliases = code === 'tl' ? ['fil', 'tl'] : [base];
  const exact = voiceLanguages.find(v => v.replace('_', '-').toLowerCase() === wanted.toLowerCase());
  if (exact) return exact;
  const loose = voiceLanguages.find(v => aliases.includes(v.replace('_', '-').split('-')[0].toLowerCase()));
  return loose ?? languageOption('en').speechLocale;
}

export async function speak(text: string, code: LanguageCode): Promise<void> {
  let locale = languageOption('en').speechLocale;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    locale = pickSpeechLocale(voices.map(v => v.language), code);
  } catch {
    locale = languageOption(code).speechLocale;
  }
  Speech.stop();
  Speech.speak(text, { language: locale });
}

export function stopSpeaking(): void {
  Speech.stop();
}
