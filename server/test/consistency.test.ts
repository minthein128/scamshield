import { describe, expect, it, vi } from 'vitest';
import { loadConfig, pipelineOptions, SAMPLING } from '../src/config.js';
import { createGeminiExtractor } from '../src/extract.js';
import { createStreamingExtractor } from '../src/extract-stream.js';
import { createGrounder, groundingKey } from '../src/ground.js';
import { createJobExtractor, jobCacheKey } from '../src/job/extract.js';
import { emptyFacts } from '../src/job/types.js';
import { createMockCorrelator, createMockExtractor } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import type { Extraction } from '../src/types.js';

const DAY_MS = 86_400_000;
const cfg = loadConfig({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-test' });
type Call = [{ config: Record<string, unknown> }];

const extraction = {
  flags: [],
  scamType: 'other',
  verdictDraft: 'careful',
  unsolicited: false,
  summary: 's',
  spokenWarning: 'w',
  urls: [],
  entities: { companies: [], phones: [], domains: [] },
};

const searchedReply = {
  text: '{"findings":[{"family":"identity","label":"No licence record","evidence":"Registry search","severity":"medium"}],"companyFound":false}',
  candidates: [{ groundingMetadata: { groundingChunks: [{ web: { title: 'Registry', uri: 'https://registry.example/a' } }] } }],
};

const entities = (companies: string[]): Pick<Extraction, 'entities'> => ({
  entities: { companies, phones: [], domains: [], country: 'Thailand' },
});

describe('fixed sampling', () => {
  it('uses temperature 0 with a fixed seed', () => {
    expect(SAMPLING).toEqual({ temperature: 0, seed: 1729 });
  });

  it('applies to message extraction, streamed extraction, grounding and job extraction', async () => {
    const generateContent = vi.fn(async (_a: unknown) => ({ text: JSON.stringify(extraction), candidates: searchedReply.candidates }));
    await createGeminiExtractor(cfg, { models: { generateContent } } as never).extract({ kind: 'message', language: 'en', text: 'x' });
    await createGrounder(cfg, { models: { generateContent } } as never).ground({ language: 'en' }, entities(['Acme Co']), 5000);
    const jobGen = vi.fn(async (_a: unknown) => ({ text: JSON.stringify({ ad: emptyFacts(), chat: null }) }));
    await createJobExtractor(cfg, { models: { generateContent: jobGen } } as never).extract({ language: 'en', ad: { text: 'ad' } });
    let streamConfig: Record<string, unknown> = {};
    const stream = {
      models: {
        generateContentStream: async (a: { config: Record<string, unknown> }) => {
          streamConfig = a.config;
          return (async function* () {
            yield { text: JSON.stringify(extraction) };
          })();
        },
      },
    };
    await createStreamingExtractor(cfg, stream as never).extract({ kind: 'message', language: 'en', text: 'x' });
    const configs = [
      ...(generateContent.mock.calls as unknown as Call[]).map((c) => c[0].config),
      (jobGen.mock.calls[0] as unknown as Call)[0].config,
      streamConfig,
    ];
    expect(configs).toHaveLength(4);
    for (const c of configs) expect(c).toMatchObject({ temperature: 0, seed: 1729 });
  });
});

describe('cache defaults', () => {
  it('keeps results, grounding and job facts for a day unless CACHE=0', () => {
    expect(cfg.resultCacheTtlMs).toBe(DAY_MS);
    expect(cfg.groundCacheTtlMs).toBe(DAY_MS);
    expect(cfg.jobCacheTtlMs).toBe(DAY_MS);
    expect(pipelineOptions(cfg).resultCacheTtlMs).toBe(DAY_MS);
    expect(pipelineOptions(loadConfig({ GEMINI_API_KEY: 'g', CACHE: '0' })).resultCacheTtlMs).toBe(0);
  });
});

describe('grounding cache', () => {
  it('keys on the organisations whatever their order or case, the language and the mode', () => {
    const k = groundingKey(entities(['Acme Co', 'Beta Ltd']), 'en');
    expect(groundingKey(entities(['beta ltd', 'Acme Co']), 'en')).toBe(k);
    expect(groundingKey(entities(['Acme Co', 'Beta Ltd']), 'my')).not.toBe(k);
    expect(groundingKey(entities(['Acme Co', 'Beta Ltd']), 'en', { companyCheck: true })).not.toBe(k);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reuses a searched answer for the same organisations', async () => {
    const generateContent = vi.fn(async () => searchedReply);
    const g = createGrounder(cfg, { models: { generateContent } } as never);
    const a = await g.ground({ language: 'en' }, entities(['Acme Co', 'Beta Ltd']), 5000, { companyCheck: true });
    const b = await g.ground({ language: 'en' }, entities(['Beta Ltd', 'Acme Co']), 5000, { companyCheck: true });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
    expect(a.companyFound).toBe(false);
  });

  it('serves a cached answer even when too little budget is left for a new search', async () => {
    const generateContent = vi.fn(async () => searchedReply);
    const g = createGrounder(cfg, { models: { generateContent } } as never);
    const a = await g.ground({ language: 'en' }, entities(['Acme Co']), 5000);
    expect(await g.ground({ language: 'en' }, entities(['Acme Co']), 200)).toEqual(a);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('does not keep a failed search and marks it incomplete', async () => {
    const generateContent = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(searchedReply);
    const g = createGrounder(cfg, { models: { generateContent } } as never);
    const first = await g.ground({ language: 'en' }, entities(['Acme Co']), 5000);
    const second = await g.ground({ language: 'en' }, entities(['Acme Co']), 5000);
    expect(first).toEqual({ flags: [], sources: [], incomplete: true });
    expect(second.flags).toHaveLength(1);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('is off with CACHE=0', async () => {
    const generateContent = vi.fn(async () => searchedReply);
    const g = createGrounder(loadConfig({ GEMINI_API_KEY: 'g', CACHE: '0' }), { models: { generateContent } } as never);
    await g.ground({ language: 'en' }, entities(['Acme Co']), 5000);
    await g.ground({ language: 'en' }, entities(['Acme Co']), 5000);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe('job extraction cache', () => {
  const facts = {
    ad: { ...emptyFacts(), workerFee: { value: 'none', quote: 'No agency fees', confidence: 0.9 } },
    chat: null,
  };
  const client = () => {
    const generateContent = vi.fn(async (_a: unknown) => ({ text: JSON.stringify(facts) }));
    return { generateContent, c: { models: { generateContent } } as never };
  };

  it('returns the same job id and facts for the same sources, with one model call', async () => {
    const { generateContent, c } = client();
    const ex = createJobExtractor(cfg, c);
    const a = await ex.extract({ language: 'my', ad: { text: 'No agency fees.  Apply now' } });
    const b = await ex.extract({ language: 'my', ad: { text: 'No agency fees. Apply now ' } });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
    expect(ex.getStored(a.jobId)).toBeDefined();
    const c2 = await ex.extract({ language: 'en', ad: { text: 'No agency fees. Apply now' } });
    expect(c2.jobId).not.toBe(a.jobId);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('hashes the input instead of keeping it', () => {
    const key = jobCacheKey({ language: 'en', ad: { text: 'secret recruiter text' } });
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('secret');
    expect(jobCacheKey({ language: 'en', chat: { text: 'secret recruiter text' } })).not.toBe(key);
  });

  it('is off with CACHE=0', async () => {
    const { generateContent, c } = client();
    const ex = createJobExtractor(loadConfig({ GEMINI_API_KEY: 'g', CACHE: '0' }), c);
    await ex.extract({ language: 'en', ad: { text: 'ad' } });
    await ex.extract({ language: 'en', ad: { text: 'ad' } });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe('pipeline result cache', () => {
  it('does not keep a result whose grounding failed', async () => {
    let extracts = 0;
    const mock = createMockExtractor();
    const p = createPipeline({
      extractor: {
        extract: (r) => {
          extracts++;
          return mock.extract(r);
        },
      },
      correlator: createMockCorrelator(),
      grounder: { ground: async () => ({ flags: [], sources: [], incomplete: true }) },
      model: 'm',
      resultCacheTtlMs: DAY_MS,
    });
    const req = { kind: 'agency' as const, language: 'en' as const, text: 'Sunrise Overseas Agency, deposit 5000' };
    await p.run(req);
    await p.run(req);
    expect(extracts).toBe(2);
  });

  it('returns the identical verdict, score and flags for an identical check', async () => {
    const p = createPipeline({
      extractor: createMockExtractor(),
      correlator: createMockCorrelator(),
      grounder: { ground: async () => ({ flags: [], sources: [] }) },
      model: 'm',
      resultCacheTtlMs: DAY_MS,
    });
    const req = { kind: 'message' as const, language: 'my' as const, text: 'Pay the deposit today. Send your passport photo.' };
    const a = await p.run(req);
    const b = await p.run(req);
    expect([b.verdict, b.score, b.flags]).toEqual([a.verdict, a.score, a.flags]);
  });
});
