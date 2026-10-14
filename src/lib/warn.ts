import { Linking, Platform } from 'react-native';
import type { TrustedContact } from './contacts';
import { smsUrl, telLink } from './contacts';
import { shareText } from './notify';

export async function textContact(contact: TrustedContact, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    await shareText(message);
    return;
  }
  try {
    await Linking.openURL(smsUrl(contact.phone, message, Platform.OS === 'ios' ? 'ios' : 'android'));
  } catch {
    await shareText(message);
  }
}

export async function callNumber(phone: string): Promise<void> {
  await Linking.openURL(telLink(phone)).catch(() => undefined);
}
