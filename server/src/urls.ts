const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s<>"'()\]]+|\b[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9-]{1,63})*\.(?:com|net|org|info|xyz|top|club|online|site|shop|store|vip|app|link|click|cc|co|me|io|id|ph|th|kh|mm|asia|biz|live|work|icu)\b(?:\/[^\s<>"'()\]]*)?/gi;

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[.,;:!?]+$/, '');
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function findUrls(text: string): string[] {
  return (text.match(URL_RE) ?? []).map(normalizeUrl).filter((u): u is string => u !== null);
}

export function mergeUrls(max: number, ...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      const n = normalizeUrl(raw);
      if (n) seen.add(n);
    }
  }
  return [...seen].slice(0, max);
}

export function registrableDomain(url: string): string {
  const parts = new URL(url).hostname.toLowerCase().replace(/\.$/, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  const twoLevel = new Set(['co', 'com', 'net', 'org', 'gov', 'ac', 'or', 'go', 'web']);
  const sld = parts[parts.length - 2] ?? '';
  const keep = twoLevel.has(sld) && (parts[parts.length - 1]?.length ?? 0) === 2 ? 3 : 2;
  return parts.slice(-keep).join('.');
}
