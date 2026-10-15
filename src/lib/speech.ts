import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import type { CheckClient, LanguageCode } from '../api/types';
import { playWavBase64, stopAudio } from './audio';
import { languageOption } from './languages';

export function findVoiceLocale(voiceLanguages: string[], code: LanguageCode): string | undefined {
  const wanted = languageOption(code).speechLocale;
  const aliases = code === 'tl' ? ['fil', 'tl'] : [wanted.split('-')[0].toLowerCase()];
  const norm = (v: string) => v.replace('_', '-');
  const exact = voiceLanguages.find(v => norm(v).toLowerCase() === wanted.toLowerCase());
  return exact ?? voiceLanguages.find(v => aliases.includes(norm(v).split('-')[0].toLowerCase()));
}

export function pickSpeechLocale(voiceLanguages: string[], code: LanguageCode): string {
  return findVoiceLocale(voiceLanguages, code) ?? languageOption('en').speechLocale;
}

async function availableVoiceLanguages(): Promise<string[]> {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('voice list timeout')), 1500));
  try {
    const voices = await Promise.race([Speech.getAvailableVoicesAsync(), timeout]);
    return voices.map(v => v.language);
  } catch {
    return [];
  }
}

function speakLocally(text: string, locale: string, onEnd?: () => void): void {
  stopSpeaking();
  Speech.speak(text, { language: locale, onDone: onEnd, onStopped: onEnd, onError: onEnd });
}

const audioCache = new Map<string, string>();
const AUDIO_CACHE_MAX = 8;

async function serverAudio(client: CheckClient, text: string, code: LanguageCode): Promise<string> {
  const key = `${code}:${text}`;
  const hit = audioCache.get(key);
  if (hit) return hit;
  const audio = await client.speak({ text, language: code });
  audioCache.set(key, audio.audioBase64);
  if (audioCache.size > AUDIO_CACHE_MAX) audioCache.delete(audioCache.keys().next().value as string);
  return audio.audioBase64;
}

export async function speak(text: string, code: LanguageCode, onEnd?: () => void, client?: CheckClient): Promise<void> {
  const voices = await availableVoiceLanguages();
  const local = findVoiceLocale(voices, code);
  if (code === 'en' || local) {
    speakLocally(text, local ?? languageOption('en').speechLocale, onEnd);
    return;
  }
  if (client && !client.isMock) {
    try {
      const audioBase64 = await serverAudio(client, text.slice(0, 600), code);
      stopSpeaking();
      await playWavBase64(audioBase64, onEnd);
      return;
    } catch {
      // fall through to the English voice
    }
  }
  speakLocally(text, languageOption('en').speechLocale, onEnd);
}

export function stopSpeaking(): void {
  stopAudio().catch(() => undefined);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    return;
  }
  Promise.resolve(Speech.stop()).catch(() => undefined);
}
