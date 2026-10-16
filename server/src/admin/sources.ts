import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const OFFICIAL_SUFFIXES = [
  'iom.int',
  'un.org',
  'unodc.org',
  'ohchr.org',
  'ilo.org',
  'unicef.org',
  'unfpa.org',
  'unwomen.org',
  'undp.org',
  'unhcr.org',
  'interpol.int',
  'europa.eu',
  'state.gov',
  'asean.org',
];

/** True when the host looks like a government, police, embassy or UN and IOM site. */
export function isOfficialHost(host: string): boolean {
  const h = host
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '');
  if (OFFICIAL_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))) return true;
  if (/(^|\.)(gov|mil)$/.test(h)) return true;
  if (/\.(gov|go|gob|gouv|govt|mil|police|polis)\.[a-z]{2}$/.test(h)) return true;
  if (/(^|[.-])(embassy|consulate|kedutaan|konsulat|kbri|kjri)([.-]|$)/.test(h)) return true;
  return h.endsWith('.int');
}

export function isOfficialUrl(url: string): boolean {
  try {
    return isOfficialHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export const hostOf = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

/** True when the text shows the number. Short codes must stand alone; long numbers ignore spacing and the country code. */
export function numberAppears(text: string, dial: string | undefined, number?: string): boolean {
  const wanted = new Set<string>();
  for (const v of [dial, number]) {
    const d = (v ?? '').replace(/\D/g, '');
    if (d.length >= 2) wanted.add(d);
  }
  const flat = text.replace(/[\s\-(). ]/g, '');
  for (const d of wanted) {
    if (d.length <= 6) {
      if (new RegExp(`(?<!\\d)${d}(?!\\d)`).test(text)) return true;
      continue;
    }
    if (flat.replace(/\+/g, '').includes(d)) return true;
    for (const cut of [1, 2, 3]) {
      const rest = d.slice(cut);
      if (rest.length >= 7 && flat.includes(rest)) return true;
    }
  }
  return false;
}

const BLOCKED_HOST = /(^|\.)(localhost|local|internal|localdomain|lan|home)$/i;

function privateIp(ip: string): boolean {
  if (ip.includes(':')) return /^(::1?$|fc|fd|fe80)/i.test(ip) || ip.startsWith('::ffff:');
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a >= 224
  );
}

/** Blocks non-https URLs and hosts that resolve to private networks. */
export async function safeToFetch(url: string, resolve: (host: string) => Promise<string[]> = defaultResolve): Promise<boolean> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.port) return false;
    const host = u.hostname;
    if (BLOCKED_HOST.test(host)) return false;
    if (isIP(host)) return !privateIp(host);
    const ips = await resolve(host);
    return ips.length > 0 && ips.every((ip) => !privateIp(ip));
  } catch {
    return false;
  }
}

const defaultResolve = async (host: string) => (await lookup(host, { all: true })).map((r) => r.address);

export type PageCheck = 'number_found' | 'number_not_found' | 'unreadable' | 'unreachable' | 'blocked';

const MAX_BYTES = 800_000;

/** Fetches a public https page and reports whether it shows the number. Never throws. */
export async function checkPage(
  url: string,
  dial: string | undefined,
  number: string | undefined,
  fetchFn: typeof fetch = fetch,
  resolve?: (host: string) => Promise<string[]>,
): Promise<PageCheck> {
  let current = url;
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!(await safeToFetch(current, resolve))) return 'blocked';
      const res = await fetchFn(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(6000),
        headers: { 'user-agent': 'KakweAdminBot/1.0 (+https://saferoute-aibc.web.app)', accept: 'text/html,text/plain' },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get('location');
        if (!next) return 'unreachable';
        current = new URL(next, current).toString();
        continue;
      }
      if (!res.ok) return 'unreachable';
      const type = res.headers.get('content-type') ?? '';
      if (!/text\/|html|xml|json/i.test(type)) return 'unreadable';
      const buf = (await res.text()).slice(0, MAX_BYTES);
      return numberAppears(buf.replace(/<[^>]+>/g, ' '), dial, number) ? 'number_found' : 'number_not_found';
    }
    return 'unreachable';
  } catch {
    return 'unreachable';
  }
}
