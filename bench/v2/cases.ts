import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type * as Yaml from 'yaml';
import { FAMILIES, type Family, type Kind, LANGS, type Lang, type ScamType, type Verdict } from '../../server/src/types.js';
import { BENCH_DIR, IMAGE_EXT, readLabels, VERDICTS } from '../lib.js';
import { ADVICE_IDS, type AdviceId, FACT_LIBRARY, type Phrase } from './lexicon.js';
import { countryCode, type FactSpec } from './match.js';
import { type JsonSchema, validateSchema } from './schema.js';

export const YAML = createRequire(new URL('../../server/package.json', import.meta.url))('yaml') as typeof Yaml;
export const CASES_DIR = join(BENCH_DIR, 'cases');
export const SCHEMA_PATH = join(CASES_DIR, 'case.schema.json');
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface SceneMessage {
  from: 'them' | 'me' | 'time';
  text: string;
}
export interface Scene {
  layout: 'chat' | 'sms' | 'post';
  sender: string;
  subtitle?: string;
  messages: SceneMessage[];
}

type FactEntry = string | { id: string; variants?: string[]; library?: boolean };
type AdviceEntry = AdviceId | { id: AdviceId; variants?: string[] };

export interface CaseFile {
  id: string;
  file: string;
  language: Lang;
  content_language?: string;
  kind?: Kind;
  home?: string;
  destination?: string;
  app?: string;
  scam_type?: ScamType;
  source_text: string;
  expected_verdict: Verdict;
  score_range?: [number, number];
  families?: Family[];
  must_mention?: FactEntry[];
  must_advise?: AdviceEntry[];
  must_not?: { accuse?: string[]; advice?: string[] };
  translations?: { language: string; source_text: string; file?: string; synthetic?: Scene }[];
  synthetic?: Scene;
  notes?: string;
  public?: boolean;
  draft?: boolean;
}

export interface Translation {
  language: string;
  sourceText: string;
  image?: string;
  synthetic?: Scene;
}

/** A case ready to run. Legacy labels.csv rows have no source text and skip the text metrics. */
export interface Case {
  id: string;
  path?: string;
  image: string;
  language: Lang;
  kind: Kind;
  app: string;
  scamType: string;
  home?: string;
  destination?: string;
  countries: string[];
  sourceText?: string;
  expected: Verdict;
  scoreRange: [number, number];
  families?: Family[];
  facts: FactSpec[];
  advice: { id: AdviceId; extra: Phrase[] }[];
  accuse: string[];
  harmful: string[];
  translations: Translation[];
  synthetic?: Scene;
  public: boolean;
  legacy: boolean;
}

export const VERDICT_BAND: Record<Verdict, [number, number]> = { safe: [0, 34], careful: [35, 69], danger: [70, 100] };

export function loadSchema(): JsonSchema {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as JsonSchema;
}

export function parseCaseText(text: string, path: string): unknown {
  return extname(path) === '.json' ? JSON.parse(text) : YAML.parse(text);
}

export function resolveFacts(entries: FactEntry[] = []): FactSpec[] {
  return entries.map((e) => {
    if (typeof e === 'string') return { id: e, variants: FACT_LIBRARY[e] ?? [e] };
    const lib = e.library || !e.variants ? (FACT_LIBRARY[e.id] ?? []) : [];
    return { id: e.id, variants: [...new Set([...(e.variants ?? []), ...lib])] };
  });
}

export function toCase(raw: CaseFile, path: string): Case {
  const dir = dirname(path);
  const countries = [raw.home, raw.destination].map(countryCode).filter((c): c is string => Boolean(c));
  return {
    id: raw.id,
    path,
    image: resolve(dir, raw.file),
    language: raw.language,
    kind: raw.kind ?? 'screen',
    app: raw.app ?? 'unspecified',
    scamType: raw.scam_type ?? (raw.expected_verdict === 'safe' ? 'none' : 'other'),
    home: raw.home,
    destination: raw.destination,
    countries: [...new Set(countries)],
    sourceText: raw.source_text,
    expected: raw.expected_verdict,
    scoreRange: raw.score_range ?? VERDICT_BAND[raw.expected_verdict],
    families: raw.families ?? (raw.expected_verdict === 'safe' ? [] : undefined),
    facts: resolveFacts(raw.must_mention),
    advice: (raw.must_advise ?? []).map((a) => (typeof a === 'string' ? { id: a, extra: [] } : { id: a.id, extra: a.variants ?? [] })),
    accuse: raw.must_not?.accuse ?? [],
    harmful: raw.must_not?.advice ?? [],
    translations: (raw.translations ?? []).map((t) => ({
      language: t.language,
      sourceText: t.source_text,
      image: t.file ? resolve(dir, t.file) : undefined,
      synthetic: t.synthetic,
    })),
    synthetic: raw.synthetic,
    public: raw.public === true,
    legacy: false,
  };
}

