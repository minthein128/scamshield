const SLOTS = 32;
const SEEDS = Array.from({ length: SLOTS }, (_, i) => Math.imul(i + 1, 0x9e3779b1) >>> 0);

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mix(x: number): number {
  let h = x;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function shingles(template: string, n = 4): Set<string> {
  const t = template
    .toLowerCase()
    .replace(/\[[a-z_]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...t];
  const out = new Set<string>();
  for (let i = 0; i + n <= chars.length; i++) out.add(chars.slice(i, i + n).join(''));
  return out;
}

export function minhash(template: string): number[] | undefined {
  const sh = shingles(template);
  if (sh.size < 8) return undefined;
  const sig = new Array<number>(SLOTS).fill(0xffffffff);
  for (const s of sh) {
    const base = fnv(s);
    for (let i = 0; i < SLOTS; i++) {
      const v = mix(base ^ (SEEDS[i] ?? 0));
      if (v < (sig[i] ?? 0xffffffff)) sig[i] = v;
    }
  }
  return sig;
}

export function similarity(a: number[], b: number[]): number {
  let same = 0;
  for (let i = 0; i < SLOTS; i++) if (a[i] === b[i]) same++;
  return same / SLOTS;
}

export const MATCH_THRESHOLD = 0.5;

export function nearest<T extends { sig?: number[] }>(sig: number[], candidates: T[], min = MATCH_THRESHOLD): T | undefined {
  let best: T | undefined;
  let bestSim = min;
  for (const c of candidates) {
    if (!c.sig) continue;
    const s = similarity(sig, c.sig);
    if (s >= bestSim) {
      best = c;
      bestSim = s;
    }
  }
  return best;
}
