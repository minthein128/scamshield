import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BENCH_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SRC = '/home/ubuntu/.seti/workspace/b1632abd-a2dd-4fa2-b8ff-c415fca04aae/uploads/bench';
export const IMAGE_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
export const COLUMNS = ['file', 'app', 'expected', 'scam_type', 'language', 'notes', 'public'] as const;
export const VERDICTS = ['safe', 'careful', 'danger'] as const;
export type Expected = (typeof VERDICTS)[number];
export type LabelRow = Record<(typeof COLUMNS)[number], string>;

export const resultsDir = () => join(BENCH_DIR, 'results');

export function parseArgs(argv: string[]) {
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (!a.startsWith('--')) continue;
    const [k, inline] = a.slice(2).split('=', 2);
    const next = argv[i + 1];
    if (inline !== undefined) flags[k as string] = inline;
    else if (next && !next.startsWith('--')) {
      flags[k as string] = next;
      i++;
    } else flags[k as string] = true;
  }
  return flags;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i] as string;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
export const toCsv = (rows: LabelRow[]) =>
  `${[COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => esc(r[c] ?? '')).join(','))].join('\n')}\n`;

export function readLabels(path: string): LabelRow[] {
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'));
  if (!head) return [];
  const idx = head.map((h) => h.trim().toLowerCase());
  return body.map((cells) => {
    const r = {} as LabelRow;
    for (const col of COLUMNS) r[col] = (cells[idx.indexOf(col)] ?? '').trim();
    r.expected = r.expected.toLowerCase();
    r.public = r.public.toLowerCase();
    return r;
  });
}

export const srcDir = (flag: string | true | undefined) =>
  resolve(typeof flag === 'string' ? flag : (process.env.BENCH_SRC ?? DEFAULT_SRC));

export interface Row {
  file: string;
  app: string;
  expected: Expected;
  scamTypeExpected: string;
  language: string;
  verdict: string;
  score: number | null;
  scamType: string | null;
  flagFamilies: string[];
  flagCount: number;
  seenCount: number | null;
  latencyMs: number;
  correct: boolean;
  piiHits: Record<string, number>;
  error?: string;
}

export interface Summary {
  n: number;
  errors: number;
  accuracy: number;
  exactAccuracy: number;
  falsePositiveRate: number | null;
  missRate: number | null;
  safeCases: number;
  riskyCases: number;
  scamTypeAccuracy: number | null;
  p50: number;
  p95: number;
  piiLeaks: number;
  piiByType: Record<string, number>;
  confusion: Record<string, Record<string, number>>;
  perApp: Record<string, { n: number; correct: number }>;
  perLanguage: Record<string, { n: number; correct: number }>;
}

export const isRisky = (v: string) => v === 'careful' || v === 'danger';

export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? 0;
}

export function summarize(rows: Row[]): Summary {
  const confusion: Summary['confusion'] = {};
  for (const e of VERDICTS) confusion[e] = { safe: 0, careful: 0, danger: 0, ERROR: 0 };
  const perApp: Summary['perApp'] = {};
  const perLanguage: Summary['perLanguage'] = {};
  const piiByType: Record<string, number> = {};
  let safeCases = 0;
  let fp = 0;
  let riskyCases = 0;
  let missed = 0;
  let exact = 0;
  let typed = 0;
  let typedOk = 0;
  for (const r of rows) {
    const row = confusion[r.expected] as Record<string, number>;
    const col = r.verdict in row ? r.verdict : 'ERROR';
    row[col] = (row[col] ?? 0) + 1;
    if (r.expected === r.verdict) exact++;
    for (const [bucket, key] of [
      [perApp, r.app || 'unspecified'],
      [perLanguage, r.language || 'unspecified'],
    ] as const) {
      const b = bucket[key] ?? { n: 0, correct: 0 };
      b.n++;
      if (r.correct) b.correct++;
      bucket[key] = b;
    }
    if (r.expected === 'safe') {
      safeCases++;
      if (isRisky(r.verdict)) fp++;
    } else {
      riskyCases++;
      if (!isRisky(r.verdict)) missed++;
      if (r.scamTypeExpected && r.scamTypeExpected !== 'none' && !r.error) {
        typed++;
        if (r.scamTypeExpected === r.scamType) typedOk++;
      }
    }
    for (const [k, v] of Object.entries(r.piiHits)) piiByType[k] = (piiByType[k] ?? 0) + v;
  }
  const ok = rows.filter((r) => !r.error);
  const ms = ok.map((r) => r.latencyMs);
  const piiLeaks = Object.values(piiByType).reduce((a, b) => a + b, 0);
  return {
    n: rows.length,
    errors: rows.length - ok.length,
    accuracy: rows.length ? rows.filter((r) => r.correct).length / rows.length : 0,
    exactAccuracy: rows.length ? exact / rows.length : 0,
    falsePositiveRate: safeCases ? fp / safeCases : null,
    missRate: riskyCases ? missed / riskyCases : null,
    safeCases,
    riskyCases,
    scamTypeAccuracy: typed ? typedOk / typed : null,
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    piiLeaks,
    piiByType,
    confusion,
    perApp,
    perLanguage,
  };
}

export interface BenchResult {
  kind: 'screenshot-bench';
  date: string;
  set: string;
  model: string;
  mode: 'api' | 'in-process';
  shareSignals: false;
  summary: Summary;
  rows: Row[];
}