export interface LoadResult {
  cases: Case[];
  problems: { path: string; errors: string[] }[];
  drafts: string[];
}

/** Semantic checks the schema cannot express. */
export function checkCase(raw: CaseFile, path: string, opts: { requireImage?: boolean } = {}): string[] {
  const errs: string[] = [];
  if (basename(path, extname(path)) !== raw.id) errs.push(`id: "${raw.id}" must match the file name`);
  const image = resolve(dirname(path), raw.file);
  if (!(extname(image).toLowerCase() in IMAGE_EXT)) errs.push(`file: unsupported image type ${extname(image)}`);
  else if (!existsSync(image)) {
    if (opts.requireImage !== false) errs.push(`file: ${raw.file} does not exist${raw.synthetic ? ' (run npm run bench:render)' : ''}`);
  } else if (readFileSync(image).byteLength > MAX_IMAGE_BYTES) errs.push('file: image is over 4 MB');
  if (raw.score_range) {
    const [lo, hi] = raw.score_range;
    const band = VERDICT_BAND[raw.expected_verdict];
    if (lo > hi) errs.push('score_range: min is above max');
    if (hi < band[0] || lo > band[1])
      errs.push(`score_range: [${lo}, ${hi}] does not overlap the ${raw.expected_verdict} band ${band.join('-')}`);
  }
  if (raw.expected_verdict === 'safe' && raw.families?.length) errs.push('families: a safe case should list no families');
  if (raw.expected_verdict !== 'safe' && !raw.families?.length) errs.push('families: a risky case needs at least one family');
  const ids = resolveFacts(raw.must_mention).map((f) => f.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) errs.push(`must_mention: duplicate id ${dup}`);
  for (const f of raw.must_mention ?? []) {
    if (typeof f === 'string' && !FACT_LIBRARY[f] && f.length > 40)
      errs.push(`must_mention: "${f.slice(0, 30)}..." is long; use an object with variants`);
  }
  for (const t of raw.translations ?? []) {
    if (t.file && !existsSync(resolve(dirname(path), t.file)) && opts.requireImage !== false) {
      errs.push(`translations: ${t.file} does not exist${t.synthetic ? ' (run npm run bench:render)' : ''}`);
    }
  }
  if (!countryCode(raw.home) && raw.home) errs.push(`home: unknown country "${raw.home}"`);
  for (const a of raw.must_advise ?? []) {
    const id = typeof a === 'string' ? a : a.id;
    if (!(ADVICE_IDS as readonly string[]).includes(id)) errs.push(`must_advise: unknown id ${id}`);
  }
  return errs;
}

export function loadCases(dir = CASES_DIR, opts: { allowDrafts?: boolean; requireImage?: boolean } = {}): LoadResult {
  const schema = loadSchema();
  const out: LoadResult = { cases: [], problems: [], drafts: [] };
  if (!existsSync(dir)) return out;
  const files = readdirSync(dir)
    .filter((f) => /\.(ya?ml|json)$/.test(f) && !f.startsWith('_') && f !== 'case.schema.json')
    .sort();
  for (const f of files) {
    const path = join(dir, f);
    let raw: unknown;
    try {
      raw = parseCaseText(readFileSync(path, 'utf8'), path);
    } catch (err) {
      out.problems.push({ path, errors: [`parse error: ${(err as Error).message.split('\n')[0]}`] });
      continue;
    }
    const errors = validateSchema(raw, schema);
    if (!errors.length) errors.push(...checkCase(raw as CaseFile, path, opts));
    if (errors.length) {
      out.problems.push({ path, errors });
      continue;
    }
    const c = raw as CaseFile;
    if (c.draft && !opts.allowDrafts) {
      out.drafts.push(path);
      continue;
    }
    out.cases.push(toCase(c, path));
  }
  return out;
}

/** Old labels.csv rows become cases with a verdict label only. */
export function legacyCases(labelsPath: string): Case[] {
  const dir = dirname(labelsPath);
  return readLabels(labelsPath)
    .filter((l) => (VERDICTS as readonly string[]).includes(l.expected))
    .map((l) => {
      const expected = l.expected as Verdict;
      const language = (LANGS as readonly string[]).includes(l.language) ? (l.language as Lang) : 'en';
      return {
        id: basename(l.file, extname(l.file)),
        image: resolve(dir, l.file),
        language,
        kind: 'screen' as const,
        app: l.app || 'unspecified',
        scamType: l.scam_type || 'unspecified',
        countries: [],
        expected,
        scoreRange: VERDICT_BAND[expected],
        facts: [],
        advice: [],
        accuse: [],
        harmful: [],
        translations: [],
        public: l.public === 'yes',
        legacy: true,
      } satisfies Case;
    });
}

export const isFamily = (f: string): f is Family => (FAMILIES as readonly string[]).includes(f);
