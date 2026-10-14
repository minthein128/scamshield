import { createHmac } from 'node:crypto';
import { foldDigits } from './redact.js';

export type IndicatorType = 'phone' | 'handle' | 'account';

export interface HashedIndicator {
  t: IndicatorType;
  h: string;
}

const COUNTRY_CODES = ['855', '856', '66', '95', '62', '63', '84', '60', '65'];

export function normalizePhone(raw: string): string | null {
  const t = raw.trim();
  let d = foldDigits(t).replace(/\D/g, '');
  const intl = t.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2);
  if (intl || !d.startsWith('0')) {
    const cc = COUNTRY_CODES.find((c) => d.startsWith(c) && d.length - c.length >= 8 && d.length - c.length <= 12);
    if (cc) d = d.slice(cc.length);
  }
  d = d.replace(/^0+/, '');
  return d.length >= 7 && d.length <= 12 ? d : null;
}

export function normalizeHandle(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  s = s
    .replace(/^https?:\/\//, '')
    .replace(/^(?:www\.)?(?:t\.me|telegram\.me|line\.me\/ti\/p|line\.me\/r\/ti\/p|m\.me|instagram\.com|facebook\.com)\//, '');
  s = s
    .replace(/^[@~]+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/[.,;:!]+$/, '');
  return /^[a-z0-9][a-z0-9_.-]{2,63}$/.test(s) ? s : null;
}

export function normalizeAccount(raw: string): string | null {
  const d = foldDigits(raw).replace(/\D/g, '');
  return d.length >= 6 && d.length <= 20 ? d : null;
}

const SKIP_HOSTS = new Set([
  'google.com',
  'youtube.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'tiktok.com',
  't.me',
  'telegram.org',
  'telegram.me',
  'wa.me',
  'whatsapp.com',
  'line.me',
  'wechat.com',
  'x.com',
  'twitter.com',
  'shopee.com',
  'lazada.com',
  'tokopedia.com',
  'linkedin.com',
  'wikipedia.org',
  'apple.com',
  'microsoft.com',
]);

/** Public host of a URL or bare domain, or null when it is a common platform or invalid. */
export function publicHost(raw: string): string | null {
  const t = raw.trim().replace(/[.,;:!?]+$/, '');
  if (!t || /\s/.test(t)) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) || host.length > 100) return null;
  const parts = host.split('.');
  const base = parts.slice(-2).join('.');
  if (SKIP_HOSTS.has(host) || SKIP_HOSTS.has(base)) return null;
  return host;
}

export interface Hasher {
  hash(type: IndicatorType | 'dom' | 'day' | 'sig', value: string): string;
}

export function createHasher(pepper: string): Hasher {
  return { hash: (type, value) => createHmac('sha256', pepper).update(`${type}|${value}`).digest('hex').slice(0, 32) };
}

const looksLikePhone = (s: string) => {
  const d = foldDigits(s).replace(/\D/g, '');
  return d.length >= 8 && d.length / s.replace(/\s/g, '').length >= 0.6;
};

export interface RawIndicators {
  phones: string[];
  handles: string[];
  accounts: string[];
}

/** Validate, normalise and hash sender-side indicators. Invalid values are dropped. */
export function hashIndicators(raw: RawIndicators, hasher: Hasher): HashedIndicator[] {
  const seen = new Map<string, HashedIndicator>();
  const add = (t: IndicatorType, norm: string | null) => {
    if (!norm) return;
    const h = hasher.hash(t, norm);
    seen.set(`${t}:${h}`, { t, h });
  };
  for (const p of raw.phones) {
    if (looksLikePhone(p)) add('phone', normalizePhone(p));
    else add('handle', normalizeHandle(p));
  }
  for (const h of raw.handles) {
    if (looksLikePhone(h)) add('phone', normalizePhone(h));
    else add('handle', normalizeHandle(h));
  }
  for (const a of raw.accounts) add('account', normalizeAccount(a));
  return [...seen.values()].sort((a, b) => (a.t + a.h).localeCompare(b.t + b.h)).slice(0, 8);
}
