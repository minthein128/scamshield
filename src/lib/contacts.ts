import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONTACTS_KEY = 'saferoute.contacts.v1';
export const MAX_CONTACTS = 20;

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  updatedAt: string;
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function validateContact(input: { name: string; phone: string }): string | null {
  if (!input.name.trim()) return 'Enter a name.';
  if (input.name.trim().length > 80) return 'That name is too long.';
  const digits = normalizePhone(input.phone).replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return 'Enter a phone number with 6 to 15 digits.';
  return null;
}

export function makeContact(input: { name: string; phone: string }, now: Date = new Date(), id?: string): TrustedContact {
  const phone = normalizePhone(input.phone);
  return {
    id: id ?? `c_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    phone,
    updatedAt: now.toISOString(),
  };
}

export function upsertContact(list: TrustedContact[], contact: TrustedContact): TrustedContact[] {
  const duplicate = list.find(c => c.id !== contact.id && c.phone === contact.phone);
  if (duplicate) return list;
  const rest = list.filter(c => c.id !== contact.id);
  return [...rest, contact].sort((a, b) => a.name.localeCompare(b.name)).slice(0, MAX_CONTACTS);
}

export function removeContact(list: TrustedContact[], id: string): TrustedContact[] {
  return list.filter(c => c.id !== id);
}

export function mergeContacts(local: TrustedContact[], remote: TrustedContact[]): TrustedContact[] {
  const byId = new Map<string, TrustedContact>();
  for (const c of [...remote, ...local]) {
    const prev = byId.get(c.id);
    if (!prev || prev.updatedAt < c.updatedAt) byId.set(c.id, c);
  }
  return [...byId.values()].reduce<TrustedContact[]>((acc, c) => upsertContact(acc, c), []);
}

export function smsUrl(phone: string, body: string, platform: 'android' | 'ios' = 'android'): string {
  const joiner = platform === 'ios' ? '&' : '?';
  return `sms:${normalizePhone(phone)}${joiner}body=${encodeURIComponent(body)}`;
}

export function telLink(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}

export async function loadContacts(): Promise<TrustedContact[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is TrustedContact => Boolean(c) && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.phone === 'string',
    );
  } catch {
    return [];
  }
}

export async function saveContacts(list: TrustedContact[]): Promise<void> {
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(list));
}
