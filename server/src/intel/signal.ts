import type { Extraction, Family, Flag, Kind, ScamType, Severity, Verdict } from '../types.js';
import { toCountryCode } from './countries.js';
import { type HashedIndicator, type Hasher, hashIndicators, publicHost } from './indicators.js';
import { minhash } from './minhash.js';
import { finalizeLabel, finalizeTemplate } from './template.js';
import { type AggWrite, GLOBAL, RETENTION_DAYS, type SignalDoc } from './types.js';

export interface PrepareInput {
  kind: Kind;
  language: string;
  url?: string;
  home?: string;
  destination?: string;
}

export interface Prepared {
  kind: Kind;
  language: string;
  home?: string;
  dest?: string;
  template?: string;
  campaign?: string;
  sig?: number[];
  ind: HashedIndicator[];
  domains: string[];
}

export interface Outcome {
  verdict: Verdict;
  score: number;
  scamType: ScamType;
  flags: Array<Pick<Flag, 'family' | 'severity'>>;
}

/** Local, pure step: redact the model template and hash sender indicators. Nothing leaves memory. */
export function prepare(input: PrepareInput, ex: Extraction, hasher: Hasher): Prepared {
  const hosts = new Set<string>();
  for (const u of [input.url, ...ex.urls, ...ex.entities.domains]) {
    const h = u ? publicHost(u) : null;
    if (h) hosts.add(h);
  }
  const ind = hashIndicators(
    {
      phones: [...(ex.sender?.phones ?? []), ...ex.entities.phones],
      handles: ex.sender?.handles ?? [],
      accounts: ex.sender?.accounts ?? [],
    },
    hasher,
  );
  const template = finalizeTemplate(ex.template, ex.templateSafe);
  const lang = ex.inputLanguage?.toLowerCase();
  return {
    kind: input.kind,
    language: lang && /^[a-z]{2,3}$/.test(lang) ? lang : input.language,
    home: toCountryCode(input.home),
    dest: toCountryCode(input.destination) ?? toCountryCode(ex.entities.country),
    template,
    campaign: finalizeLabel(ex.campaign),
    sig: template ? minhash(template) : undefined,
    ind,
    domains: [...hosts].slice(0, 5),
  };
}

export const dayKey = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '');

const dayKeyMs = (d: Date) => dayToDate(dayKey(d)).getTime();

export const dayToDate = (day: string) => new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8))));

export const scopesOf = (p: { home?: string; dest?: string }) => [
  GLOBAL,
  ...new Set([p.home, p.dest].filter((c): c is string => Boolean(c))),
];

export function isRecordable(o: Outcome, confirmed = false): boolean {
  if (confirmed) return o.scamType !== 'none';
  return o.verdict !== 'safe' && o.scamType !== 'none';
}

/** Strongest severity per family, in a stable order. */
export function strongestFlags(flags: Outcome['flags']): SignalDoc['flags'] {
  const rank: Record<Severity, number> = { low: 0, medium: 1, high: 2 };
  const best = new Map<Family, Severity>();
  for (const f of flags) {
    const cur = best.get(f.family);
    if (!cur || rank[f.severity] > rank[cur]) best.set(f.family, f.severity);
  }
  return [...best].map(([family, severity]) => ({ family, severity })).sort((a, b) => a.family.localeCompare(b.family));
}

export function buildSignal(
  p: Prepared,
  o: Outcome,
  hasher: Hasher,
  opts: {
    now?: Date;
    clusterId?: string;
    seed?: boolean;
    nonce?: string;
    expireBase?: Date;
    uid?: string;
    confirmed?: boolean;
    src?: 'reported' | 'feedback';
  } = {},
): { id: string; doc: SignalDoc } {
  const now = opts.now ?? new Date();
  const day = dayKey(now);
  const dayTs = dayToDate(day);
  const flags = strongestFlags(o.flags);
  const anchor = [...p.ind.map((i) => `${i.t}:${i.h}`), ...p.domains].sort().join(',');
  const rk = opts.uid ? hasher.hash('rk', `${opts.uid}|${day}`) : undefined;
  const idSource = anchor
    ? `${day}|${o.scamType}|${anchor}|${rk ?? ''}`
    : `${day}|${o.scamType}|${p.template ?? opts.nonce ?? Math.random()}`;
  const doc: SignalDoc = {
    v: 1,
    scamType: o.scamType,
    flags,
    verdict: o.verdict,
    scoreBucket: Math.min(80, Math.floor(o.score / 20) * 20),
    kind: p.kind,
    language: p.language,
    ind: p.ind,
    domains: p.domains,
    day,
    dayTs,
    expireAt: new Date((opts.expireBase ? new Date(dayKeyMs(opts.expireBase)) : dayTs).getTime() + RETENTION_DAYS * 86_400_000),
  };
  if (p.home) doc.home = p.home;
  if (p.dest) doc.dest = p.dest;
  if (p.template) doc.template = p.template;
  if (p.campaign) doc.campaign = p.campaign;
  if (opts.clusterId) doc.clusterId = opts.clusterId;
  if (rk) doc.rk = rk;
  if (opts.seed) doc.seed = true;
  if (opts.confirmed) doc.confirmed = true;
  if (opts.src) doc.src = opts.src;
  return { id: hasher.hash('sig', idSource), doc };
}

export const aggId = (kind: string, scope: string, key: string) => `${kind}:${scope}:${key}`;

export function aggregateWrites(doc: SignalDoc, hasher: Hasher): AggWrite[] {
  const scopes = scopesOf(doc);
  const fams = doc.flags.map((f) => f.family);
  const out: AggWrite[] = [];
  for (const scope of scopes) {
    out.push({
      id: aggId('type', scope, doc.scamType),
      kind: 'type',
      scope,
      key: doc.scamType,
      scamType: doc.scamType,
      day: doc.day,
      fams,
    });
    if (doc.clusterId) {
      out.push({
        id: aggId('cluster', scope, doc.clusterId),
        kind: 'cluster',
        scope,
        key: doc.clusterId,
        scamType: doc.scamType,
        day: doc.day,
        fams: [],
      });
    }
    for (const host of doc.domains) {
      const key = hasher.hash('dom', host).slice(0, 24);
      out.push({ id: aggId('dom', scope, key), kind: 'dom', scope, key, value: host, day: doc.day, fams: [] });
    }
  }
  for (const i of doc.ind) {
    out.push({ id: aggId('ind', GLOBAL, i.h), kind: 'ind', scope: GLOBAL, key: i.h, itype: i.t, day: doc.day, fams: [] });
  }
  if (doc.rk) for (const w of out) w.marker = hasher.hash('seen', `${doc.rk}|${w.id}`);
  return out;
}
