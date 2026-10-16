import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { GoogleGenAI } from '@google/genai';
import { type Config, loadConfig } from '../../server/src/config.js';
import { createCorrelator } from '../../server/src/correlate.js';
import { createClient, type Extractor } from '../../server/src/extract.js';
import { createExtractor } from '../../server/src/extract-stream.js';
import { createGrounder } from '../../server/src/ground.js';
import { createPipeline } from '../../server/src/pipeline.js';
import { SYSTEM_PROMPT } from '../../server/src/prompt.js';
import type { CheckRequest, Extraction } from '../../server/src/types.js';
import { BENCH_DIR } from '../lib.js';
import type { Case } from './cases.js';
import { YAML } from './cases.js';
import type { RunRecord, VariantKind } from './types.js';

export const RESPONSE_CACHE = join(BENCH_DIR, '.cache', 'v2', 'responses');
const CACHE_VERSION = 1;

export const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

export interface PromptVariant {
  name: string;
  system: string;
  hash: string;
  source: string;
}

interface VariantFile {
  name?: string;
  system?: string;
  append?: string;
  replace?: { from: string; to: string }[];
}

/** Production prompt, or a variant: .txt/.md is the whole prompt; .yaml/.json patches it. */
export function loadPromptVariant(path?: string): PromptVariant {
  if (!path) return { name: 'production', system: SYSTEM_PROMPT, hash: sha(SYSTEM_PROMPT).slice(0, 12), source: 'server/src/prompt.ts' };
  const text = readFileSync(path, 'utf8');
  const ext = extname(path).toLowerCase();
  let system: string;
  let name = basename(path, ext);
  if (ext === '.txt' || ext === '.md') system = text;
  else {
    const spec = (ext === '.json' ? JSON.parse(text) : YAML.parse(text)) as VariantFile;
    name = spec.name ?? name;
    system = spec.system ?? SYSTEM_PROMPT;
    for (const r of spec.replace ?? []) {
      if (!system.includes(r.from)) throw new Error(`prompt variant ${path}: replace.from not found: "${r.from.slice(0, 60)}"`);
      system = system.replace(r.from, r.to);
    }
    if (spec.append) system = `${system}\n${spec.append}`;
  }
  if (system === SYSTEM_PROMPT && path) console.warn(`prompt variant ${path} is identical to the production prompt`);
  return { name, system, hash: sha(system).slice(0, 12), source: path };
}

type Models = GoogleGenAI['models'];

/** Wraps the SDK client so extraction uses the variant prompt; other calls pass through. */
export function withSystemPrompt(client: Pick<GoogleGenAI, 'models'>, system: string): Pick<GoogleGenAI, 'models'> {
  const swap = <T extends { config?: { systemInstruction?: unknown } }>(args: T): T =>
    args.config?.systemInstruction === SYSTEM_PROMPT ? { ...args, config: { ...args.config, systemInstruction: system } } : args;
  const models = {
    generateContent: (args: Parameters<Models['generateContent']>[0]) => client.models.generateContent(swap(args)),
    generateContentStream: (args: Parameters<Models['generateContentStream']>[0]) => client.models.generateContentStream(swap(args)),
  };
  return { models: models as unknown as Models };
}

export interface RunnerOptions {
  model?: string;
  variant: PromptVariant;
  grounding: boolean;
  cache: boolean;
  /** Use cached responses only; a cache miss becomes an error instead of a model call. */
  offline?: boolean;
  retries?: number;
}

export interface RunInput {
  c: Case;
  name: string;
  kind: 'base' | VariantKind;
  image: string;
  mime: string;
  sourceText?: string;
  runIndex: number;
}

