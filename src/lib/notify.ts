import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export async function shareText(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    await Clipboard.setStringAsync(message);
    notify('Copied', 'The warning is copied. Paste it into any chat to share it.');
  }
}
