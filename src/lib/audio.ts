import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let webAudio: HTMLAudioElement | null = null;
let nativeSound: Audio.Sound | null = null;

export async function stopAudio(): Promise<void> {
  if (webAudio) {
    webAudio.pause();
    webAudio = null;
  }
  if (nativeSound) {
    const sound = nativeSound;
    nativeSound = null;
    await sound.unloadAsync().catch(() => undefined);
  }
}

export async function playWavBase64(base64: string, onEnd?: () => void): Promise<void> {
  await stopAudio();
  if (Platform.OS === 'web') {
    const audio = new window.Audio(`data:audio/wav;base64,${base64}`);
    webAudio = audio;
    audio.onended = () => onEnd?.();
    await audio.play();
    return;
  }
  const uri = `${FileSystem.cacheDirectory}spoken-warning.wav`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
  nativeSound = sound;
  sound.setOnPlaybackStatusUpdate(status => {
    if (status.isLoaded && status.didJustFinish) {
      onEnd?.();
      sound.unloadAsync().catch(() => undefined);
    }
  });
}