export interface Runner {
  model: string;
  config: Config;
  client: Pick<GoogleGenAI, 'models'>;
  run(input: RunInput): Promise<RunRecord>;
  keyOf(input: RunInput): string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createRunner(opts: RunnerOptions): Runner {
  const cfg = loadConfig({
    ...process.env,
    MOCK: '0',
    LOG_SILENT: '1',
    ...(opts.model ? { GEMINI_MODEL: opts.model } : {}),
    ...(opts.grounding ? {} : { GROUNDING: '0' }),
  });
  const hasKey = Boolean(cfg.geminiApiKey || (cfg.useVertex && cfg.project));
  const base = hasKey ? createClient(cfg) : undefined;
  const client = base ? withSystemPrompt(base, opts.variant.system) : undefined;

  const keyOf = (i: RunInput) =>
    sha(
      JSON.stringify([
        CACHE_VERSION,
        i.c.id,
        i.name,
        opts.variant.hash,
        cfg.model,
        sha(readFileSync(i.image)).slice(0, 16),
        i.c.language,
        i.c.kind,
        i.c.destination ?? '',
        i.c.home ?? '',
        opts.grounding,
        i.runIndex,
      ]),
    );

  async function once(i: RunInput): Promise<Omit<RunRecord, 'key' | 'cached'>> {
    if (!client) throw new Error('no GEMINI_API_KEY: set it, or rerun with --rescore to use cached responses only');
    const extractions: Extraction[] = [];
    let reasked = false;
    const inner = createExtractor(cfg, client);
    const extractor: Extractor = {
      async extract(req, o) {
        if (o?.hedgeRetry) reasked = true;
        const x = await inner.extract(req, o);
        extractions.push(x);
        return x;
      },
    };
    const pipeline = createPipeline({
      extractor,
      correlator: createCorrelator(cfg, { getToken: async () => undefined }),
      grounder: createGrounder(cfg, client),
      model: cfg.model,
      budgetMs: cfg.requestBudgetMs,
      earlyLinks: cfg.earlyLinks,
      earlyGrounding: cfg.streamExtract,
      dangerGroundCapMs: cfg.dangerGroundCapMs,
      resultCacheTtlMs: 0,
    });
    const req: CheckRequest = {
      kind: i.c.kind,
      language: i.c.language,
      imageBase64: readFileSync(i.image).toString('base64'),
      imageMimeType: i.mime,
      shareSignals: false,
      ...(i.c.destination || i.c.home ? { context: { destination: i.c.destination, home: i.c.home } } : {}),
    };
    const t = Date.now();
    const response = await pipeline.run(req);
    return {
      caseId: i.c.id,
      variant: i.name,
      kind: i.kind,
      response,
      extraction: extractions.at(-1),
      reasked,
      latencyMs: Date.now() - t,
      sourceText: i.sourceText,
    };
  }

  return {
    model: cfg.model,
    config: cfg,
    client: base as Pick<GoogleGenAI, 'models'>,
    keyOf,
    async run(i) {
      const key = keyOf(i);
      const file = join(RESPONSE_CACHE, `${key}.json`);
      if (opts.cache && existsSync(file)) {
        const hit = JSON.parse(readFileSync(file, 'utf8')) as RunRecord;
        return { ...hit, sourceText: i.sourceText, cached: true };
      }
      if (opts.offline) {
        return {
          caseId: i.c.id,
          variant: i.name,
          kind: i.kind,
          key,
          latencyMs: 0,
          cached: false,
          error: 'not in cache',
          sourceText: i.sourceText,
        };
      }
      const retries = opts.retries ?? 2;
      let last: Error | undefined;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const rec = await once(i);
          const out: RunRecord = { ...rec, key, cached: false };
          mkdirSync(RESPONSE_CACHE, { recursive: true });
          writeFileSync(file, JSON.stringify({ ...out, sourceText: undefined }));
          return out;
        } catch (err) {
          last = err as Error;
          if (/no GEMINI_API_KEY/.test(last.message)) break;
          if (attempt < retries) await sleep(4000 * (attempt + 1) ** 2);
        }
      }
      return {
        caseId: i.c.id,
        variant: i.name,
        kind: i.kind,
        key,
        latencyMs: 0,
        cached: false,
        error: (last?.message ?? 'failed').slice(0, 200),
        sourceText: i.sourceText,
      };
    },
  };
}

/** Runs tasks with at most `n` in flight, keeping input order in the result. */
export async function pool<T, R>(items: T[], n: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}
